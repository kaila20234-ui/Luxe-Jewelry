jest.mock('../model/user', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../model/sales', () => ({
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../model/setting', () => ({
  findOne: jest.fn(),
}));

const User = require('../model/user');
const Sale = require('../model/sales');
const Setting = require('../model/setting');
const {
  loadRewardSettings,
  awardUserCredit,
  applyReferralMilestoneReward,
  processSaleRewards,
} = require('../services/referralRewards');

const defaultSettings = {
  referralSignupMilestoneThreshold: 5,
  referralSignupMilestoneRewardAmount: 1500,
  referralPurchaseRewardAmount: 500,
  referralPurchaseRewardLimit: 2,
  ownPurchaseRewardAmount: 250,
};

function configureSettings(values) {
  Setting.findOne.mockImplementation(async ({ key }) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? { value: values[key] }
      : null
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  configureSettings({});
});

describe('reward settings', () => {
  test('uses defaults for absent, null, and invalid settings and converts numeric values', async () => {
    configureSettings({
      referralSignupMilestoneThreshold: '3',
      referralSignupMilestoneRewardAmount: null,
      referralPurchaseRewardAmount: 'invalid',
      referralPurchaseRewardLimit: undefined,
      ownPurchaseRewardAmount: '275',
    });

    await expect(loadRewardSettings()).resolves.toEqual({
      ...defaultSettings,
      referralSignupMilestoneThreshold: 3,
      ownPurchaseRewardAmount: 275,
    });
  });
});

describe('user credit awards', () => {
  test('rejects missing users and non-positive or invalid credit amounts', async () => {
    await expect(awardUserCredit(null, 10, 'purchase', 'reason')).resolves.toBeNull();
    await expect(awardUserCredit('user-1', 0, 'purchase', 'reason')).resolves.toBeNull();
    await expect(awardUserCredit('user-1', -1, 'purchase', 'reason')).resolves.toBeNull();
    await expect(awardUserCredit('user-1', '', 'purchase', 'reason')).resolves.toBeNull();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('increments credit and records referral-purchase counters and history', async () => {
    const updatedUser = { _id: 'referrer-1' };
    User.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await expect(
      awardUserCredit(
        'referrer-1',
        '500',
        'referral_purchase',
        '  Purchase reward  ',
        'buyer-1',
        'sale-1'
      )
    ).resolves.toBe(updatedUser);

    const [userId, update, options] = User.findByIdAndUpdate.mock.calls[0];
    expect(userId).toBe('referrer-1');
    expect(update.$inc).toEqual({ storeCredit: 500, referredPurchaseRewards: 1 });
    expect(update.$push.rewardHistory).toMatchObject({
      type: 'referral_purchase',
      amount: '500',
      reason: 'Purchase reward',
      sourceUser: 'buyer-1',
      relatedSale: 'sale-1',
    });
    expect(update.$push.rewardHistory.awardedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ new: true });
  });
});

describe('referral milestone rewards', () => {
  test('rewards newly eligible milestones and advances the rewarded count', async () => {
    User.findById.mockResolvedValue({
      _id: 'referrer-1',
      referralCount: 0,
      referralMilestoneRewardedCount: 5,
    });

    await applyReferralMilestoneReward('referrer-1', 12, {
      referralSignupMilestoneThreshold: 5,
      referralSignupMilestoneRewardAmount: 1500,
    });

    const [, update, options] = User.findByIdAndUpdate.mock.calls[0];
    expect(update.$inc).toEqual({ storeCredit: 1500 });
    expect(update.$set).toEqual({ referralMilestoneRewardedCount: 10 });
    expect(update.$push.rewardHistory).toMatchObject({
      type: 'milestone',
      amount: 1500,
      reason: 'Referral milestone reward for 10 referred users',
    });
    expect(options).toEqual({ new: true });
  });

  test('does not reward when no new milestone is eligible or the referrer is missing', async () => {
    User.findById.mockResolvedValue({
      referralCount: 4,
      referralMilestoneRewardedCount: 0,
    });
    const settings = {
      referralSignupMilestoneThreshold: 5,
      referralSignupMilestoneRewardAmount: 1500,
    };

    await expect(applyReferralMilestoneReward('referrer-1', null, settings)).resolves.toBeNull();
    User.findById.mockResolvedValue(null);
    await expect(applyReferralMilestoneReward('missing-referrer', 5, settings)).resolves.toBeNull();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('sale rewards', () => {
  const sale = {
    _id: 'sale-1',
    userId: 'buyer-1',
    email: 'buyer@example.com',
    reference: 'reference-1',
  };

  test('leaves a sale unapplied when its purchaser cannot be found', async () => {
    User.findById.mockResolvedValue(null);

    await expect(processSaleRewards(sale)).resolves.toBeNull();

    expect(User.findOne).toHaveBeenCalledWith({ email: 'buyer@example.com' });
    expect(Sale.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('awards the purchaser own-purchase credit and marks the sale applied', async () => {
    User.findById.mockResolvedValue({ _id: 'buyer-1', email: 'buyer@example.com' });

    await expect(processSaleRewards(sale)).resolves.toBe(true);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'buyer-1',
      expect.objectContaining({
        $inc: { storeCredit: 250, ownPurchaseRewards: 1 },
        $push: {
          rewardHistory: expect.objectContaining({
            type: 'purchase',
            amount: 250,
            reason: 'Own purchase reward',
            relatedSale: 'sale-1',
          }),
        },
      }),
      { new: true }
    );
    expect(Sale.findByIdAndUpdate).toHaveBeenCalledWith('sale-1', {
      $set: { rewardsApplied: true },
    });
  });

  test('still applies a sale if its referred purchaser has no existing referrer record', async () => {
    User.findById
      .mockResolvedValueOnce({
        _id: 'buyer-1',
        email: 'buyer@example.com',
        referredBy: 'missing-referrer',
      })
      .mockResolvedValueOnce(null);
    Sale.countDocuments.mockResolvedValue(0);

    await expect(processSaleRewards(sale)).resolves.toBe(true);

    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Sale.findByIdAndUpdate).toHaveBeenCalledWith('sale-1', {
      $set: { rewardsApplied: true },
    });
  });

  test('awards referral purchase credit below the configured purchase limit', async () => {
    configureSettings({ referralPurchaseRewardLimit: 2 });
    User.findById
      .mockResolvedValueOnce({
        _id: 'buyer-1',
        email: 'buyer@example.com',
        referredBy: 'referrer-1',
      })
      .mockResolvedValueOnce({ _id: 'referrer-1' });
    Sale.countDocuments.mockResolvedValue(1);

    await processSaleRewards(sale);

    expect(Sale.countDocuments).toHaveBeenCalledWith({
      userId: 'buyer-1',
      status: 'paid',
      _id: { $ne: 'sale-1' },
    });
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(User.findByIdAndUpdate.mock.calls[1][1].$inc).toEqual({
      storeCredit: 500,
      referredPurchaseRewards: 1,
    });
  });

  test('does not award referral purchase credit after the configured limit', async () => {
    configureSettings({ referralPurchaseRewardLimit: 2 });
    User.findById.mockResolvedValueOnce({
      _id: 'buyer-1',
      email: 'buyer@example.com',
      referredBy: 'referrer-1',
    });
    Sale.countDocuments.mockResolvedValue(2);

    await processSaleRewards(sale);

    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Sale.findByIdAndUpdate).toHaveBeenCalledWith('sale-1', {
      $set: { rewardsApplied: true },
    });
  });
});
