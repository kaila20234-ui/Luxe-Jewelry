jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

jest.mock('mongoose', () => ({
  connection: { readyState: 1 }
}));

jest.mock('../model/user', () => ({
  findOne: jest.fn(),
  find: jest.fn()
}));

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../model/user');
const authService = require('../services/authService');

describe('Auth service behavior', () => {
  const envKeys = [
    'SITE_ADMIN_USER',
    'SITE_ADMIN_PASS_HASH',
    'SITE_ADMIN_PASS',
    'ADMIN2_USER',
    'ADMIN2_PASS_HASH',
    'ADMIN2_PASS',
    'ADMIN_USER',
    'ADMIN_PASS_HASH',
    'ADMIN_PASS_PLAIN'
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.readyState = 1;
    for (const key of envKeys) delete process.env[key];
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockUserLookup = (user) => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    });
  };

  it('checks environment usernames, hashed credentials, and plain-text fallback', async () => {
    expect(await authService.validateEnvCredentials('', 'pw', '', '', '')).toBe(false);
    expect(await authService.validateEnvCredentials('other', 'pw', 'admin', '', 'pw')).toBe(false);

    bcrypt.compare.mockResolvedValueOnce(true);
    await expect(
      authService.validateEnvCredentials('admin', 'pw', 'admin', 'hash', 'fallback')
    ).resolves.toBe(true);

    bcrypt.compare.mockResolvedValueOnce(false);
    await expect(
      authService.validateEnvCredentials('admin', 'pw', 'admin', 'hash', 'pw')
    ).resolves.toBe(true);
    await expect(
      authService.validateEnvCredentials('admin', 'bad', 'admin', '', 'pw')
    ).resolves.toBe(false);

    bcrypt.compare.mockRejectedValueOnce(new Error('bcrypt unavailable'));
    await expect(
      authService.validateEnvCredentials('admin', 'pw', 'admin', 'bad-hash', 'pw')
    ).resolves.toBe(false);

    process.env.SITE_ADMIN_USER = ' Admin@Example.com ';
    process.env.SITE_ADMIN_PASS = 'secret';
    await expect(
      authService.validateStaffEnvironmentCredentials(
        'admin@example.com',
        'secret',
        'admin'
      )
    ).resolves.toBe(true);

    process.env.SITE_ADMIN_USER = 'admin';
    await expect(
      authService.validateStaffEnvironmentCredentials(
        'admin@luxejewelry.com',
        'secret',
        'admin'
      )
    ).resolves.toBe(true);
    await expect(
      authService.validateStaffEnvironmentCredentials('manager', 'secret', 'manager')
    ).resolves.toBe(false);
  });

  it('looks up normalized email and username aliases and handles lookup errors', async () => {
    const user = { email: 'admin@example.com' };
    mockUserLookup(user);
    await expect(authService.findUserByEmail(' Admin ')).resolves.toBe(user);
    expect(User.findOne).toHaveBeenCalledWith({
      email: { $in: ['Admin', 'admin', 'Admin@example.com'] }
    });
    expect(User.findOne.mock.results[0].value.select).toHaveBeenCalledWith('+password');

    await expect(authService.findUserByEmail('')).resolves.toBeNull();
    User.findOne.mockImplementationOnce(() => {
      throw new Error('database unavailable');
    });
    await expect(authService.findUserByEmail('admin@example.com')).rejects.toThrow(
      'database unavailable'
    );
  });

  it('validates database users and rejects missing, wrong-role, and passwordless users', async () => {
    const admin = { email: 'admin@example.com', role: 'admin', password: 'hash' };
    bcrypt.compare.mockResolvedValueOnce(true);
    await expect(authService.validateUserCredentials(admin, 'pw', 'admin')).resolves.toBe(true);
    bcrypt.compare.mockResolvedValueOnce(false);
    await expect(authService.validateUserCredentials(admin, 'pw', 'admin')).resolves.toBe(false);
    await expect(authService.validateUserCredentials(null, 'pw', 'admin')).resolves.toBe(false);
    await expect(authService.validateUserCredentials(admin, 'pw', 'manager')).resolves.toBe(false);
    await expect(
      authService.validateUserCredentials({ ...admin, password: '' }, 'pw', 'admin')
    ).resolves.toBe(false);

    bcrypt.compare.mockRejectedValueOnce(new Error('compare failed'));
    await expect(authService.validateUserCredentials(admin, 'pw', 'admin')).resolves.toBe(false);
  });

  it('returns the first admin or manager and handles empty queries and database errors', async () => {
    const admin = { email: 'admin@example.com' };
    const manager = { email: 'manager@example.com' };
    User.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([admin, {}]) });
    await expect(authService.getSingleAdminFromDB()).resolves.toBe(admin);
    expect(User.find).toHaveBeenCalledWith({ role: 'admin' });

    User.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) });
    await expect(authService.getSingleAdminFromDB()).resolves.toBeNull();

    User.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([manager]) });
    await expect(authService.getSingleManagerFromDB()).resolves.toBe(manager);

    User.find.mockImplementationOnce(() => {
      throw new Error('database unavailable');
    });
    await expect(authService.getSingleManagerFromDB()).resolves.toBeNull();
  });

  it('generates verifiable tokens with username and role claims', () => {
    const jwt = require('jsonwebtoken');
    const token = authService.generateToken('user@example.com', 'manager');
    const payload = jwt.decode(token);
    expect(payload).toMatchObject({ username: 'user@example.com', role: 'manager' });
    expect(payload.exp - payload.iat).toBe(6 * 60 * 60);

    const userToken = authService.generateToken('admin@example.com', 'admin', 'user-id');
    expect(jwt.decode(userToken)).toMatchObject({
      username: 'admin@example.com',
      role: 'admin',
      userId: 'user-id'
    });
  });

  it('authenticates an admin from environment credentials or the database', async () => {
    process.env.SITE_ADMIN_USER = 'admin';
    process.env.SITE_ADMIN_PASS = 'secret';
    mongoose.connection.readyState = 0;
    await expect(
      authService.authenticate('admin@luxejewelry.com', 'secret', 'admin')
    ).resolves.toMatchObject({
      success: true,
      token: expect.any(String)
    });
    expect(User.find).not.toHaveBeenCalled();

    mongoose.connection.readyState = 1;
    User.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) });
    await expect(authService.authenticate('admin', 'secret', 'admin')).resolves.toMatchObject({
      success: true,
      token: expect.any(String)
    });

    const admin = { email: 'db-admin@example.com', role: 'admin', password: 'hash' };
    mockUserLookup(admin);
    bcrypt.compare.mockResolvedValueOnce(true);
    await expect(authService.authenticateAdmin('db-admin@example.com', 'pw')).resolves.toMatchObject({
      success: true,
      token: expect.any(String)
    });

    mockUserLookup(null);
    await expect(authService.authenticateAdmin('missing', 'pw')).resolves.toMatchObject({
      success: false
    });

    mockUserLookup(admin);
    bcrypt.compare.mockResolvedValueOnce(false);
    await expect(authService.authenticateAdmin('db-admin@example.com', 'bad')).resolves.toMatchObject({
      success: false
    });
  });

  it('authenticates a manager from environment credentials or the database', async () => {
    process.env.ADMIN_USER = 'manager';
    process.env.ADMIN_PASS_PLAIN = 'secret';
    User.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValue([]) });
    await expect(authService.authenticate('manager', 'secret', 'manager')).resolves.toMatchObject({
      success: true,
      token: expect.any(String)
    });

    const manager = { email: 'db-manager@example.com', role: 'manager', password: 'hash' };
    mockUserLookup(manager);
    bcrypt.compare.mockResolvedValueOnce(true);
    await expect(authService.authenticateManager('db-manager@example.com', 'pw')).resolves.toMatchObject({
      success: true,
      token: expect.any(String)
    });

    mockUserLookup(null);
    await expect(authService.authenticateManager('missing', 'pw')).resolves.toMatchObject({
      success: false
    });

    mockUserLookup(manager);
    bcrypt.compare.mockResolvedValueOnce(false);
    await expect(authService.authenticateManager('db-manager@example.com', 'bad')).resolves.toMatchObject({
      success: false
    });
  });

  it('rejects unsupported roles and reports unimplemented customer authentication', async () => {
    await expect(authService.authenticate('user', 'pw', 'unknown')).resolves.toEqual({
      success: false,
      message: 'Invalid role'
    });
    await expect(authService.authenticate('user', 'pw', 'customer')).resolves.toEqual({
      success: false,
      message: 'Customer auth not implemented in this service'
    });
  });
});
