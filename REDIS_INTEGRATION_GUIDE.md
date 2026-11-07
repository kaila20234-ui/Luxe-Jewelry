# Redis Integration Testing & Configuration Guide

## Redis Overview
Redis is an in-memory data store used in the Luxe Jewelry platform for:
- **Session caching** (24-hour TTL)
- **Product list caching** (10 minutes, frequently accessed)
- **Category caching** (1 hour, rarely changed)
- **Search result caching** (5 minutes)
- **Token blacklist** (invalidated JWT tokens)

---

## Current Configuration

### In `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

CACHE_ENABLED=true
CACHE_WARM_ON_START=true
CACHE_OPTIMIZER_ENABLED=true
```

### In `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

---

## Part 1: Local Development Testing

### 1.1 Start Redis Locally

**Option A: Using Docker (Recommended)**
```bash
# Start Redis container
docker run -d \
  --name redis-luxe \
  -p 6379:6379 \
  redis:7-alpine

# Verify it's running
docker logs redis-luxe
# Output: Ready to accept connections

# Test connection
docker exec redis-luxe redis-cli ping
# Output: PONG
```

**Option B: Using docker-compose.yml**
```bash
# Start entire stack
docker-compose up -d

# Verify Redis is healthy
docker-compose ps
# redis  | healthy status expected

# Test Redis specifically
docker-compose exec redis redis-cli ping
```

**Option C: Install Redis Locally**
```bash
# macOS
brew install redis
redis-server

# Ubuntu/Debian
sudo apt-get install redis-server
redis-server

# Windows (via WSL or native)
# Download: https://github.com/microsoftarchive/redis/releases
redis-server.exe
```

### 1.2 Verify Redis Connection

```bash
# Start Node.js server
npm start

# Check server logs for:
[CACHE] Initializing Redis cache service...
[CACHE] Cache warming...
[CACHE] Cache warmed

# If error: "Connection refused"
# → Ensure Redis is running on localhost:6379
```

### 1.3 Test Redis Manually

```bash
# Connect to Redis CLI
redis-cli

# Try basic commands
> PING
PONG

> SET test-key "hello"
OK

> GET test-key
"hello"

> DEL test-key
(integer) 1

# Check memory usage
> INFO memory
# Shows: used_memory_human, total_system_memory, etc.

# View all keys
> KEYS *
# Lists all cached items

# Monitor real-time commands (useful for debugging)
> MONITOR
# Shows every command executed in real-time

# Exit
> EXIT
```

---

## Part 2: API Testing

### 2.1 Verify Cache is Working

**Test Cache Hit/Miss**:
```bash
# First request (cache miss - slower)
curl -X GET http://localhost:5000/api/products \
  -H "content-type: application/json" \
  -w "\nTime: %{time_total}s\n"
# Response time: ~200-500ms (hits database)

# Second request (cache hit - faster)
curl -X GET http://localhost:5000/api/products \
  -w "\nTime: %{time_total}s\n"
# Response time: ~20-50ms (served from cache)
```

### 2.2 Monitor Cache Keys

```bash
# Start Redis monitor
redis-cli MONITOR

# In another terminal, make API requests
curl http://localhost:5000/api/products
curl http://localhost:5000/api/categories
curl http://localhost:5000/api/search?q=gold

# Monitor output shows:
# "SET" cache:products {"products": [...]}
# "GET" cache:products
# "SET" cache:categories {...}
```

### 2.3 Check Cache Statistics

```bash
# Via API endpoint (if available)
curl http://localhost:5000/api/monitoring/cache
# Response:
# {
#   "hits": 1234,
#   "misses": 45,
#   "hitRate": "96.5%",
#   "memory": "2.5MB"
# }

# Via Redis CLI
redis-cli> INFO stats
# Shows: total_commands_processed, connections_received, etc.
```

---

## Part 3: Cache Warming Test

### 3.1 Monitor Cache Warming on Startup

When server starts with `CACHE_WARM_ON_START=true`:

```bash
# Start server
npm start

# Watch logs for:
[CACHE] Initializing Redis cache service...
[CACHE] Warming cache...
[CACHE] → Loading products (estimate: 2s)
[CACHE] → Loading categories (estimate: 1s)
[CACHE] → Loading popular searches (estimate: <1s)
[CACHE] Cache warmed (total: 3.2s)

# This means:
# ✅ Products loaded: ~500ms
# ✅ Categories loaded: ~200ms
# ✅ Searches loaded: ~100ms
```

### 3.2 Verify Warmed Data

```bash
# Check what's cached
redis-cli> KEYS cache:*
# Should show:
# cache:products
# cache:categories  
# cache:searches:trending
# cache:popular_items

# View cache expiration
redis-cli> TTL cache:products
# Output: 300 (means expires in 300 seconds = 5 minutes)
# Output: -1 (means no expiration)
# Output: -2 (means key doesn't exist)
```

---

## Part 4: Performance Testing

### 4.1 Load Testing with Cache

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Test without cache (all requests hit database)
redis-cli FLUSHDB  # Clear cache
ab -n 100 -c 10 http://localhost:5000/api/products
# Requests per second (without cache): ~50-100

# Test with cache (requests served from Redis)
sleep 2  # Let cache warm
ab -n 100 -c 10 http://localhost:5000/api/products
# Requests per second (with cache): ~1000-5000

# That's 10-50x performance improvement!
```

### 4.2 Memory Usage Test

```bash
# Monitor Redis memory as you use the app
redis-cli --stat

# Output shows:
# keys          memory          clients
# 45            4.56M           1
# 47            4.58M           1

# Check memory limits
redis-cli> CONFIG GET maxmemory
# Default: 0 (unlimited)
# Production recommendation: 512MB - 2GB

# Set memory limit (temporary)
redis-cli> CONFIG SET maxmemory 1gb
redis-cli> CONFIG SET maxmemory-policy allkeys-lru

# These settings evict least-recently-used keys when memory is full
```

---

## Part 5: Production Deployment

### 5.1 Docker Compose Production Setup

```yaml
# docker-compose.yml (production)
services:
  redis:
    image: redis:7-alpine
    container_name: redis-luxe-prod
    ports:
      - "127.0.0.1:6379:6379"  # Only localhost
    volumes:
      - redis-data:/data  # Persistent storage
      - ./redis.conf:/usr/local/etc/redis/redis.conf  # Config file
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network
    
  app:
    # ... other config
    depends_on:
      redis:
        condition: service_healthy
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      CACHE_ENABLED: "true"

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### 5.2 Redis Configuration for Production

Create `redis.conf`:
```bash
# redis.conf
# ===== Performance =====
maxmemory 2gb                    # 2GB limit
maxmemory-policy allkeys-lru     # Evict least used
appendonly yes                   # Persistence
appendfsync everysec             # Sync every second

# ===== Security =====
requirepass your_secure_password  # Add password
bind 127.0.0.1                   # Only local access

# ===== Client Handling =====
timeout 300                       # Close idle clients
tcp-backlog 511                   # Connection queue
tcp-keepalive 300                 # Keep connections alive

# ===== Replication (optional) =====
# For high availability, consider replication:
# slaveof master-ip master-port
# masterauth password

#  ===== Monitoring =====
slowlog-log-slower-than 10000    # Log queries > 10ms
slowlog-max-len 128              # Keep 128 slow queries
```

### 5.3 Update `.env` for Production

```env
# .env (production)
REDIS_HOST=redis              # Docker service name
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0

CACHE_ENABLED=true
CACHE_WARM_ON_START=true
CACHE_OPTIMIZER_ENABLED=true

# Monitoring
MONITOR_ENABLED=true
PROMETHEUS_ENABLED=true

# Cache warmup config
CACHE_OPTIMIZATION_CHECK_INTERVAL=300000  # 5 minutes
CACHE_MAX_TTL=3600                        # 1 hour
CACHE_MIN_TTL=300                         # 5 minutes
```

---

## Part 6: Monitoring & Maintenance

### 6.1 Health Checks

```bash
# Health check endpoint
curl http://localhost:5000/api/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "cache": "connected",  ← Redis status
#   "timestamp": "2026-02-20T12:34:56Z"
# }
```

### 6.2 Monitoring Queries

```bash
# Monitor active connections
redis-cli> CLIENT LIST
# Shows connected clients and their commands

# Find slow queries
redis-cli> SLOWLOG GET 10
# Top 10 slowest commands

# Check persistence status
redis-cli> INFO persistence
# Shows RDB status, AOF status, etc.
```

### 6.3 Maintenance Tasks

```bash
# Daily: Check memory usage
redis-cli> INFO memory | grep used_memory_human

# Weekly: Backup data
redis-cli --rdb /backups/redis-backup.rdb

# Monthly: Analyze keys
redis-cli> INFO keyspace
# Shows number of keys in each database

# As needed: Clear cache (carefully!)
redis-cli> FLUSHDB      # Current database only
redis-cli> FLUSHALL     # All databases (dangerous!)
```

---

## Part 7: Troubleshooting

### Issue: "Redis Connection Refused"
```bash
# Check if Redis is running
ps aux | grep redis
# or
docker ps | grep redis

# Start Redis
redis-server
# or  
docker-compose up -d redis
```

### Issue: Cache Not Warming
```bash
# Check logs
npm start 2>&1 | grep CACHE

# Verify endpoint exists
curl http://localhost:5000/api/products

# Check Redis is accessible
redis-cli PING  # Should return PONG
```

### Issue: High Memory Usage
```bash
# Check what's using memory
redis-cli> INFO memory

# Find large keys
redis-cli> --bigkeys

# Reduce TTL values in .env:
CACHE_PRODUCT_LIST=300       # 5 min (was 10)
CACHE_CATEGORY=300           # 5 min (was 1 hour)

# Or reduce maxmemory
redis-cli> CONFIG SET maxmemory 512mb
```

### Issue: Slow Requests Despite Cache
```bash
# Check cache hit rate
curl http://localhost:5000/api/monitoring/cache

# If hit rate < 80%, check:
1. Cache TTL is appropriate
2. Cache warming is enabled
3. Database queries are still slow

# Monitor real requests
redis-cli MONITOR &
curl http://localhost:5000/api/products
# Check if SET or GET commands appear
```

---

## Testing Checklist

- [ ] Redis is running and accessible
- [ ] Server connects to Redis on startup
- [ ] Cache warming completes without errors
- [ ] Product list cache serves in <50ms (second request)
- [ ] Category caching works (TTL: 1 hour)
- [ ] Session caching enabled (TTL: 24 hours)
- [ ] Search results cached (TTL: 5 minutes)
- [ ] Expired keys automatically removed
- [ ] Memory usage stays under limit
- [ ] Persistence enabled (for production)
- [ ] Password protection configured (production)
- [ ] Health check endpoint returns "cache: connected"
- [ ] Load test shows 10x+ improvement with cache
- [ ] Slow queries logged for debugging
- [ ] Backup strategy documented

---

## Performance Baselines

| Operation | Without Cache | With Cache | Improvement |
|-----------|----------------------------------------|
| List products | 200-500ms | 20-50ms | **10x faster** |
| List categories | 150-300ms | 10-30ms | **10-30x faster** |
| Search products | 300-700ms | 30-80ms | **5-10x faster** |
| Get user profile | 100-200ms | 5-20ms | **5-20x faster** |
| List orders | 250-500ms | 25-60ms | **5-10x faster** |

RPS Improvement:
- Without cache: 50-100 requests/second
- With cache: 1000-5000 requests/second
- **Real-world gain: 10-50x more users supported**

---

## Next Steps

1. **Monitor in production**:
   - Set up Prometheus metrics
   - Create Grafana dashboard for Redis metrics
   - Setup alerts for high memory usage

2. **Optimize caching**:
   - Analyze slow queries
   - Adjust TTL values based on usage patterns
   - Implement cache invalidation on data updates

3. **Plan for scaling**:
   - Consider Redis Cluster for high availability
   - Setup Redis Sentinel for automatic failover
   - Plan for Redis replication

---

**Created**: February 20, 2026  
**Status**: ✅ Ready for Testing
