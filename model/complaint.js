const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  subject: { type: String, default: 'General Complaint' },
  message: { type: String, required: true },
  name: { type: String, default: 'Anonymous' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  product: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
complaintSchema.index({ status: 1 });
complaintSchema.index({ customerId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
