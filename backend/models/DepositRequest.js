const mongoose = require('mongoose');

const DepositRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  proof: { type: String }, // file path or URL
  utr: { type: String }, // user's UTR number
  adminReason: { type: String }, // admin's reason for approval/rejection
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DepositRequest', DepositRequestSchema); 