const express = require('express');
const redis = require('redis');
const os = require('os');
const promClient = require('prom-client');

const app = express();
const PORT = 3002;
const containerId = os.hostname().substring(0, 8);

app.use(express.json());

// ============================================
// PROMETHEUS METRICS (Built-in)
// ============================================
const register = new promClient.Registry();
const serviceName = 'product_service';

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

const activeProducts = new promClient.Gauge({
    name: `${serviceName}_active_products_total`,
    help: 'Total number of products in memory',
    registers: [register]
});

const productPurchases = new promClient.Counter({
    name: `${serviceName}_purchases_total`,
    help: 'Total number of product purchases',
    labelNames: ['product_id', 'product_name'],
    registers: [register]
});

const stockLevel = new promClient.Gauge({
    name: `${serviceName}_stock_level`,
    help: 'Current stock level for products',
    labelNames: ['product_id', 'product_name'],
    registers: [register]
});

const redisOps = new promClient.Counter({
    name: `${serviceName}_redis_operations_total`,
    help: 'Total number of Redis operations',
    labelNames: ['operation'],
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

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://app_redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('Product Service connected to Redis'));

(async () => {
    await redisClient.connect();
})();

// Product data with stock
const products = [
    { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 10 },
    { id: 2, name: 'Mouse', price: 29.99, category: 'Accessories', stock: 50 },
    { id: 3, name: 'Keyboard', price: 79.99, category: 'Accessories', stock: 25 },
    { id: 4, name: 'Monitor', price: 299.99, category: 'Electronics', stock: 15 },
    { id: 5, name: 'USB Cable', price: 9.99, category: 'Accessories', stock: 100 }
];

// Initialize stock metrics
products.forEach(product => {
    stockLevel.set({ product_id: product.id, product_name: product.name }, product.stock);
});
activeProducts.set(products.length);

// Track API calls
app.use(async (req, res, next) => {
    await redisClient.incr('product_service_requests');
    redisOps.inc({ operation: 'incr_requests' });
    next();
});

// Home route
app.get('/', async (req, res) => {
    const requestCount = await redisClient.get('product_service_requests');
    redisOps.inc({ operation: 'get_requests' });
    
    res.json({
        service: 'Product Service',
        container: containerId,
        total_products: products.length,
        api_calls: requestCount || 0,
        redis_status: redisClient.isReady ? 'connected' : 'disconnected'
    });
});

// Get all products
app.get('/products', async (req, res) => {
    const cacheKey = 'product_list';
    
    try {
        const cachedProducts = await redisClient.get(cacheKey);
        redisOps.inc({ operation: 'get_cache' });
        
        if (cachedProducts) {
            return res.json({
                service: 'product-service',
                container: containerId,
                from_cache: true,
                products: JSON.parse(cachedProducts)
            });
        }
        
        await redisClient.incr('product_fetches');
        redisOps.inc({ operation: 'incr_fetches' });
        
        const fetchCount = await redisClient.get('product_fetches');
        redisOps.inc({ operation: 'get_fetches' });
        
        await redisClient.setEx(cacheKey, 30, JSON.stringify(products));
        redisOps.inc({ operation: 'set_cache' });
        
        res.json({
            service: 'product-service',
            container: containerId,
            from_cache: false,
            times_fetched: fetchCount || 0,
            products: products
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Redis error' });
    }
});

// Get product by ID
app.get('/products/:id', async (req, res) => {
    const productId = req.params.id;
    const cacheKey = `product_${productId}`;
    
    try {
        const cachedProduct = await redisClient.get(cacheKey);
        redisOps.inc({ operation: 'get_product_cache' });
        
        if (cachedProduct) {
            return res.json({
                service: 'product-service',
                container: containerId,
                from_cache: true,
                product: JSON.parse(cachedProduct)
            });
        }
        
        const product = products.find(p => p.id === parseInt(productId));
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        await redisClient.setEx(cacheKey, 60, JSON.stringify(product));
        redisOps.inc({ operation: 'set_product_cache' });
        
        res.json({
            service: 'product-service',
            container: containerId,
            from_cache: false,
            product: product
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Redis error' });
    }
});

// Get stock
app.get('/products/:id/stock', async (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    stockLevel.set({ product_id: product.id, product_name: product.name }, product.stock);
    
    res.json({
        product: product.name,
        stock: product.stock,
        container: containerId
    });
});

// Buy product with Redis lock
app.post('/products/:id/buy', async (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = req.body.quantity || 1;
    const lockKey = `lock:product:${productId}`;
    
    try {
        const lockAcquired = await redisClient.setNX(lockKey, containerId);
        redisOps.inc({ operation: 'acquire_lock' });
        
        if (!lockAcquired) {
            return res.status(409).json({ 
                error: 'Product is being purchased. Try again.',
                container: containerId
            });
        }
        
        await redisClient.expire(lockKey, 5);
        
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            await redisClient.del(lockKey);
            return res.status(404).json({ error: 'Product not found' });
        }
        
        if (product.stock < quantity) {
            await redisClient.del(lockKey);
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        product.stock -= quantity;
        
        stockLevel.set({ product_id: product.id, product_name: product.name }, product.stock);
        productPurchases.inc({ 
            product_id: product.id, 
            product_name: product.name 
        }, quantity);
        
        await redisClient.del(`product_${productId}`);
        await redisClient.del('product_list');
        await redisClient.del(lockKey);
        redisOps.inc({ operation: 'clear_cache' });
        
        res.json({
            success: true,
            message: `Purchased ${quantity} x ${product.name}`,
            remainingStock: product.stock,
            container: containerId
        });
        
    } catch (error) {
        await redisClient.del(lockKey);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', async (req, res) => {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    res.json({ 
        status: 'healthy', 
        service: 'product-service',
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
    console.log(`Product Service running on port ${PORT}`);
    console.log(`Container ID: ${containerId}`);
});