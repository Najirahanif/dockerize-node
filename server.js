const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;
const APP_NAME = process.env.APP_NAME || 'dockerize-node';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
let dbClient;
let db;

// Connect to MongoDB
async function connectMongo() {
    try {
        dbClient = new MongoClient(MONGO_URI);
        await dbClient.connect();
        db = dbClient.db();
        console.log('✅ MongoDB connected successfully');
        
        // Create collection if not exists
        const collections = await db.listCollections({ name: 'data' }).toArray();
        if (collections.length === 0) {
            await db.createCollection('data');
            console.log('📁 Created "data" collection');
        }
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        setTimeout(connectMongo, 5000); // Retry after 5 seconds
    }
}
connectMongo();

// CORS support
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware
app.use(express.json());

// Create directories
const logDir = '/app/logs';
const dataDir = '/app/data';

[logDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Logger middleware
app.use((req, res, next) => {
    const log = `${new Date().toISOString()} - ${req.method} ${req.url}`;
    console.log(log);
    try {
        fs.appendFileSync(path.join(logDir, 'access.log'), log + '\n');
    } catch (err) {
        console.error('Failed to write log:', err.message);
    }
    next();
});

// Home route
app.get('/', (req, res) => {
    res.json({
        app: APP_NAME,
        message: 'Hello from Dockerized Node.js Backend with MongoDB!',
        status: 'running',
        database: db ? 'connected' : 'disconnected',
        containerId: process.env.HOSTNAME,
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        app: APP_NAME,
        status: 'healthy',
        database: db ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// Store data in MongoDB
app.post('/data', async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) {
        return res.status(400).json({ error: 'Key and value required' });
    }
    
    try {
        // Store in MongoDB
        const collection = db.collection('data');
        await collection.updateOne(
            { key: key },
            { $set: { key, value, timestamp: new Date() } },
            { upsert: true }
        );
        
        // Also store in file system (backward compatible)
        const filePath = path.join(dataDir, `${key}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ key, value, timestamp: new Date() }));
        
        res.json({ message: 'Data stored in MongoDB', key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get data from MongoDB
app.get('/data/:key', async (req, res) => {
    try {
        const collection = db.collection('data');
        const data = await collection.findOne({ key: req.params.key });
        
        if (data) {
            res.json(data);
        } else {
            // Try file system as fallback
            const filePath = path.join(dataDir, `${req.params.key}.json`);
            if (fs.existsSync(filePath)) {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                res.json(fileData);
            } else {
                res.status(404).json({ error: 'Key not found' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all keys from MongoDB
app.get('/keys', async (req, res) => {
    try {
        const collection = db.collection('data');
        const allData = await collection.find({}).toArray();
        const keys = allData.map(item => ({ key: item.key, timestamp: item.timestamp }));
        res.json({ keys, total: keys.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get logs
app.get('/logs', (req, res) => {
    try {
        const logFile = path.join(logDir, 'access.log');
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            const logLines = logs.split('\n').filter(line => line.length > 0);
            res.json({
                total: logLines.length,
                logs: logLines.slice(-20)
            });
        } else {
            res.json({ logs: [] });
        }
    } catch (error) {
        res.status(500).json({ error: 'Cannot read logs' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ ${APP_NAME} running on port ${PORT}`);
    console.log(`📂 Logs: ${logDir}`);
    console.log(`💾 Data: ${dataDir}`);
    console.log(`🍃 MongoDB URI: ${MONGO_URI}`);
    console.log(`🌐 CORS enabled - Accepting requests from any origin`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (dbClient) {
        await dbClient.close();
        console.log('MongoDB connection closed');
    }
    process.exit(0);
});