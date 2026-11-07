/**
 * Cache Optimization Module
 * Strategies for improving cache hit rates and performance
 */

class CacheOptimizer {
  constructor(cacheService) {
    this.cache = cacheService;
    this.stats = {
      optimizations: 0,
      hitRateImprovement: 0,
      responseTimeReduction: 0
    };
  }

  /**
   * Warm cache with popular items
   */
  async warmCache(products) {
    console.log(`[CACHE-OPT] 🔥 Warming cache with ${products.length} items...`);
    
    const warmData = {};
    for (const product of products) {
      warmData[`product:${product.id}`] = product;
      warmData[`product:${product.id}:details`] = {
        ...product,
        reviews: [],
        inventory: { stock: Math.floor(Math.random() * 100) }
      };
    }

    const success = await this.cache.warmCache(warmData, 3600);
    if (success) {
      console.log(`[CACHE-OPT] ✅ Cache warmed successfully`);
      this.stats.optimizations++;
    }
    return success;
  }

  /**
   * Optimize TTL based on product popularity
   */
  optimizeTTL(productId, accessCount) {
    // Popular items: longer TTL (1 hour)
    // Medium items: medium TTL (30 mins)
    // Unpopular items: short TTL (5 mins)
    
    if (accessCount > 100) return 3600;      // 1 hour
    if (accessCount > 50) return 1800;       // 30 mins
    if (accessCount > 10) return 600;        // 10 mins
    return 300;                               // 5 mins
  }

  /**
   * Smart cache invalidation based on patterns
   */
  async smartInvalidate(category, subcategory = null) {
    let pattern;
    
    if (subcategory) {
      pattern = `product:${category}:${subcategory}:*`;
    } else {
      pattern = `product:${category}:*`;
    }

    const deleted = await this.cache.invalidatePattern(pattern);
    console.log(`[CACHE-OPT] 🗑️  Smart invalidation: ${deleted} items`);
    return deleted;
  }

  /**
   * Analyze cache performance
   */
  analyzePerformance() {
    const stats = this.cache.getStats();
    const hitRate = Number.parseFloat(stats.hitRate);
    
    let efficiency;
    if (hitRate > 70) {
      efficiency = '✅ EXCELLENT';
    } else if (hitRate > 50) {
      efficiency = '⚠️  GOOD';
    } else {
      efficiency = '❌ POOR';
    }
    
    return {
      hitRate: hitRate,
      totalRequests: stats.gets,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      efficiency: efficiency,
      recommendation: this.getRecommendation(hitRate)
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendation(hitRate) {
    if (hitRate > 80) return 'Hit rate excellent, maintain current strategy';
    if (hitRate > 60) return 'Increase TTL values or warm cache more';
    if (hitRate > 40) return 'Implement cache warming for popular items';
    return 'Review cache strategy, consider pattern invalidation';
  }

  /**
   * Get performance improvement metrics
   */
  getMetrics() {
    return {
      optimizationsApplied: this.stats.optimizations,
      estimatedImprovement: `${Math.min(50, this.stats.optimizations * 5)}%`,
      cacheStatus: this.analyzePerformance()
    };
  }
}

module.exports = CacheOptimizer;
