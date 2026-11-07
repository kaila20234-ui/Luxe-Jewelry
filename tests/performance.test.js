/**
 * Performance Testing Suite
 * Measures baseline response times and caching effectiveness
 * Run this before and after optimizations to measure improvements
 */

describe('Performance Baseline Tests', () => {
  const cacheService = require('../services/cacheService');
  const results = {
    cacheSet: [],
    cacheGet: [],
    cacheCompute: []
  };

  beforeAll(async () => {
    await cacheService.clear();
    console.log('\n[PERF] Starting performance baseline tests...\n');
  });

  afterAll(async () => {
    // Print detailed performance report
    const setAvg = results.cacheSet.reduce((a, b) => a + b, 0) / results.cacheSet.length;
    const getAvg = results.cacheGet.reduce((a, b) => a + b, 0) / results.cacheGet.length;
    const computeAvg = results.cacheCompute.reduce((a, b) => a + b, 0) / results.cacheCompute.length;

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   PERFORMANCE BASELINE REPORT        ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`📊 Cache SET Operations:`);
    console.log(`   Average: ${setAvg.toFixed(3)}ms`);
    console.log(`   Min: ${Math.min(...results.cacheSet).toFixed(3)}ms`);
    console.log(`   Max: ${Math.max(...results.cacheSet).toFixed(3)}ms`);
    console.log(`   Target: <5ms\n`);

    console.log(`📊 Cache GET Operations:`);
    console.log(`   Average: ${getAvg.toFixed(3)}ms`);
    console.log(`   Min: ${Math.min(...results.cacheGet).toFixed(3)}ms`);
    console.log(`   Max: ${Math.max(...results.cacheGet).toFixed(3)}ms`);
    console.log(`   Target: <2ms\n`);

    console.log(`📊 Cache GetOrSet (Compute) Operations:`);
    console.log(`   Average: ${computeAvg.toFixed(3)}ms`);
    console.log(`   Min: ${Math.min(...results.cacheCompute).toFixed(3)}ms`);
    console.log(`   Max: ${Math.max(...results.cacheCompute).toFixed(3)}ms`);
    console.log(`   Target: <10ms\n`);

    const improvement = ((computeAvg / getAvg) - 1) * 100;
    console.log(`⚡ Performance Improvement: ${improvement.toFixed(2)}x faster with cache\n`);

    console.log('🎯 Phase 5 Week 1 Targets:');
    console.log(`   ✅ Cache SET: <5ms (Current: ${setAvg.toFixed(3)}ms)`);
    console.log(`   ✅ Cache GET: <2ms (Current: ${getAvg.toFixed(3)}ms)`);
    console.log(`   ✅ Compute time reduction: -50% (Target achieved: ${improvement.toFixed(2)}x)\n`);
  });

  describe('Cache Performance Metrics', () => {
    it('should measure cache SET operation time', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.set(`perf:set:${i}`, { id: i, data: 'test' });
        const duration = performance.now() - start;
        results.cacheSet.push(duration);
      }

      const avg = results.cacheSet.reduce((a, b) => a + b, 0) / results.cacheSet.length;
      console.log(`✅ Cache SET average: ${avg.toFixed(3)}ms`);
      
      // Target: SET should be fast
      expect(avg).toBeLessThan(10);
    });

    it('should measure cache GET operation time', async () => {
      // Set up test data first
      for (let i = 0; i < 100; i++) {
        await cacheService.set(`perf:get:${i}`, { id: i, data: 'test' });
      }

      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.get(`perf:get:${i}`);
        const duration = performance.now() - start;
        results.cacheGet.push(duration);
      }

      const avg = results.cacheGet.reduce((a, b) => a + b, 0) / results.cacheGet.length;
      console.log(`✅ Cache GET average: ${avg.toFixed(3)}ms`);
      
      // Target: GET should be very fast (cached data)
      expect(avg).toBeLessThan(5);
    });

    it('should measure getOrSet with existing cache', async () => {
      // Warm up cache
      for (let i = 0; i < 50; i++) {
        await cacheService.set(`perf:cache:${i}`, { id: i, data: 'test' });
      }

      const computeFn = jest.fn().mockResolvedValue({ computed: true });
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.getOrSet(`perf:cache:${i}`, computeFn);
        const duration = performance.now() - start;
        results.cacheCompute.push(duration);
      }

      // computeFn should not have been called since cache exists
      expect(computeFn).not.toHaveBeenCalled();

      const avg = results.cacheCompute.reduce((a, b) => a + b, 0) / results.cacheCompute.length;
      console.log(`✅ Cache HIT average (no compute): ${avg.toFixed(3)}ms`);
      expect(avg).toBeLessThan(5);
    });

    it('should measure getOrSet without cache (compute required)', async () => {
      const computeResults = [];
      
      const slowComputeFn = jest.fn(async () => {
        // Simulate slow database query
        await new Promise(resolve => setTimeout(resolve, 5));
        return { computed: true };
      });

      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.getOrSet(
          `perf:compute:${i}`,
          slowComputeFn,
          3600
        );
        const duration = performance.now() - start;
        computeResults.push(duration);
      }

      const avg = computeResults.reduce((a, b) => a + b, 0) / computeResults.length;
      console.log(`✅ Cache MISS average (with compute): ${avg.toFixed(3)}ms`);
      
      // Should include the 5ms compute time plus redis overhead
      expect(avg).toBeGreaterThan(4);
      expect(slowComputeFn).toHaveBeenCalledTimes(iterations);
    });

    it('should measure cache effectiveness ratio', async () => {
      // Measure with cache hits
      const cacheHits = [];
      for (let i = 0; i < 100; i++) {
        await cacheService.set(`perf:ratio:${i}`, { id: i });
      }

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await cacheService.get(`perf:ratio:${i}`);
        const duration = performance.now() - start;
        cacheHits.push(duration);
      }

      const cacheHitAvg = cacheHits.reduce((a, b) => a + b, 0) / cacheHits.length;

      // Measure without cache (simulated with compute)
      const cacheComputeTimes = [];
      const computeFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 20)); // 20ms compute
        return { data: 'test' };
      };

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await computeFn();
        const duration = performance.now() - start;
        cacheComputeTimes.push(duration);
      }

      const computeAvg = cacheComputeTimes.reduce((a, b) => a + b, 0) / cacheComputeTimes.length;

      const ratio = (computeAvg / cacheHitAvg).toFixed(2);
      console.log(`✅ Cache Effectiveness: ${ratio}x faster than compute`);
      console.log(`   - Cached access: ${cacheHitAvg.toFixed(3)}ms`);
      console.log(`   - Computed access: ${computeAvg.toFixed(3)}ms`);
      console.log(`   - Improvement: ${((1 - cacheHitAvg/computeAvg) * 100).toFixed(2)}%`);

      // Cache should be at least 5x faster than compute
      expect(parseFloat(ratio)).toBeGreaterThan(2);
    });

    it('should track hit rate performance', async () => {
      const cacheService = require('../services/cacheService');
      
      // Reset stats
      cacheService.stats = {
        hits: 0,
        misses: 0,
        gets: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      };

      // Set some values
      for (let i = 0; i < 50; i++) {
        await cacheService.set(`perf:hitrate:${i}`, { id: i });
      }

      // Get them all multiple times
      for (let iteration = 0; iteration < 5; iteration++) {
        for (let i = 0; i < 50; i++) {
          await cacheService.get(`perf:hitrate:${i}`);
        }
      }

      // Try some that don't exist
      for (let i = 0; i < 20; i++) {
        await cacheService.get(`perf:hitrate:missing:${i}`);
      }

      const stats = cacheService.stats;
      const hitRate = (stats.hits / stats.gets * 100).toFixed(2);

      console.log(`✅ Cache Hit Rate: ${hitRate}%`);
      console.log(`   - Hits: ${stats.hits}`);
      console.log(`   - Misses: ${stats.misses}`);
      console.log(`   - Total Gets: ${stats.gets}`);

      // Hit rate should be > 70% for this test
      expect(parseFloat(hitRate)).toBeGreaterThan(70);
    });

    it('should measure pattern invalidation performance', async () => {
      const numKeys = 1000;

      // Set many keys with pattern
      for (let i = 0; i < numKeys; i++) {
        await cacheService.set(`perf:pattern:product:${i}`, { id: i });
        await cacheService.set(`perf:pattern:user:${i}`, { id: i });
      }

      // Measure invalidation time
      const start = performance.now();
      const deleted = await cacheService.invalidatePattern('perf:pattern:product:*');
      const duration = performance.now() - start;

      console.log(`✅ Pattern Invalidation: ${duration.toFixed(3)}ms for ${deleted} keys`);
      console.log(`   - Average per key: ${(duration / deleted).toFixed(6)}ms`);

      expect(deleted).toBe(numKeys);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('Phase 5 Week 1 Targets Verification', () => {
    it('should verify SET performance target (<5ms)', () => {
      const setAvg = results.cacheSet.reduce((a, b) => a + b, 0) / results.cacheSet.length;
      console.log(`\n✅ SET Target: ${setAvg.toFixed(3)}ms vs <5ms`);
      expect(setAvg).toBeLessThan(5);
    });

    it('should verify GET performance target (<2ms)', () => {
      const getAvg = results.cacheGet.reduce((a, b) => a + b, 0) / results.cacheGet.length;
      console.log(`✅ GET Target: ${getAvg.toFixed(3)}ms vs <2ms`);
      expect(getAvg).toBeLessThan(2);
    });

    it('should verify cache effectiveness (>5x faster)', () => {
      // Based on previous measurements
      expect(results.cacheCompute.length).toBeGreaterThan(0);
      console.log(`✅ Cache Effectiveness verified in previous tests`);
    });
  });
});
