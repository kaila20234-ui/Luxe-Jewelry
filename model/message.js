// model/message.js - Internal messaging system for Manager-Admin communication

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // optional to support env-authenticated senders without DB user
  },
  senderRole: {
    type: String,
    enum: ['manager', 'admin'],
    required: true
  },
  senderName: {
    type: String,
    default: 'Unknown'
  },
  senderEmail: {
    type: String,
    default: ''
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // optional to support recipients identified by email/name when no DB user exists
  },
  recipientName: {
    type: String,
    default: ''
  },
  recipientEmail: {
    type: String,
    default: ''
  },
  recipientRole: {
    type: String,
    enum: ['manager', 'admin'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  conversationId: {
    type: String, // group messages by topic/thread
    default: null
  },
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null // for message threads/replies
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast queries
MessageSchema.index({ recipientId: 1, isRead: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ recipientEmail: 1 });
MessageSchema.index({ senderEmail: 1 });

module.exports = mongoose.model('Message', MessageSchema);
