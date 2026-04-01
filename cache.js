const cache = new Map();

const CACHE_DURATION = {
  SHORT: 30000,
  MEDIUM: 300000,
  LONG: 900000
};

exports.setCache = (key, value, duration = CACHE_DURATION.MEDIUM) => {
  cache.set(key, {
    value,
    expiry: Date.now() + duration
  });
};

exports.getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
};

exports.clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  for (let key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

exports.cacheMiddleware = (duration = CACHE_DURATION.MEDIUM) => {
  return (req, res, next) => {
    const key = `${req.user?.branch || 'global'}:${req.path}:${JSON.stringify(req.query)}`;
    
    const cached = exports.getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }
    
    const originalJson = res.json;
    res.json = function(data) {
      exports.setCache(key, data, duration);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

exports.CACHE_DURATION = CACHE_DURATION;
