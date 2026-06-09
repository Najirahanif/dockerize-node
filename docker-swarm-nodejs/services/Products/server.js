const express = require('express');
const redis = require('redis');
const os = require('os');

const app = express();
const PORT = 3002;
const containerId = os.hostname().substring(0, 8);

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('Product Service connected to Redis'));

(async () => {
    await redisClient.connect();
})();

// Product data
const products = [
    { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics' },
    { id: 2, name: 'Mouse', price: 29.99, category: 'Accessories' },
    { id: 3, name: 'Keyboard', price: 79.99, category: 'Accessories' },
    { id: 4, name: 'Monitor', price: 299.99, category: 'Electronics' },
    { id: 5, name: 'USB Cable', price: 9.99, category: 'Accessories' }
];

// Track API calls
app.use(async (req, res, next) => {
    await redisClient.incr('product_service_requests');
    next();
});

// Home route
app.get('/', async (req, res) => {
    const requestCount = await redisClient.get('product_service_requests');
    res.json({
        service: 'Product Service',
        container: containerId,
        total_products: products.length,
        api_calls: requestCount || 0,
        redis_status: redisClient.isReady ? 'connected' : 'disconnected'
    });
});

// Get all products with Redis caching
app.get('/products', async (req, res) => {
    const cacheKey = 'product_list';
    
    try {
        // Try to get from cache
        const cachedProducts = await redisClient.get(cacheKey);
        
        if (cachedProducts) {
            console.log(`Returning cached products`);
            return res.json({
                service: 'product-service',
                container: containerId,
                from_cache: true,
                products: JSON.parse(cachedProducts)
            });
        }
        
        // Track product fetches
        await redisClient.incr('product_fetches');
        const fetchCount = await redisClient.get('product_fetches');
        
        // Store in cache for 30 seconds
        await redisClient.setEx(cacheKey, 30, JSON.stringify(products));
        
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

// Get product by ID with Redis caching
app.get('/products/:id', async (req, res) => {
    const productId = req.params.id;
    const cacheKey = `product_${productId}`;
    
    try {
        // Try cache
        const cachedProduct = await redisClient.get(cacheKey);
        
        if (cachedProduct) {
            return res.json({
                service: 'product-service',
                container: containerId,
                from_cache: true,
                product: JSON.parse(cachedProduct)
            });
        }
        
        // Find product
        const product = products.find(p => p.id === parseInt(productId));
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Cache for 1 minute
        await redisClient.setEx(cacheKey, 60, JSON.stringify(product));
        
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

app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
    console.log(`Container ID: ${containerId}`);
});