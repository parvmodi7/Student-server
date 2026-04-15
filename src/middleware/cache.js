/**
 * Cache Middleware
 * Uses in-memory cache to optimize repeated API calls and reduce Gemini API usage
 */
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function cacheMiddleware(ttl) {
  return function(req, res, next) {
    if (req.method !== 'GET') {
      return next();
    }

    var key = req.originalUrl || req.url;
    var cached = cache.get(key);

    if (cached) {
      console.log('[CACHE HIT] ' + key);
      return res.status(200).json({ data: cached, cached: true });
    }

    var originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
        console.log('[CACHE SET] ' + key + ' for ' + ttl + 's');
      }
      return originalJson(data);
    };

    next();
  };
}

function clearCache(pattern) {
  if (!pattern) {
    cache.flushAll();
    console.log('[CACHE] Cleared all');
    return;
  }
  
  var keys = cache.keys();
  var regex = new RegExp(pattern);
  keys.forEach(function(key) {
    if (regex.test(key)) cache.del(key);
  });
  console.log('[CACHE] Cleared matching: ' + pattern);
}

module.exports = { cacheMiddleware: cacheMiddleware, cache: cache, clearCache: clearCache };