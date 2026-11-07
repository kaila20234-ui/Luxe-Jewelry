const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'register',
      'password_change',
      'email_verification',
      'two_factor_enabled',
      'two_factor_disabled',
      'account_locked',
      'account_unlocked',
      'coupon_created',
      'coupon_deleted',
      'product_created',
      'product_updated',
      'product_deleted',
      'order_placed',
      'order_list',
      'order_cancelled',
      'admin_action'
    ]
  },
  resource: {
    type: String,
    required: false
  },
  resourceId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  ipAddress: String,
  userAgent: String,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
