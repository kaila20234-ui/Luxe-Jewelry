const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Link to customer account (optional for guests)
  email: String,
  name: String,
  phone: String,
  address: String,
  amount: Number,

  status: { type: String, default: "paid" },
  paidAt: { type: Date, default: null },
  otpVerified: { type: Boolean, default: false },
  rewardsApplied: { type: Boolean, default: false },

  items: [
    {
      productId: String,
      productName: String,
      price: Number,
      quantity: Number,
      subtotal: Number
    }
  ],
  date: { type: Date, default: Date.now }
});

// Indexes for performance
// Indexes for performance
SaleSchema.index({ userId: 1 });
SaleSchema.index({ date: -1 });

module.exports = mongoose.model("Sale", SaleSchema);
