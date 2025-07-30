const mongoose = require('mongoose');

const AviatorUserRoundSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundId: { type: String, required: true },
  bet: { type: Number, required: true },
  cashedOut: { type: Boolean, default: false },
  cashedOutAt: { type: Date },
  payout: { type: Number, default: 0 },
  multiplier: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

AviatorUserRoundSchema.index({ userId: 1, roundId: 1 }, { unique: true });

module.exports = mongoose.model('AviatorUserRound', AviatorUserRoundSchema); 