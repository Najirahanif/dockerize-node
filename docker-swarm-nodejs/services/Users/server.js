const express = require('express');
const redis = require('redis');
const os = require('os');
const promClient = require('prom-client'); 

const app = express();
const PORT = 3001;
const containerId = os.hostname().substring(0, 8);

// ============================================
// PROMETHEUS METRICS (Built-in)
// ============================================
const register = new promClient.Registry();
const serviceName = 'user_service';

// Collect default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
    name: `${serviceName}_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
    name: `${serviceName}_http_request_duration_seconds`,
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const redisOps = new promClient.Counter({
    name: `${serviceName}_redis_operations_total`,
    help: 'Total number of Redis operations',
    labelNames: ['operation'],
    registers: [register]
});

const activeUsers = new promClient.Gauge({
    name: `${serviceName}_active_users_total`,
    help: 'Total number of active users in memory',
    registers: [register]
});

const cacheHits = new promClient.Counter({
    name: `${serviceName}_cache_hits_total`,
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
    registers: [register]
});

const cacheMisses = new promClient.Counter({
    name: `${serviceName}_cache_misses_total`,
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
    registers: [register]
});

// Metrics middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        httpRequestsTotal.inc({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode
        }, duration);
    });
    
    next();
});
// ============================================

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request received`);
    next();
});

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://app_redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('User Service connected to Redis'));

(async () => {
    await redisClient.connect();
})();

// User data
const users = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com' },
    { id: 5, name: 'Evan Wright', email: 'evan@example.com' }
];

activeUsers.set(users.length);

// Track API calls using Redis
app.use(async (req, res, next) => {
    await redisClient.incr('user_service_requests');
    redisOps.inc({ operation: 'incr_requests' });
    next();
});

// Home route
app.get('/', async (req, res) => {
    const requestCount = await redisClient.get('user_service_requests');
    redisOps.inc({ operation: 'get_requests' });
    
    res.json({
        service: 'User Service',
        container: containerId,
        total_users: users.length,
        api_calls: requestCount || 0,
        redis_status: redisClient.isReady ? 'connected' : 'disconnected'
    });
});

// Get all users
app.get('/users', async (req, res) => {
    await redisClient.incr('user_fetches');
    redisOps.inc({ operation: 'incr_fetches' });
    
    const fetchCount = await redisClient.get('user_fetches');
    redisOps.inc({ operation: 'get_fetches' });
    
    res.json({
        service: 'user-service',
        container: containerId,
        times_fetched: fetchCount || 0,
        users: users
    });
});

// Get user by ID with Redis caching
app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `user_${userId}`;
    
    try {
        const cachedUser = await redisClient.get(cacheKey);
        redisOps.inc({ operation: 'get_cached_user' });
        
        if (cachedUser) {
            cacheHits.inc({ cache_type: 'user_detail' });
            console.log(`Returning cached user ${userId}`);
            return res.json({
                service: 'user-service',
                container: containerId,
                from_cache: true,
                user: JSON.parse(cachedUser) 
            });
        }
        
        cacheMisses.inc({ cache_type: 'user_detail' });
        
        const user = users.find(u => u.id === parseInt(userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await redisClient.setEx(cacheKey, 60, JSON.stringify(user));
        redisOps.inc({ operation: 'set_cached_user' });
        
        res.json({
            service: 'user-service',
            container: containerId,
            from_cache: false,
            user: user
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Redis error' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    res.json({ 
        status: 'healthy', 
        service: 'user-service',
        container: containerId,
        redis: redisStatus
    });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
    console.log(`Container ID: ${containerId}`);
});
