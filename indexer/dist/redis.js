"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
// Create Redis client
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
// Handle connection errors
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});
// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('✓ Redis connected');
    }
    catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();
exports.default = redisClient;
