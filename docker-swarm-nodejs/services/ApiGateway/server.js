const express = require('express');
const axios = require('axios');
const os = require('os');
const fs = require('fs');
const app = express();
const PORT = 3000;
const containerId = os.hostname().substring(0, 8);
const VERSION = "v2.0.0";

app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.json({
        service: 'API Gateway',
        version: VERSION,
        container: containerId,
        message: 'Welcome to Docker Swarm - UPDATED VERSION!'
    });
});

// Users routes
app.get('/users', async (req, res) => {
    try {
        const response = await axios.get('http://user-service:3001/users');
        res.json({
            version: VERSION,
            from: 'API Gateway',
            gateway_container: containerId,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: 'User service unavailable' });
    }
});

// Products routes
app.get('/products', async (req, res) => {
    try {
        const response = await axios.get('http://product-service:3002/products');
        res.json({
            version: VERSION,
            from: 'API Gateway',
            gateway_container: containerId,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Product service unavailable' });
    }
});

// Get single product
app.get('/products/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://product-service:3002/products/${req.params.id}`);
        res.json({
            from: 'API Gateway',
            gateway_container: containerId,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Product service unavailable' });
    }
});

// Get product stock (NEW)
app.get('/products/:id/stock', async (req, res) => {
    try {
        const response = await axios.get(`http://product-service:3002/products/${req.params.id}/stock`);
        res.json({
            from: 'API Gateway',
            gateway_container: containerId,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Product service unavailable' });
    }
});

// Buy product with lock (NEW)
app.post('/products/:id/buy', async (req, res) => {
    try {
        const response = await axios.post(
            `http://product-service:3002/products/${req.params.id}/buy`,
            req.body
        );
        res.json({
            from: 'API Gateway',
            gateway_container: containerId,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({
            error: error.response?.data?.error || 'Product service unavailable',
            gateway_container: containerId
        });
    }
});


const API_KEY = fs.readFileSync('/run/secrets/api_key', 'utf8').trim();
const JWT_SECRET = fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();

console.log('Secrets loaded successfully', API_KEY, JWT_SECRET);

app.get('/check-secrets', (req, res) => {
    const hasApiKey = fs.existsSync('/run/secrets/api_key');
    const hasJwtSecret = fs.existsSync('/run/secrets/jwt_secret');

    res.json({
        api_key_exists: hasApiKey,
        jwt_secret_exists: hasJwtSecret,
        api_key_value: hasApiKey ? fs.readFileSync('/run/secrets/api_key', 'utf8').trim() : null
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: VERSION,
        service: 'api-gateway',
        container: containerId
    });
});

app.listen(PORT, () => console.log(`API Gateway ${VERSION} running on port ${PORT}, container: ${containerId}`));