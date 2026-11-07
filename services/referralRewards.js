const User = require('../model/user');
const Sale = require('../model/sales');
const Setting = require('../model/setting');

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function getSettingValue(key, defaultValue) {
  const setting = await Setting.findOne({ key });
  if (!setting || setting.value === undefined || setting.value === null) {
    return defaultValue;
  }
  return setting.value;
}

async function loadRewardSettings() {
  return {
    referralSignupMilestoneThreshold: toNumber(
      await getSettingValue('referralSignupMilestoneThreshold', 5),
      5
    ),
    referralSignupMilestoneRewardAmount: toNumber(
      await getSettingValue('referralSignupMilestoneRewardAmount', 1500),
      1500
    ),
    referralPurchaseRewardAmount: toNumber(
      await getSettingValue('referralPurchaseRewardAmount', 500),
      500
    ),
    referralPurchaseRewardLimit: toNumber(
      await getSettingValue('referralPurchaseRewardLimit', 2),
      2
    ),
    ownPurchaseRewardAmount: toNumber(
      await getSettingValue('ownPurchaseRewardAmount', 250),
      250
    ),
  };
}

async function awardUserCredit(
  userId,
  amount,
  type,
  reason,
  sourceUserId = null,
  relatedSaleId = null
) {
  if (!userId || !amount || Number(amount) <= 0) {
    return null;
  }

  const historyEntry = {
    type,
    amount,
    reason: String(reason || '').trim(),
    sourceUser: sourceUserId || null,
    relatedSale: relatedSaleId || null,
    awardedAt: new Date(),
  };

  const update = {
    $inc: { storeCredit: Number(amount) },
    $push: { rewardHistory: historyEntry },
  };

  if (type === 'referral_purchase') {
    update.$inc.referredPurchaseRewards = 1;
  }
  if (type === 'purchase') {
    update.$inc.ownPurchaseRewards = 1;
  }

  return await User.findByIdAndUpdate(userId, update, { new: true });
}

async function applyReferralMilestoneReward(referrerId, referralCount, settings) {
  if (!referrerId || !settings) {
    return null;
  }

  if (
    settings.referralSignupMilestoneThreshold <= 0 ||
    settings.referralSignupMilestoneRewardAmount <= 0
  ) {
    return null;
  }

  const referrer = await User.findById(referrerId);
  if (!referrer) {
    return null;
  }

  const currentCount =
    referralCount !== undefined && referralCount !== null
      ? referralCount
      : referrer.referralCount || 0;
  const rewardedCount = referrer.referralMilestoneRewardedCount || 0;

  const eligibleMilestones = Math.floor(
    currentCount / settings.referralSignupMilestoneThreshold
  );
  const rewardedMilestones = Math.floor(
    rewardedCount / settings.referralSignupMilestoneThreshold
  );
  const dueMilestones = eligibleMilestones - rewardedMilestones;

  if (dueMilestones <= 0) {
    return null;
  }

  const totalAmount =
    dueMilestones * settings.referralSignupMilestoneRewardAmount;
  const newRewardedCount =
    rewardedMilestones * settings.referralSignupMilestoneThreshold +
    dueMilestones * settings.referralSignupMilestoneThreshold;

  return await User.findByIdAndUpdate(
    referrerId,
    {
      $inc: { storeCredit: totalAmount },
      $set: { referralMilestoneRewardedCount: newRewardedCount },
      $push: {
        rewardHistory: {
          type: 'milestone',
          amount: totalAmount,
          reason: `Referral milestone reward for ${newRewardedCount} referred users`,
          sourceUser: null,
          relatedSale: null,
          awardedAt: new Date(),
        },
      },
    },
    { new: true }
  );
}

async function processSaleRewards(sale) {
  if (!sale || sale.rewardsApplied) {
    return null;
  }

  const settings = await loadRewardSettings();
  if (!settings) {
    return null;
  }

  let purchaser = null;
  if (sale.userId) {
    purchaser = await User.findById(sale.userId);
  }

  if (!purchaser && sale.email) {
    purchaser = await User.findOne({ email: String(sale.email || '').toLowerCase() });
  }

  if (!purchaser) {
    console.log(
      '[REFERRAL-REWARD] No purchaser user record found for sale',
      sale.reference
    );
    return null;
  }

  if (settings.ownPurchaseRewardAmount > 0) {
    await awardUserCredit(
      purchaser._id,
      settings.ownPurchaseRewardAmount,
      'purchase',
      'Own purchase reward',
      null,
      sale._id
    );
  }

  if (
    purchaser.referredBy &&
    settings.referralPurchaseRewardAmount > 0
  ) {
    const previousPaidCount = await Sale.countDocuments({
      userId: purchaser._id,
      status: 'paid',
      _id: { $ne: sale._id },
    });

    const limit = settings.referralPurchaseRewardLimit;
    const canRewardPurchase =
      !limit || limit < 1 || previousPaidCount < limit;

    if (canRewardPurchase) {
      const referrer = await User.findById(purchaser.referredBy);
      if (referrer) {
        await awardUserCredit(
          referrer._id,
          settings.referralPurchaseRewardAmount,
          'referral_purchase',
          `Referral purchase reward for ${purchaser.email}`,
          purchaser._id,
          sale._id
        );
      }
    }
  }

  await Sale.findByIdAndUpdate(sale._id, { $set: { rewardsApplied: true } });
  return true;
}

module.exports = {
  getSettingValue,
  loadRewardSettings,
  awardUserCredit,
  applyReferralMilestoneReward,
  processSaleRewards,
};
