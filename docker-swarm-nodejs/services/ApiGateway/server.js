const express = require('express');
const axios = require('axios');
const os = require('os');

const app = express();
const PORT = 3000;
const containerId = os.hostname().substring(0, 8);
const VERSION = "v2.0.0";  // ← NEW VERSION NUMBER

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ 
        service: 'API Gateway', 
        version: VERSION,  // ← Showing version now
        container: containerId, 
        message: 'Welcome to Docker Swarm - UPDATED VERSION!' 
    });
});

app.get('/users', async (req, res) => {
    try {
        const response = await axios.get('http://user-service:3001/users');
        res.json({ 
            version: VERSION,  // ← Show version
            from: 'API Gateway', 
            gateway_container: containerId, 
            data: response.data 
        });
    } catch (error) {
        res.status(500).json({ error: 'User service unavailable' });
    }
});

app.get('/products', async (req, res) => {
    try {
        const response = await axios.get('http://product-service:3002/products');
        res.json({ 
            version: VERSION,  // ← Show version
            from: 'API Gateway', 
            gateway_container: containerId, 
            data: response.data 
        });
    } catch (error) {
        res.status(500).json({ error: 'Product service unavailable' });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        version: VERSION,  // ← Show version
        service: 'api-gateway', 
        container: containerId 
    });
});

app.listen(PORT, () => console.log(`API Gateway ${VERSION} running on port ${PORT}, container: ${containerId}`));
