const express = require('express');
const redis = require('redis');
const os = require('os');

const app = express();
const PORT = 3001;
const containerId = os.hostname().substring(0, 8);

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://redis:6379'
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

// Track API calls using Redis
app.use(async (req, res, next) => {
    // Increment request counter in Redis
    await redisClient.incr('user_service_requests');
    next();
});

// Home route
app.get('/', async (req, res) => {
    const requestCount = await redisClient.get('user_service_requests');
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
    // Track how many times users are fetched
    await redisClient.incr('user_fetches');
    const fetchCount = await redisClient.get('user_fetches');
    
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
        // Try to get from Redis cache
        const cachedUser = await redisClient.get(cacheKey);
        
        if (cachedUser) {
            console.log(`Returning cached user ${userId}`);
            return res.json({
                service: 'user-service',
                container: containerId,
                from_cache: true,
                user: JSON.parse(cachedUser)
            });
        }
        
        // Find user
        const user = users.find(u => u.id === parseInt(userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Store in Redis cache for 1 minute
        await redisClient.setEx(cacheKey, 60, JSON.stringify(user));
        
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

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
    console.log(`Container ID: ${containerId}`);
});