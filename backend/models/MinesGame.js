const mongoose = require('mongoose');

const minesGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bet: {
    type: Number,
    required: true,
    min: 1
  },
  minesCount: {
    type: Number,
    required: true,
    min: 1,
    max: 24
  },
  minePositions: {
    type: [Number],
    required: true
  },
  revealedTiles: {
    type: [Number],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  result: {
    type: String,
    enum: ['active', 'win', 'loss'],
    default: 'active'
  },
  payout: {
    type: Number,
    default: 0
  },
  multiplier: {
    type: Number,
    default: 0
  },
  serverSeed: {
    type: String,
    required: true
  },
  clientSeed: {
    type: String,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  },
  gameHash: {
    type: String,
    required: true
  },

  /** ✅ NEW FIELDS BELOW */
  dynamicEdge: {
    type: Number,
    default: 0.02 // used for adaptive house edge tracking
  },
  isTrap: {
    type: Boolean,
    default: false // whether this round triggered trap logic
  },
  antiPatternTriggered: {
    type: Boolean,
    default: false // whether user's pattern matched a suspicious one
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
});

// Index for faster queries
minesGameSchema.index({ userId: 1, createdAt: -1 });
minesGameSchema.index({ isActive: 1 });

module.exports = mongoose.model('MinesGame', minesGameSchema);
