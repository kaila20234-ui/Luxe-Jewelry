const CacheOptimizer = require('../services/cacheOptimizer');
const { PerformanceMonitor, monitor } = require('../services/performanceMonitor');

describe('CacheOptimizer', () => {
  let cache;
  let optimizer;

  beforeEach(() => {
    cache = {
      warmCache: jest.fn().mockResolvedValue(true),
      invalidatePattern: jest.fn().mockResolvedValue(3),
      getStats: jest.fn().mockReturnValue({
        hitRate: '75.5',
        gets: 200,
        hits: 151,
        misses: 49
      })
    };
    optimizer = new CacheOptimizer(cache);
  });

  it('warms product and details entries and counts only successful optimizations', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const products = [{ id: 'p1', name: 'Ring' }];

    await expect(optimizer.warmCache(products)).resolves.toBe(true);

    expect(cache.warmCache).toHaveBeenCalledWith({
      'product:p1': products[0],
      'product:p1:details': {
        id: 'p1',
        name: 'Ring',
        reviews: [],
        inventory: { stock: 25 }
      }
    }, 3600);
    expect(optimizer.getMetrics().optimizationsApplied).toBe(1);

    cache.warmCache.mockResolvedValue(false);
    await expect(optimizer.warmCache([])).resolves.toBe(false);
    expect(optimizer.getMetrics().optimizationsApplied).toBe(1);
    random.mockRestore();
  });

  it('selects TTLs at each popularity boundary', () => {
    expect([101, 100, 51, 50, 11, 10, 0].map(count =>
      optimizer.optimizeTTL('p1', count)
    )).toEqual([3600, 1800, 1800, 600, 600, 300, 300]);
  });

  it('invalidates category and subcategory patterns', async () => {
    await expect(optimizer.smartInvalidate('rings')).resolves.toBe(3);
    await expect(optimizer.smartInvalidate('rings', 'gold')).resolves.toBe(3);
    expect(cache.invalidatePattern.mock.calls).toEqual([
      ['product:rings:*'],
      ['product:rings:gold:*']
    ]);
  });

  it('reports hit-rate efficiency, recommendations, and capped metrics', () => {
    const expected = [
      [90, '✅ EXCELLENT', 'Hit rate excellent, maintain current strategy'],
      [70, '⚠️  GOOD', 'Increase TTL values or warm cache more'],
      [55, '⚠️  GOOD', 'Implement cache warming for popular items'],
      [30, '❌ POOR', 'Review cache strategy, consider pattern invalidation']
    ];

    expected.forEach(([rate, efficiency, recommendation]) => {
      cache.getStats.mockReturnValue({
        hitRate: String(rate), gets: 10, hits: 8, misses: 2
      });
      expect(optimizer.analyzePerformance()).toEqual({
        hitRate: rate,
        totalRequests: 10,
        cacheHits: 8,
        cacheMisses: 2,
        efficiency,
        recommendation
      });
    });

    optimizer.stats.optimizations = 11;
    expect(optimizer.getMetrics()).toEqual({
      optimizationsApplied: 11,
      estimatedImprovement: '50%',
      cacheStatus: expect.objectContaining({ hitRate: 30 })
    });
  });
});

describe('PerformanceMonitor', () => {
  let performance;
  const fixedNow = new Date('2026-11-08T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    performance = new PerformanceMonitor();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exports a monitor singleton and tracks records with threshold flags', () => {
    expect(monitor).toBeInstanceOf(PerformanceMonitor);
    expect(performance.trackAPICall('/items', 'GET', 500, 399).isSlow).toBe(false);
    expect(performance.trackAPICall('/slow', 'POST', 501, 500, true)).toEqual({
      timestamp: fixedNow,
      route: '/slow',
      method: 'POST',
      duration: 501,
      status: 500,
      cached: true,
      isSlow: true,
      isError: true
    });
    expect(performance.trackCacheOperation('get', 10, true).isSlow).toBe(false);
    expect(performance.trackCacheOperation('set', 11, false, 'k').isSlow).toBe(true);
    expect(performance.trackPageLoad('/home', 3000, 4).slow).toBe(false);
    expect(performance.trackPageLoad('/slow', 3001, 8).slow).toBe(true);

    const error = new Error('failed');
    expect(performance.trackError(error, { route: '/items' })).toEqual({
      timestamp: fixedNow,
      message: 'failed',
      stack: error.stack,
      context: { route: '/items' }
    });
  });

  it('summarizes only the last hour and reports API, cache, page, and error metrics', () => {
    jest.setSystemTime(new Date(fixedNow.getTime() - 3600001));
    performance.trackAPICall('/old', 'GET', 999, 500);
    jest.setSystemTime(fixedNow);
    performance.trackAPICall('/a', 'GET', 100, 200, true);
    performance.trackAPICall('/b', 'POST', 600, 500);
    performance.trackCacheOperation('get', 2, true);
    performance.trackCacheOperation('get', 6, false);
    performance.trackPageLoad('/home', 1000, 3);
    performance.trackPageLoad('/slow', 4000, 9);
    performance.trackError(new Error('same'));
    performance.trackError(new Error('same'));

    const summary = performance.getSummary();
    expect(summary).toEqual({
      timestamp: fixedNow,
      period: 'last-hour',
      api: {
        totalCalls: 2, avgDuration: '350.00', errorRate: '50.00%',
        cachedRequests: 1, slowRequests: 1
      },
      cache: {
        operations: 2, hitRate: '50.00%', avgDuration: '4.00', slowOps: 0
      },
      pageLoads: { count: 2, avgLoadTime: '2500.00', slowLoads: 1 },
      errors: { count: 2, unique: 1 },
      health: 60
    });
  });

  it('returns zeroed summaries and covers health deduction thresholds', () => {
    expect(performance.getSummary()).toMatchObject({
      api: { totalCalls: 0, avgDuration: '0.00', errorRate: '0.00%' },
      cache: { operations: 0, hitRate: '0.00%', avgDuration: '0.00' },
      pageLoads: { count: 0, avgLoadTime: '0.00' },
      errors: { count: 0, unique: 0 },
      health: 80
    });
    expect(performance.calculateHealth(0, 0.8, 1000)).toBe(100);
    expect(performance.calculateHealth(0.01, 0.6, 3500)).toBe(75);
    expect(performance.calculateHealth(0.06, 0.4, 5001)).toBe(45);
    expect(performance.calculateHealth(0.11, 0.49, 6000)).toBe(30);
  });

  it('sorts slow API routes and reports cache effectiveness including empty data', () => {
    performance.trackAPICall('/quick', 'GET', 500, 200);
    performance.trackAPICall('/slow', 'GET', 900, 200, true);
    performance.trackAPICall('/slower', 'POST', 1200, 503);
    expect(performance.getSlowRoutes(1)).toEqual([
      { route: '/slower', method: 'POST', duration: 1200, cached: false }
    ]);
    expect(performance.getSlowRoutes()).toEqual([
      { route: '/slower', method: 'POST', duration: 1200, cached: false },
      { route: '/slow', method: 'GET', duration: 900, cached: true }
    ]);
    expect(performance.getCacheReport()).toEqual({
      totalOperations: 0,
      hits: 0,
      misses: 0,
      hitRate: 'N/A',
      avgHitDuration: 0,
      avgMissDuration: 0
    });

    performance.trackCacheOperation('get', 2, true);
    performance.trackCacheOperation('set', 8, false);
    performance.trackCacheOperation('get', 4, true);
    expect(performance.getCacheReport()).toEqual({
      totalOperations: 3,
      hits: 2,
      misses: 1,
      hitRate: '66.67%',
      avgHitDuration: 3,
      avgMissDuration: 8
    });
  });

  it('retains only the configured maximum number of records', () => {
    for (let index = 0; index < 1001; index += 1) {
      performance.trackAPICall(`/api/${index}`, 'GET', index, 200);
      performance.trackCacheOperation('get', index, true);
      if (index < 501) {
        performance.trackPageLoad(`/page/${index}`, index, 1);
        performance.trackError(new Error(`error-${index}`));
      }
    }

    expect(performance.metrics.apiCalls).toHaveLength(1000);
    expect(performance.metrics.apiCalls[0].route).toBe('/api/1');
    expect(performance.metrics.cacheOperations).toHaveLength(1000);
    expect(performance.metrics.cacheOperations[0].duration).toBe(1);
    expect(performance.metrics.pageLoads).toHaveLength(500);
    expect(performance.metrics.pageLoads[0].path).toBe('/page/1');
    expect(performance.metrics.errors).toHaveLength(500);
    expect(performance.metrics.errors[0].message).toBe('error-1');
  });
});
