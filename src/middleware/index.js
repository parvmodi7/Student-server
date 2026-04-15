/**
 * Middleware Index
 * Export all middleware for easy importing
 */
module.exports = {
  auth: require('./auth'),
  cacheMiddleware: require('./cache').cacheMiddleware,
  clearCache: require('./cache').clearCache,
  apiLimiter: require('./rateLimiter').apiLimiter,
  geminiLimiter: require('./rateLimiter').geminiLimiter,
  authLimiter: require('./rateLimiter').authLimiter
};