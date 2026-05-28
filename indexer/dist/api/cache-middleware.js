"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = void 0;
const redis_js_1 = __importDefault(require("../redis.js"));
/**
 * Cache middleware with TTL support
 * @param ttl Time-to-live in seconds
 */
const cacheMiddleware = (ttl) => {
    return async (req, res, next) => {
        // Skip caching if Redis is not connected
        if (!redis_js_1.default.isOpen) {
            return next();
        }
        // Generate cache key from request URL and query params
        const cacheKey = `cache:${req.originalUrl || req.url}`;
        try {
            // Try to get cached data
            const cachedData = await redis_js_1.default.get(cacheKey);
            if (cachedData) {
                // Cache hit - return cached data
                return res.json(JSON.parse(cachedData));
            }
            // Cache miss - store original json method
            const originalJson = res.json.bind(res);
            // Override json method to cache the response
            res.json = function (data) {
                // Cache the response with TTL
                redis_js_1.default.setEx(cacheKey, ttl, JSON.stringify(data)).catch((err) => {
                    console.error('Failed to cache data:', err);
                });
                // Send the response
                return originalJson(data);
            };
            next();
        }
        catch (err) {
            console.error('Cache middleware error:', err);
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
