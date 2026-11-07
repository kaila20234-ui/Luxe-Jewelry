/**
 * Session Cache Middleware
 * Stores and retrieves user sessions from Redis for fast access
 * 
 * Features:
 * - Session storage with TTL
 * - User session retrieval
 * - Session invalidation
 * - Middleware integration
 * - Session refresh
 */

const cacheService = require('../services/cacheService');

const sessionCache = {
  /**
   * Store user session in Redis
   * @param {string} userId - User ID
   * @param {object} sessionData - Session data to store
   * @param {number} ttl - Time to live in seconds (default: 86400 = 24 hours)
   * @returns {Promise<boolean>}
   */
  async storeSession(userId, sessionData, ttl = 86400) {
    const key = `session:${userId}`;
    const success = await cacheService.set(key, sessionData, ttl);
    if (success) {
      console.log(`[SESSION] ✅ Session stored for user ${userId}`);
    }
    return success;
  },

  /**
   * Retrieve user session from Redis
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} - Session data or null if not found
   */
  async getSession(userId) {
    const key = `session:${userId}`;
    const session = await cacheService.get(key);
    if (session) {
      console.log(`[SESSION] ✅ Session retrieved for user ${userId}`);
    }
    return session;
  },

  /**
   * Invalidate/delete user session
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async invalidateSession(userId) {
    const key = `session:${userId}`;
    const success = await cacheService.delete(key);
    if (success) {
      console.log(`[SESSION] ✅ Session invalidated for user ${userId}`);
    }
    return success;
  },

  /**
   * Refresh session TTL
   * @param {string} userId - User ID
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>}
   */
  async refreshSession(userId, ttl = 86400) {
    const key = `session:${userId}`;
    const success = await cacheService.setTTL(key, ttl);
    if (success) {
      console.log(`[SESSION] ✅ Session refreshed for user ${userId}`);
    }
    return success;
  },

  /**
   * Check if session exists
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasSession(userId) {
    const key = `session:${userId}`;
    return await cacheService.exists(key);
  },

  /**
   * Invalidate all sessions matching pattern
   * @param {string} pattern - Pattern to match (e.g., "session:*")
   * @returns {Promise<number>} - Number of sessions invalidated
   */
  async invalidateAllSessions(pattern = 'session:*') {
    const count = await cacheService.invalidatePattern(pattern);
    console.log(`[SESSION] ✅ Invalidated ${count} sessions`);
    return count;
  },

  /**
   * Express middleware to check and load session
   * Usage: app.use(sessionCache.middleware)
   */
  middleware: async (req, res, next) => {
    try {
      if (req.user?.id) {
        const session = await sessionCache.getSession(req.user.id);
        if (session) {
          req.session = session;
          // Refresh session TTL on each request
          await sessionCache.refreshSession(req.user.id);
        }
      }
      next();
    } catch (err) {
      console.error('[SESSION] Middleware error:', err.message);
      next(); // Continue even if session caching fails
    }
  },

  /**
   * Middleware to store session on login
   * Usage: app.post('/login', sessionCache.storeSessionMiddleware, ...)
   */
  storeSessionMiddleware: async (req, res, next) => {
    try {
      if (req.user?.id) {
        const sessionData = {
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          loginTime: new Date(),
          lastActivity: new Date()
        };
        await sessionCache.storeSession(req.user.id, sessionData);
      }
      next();
    } catch (err) {
      console.error('[SESSION] Store middleware error:', err.message);
      next(); // Continue even if session caching fails
    }
  },

  /**
   * Middleware to update session activity
   * Usage: app.use(sessionCache.updateActivityMiddleware)
   */
  updateActivityMiddleware: async (req, res, next) => {
    try {
      if (req.user?.id) {
        const session = await sessionCache.getSession(req.user.id);
        if (session) {
          session.lastActivity = new Date();
          await sessionCache.storeSession(req.user.id, session);
        }
      }
      next();
    } catch (err) {
      console.error('[SESSION] Update activity error:', err.message);
      next();
    }
  },

  /**
   * Middleware to invalidate session on logout
   * Usage: app.post('/logout', sessionCache.invalidateSessionMiddleware, ...)
   */
  invalidateSessionMiddleware: async (req, res, next) => {
    try {
      if (req.user?.id) {
        await sessionCache.invalidateSession(req.user.id);
      }
      next();
    } catch (err) {
      console.error('[SESSION] Invalidate middleware error:', err.message);
      next();
    }
  }
};

module.exports = sessionCache;
