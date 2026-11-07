/**
 * Cache Service - Redis-based caching layer
 * Modern redis v5 with Promise-based API
 */

const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null
    });

    this.stats = {
      hits: 0,
      misses: 0,
      gets: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    this.isConnected = false;
    this.initConnection();
  }

  initConnection() {
    this.errorLogged = false;
    
    // Suppress Redis error events - we'll handle connection failures silently
    this.client.on('error', (err) => {
      // Don't log Redis connection errors - the service handles fallback gracefully
      this.stats.errors++;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      console.log('[CACHE]  ✅ Redis connected and ready');
    });

    this.client.on('connect', () => {
      if (!this.errorLogged) {
        console.log('[CACHE]  Redis connection established');
        this.errorLogged = true;
      }
    });

    this.connect().catch(err => {
      if (!this.errorLogged) {
        console.log('[CACHE]  ⚠️  Redis unavailable - app will run without caching');
        this.errorLogged = true;
      }
    });
  }

  async connect() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        this.isConnected = true;
        console.log('[CACHE]  ✅ Redis connected successfully');
      }
    } catch (error_) {
      this.isConnected = false;
      console.log('[CACHE]  ⚠️  Redis unavailable - cache will be disabled (app still works)');
      console.log('[CACHE]  Connection error:', error_.message);
      this.stats.errors++;
    }
  }

  async get(key) {
    this.stats.gets++;
    try {
      if (!this.isConnected) {
        this.stats.misses++;
        return null;
      }
      const data = await this.client.get(key);
      if (data) {
        try {
          this.stats.hits++;
          return JSON.parse(data);
        } catch (parseError_) {
          console.warn('[CACHE] Parse error:', parseError_.message);
          this.stats.misses++;
          return null;
        }
      }
      this.stats.misses++;
      return null;
    } catch (error_) {
      console.warn('[CACHE] Get error:', error_.message);
      this.stats.errors++;
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    this.stats.sets++;
    try {
      if (!this.isConnected) {
        return false;
      }
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error_) {
      console.warn('[CACHE] Set error:', error_.message);
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    this.stats.deletes++;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      console.warn(`[CACHE] Delete error:`, err.message);
      this.stats.errors++;
      return false;
    }
  }

  async clear() {
    try {
      await this.client.flushDb();
      console.log('[CACHE]  Cache cleared');
      return true;
    } catch (err) {
      console.warn('[CACHE] Clear error:', err.message);
      this.stats.errors++;
      return false;
    }
  }

  async getOrSet(key, computeFn, ttl = 3600) {
    try {
      const cached = await this.get(key);
      if (cached !== null) return cached;

      const value = await computeFn();
      await this.set(key, value, ttl);
      return value;
    } catch (err) {
      console.warn(`[CACHE] GetOrSet error:`, err.message);
      this.stats.errors++;
      return null;
    }
  }

  async mset(data, ttl = 3600) {
    try {
      const promises = Object.entries(data).map(([key, value]) =>
        this.set(key, value, ttl)
      );
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.warn('[CACHE] Mset error:', err.message);
      this.stats.errors++;
      return false;
    }
  }

  async mget(keys) {
    try {
      const results = {};
      for (const key of keys) {
        results[key] = await this.get(key);
      }
      return results;
    } catch (err) {
      console.warn('[CACHE] Mget error:', err.message);
      this.stats.errors++;
      return {};
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      for (const key of keys) {
        await this.client.del(key);
      }

      console.log(`[CACHE]  Invalidated ${keys.length} keys`);
      return keys.length;
    } catch (err) {
      console.warn(`[CACHE] Invalidate error:`, err.message);
      this.stats.errors++;
      return 0;
    }
  }

  async exists(key) {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (err) {
      console.warn(`[CACHE] Exists error:`, err.message);
      this.stats.errors++;
      return false;
    }
  }

  async setTTL(key, seconds) {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (err) {
      console.warn(`[CACHE] SetTTL error:`, err.message);
      this.stats.errors++;
      return false;
    }
  }

  getStats() {
    const total = this.stats.gets || 1;
    const hitRate = ((this.stats.hits / total) * 100).toFixed(2);

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      total: total,
      isConnected: this.isConnected
    };
  }

  async warmCache(data, ttl = 3600) {
    try {
      console.log(`[CACHE]  Warming cache...`);
      await this.mset(data, ttl);
      console.log('[CACHE]  Cache warmed');
      return true;
    } catch (err) {
      console.warn('[CACHE] Warm cache error:', err.message);
      this.stats.errors++;
      return false;
    }
  }

  async close() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
        this.isConnected = false;
        console.log('[CACHE]  Redis closed');
      }
    } catch (err) {
      console.warn('[CACHE] Close error:', err.message);
    }
  }
}

const cacheService = new CacheService();

module.exports = cacheService;
