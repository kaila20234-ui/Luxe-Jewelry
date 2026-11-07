const express = require('express');
const User = require('../model/user');
const Setting = require('../model/setting');
const { authenticateJWT, verifyAdminRole, sanitize } = require('./coupon-auth-middleware');
const referralService = require('../services/referralRewards');

const router = express.Router();

// All endpoints require admin/manager
router.use(authenticateJWT);
router.use(verifyAdminRole);

// GET / - basic stats & settings
router.get('/stats', async (req, res) => {
  try {
    const settings = await referralService.loadRewardSettings();
    const totalUsers = await User.countDocuments();
    const totalReferrers = await User.countDocuments({ referralCount: { $gt: 0 } });
    const topReferrers = await User.find({ referralCount: { $gt: 0 } })
      .select('name email referralCode referralCount storeCredit')
      .sort({ referralCount: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, settings, totalUsers, totalReferrers, topReferrers });
  } catch (err) {
    console.error('[ADMIN-REFERRALS] /stats error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /users - paginated list of users with referral info
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50')));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.hasReferral === 'true') filter.referralCount = { $gt: 0 };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('name email referralCode referralCount referredBy referrals storeCredit createdAt')
      .sort({ referralCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ success: true, users, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[ADMIN-REFERRALS] /users error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /settings - update referral reward settings
router.put('/settings', async (req, res) => {
  try {
    const allowed = [
      'referralSignupMilestoneThreshold',
      'referralSignupMilestoneRewardAmount',
      'referralPurchaseRewardAmount',
      'referralPurchaseRewardLimit',
      'ownPurchaseRewardAmount'
    ];

    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings provided' });
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate({ key }, { $set: { value, updatedAt: new Date() } }, { upsert: true });
    }

    const newSettings = await referralService.loadRewardSettings();
    res.json({ success: true, message: 'Settings updated', settings: newSettings });
  } catch (err) {
    console.error('[ADMIN-REFERRALS] /settings error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /award - manually award user credit
router.post('/award', async (req, res) => {
  try {
    const { userId, amount, type = 'manual', reason = 'Admin manual award' } = req.body;
    if (!userId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'userId and positive amount required' });
    }

    const updated = await referralService.awardUserCredit(userId, Number(amount), type, reason, req.userId || null, null);
    if (!updated) return res.status(500).json({ success: false, message: 'Failed to award credit' });
    res.json({ success: true, message: 'Award applied', user: updated });
  } catch (err) {
    console.error('[ADMIN-REFERRALS] /award error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
