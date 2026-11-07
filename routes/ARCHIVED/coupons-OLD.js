const express = require("express");
const router = express.Router();
const Coupon = require("../model/coupon");
const Sale = require("../model/sales");
const User = require("../model/user");

/**
 * Validate and apply coupon to cart
 * POST /api/coupons/validate
 * Body: { code, cartTotal, userId?, userEmail? }
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

    // Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon code not found"
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon code is no longer active"
      });
    }

    // Check validity period
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

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit"
      });
    }

    // Check per-user limit
    if (userId && coupon.perUserLimit > 0) {
      const userUsageCount = coupon.usedBy.filter(
        u => u.userId.toString() === userId
      ).length;

      if (userUsageCount >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You can only use this coupon ${coupon.perUserLimit} time(s)`
        });
      }
    }

    // Check minimum purchase
    if (cartTotal < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₦${coupon.minPurchase} required to use this coupon`
      });
    }

    // Check if applicable to items
    if (items && items.length > 0) {
      const applicableCoupons = await checkItemApplicability(coupon, items);
      if (!applicableCoupons) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not applicable to your selected items"
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;
      
      // Apply max discount cap if set
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "fixed") {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed total
    discountAmount = Math.min(discountAmount, cartTotal);

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount
      },
      discount: discountAmount,
      finalTotal: cartTotal - discountAmount,
      message: `Coupon applied! You saved ₦${discountAmount.toFixed(2)}`
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating coupon"
    });
  }
});

/**
 * Apply coupon to order (save usage)
 * POST /api/coupons/apply
 * Body: { code, orderReference, userId, discountAmount }
 */
router.post("/apply", async (req, res) => {
  try {
    const { code, orderReference, userId, discountAmount } = req.body;

    if (!code || !orderReference) {
      return res.status(400).json({
        success: false,
        message: "Code and order reference required"
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    // Increment usage count
    coupon.usageCount += 1;

    // Add user to used list
    if (userId) {
      coupon.usedBy.push({
        userId,
        usageDate: new Date(),
        orderReference
      });
    }

    await coupon.save();

    res.json({
      success: true,
      message: "Coupon applied to order successfully",
      coupon: coupon.code,
      discountApplied: discountAmount
    });
  } catch (error) {
    console.error("Coupon apply error:", error);
    res.status(500).json({
      success: false,
      message: "Error applying coupon to order"
    });
  }
});

/**
 * Get available coupons (for display)
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
    .select("code description discountType discountValue minPurchase -usedBy -usageCount")
    .limit(20);

    res.json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupons"
    });
  }
});

/**
 * Admin: Create new coupon
 * POST /api/coupons/create
 * Requires admin authentication
 */
router.post("/create", async (req, res) => {
  try {
    // In production, verify admin/manager role
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minPurchase,
      usageLimit,
      perUserLimit,
      startDate,
      endDate,
      applicableCategories,
      applicableProducts,
      excludedCategories,
      excludedProducts
    } = req.body;

    // Validate required fields
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({
        success: false,
        message: "Code, discount type, and value are required"
      });
    }

    // Check if code already exists
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxDiscount: maxDiscount || null,
      minPurchase: minPurchase || 0,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      excludedCategories: excludedCategories || [],
      excludedProducts: excludedProducts || []
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating coupon",
      error: error.message
    });
  }
});

/**
 * Admin: Get all coupons
 * GET /api/coupons/admin/all
 */
router.get("/admin/all", async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .select("-usedBy");

    res.json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error("Get all coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupons"
    });
  }
});

/**
 * Admin: Update coupon
 * PUT /api/coupons/admin/:id
 */
router.put("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent changing code
    delete updates.code;
    delete updates.createdAt;

    updates.updatedAt = new Date();

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).select("-usedBy");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating coupon"
    });
  }
});

/**
 * Admin: Delete coupon
 * DELETE /api/coupons/admin/:id
 */
router.delete("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    res.json({
      success: true,
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting coupon"
    });
  }
});

/**
 * Helper function to check if coupon applies to items
 */
async function checkItemApplicability(coupon, items) {
  // If no restrictions, applies to all
  if (coupon.applicableCategories.length === 0 &&
      coupon.applicableProducts.length === 0 &&
      coupon.excludedCategories.length === 0 &&
      coupon.excludedProducts.length === 0) {
    return true;
  }

  // If specific products/categories are allowed, item must be in list
  if (coupon.applicableCategories.length > 0 || coupon.applicableProducts.length > 0) {
    const itemsMatch = items.some(item => {
      return coupon.applicableProducts.includes(item.productId) ||
             (item.category && coupon.applicableCategories.includes(item.category));
    });
    return itemsMatch;
  }

  // If items are excluded, none should match exclusions
  if (coupon.excludedCategories.length > 0 || coupon.excludedProducts.length > 0) {
    const itemsExcluded = items.some(item => {
      return coupon.excludedProducts.includes(item.productId) ||
             (item.category && coupon.excludedCategories.includes(item.category));
    });
    return !itemsExcluded;
  }

  return true;
}

module.exports = router;
