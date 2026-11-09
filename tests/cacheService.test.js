/**
 * Cache Service - Structural Tests
 * Validates cache infrastructure without requiring Redis connection
 */

const cacheService = require('../services/cacheService');
const sessionCache = require('../middleware/sessionCache');

describe('Cache Service Structure', () => {
  it('should have all required methods', () => {
    expect(typeof cacheService.get).toBe('function');
    expect(typeof cacheService.set).toBe('function');
    expect(typeof cacheService.delete).toBe('function');
    expect(typeof cacheService.clear).toBe('function');
    expect(typeof cacheService.getOrSet).toBe('function');
    expect(typeof cacheService.invalidatePattern).toBe('function');
    expect(typeof cacheService.exists).toBe('function');
    expect(typeof cacheService.setTTL).toBe('function');
    expect(typeof cacheService.getStats).toBe('function');
    expect(typeof cacheService.mset).toBe('function');
    expect(typeof cacheService.mget).toBe('function');
  });

  it('should initialize statistics', () => {
    const stats = cacheService.getStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('gets');
    expect(stats).toHaveProperty('sets');
    expect(stats).toHaveProperty('deletes');
    expect(stats).toHaveProperty('errors');
  });
});

describe('Cache Service without Redis', () => {
  const originalClient = cacheService.client;
  const originalConnectionState = cacheService.isConnected;
  const clientMethods = ['del', 'flushDb', 'keys', 'exists', 'expire'];

  beforeEach(() => {
    cacheService.isConnected = false;
    cacheService.client = Object.fromEntries(
      clientMethods.map((method) => [method, jest.fn()])
    );
  });

  afterEach(() => {
    cacheService.client = originalClient;
    cacheService.isConnected = originalConnectionState;
  });

  it('should fail fast for Redis-only operations when disconnected', async () => {
    expect(await cacheService.delete('key')).toBe(false);
    expect(await cacheService.clear()).toBe(false);
    expect(await cacheService.invalidatePattern('key:*')).toBe(0);
    expect(await cacheService.exists('key')).toBe(false);
    expect(await cacheService.setTTL('key', 60)).toBe(false);

    for (const method of clientMethods) {
      expect(cacheService.client[method]).not.toHaveBeenCalled();
    }
  });

  it('should report bulk writes as unsuccessful when Redis is disconnected', async () => {
    expect(await cacheService.mset({ first: 1, second: 2 })).toBe(false);
    expect(await cacheService.warmCache({ first: 1 })).toBe(false);
  });
});

describe('Session Cache Structure', () => {
  it('should have all required methods', () => {
    expect(typeof sessionCache.storeSession).toBe('function');
    expect(typeof sessionCache.getSession).toBe('function');
    expect(typeof sessionCache.invalidateSession).toBe('function');
    expect(typeof sessionCache.refreshSession).toBe('function');
    expect(typeof sessionCache.hasSession).toBe('function');
  });

  it('should have Express middleware functions', () => {
    expect(typeof sessionCache.middleware).toBe('function');
    expect(typeof sessionCache.storeSessionMiddleware).toBe('function');
    expect(typeof sessionCache.updateActivityMiddleware).toBe('function');
    expect(typeof sessionCache.invalidateSessionMiddleware).toBe('function');
  });
});

describe('Cached Routes', () => {
  it('should load cached products routes', () => {
    const routes = require('../routes/cached-products');
    expect(routes).toBeDefined();
  });
});
