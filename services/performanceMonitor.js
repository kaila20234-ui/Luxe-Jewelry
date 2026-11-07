/**
 * Performance Monitoring Module
 * Tracks cache, API, and application metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: [],
      cacheOperations: [],
      pageLoads: [],
      errors: [],
      performance: {}
    };
    
    this.thresholds = {
      slowAPI: 500,      // ms
      slowCache: 10,     // ms
      errorRate: 0.05    // 5%
    };
  }

  /**
   * Track API performance
   */
  trackAPICall(route, method, duration, status, cached = false) {
    const call = {
      timestamp: new Date(),
      route,
      method,
      duration,
      status,
      cached,
      isSlow: duration > this.thresholds.slowAPI,
      isError: status >= 400
    };

    this.metrics.apiCalls.push(call);
    
    // Keep only last 1000 calls
    if (this.metrics.apiCalls.length > 1000) {
      this.metrics.apiCalls.shift();
    }

    return call;
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(operation, duration, hit, key = null) {
    const op = {
      timestamp: new Date(),
      operation,
      duration,
      hit,
      key,
      isSlow: duration > this.thresholds.slowCache
    };

    this.metrics.cacheOperations.push(op);
    
    if (this.metrics.cacheOperations.length > 1000) {
      this.metrics.cacheOperations.shift();
    }

    return op;
  }

  /**
   * Track page load performance
   */
  trackPageLoad(path, loadTime, resourceCount) {
    const load = {
      timestamp: new Date(),
      path,
      loadTime,
      resourceCount,
      slow: loadTime > 3000
    };

    this.metrics.pageLoads.push(load);
    
    if (this.metrics.pageLoads.length > 500) {
      this.metrics.pageLoads.shift();
    }

    return load;
  }

  /**
   * Track errors
   */
  trackError(error, context = {}) {
    const err = {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      context
    };

    this.metrics.errors.push(err);
    
    if (this.metrics.errors.length > 500) {
      this.metrics.errors.shift();
    }

    return err;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const now = new Date();
    const oneHourAgo = new Date(now - 3600000);

    // API metrics
    const recentAPICalls = this.metrics.apiCalls.filter(c => c.timestamp > oneHourAgo);
    const avgAPIDuration = recentAPICalls.length > 0
      ? recentAPICalls.reduce((sum, c) => sum + c.duration, 0) / recentAPICalls.length
      : 0;
    const apiErrorRate = recentAPICalls.length > 0
      ? recentAPICalls.filter(c => c.isError).length / recentAPICalls.length
      : 0;
    const cachedRequests = recentAPICalls.filter(c => c.cached).length;

    // Cache metrics
    const recentCacheOps = this.metrics.cacheOperations.filter(c => c.timestamp > oneHourAgo);
    const cacheHitRate = recentCacheOps.length > 0
      ? recentCacheOps.filter(c => c.hit).length / recentCacheOps.length
      : 0;
    const avgCacheDuration = recentCacheOps.length > 0
      ? recentCacheOps.reduce((sum, c) => sum + c.duration, 0) / recentCacheOps.length
      : 0;

    // Page load metrics
    const recentPageLoads = this.metrics.pageLoads.filter(p => p.timestamp > oneHourAgo);
    const avgPageLoadTime = recentPageLoads.length > 0
      ? recentPageLoads.reduce((sum, p) => sum + p.loadTime, 0) / recentPageLoads.length
      : 0;

    // Error metrics
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > oneHourAgo);

    return {
      timestamp: now,
      period: 'last-hour',
      api: {
        totalCalls: recentAPICalls.length,
        avgDuration: avgAPIDuration.toFixed(2),
        errorRate: (apiErrorRate * 100).toFixed(2) + '%',
        cachedRequests: cachedRequests,
        slowRequests: recentAPICalls.filter(c => c.isSlow).length
      },
      cache: {
        operations: recentCacheOps.length,
        hitRate: (cacheHitRate * 100).toFixed(2) + '%',
        avgDuration: avgCacheDuration.toFixed(2),
        slowOps: recentCacheOps.filter(c => c.isSlow).length
      },
      pageLoads: {
        count: recentPageLoads.length,
        avgLoadTime: avgPageLoadTime.toFixed(2),
        slowLoads: recentPageLoads.filter(p => p.slow).length
      },
      errors: {
        count: recentErrors.length,
        unique: new Set(recentErrors.map(e => e.message)).size
      },
      health: this.calculateHealth(apiErrorRate, cacheHitRate, avgPageLoadTime)
    };
  }

  /**
   * Calculate overall system health
   */
  calculateHealth(errorRate, cacheHitRate, pageLoadTime) {
    let health = 100;

    // Deduct for errors
    if (errorRate > 0.1) health -= 30;
    else if (errorRate > 0.05) health -= 15;
    else if (errorRate > 0) health -= 5;

    // Deduct for low cache hit rate
    if (cacheHitRate < 0.5) health -= 20;
    else if (cacheHitRate < 0.7) health -= 10;

    // Deduct for slow page loads
    if (pageLoadTime > 5000) health -= 20;
    else if (pageLoadTime > 3000) health -= 10;

    return Math.max(0, Math.min(100, health));
  }

  /**
   * Get top slow API routes
   */
  getSlowRoutes(limit = 10) {
    return this.metrics.apiCalls
      .filter(c => c.isSlow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(c => ({
        route: c.route,
        method: c.method,
        duration: c.duration,
        cached: c.cached
      }));
  }

  /**
   * Get cache effectiveness report
   */
  getCacheReport() {
    const hits = this.metrics.cacheOperations.filter(c => c.hit).length;
    const misses = this.metrics.cacheOperations.filter(c => !c.hit).length;
    const total = hits + misses;

    return {
      totalOperations: total,
      hits: hits,
      misses: misses,
      hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : 'N/A',
      avgHitDuration: this.metrics.cacheOperations
        .filter(c => c.hit)
        .reduce((sum, c) => sum + c.duration, 0) / Math.max(1, hits),
      avgMissDuration: this.metrics.cacheOperations
        .filter(c => !c.hit)
        .reduce((sum, c) => sum + c.duration, 0) / Math.max(1, misses)
    };
  }
}

// Create singleton
const monitor = new PerformanceMonitor();

module.exports = { PerformanceMonitor, monitor };
