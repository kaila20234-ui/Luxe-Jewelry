jest.mock('redis', () => ({
  createClient: jest.fn(() => {
    const client = {
      handlers: {},
      isOpen: false,
      on: jest.fn(function addHandler(event, handler) {
        this.handlers[event] = handler;
      }),
      connect: jest.fn().mockResolvedValue(undefined)
    };
    return client;
  })
}));

const cacheService = require('../services/cacheService');

describe('Cache service behavior', () => {
  let originalClient;
  let originalConnectionState;
  let client;

  beforeEach(() => {
    originalClient = cacheService.client;
    originalConnectionState = cacheService.isConnected;
    client = {
      isOpen: false,
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      flushDb: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn()
    };
    cacheService.client = client;
    cacheService.isConnected = true;
    cacheService.stats = {
      hits: 0,
      misses: 0,
      gets: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cacheService.client = originalClient;
    cacheService.isConnected = originalConnectionState;
    jest.restoreAllMocks();
  });

  it('reads and parses cached values and tracks misses and invalid values', async () => {
    client.get.mockResolvedValueOnce('{"value":1}').mockResolvedValueOnce(null).mockResolvedValueOnce('{');

    await expect(cacheService.get('hit')).resolves.toEqual({ value: 1 });
    await expect(cacheService.get('missing')).resolves.toBeNull();
    await expect(cacheService.get('invalid')).resolves.toBeNull();
    expect(cacheService.stats).toMatchObject({ hits: 1, misses: 2, gets: 3 });

    client.get.mockRejectedValueOnce(new Error('redis error'));
    await expect(cacheService.get('error')).resolves.toBeNull();
    expect(cacheService.stats.errors).toBe(1);

    cacheService.isConnected = false;
    await expect(cacheService.get('offline')).resolves.toBeNull();
    expect(cacheService.stats.misses).toBe(3);
  });

  it('writes values with and without TTL and reports failures', async () => {
    await expect(cacheService.set('ttl', { value: 1 })).resolves.toBe(true);
    expect(client.setEx).toHaveBeenCalledWith('ttl', 3600, '{"value":1}');

    await expect(cacheService.set('persistent', 'value', 0)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith('persistent', '"value"');

    client.setEx.mockRejectedValueOnce(new Error('write failed'));
    await expect(cacheService.set('error', 1)).resolves.toBe(false);
    const circular = {};
    circular.self = circular;
    await expect(cacheService.set('circular', circular)).resolves.toBe(false);

    cacheService.isConnected = false;
    await expect(cacheService.set('offline', 1)).resolves.toBe(false);
    expect(cacheService.stats.sets).toBe(5);
  });

  it('deletes and clears cache entries with safe failure results', async () => {
    client.del.mockResolvedValue(1);
    client.flushDb.mockResolvedValue('OK');
    await expect(cacheService.delete('key')).resolves.toBe(true);
    await expect(cacheService.clear()).resolves.toBe(true);

    client.del.mockRejectedValueOnce(new Error('delete failed'));
    client.flushDb.mockRejectedValueOnce(new Error('clear failed'));
    await expect(cacheService.delete('key')).resolves.toBe(false);
    await expect(cacheService.clear()).resolves.toBe(false);

    cacheService.isConnected = false;
    await expect(cacheService.delete('offline')).resolves.toBe(false);
    await expect(cacheService.clear()).resolves.toBe(false);
  });

  it('computes and caches misses, and returns cached results without recomputing', async () => {
    const compute = jest.fn().mockResolvedValue({ computed: true });
    client.get.mockResolvedValueOnce('{"cached":true}').mockResolvedValueOnce(null);

    await expect(cacheService.getOrSet('hit', compute)).resolves.toEqual({ cached: true });
    expect(compute).not.toHaveBeenCalled();

    await expect(cacheService.getOrSet('miss', compute, 30)).resolves.toEqual({ computed: true });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(client.setEx).toHaveBeenCalledWith('miss', 30, '{"computed":true}');

    await expect(
      cacheService.getOrSet('failed', () => {
        throw new Error('compute failed');
      })
    ).resolves.toBeNull();
  });

  it('handles bulk operations and reports aggregate write status', async () => {
    await expect(cacheService.mset({ first: 1, second: 2 }, 20)).resolves.toBe(true);
    expect(client.setEx).toHaveBeenCalledTimes(2);

    client.setEx.mockRejectedValueOnce(new Error('write failed'));
    await expect(cacheService.mset({ failed: 1 })).resolves.toBe(false);
    await expect(cacheService.mset(null)).resolves.toBe(false);

    client.get.mockResolvedValueOnce('1').mockResolvedValueOnce(null);
    await expect(cacheService.mget(['first', 'missing'])).resolves.toEqual({
      first: 1,
      missing: null
    });
    await expect(cacheService.mget(null)).resolves.toEqual({});
  });

  it('invalidates matching keys and handles empty and failed queries', async () => {
    client.keys.mockResolvedValueOnce([]);
    await expect(cacheService.invalidatePattern('empty:*')).resolves.toBe(0);

    client.keys.mockResolvedValueOnce(['one', 'two']);
    client.del.mockResolvedValue(1);
    await expect(cacheService.invalidatePattern('match:*')).resolves.toBe(2);
    expect(client.del).toHaveBeenCalledWith('one');
    expect(client.del).toHaveBeenCalledWith('two');

    client.keys.mockRejectedValueOnce(new Error('query failed'));
    await expect(cacheService.invalidatePattern('failed:*')).resolves.toBe(0);
    cacheService.isConnected = false;
    await expect(cacheService.invalidatePattern('offline:*')).resolves.toBe(0);
  });

  it('checks key existence and updates key TTLs', async () => {
    client.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockRejectedValueOnce(new Error('failed'));
    await expect(cacheService.exists('yes')).resolves.toBe(true);
    await expect(cacheService.exists('no')).resolves.toBe(false);
    await expect(cacheService.exists('error')).resolves.toBe(false);

    client.expire.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockRejectedValueOnce(new Error('failed'));
    await expect(cacheService.setTTL('yes', 30)).resolves.toBe(true);
    await expect(cacheService.setTTL('no', 30)).resolves.toBe(false);
    await expect(cacheService.setTTL('error', 30)).resolves.toBe(false);

    cacheService.isConnected = false;
    await expect(cacheService.exists('offline')).resolves.toBe(false);
    await expect(cacheService.setTTL('offline', 30)).resolves.toBe(false);
  });

  it('returns cache statistics with and without read requests', () => {
    expect(cacheService.getStats()).toMatchObject({
      hitRate: '0.00%',
      total: 1,
      isConnected: true
    });

    cacheService.stats = { hits: 3, misses: 1, gets: 4, sets: 0, deletes: 0, errors: 0 };
    expect(cacheService.getStats()).toMatchObject({
      hitRate: '75.00%',
      total: 4
    });
  });

  it('warms the cache only when all bulk writes succeed', async () => {
    const mset = jest.spyOn(cacheService, 'mset').mockResolvedValueOnce(true);
    await expect(cacheService.warmCache({ first: 1 }, 10)).resolves.toBe(true);
    expect(mset).toHaveBeenCalledWith({ first: 1 }, 10);

    mset.mockResolvedValueOnce(false);
    await expect(cacheService.warmCache({ first: 1 })).resolves.toBe(false);

    mset.mockRejectedValueOnce(new Error('warm failed'));
    await expect(cacheService.warmCache({ first: 1 })).resolves.toBe(false);
  });

  it('connects, closes, and handles Redis connection errors', async () => {
    client.isOpen = true;
    await cacheService.connect();
    expect(cacheService.isConnected).toBe(true);

    client.isOpen = false;
    client.connect.mockResolvedValueOnce(undefined);
    await cacheService.connect();
    expect(cacheService.isConnected).toBe(true);

    client.isOpen = true;
    client.quit.mockResolvedValueOnce(undefined);
    await cacheService.close();
    expect(cacheService.isConnected).toBe(false);

    cacheService.isConnected = true;
    client.isOpen = false;
    client.connect.mockRejectedValueOnce(new Error('offline'));
    await cacheService.connect();
    expect(cacheService.isConnected).toBe(false);
    expect(cacheService.stats.errors).toBe(1);

    client.isOpen = true;
    client.quit.mockRejectedValueOnce(new Error('close failed'));
    await cacheService.close();

    cacheService.client = null;
    await cacheService.close();
  });

  it('updates connection state through registered Redis events', () => {
    const eventClient = originalClient;
    const errorHandler = eventClient.handlers.error;
    const readyHandler = eventClient.handlers.ready;
    const connectHandler = eventClient.handlers.connect;

    errorHandler(new Error('event error'));
    readyHandler();
    connectHandler();
    connectHandler();

    expect(cacheService.stats.errors).toBe(1);
    expect(cacheService.isConnected).toBe(true);
    expect(cacheService.errorLogged).toBe(true);
    expect(console.log.mock.calls.filter(([message]) =>
      message === '[CACHE]  Redis connection established'
    )).toHaveLength(1);
  });
});
