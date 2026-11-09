const { registerServiceWorker, SW_CODE } = require('../services/serviceWorker');

describe('Service worker support', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves the generated worker script and registration metadata', () => {
    const handlers = {};
    const app = {
      get: jest.fn((path, handler) => {
        handlers[path] = handler;
      })
    };
    const response = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});

    registerServiceWorker(app);

    expect(app.get).toHaveBeenCalledTimes(2);
    handlers['/service-worker.js']({}, response);
    expect(response.type).toHaveBeenCalledWith('application/javascript');
    expect(response.send).toHaveBeenCalledWith(SW_CODE);

    handlers['/api/sw-register']({}, response);
    expect(response.json).toHaveBeenCalledWith({
      registered: true,
      message: 'Service Worker registration available',
      features: ['offline-support', 'push-notifications', 'background-sync', 'cache-strategies']
    });

    expect(SW_CODE).toContain("self.addEventListener('install'");
    expect(SW_CODE).toContain("self.addEventListener('fetch'");
    expect(SW_CODE).toContain('async function syncCart()');

  });
});
