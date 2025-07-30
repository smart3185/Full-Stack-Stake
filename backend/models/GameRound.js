const mongoose = require('mongoose');

const GameRoundSchema = new mongoose.Schema({
  roundId: { type: String, required: true, unique: true },
  roundNumber: { type: Number, required: true },
  crashPoint: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  serverSeed: { type: String, required: true },
  clientSeed: { type: String, required: true },
  nonce: { type: Number, required: true },
  fairnessHash: { type: String, required: true },
  volatilityMode: { type: String, enum: ['normal', 'mild', 'hard'], default: 'normal' },
  isFrozen: { type: Boolean, default: false }
});

module.exports = mongoose.model('GameRound', GameRoundSchema); 