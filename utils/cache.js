let client = null;
let redisAvailable = false;
let redisErrorLogged = false;

const initCache = async () => {
  try {
    const redis = require('redis');
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) }
    });

    client.on('error', (err) => {
      if (!redisErrorLogged) {
        console.warn('⚠️ Redis unavailable - caching disabled. To enable: install Redis or set REDIS_HOST/REDIS_PORT');
        redisErrorLogged = true;
      }
    });

    client.on('connect', () => {
      console.log('✅ Redis Connected');
      redisAvailable = true;
    });

    await client.connect();
    redisAvailable = true;
    return client;
  } catch (error) {
    if (!redisErrorLogged) {
      console.warn('⚠️ Redis not available, caching disabled. Install with: npm install redis');
      redisErrorLogged = true;
    }
    redisAvailable = false;
    return null;
  }
};

const getCache = async (key) => {
  try {
    if (!redisAvailable || !client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const setCache = async (key, value, ttl = 300) => {
  try {
    if (!redisAvailable || !client) return;
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

const deleteCache = async (key) => {
  try {
    if (!redisAvailable || !client) return;
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
};

const clearCache = async (pattern) => {
  try {
    if (!redisAvailable || !client) return;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
};

module.exports = { initCache, getCache, setCache, deleteCache, clearCache };
