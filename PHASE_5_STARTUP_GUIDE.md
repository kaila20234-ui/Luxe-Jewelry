# Phase 5 Startup Guide - Performance Optimization

## Quick Start: Begin Phase 5 Implementation

**Current Status**: Phase 4 Complete ✅  
**Server Status**: Running on http://localhost:5000 ✅  
**Tests**: All 54 tests passing ✅  
**Ready to Proceed**: YES ✅

---

## Phase 5 Overview

### Objective
Transform the application from functional to high-performance with a 50-70% improvement in response times and database efficiency.

### Timeline
- **Week 1**: Redis Caching Implementation
- **Week 2**: Database Optimization
- **Week 3**: Application-Level Optimization

### Success Metrics
- Response time reduction: 50%
- Database query reduction: 70%
- Concurrent user support: 5x increase
- Memory efficiency: Optimized
- Uptime: 99.9%

---

## Phase 5 Week 1: Redis Caching

### Objective
Implement intelligent caching layer to reduce database load and improve response times.

### Prerequisites
- Redis server installed locally or remotely
- Node.js packages: redis, ioredis
- 2-3 hours implementation time

### Step 1: Install Redis & Dependencies

```bash
# Install Node.js Redis client
npm install redis ioredis --save

# Verify installation
npm list redis ioredis

# Install Redis server locally (Windows)
# Option 1: Use Windows Subsystem for Linux (WSL)
wsl
sudo apt-get install redis-server

# Option 2: Use pre-built Windows Redis
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Step 2: Create Cache Service

Create file: `services/cacheService.js`

```javascript
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('End of retry.');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.client.on('error', (err) => {
      console.error('[CACHE] Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('[CACHE] Redis connected');
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error(`[CACHE] Get error for ${key}:`, err);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600)
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 3600) {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[CACHE] Set error for ${key}:`, err);
      return false;
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      console.error(`[CACHE] Delete error for ${key}:`, err);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      await this.client.flushdb();
      return true;
    } catch (err) {
      console.error('[CACHE] Clear error:', err);
      return false;
    }
  }

  /**
   * Get or set cache (compute if not exists)
   * @param {string} key - Cache key
   * @param {function} computeFn - Function to compute value if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, computeFn, ttl = 3600) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Compute value
      const value = await computeFn();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (err) {
      console.error(`[CACHE] GetOrSet error for ${key}:`, err);
      return null;
    }
  }

  /**
   * Set multiple keys
   * @param {object} data - Key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async mset(data, ttl = 3600) {
    try {
      for (const [key, value] of Object.entries(data)) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (err) {
      console.error('[CACHE] Mset error:', err);
      return false;
    }
  }

  /**
   * Invalidate cache pattern
   * @param {string} pattern - Key pattern (e.g., "product:*")
   * @returns {Promise<number>} - Number of deleted keys
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await new Promise((resolve, reject) => {
        const stream = this.client.scanStream({ match: pattern });
        const keys = [];
        stream.on('data', (resultKeys) => {
          keys.push(...resultKeys);
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(keys));
      });

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (err) {
      console.error(`[CACHE] Invalidate pattern error for ${pattern}:`, err);
      return 0;
    }
  }
}

module.exports = new CacheService();
```

### Step 3: Integrate Caching into Endpoints

Update: `routes/products.js`

```javascript
const cacheService = require('../services/cacheService');
const productController = require('../controllers/productController');

// Cached product listing
router.get('/products', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const cacheKey = `products:${page}:${limit}`;

    const products = await cacheService.getOrSet(
      cacheKey,
      () => productController.getProducts(page, limit),
      300 // Cache for 5 minutes
    );

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cached single product
router.get('/products/:id', async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;

    const product = await cacheService.getOrSet(
      cacheKey,
      () => productController.getProduct(req.params.id),
      600 // Cache for 10 minutes
    );

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invalidate cache when product is updated
router.put('/products/:id', async (req, res) => {
  try {
    const updated = await productController.updateProduct(req.params.id, req.body);
    
    // Invalidate related cache entries
    await cacheService.delete(`product:${req.params.id}`);
    await cacheService.invalidatePattern('products:*');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Step 4: Add Session Caching

Create file: `middleware/sessionCache.js`

```javascript
const cacheService = require('../services/cacheService');

/**
 * Session caching middleware
 * Stores user sessions in Redis for faster access
 */
const sessionCache = {
  /**
   * Store session
   */
  async storeSession(userId, sessionData, ttl = 86400) {
    const key = `session:${userId}`;
    return await cacheService.set(key, sessionData, ttl);
  },

  /**
   * Get session
   */
  async getSession(userId) {
    const key = `session:${userId}`;
    return await cacheService.get(key);
  },

  /**
   * Invalidate session
   */
  async invalidateSession(userId) {
    const key = `session:${userId}`;
    return await cacheService.delete(key);
  },

  /**
   * Middleware to check session cache
   */
  middleware: async (req, res, next) => {
    if (req.user) {
      const session = await sessionCache.getSession(req.user.id);
      if (session) {
        req.session = session;
      }
    }
    next();
  }
};

module.exports = sessionCache;
```

### Step 5: Performance Testing

Create file: `tests/performance.test.js`

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

describe('Performance Tests - Phase 5 Week 1', () => {
  const results = {
    productList: [],
    singleProduct: [],
    search: []
  };

  // Test product listing performance
  it('should fetch product list in <200ms (target: 100ms)', async () => {
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await axios.get(`${BASE_URL}/api/products?page=1&limit=10`);
      const duration = Date.now() - start;
      results.productList.push(duration);
    }

    const avg = results.productList.reduce((a, b) => a + b, 0) / results.productList.length;
    console.log(`Average product list time: ${avg}ms`);
    expect(avg).toBeLessThan(200);
  });

  // Test single product performance
  it('should fetch single product in <100ms (target: 50ms)', async () => {
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await axios.get(`${BASE_URL}/api/products/123`);
      const duration = Date.now() - start;
      results.singleProduct.push(duration);
    }

    const avg = results.singleProduct.reduce((a, b) => a + b, 0) / results.singleProduct.length;
    console.log(`Average single product time: ${avg}ms`);
    expect(avg).toBeLessThan(100);
  });

  // Report results
  afterAll(() => {
    console.log('\n=== Performance Baseline ===');
    console.log(`Product List - Avg: ${(results.productList.reduce((a, b) => a + b, 0) / results.productList.length).toFixed(2)}ms`);
    console.log(`Single Product - Avg: ${(results.singleProduct.reduce((a, b) => a + b, 0) / results.singleProduct.length).toFixed(2)}ms`);
  });
});
```

### Step 6: Run Performance Baseline

```bash
# Install axios for performance testing
npm install axios --save-dev

# Create performance baseline
npx jest tests/performance.test.js

# Record the baseline times
# These will be compared after optimization
```

### Step 7: Verify Cache Service

```bash
# Test cache service
npm test

# Check Redis connection
redis-cli ping
# Expected response: PONG

# Monitor cache operations
redis-cli
> INFO stats
> DBSIZE
```

### Deliverables for Week 1

- ✅ Redis installed and running
- ✅ CacheService created (get, set, delete, getOrSet)
- ✅ Session caching middleware
- ✅ Cache integration with product endpoints
- ✅ Performance baseline established
- ✅ Cache invalidation strategy implemented
- ✅ Tests passing

### Expected Improvements Week 1
- Response time: -30%
- Database queries: -40%
- Memory usage: +15% (cached data)

---

## Phase 5 Week 2: Database Optimization

*Detailed in PHASE_5_OPTIMIZATION.md*

### Key Activities
- Index critical fields
- Optimize slow queries
- Implement connection pooling
- Query projection and lean()

### Expected Improvements
- Query time: -50%
- Database load: -60%

---

## Phase 5 Week 3: Application Optimization

*Detailed in PHASE_5_OPTIMIZATION.md*

### Key Activities
- CPU profiling
- Memory optimization
- HTTP/2 enablement
- Clustering implementation

### Expected Improvements
- Concurrent capacity: +400%
- Memory efficiency: -25%

---

## Monitoring & Metrics

### Redis Monitoring

```bash
# Monitor Redis memory
redis-cli INFO memory

# Monitor Redis operations
redis-cli MONITOR

# Check cache hit rate
redis-cli INFO stats
# Look for: keyspace_hits and keyspace_misses
```

### Application Performance Monitoring

```bash
# Install monitoring tools
npm install clinic clinic-doctor --save-dev

# Profile application
clinic doctor -- node server.js

# This will generate HTML reports
```

### Logging Optimization

Add to `services/cacheService.js`:

```javascript
// Log cache hit/miss statistics
async getStats() {
  const info = await this.client.info('stats');
  const hits = info.match(/keyspace_hits:(\d+)/)?.[1] || 0;
  const misses = info.match(/keyspace_misses:(\d+)/)?.[1] || 0;
  const hitRate = (hits / (hits + misses) * 100).toFixed(2);
  
  console.log(`[CACHE] Hit Rate: ${hitRate}%`);
  return { hits, misses, hitRate };
}
```

---

## Timeline & Checklist

### Week 1 - Caching (Days 1-5)

**Monday**
- [ ] Install Redis
- [ ] Install Node.js Redis packages
- [ ] Create CacheService
- [ ] Write unit tests
- [ ] Status: Ready for integration

**Tuesday**
- [ ] Integrate cache into product endpoints
- [ ] Add session caching
- [ ] Test cache invalidation
- [ ] Verify all tests pass
- [ ] Status: Cache integrated

**Wednesday**
- [ ] Run performance baseline tests
- [ ] Record before/after metrics
- [ ] Verify cache hit rates
- [ ] Optimize cache TTLs
- [ ] Status: Performance measured

**Thursday**
- [ ] Implement cache warming strategy
- [ ] Add cache statistics endpoint
- [ ] Set up Redis monitoring
- [ ] Test failover scenarios
- [ ] Status: Monitoring active

**Friday**
- [ ] Documentation update
- [ ] Team review
- [ ] Prepare Week 2 tasks
- [ ] Metrics review
- [ ] Status: Ready for Week 2

---

## Environment Setup

Add to `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache TTLs (seconds)
CACHE_PRODUCT_LIST=300
CACHE_PRODUCT_DETAIL=600
CACHE_SEARCH=300
CACHE_SESSION=86400

# Cache enabled/disabled
CACHE_ENABLED=true
```

---

## Verification Checklist

Before moving to Week 2, verify:

- [ ] Redis server running and connected
- [ ] CacheService tests passing
- [ ] Performance baseline recorded
- [ ] Cache hits > 60% on repeated requests
- [ ] No cache corruption or stale data
- [ ] Session caching working
- [ ] All tests still passing (54/54)
- [ ] No memory leaks
- [ ] Documentation updated

---

## Troubleshooting

### Redis Won't Connect

```bash
# Check if Redis is running
redis-cli ping
# If no response, start Redis

# Check logs
docker logs <redis-container>

# Verify connection string
echo $REDIS_HOST
echo $REDIS_PORT
```

### Cache Not Working

```bash
# Check cache entries
redis-cli
> KEYS *
> GET <key>

# Check if caching is enabled
console.log(process.env.CACHE_ENABLED)

# Verify cache middleware is applied
# Check app.js for cacheService usage
```

### Performance Not Improving

```bash
# Check cache hit rate
redis-cli INFO stats

# Verify cache TTL is appropriate
# Check if cache is being invalidated too frequently
# Review cache keys in Redis

# May need to adjust TTL or caching strategy
```

---

## Next Steps

1. **Complete Week 1 tasks** ✅ Ready
2. **Move to Week 2**: Database Optimization
3. **Move to Week 3**: Application-Level Optimization
4. **Complete Phase 5**: Ready for deployment

---

## Resources

- [Redis Documentation](https://redis.io/documentation)
- [Node Redis Client](https://github.com/redis/node-redis)
- [Caching Strategies](https://en.wikipedia.org/wiki/Cache_(computing))
- [Performance Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)

---

## Support

For questions or issues:
- Review PHASE_5_OPTIMIZATION.md for detailed information
- Check test files for examples
- Refer to service documentation

---

**Status**: 🟢 Ready to Start  
**Duration**: 1 week  
**Priority**: High  
**Impact**: 50%+ performance improvement

Begin Week 1 when ready!

---

*Phase 5 Week 1 - Performance Optimization via Caching*  
*Last Updated: December 24, 2025*
