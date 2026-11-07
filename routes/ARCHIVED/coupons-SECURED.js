// SECURED COUPON ROUTES - Use this to replace current routes/coupons.js
// This version includes proper authentication for ALL admin endpoints

const express = require("express");
const router = express.Router();
const Coupon = require("../model/coupon");
const { authenticateJWT, verifyAdminRole, validateCouponCode, sanitize } = require("./coupon-auth-middleware");

/**
 * PUBLIC: Validate coupon for checkout
 * POST /api/coupons/validate
 */
router.post("/validate", async (req, res) => {
  try {
    const { code, cartTotal, userId, userEmail, items } = req.body;

    if (!code || !cartTotal) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and cart total are required"
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon code not found"
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon code is no longer active"
      });
    }

    const now = new Date();
    if (coupon.startDate > now) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not yet valid"
      });
    }

    if (coupon.endDate && coupon.endDate < now) {
      return res.status(400).json({
        success: false,
        message: "This coupon has expired"
      });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit"
      });
    }

    if (userId && coupon.perUserLimit) {
      const userUsageCount = coupon.usedBy.filter(u => u.userId === userId).length;
      if (userUsageCount >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You have already used this coupon ${coupon.perUserLimit} times`
        });
      }
    }

    if (cartTotal < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₦${coupon.minPurchase} required for this coupon`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    if (discount > cartTotal) {
      discount = cartTotal;
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      discount: discount,
      finalTotal: cartTotal - discount,
      message: `Coupon applied! You saved ₦${discount.toFixed(2)}`
    });

  } catch (error) {
    console.error('[COUPON] Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating coupon'
    });
  }
});

/**
 * PROTECTED: Record coupon usage
 * POST /api/coupons/apply
 * Requires: authenticateJWT (customer token)
 */
router.post("/apply", authenticateJWT, async (req, res) => {
  try {
    const { code, orderReference, userId, discountAmount } = req.body;

    if (!code || !orderReference) {
      return res.status(400).json({
        success: false,
        message: 'Code and orderReference required'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.usageCount += 1;
    coupon.usedBy.push({
      userId: userId,
      usageDate: new Date(),
      orderReference: orderReference
    });

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon applied to order successfully'
    });

  } catch (error) {
    console.error('[COUPON] Apply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying coupon'
    });
  }
});

/**
 * PUBLIC: Get available coupons (for marketing display)
 * GET /api/coupons/available
 */
router.get("/available", async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    })
      .select('code description discountType discountValue minPurchase')
      .limit(20)
      .lean();

    res.json({
      success: true,
      count: coupons.length,
      coupons: coupons
    });

  } catch (error) {
    console.error('[COUPON] Available error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coupons'
    });
  }
});

/**
 * ADMIN ONLY: Create new coupon
 * POST /api/coupons/create
 * Requires: authenticateJWT + admin/manager role
 */
router.post("/create", authenticateJWT, verifyAdminRole, validateCouponCode, async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxDiscount, minPurchase, usageLimit, perUserLimit, startDate, endDate, isActive } = req.body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, discountType, and discountValue are required'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'discountType must be "percentage" or "fixed"'
      });
    }

    // Check uniqueness
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description: sanitize(description),
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minPurchase: minPurchase ? Number(minPurchase) : 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== false,
      createdBy: req.user || 'system'
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon: coupon
    });

  } catch (error) {
    console.error('[COUPON] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating coupon'
    });
  }
});

/**
 * ADMIN ONLY: Get all coupons
 * GET /api/coupons/admin/all
 * Requires: authenticateJWT + admin/manager role
 */
router.get("/admin/all", authenticateJWT, verifyAdminRole, async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .select('-usedBy')  // Exclude usage history for privacy
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: coupons.length,
      coupons: coupons
    });

  } catch (error) {
    console.error('[COUPON] Admin list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching coupons'
    });
  }
});

/**
 * ADMIN ONLY: Update coupon
 * PUT /api/coupons/admin/:id
 * Requires: authenticateJWT + admin/manager role
 */
router.put("/admin/:id", authenticateJWT, verifyAdminRole, validateCouponCode, async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };

    // Prevent code changes
    if (update.code && update.code !== '') {
      delete update.code;
    }

    // Sanitize description
    if (update.description) {
      update.description = sanitize(update.description);
    }

    // Update timestamp
    update.updatedAt = new Date();

    const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon: coupon
    });

  } catch (error) {
    console.error('[COUPON] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating coupon'
    });
  }
});

/**
 * ADMIN ONLY: Delete coupon
 * DELETE /api/coupons/admin/:id
 * Requires: authenticateJWT + admin/manager role
 */
router.delete("/admin/:id", authenticateJWT, verifyAdminRole, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });

  } catch (error) {
    console.error('[COUPON] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting coupon'
    });
  }
});

module.exports = router;
