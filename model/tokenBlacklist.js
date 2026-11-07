const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['logout', 'refresh', 'password_change', 'security_revoke'],
    default: 'logout'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
