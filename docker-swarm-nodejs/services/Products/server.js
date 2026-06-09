const express = require('express');
const redis = require('redis');
const os = require('os');

const app = express();
const PORT = 3002;
const containerId = os.hostname().substring(0, 8);

// IMPORTANT: This middleware parses JSON bodies
app.use(express.json());

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://redis:6379'
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

// Get all products
app.get('/products', async (req, res) => {
    const cacheKey = 'product_list';
    
    try {
        const cachedProducts = await redisClient.get(cacheKey);
        
        if (cachedProducts) {
            return res.json({
                service: 'product-service',
                container: containerId,
                from_cache: true,
                products: JSON.parse(cachedProducts)
            });
        }
        
        await redisClient.incr('product_fetches');
        const fetchCount = await redisClient.get('product_fetches');
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

// Get product by ID
app.get('/products/:id', async (req, res) => {
    const productId = req.params.id;
    const cacheKey = `product_${productId}`;
    
    try {
        const cachedProduct = await redisClient.get(cacheKey);
        
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
    res.json({
        product: product.name,
        stock: product.stock,
        container: containerId
    });
});

// Buy product with Redis lock
app.post('/products/:id/buy', async (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = req.body.quantity || 1;  // Now req.body works!
    const lockKey = `lock:product:${productId}`;
    
    try {
        // Try to acquire lock
        const lockAcquired = await redisClient.setNX(lockKey, containerId);
        
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
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        product.stock -= quantity;
        await redisClient.del(`product_${productId}`);
        await redisClient.del('product_list');
        await redisClient.del(lockKey);
        
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

app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
    console.log(`Container ID: ${containerId}`);
});