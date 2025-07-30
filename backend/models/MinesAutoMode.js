const mongoose = require('mongoose');

const minesAutoModeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Auto Mode Settings
  isActive: {
    type: Boolean,
    default: false
  },
  
  // Bet Configuration
  betAmount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Game Configuration
  minesCount: {
    type: Number,
    required: true,
    min: 1,
    max: 24
  },
  
  tilesToReveal: {
    type: Number,
    required: true,
    min: 1,
    max: 25
  },
  
  // Stop Conditions
  stopAfterBets: {
    type: Number,
    min: 1,
    default: null
  },
  
  stopOnProfit: {
    type: Number,
    min: 0,
    default: null
  },
  
    stopOnLoss: {
    type: Number,
    min: 0,
    default: null
  },

  // Selected Tiles for Auto Mode
  selectedTiles: [{
    type: Number,
    min: 0,
    max: 24
  }],

  // Auto Mode State
  betsPlaced: {
    type: Number,
    default: 0
  },
  
  totalProfit: {
    type: Number,
    default: 0
  },
  
  startingBalance: {
    type: Number,
    default: 0
  },
  
  currentBalance: {
    type: Number,
    default: 0
  },
  
  // Game History for this auto session
  gamesPlayed: [{
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MinesGame'
    },
    bet: Number,
    result: {
      type: String,
      enum: ['win', 'loss']
    },
    payout: Number,
    multiplier: Number,
    tilesRevealed: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status and Control
  status: {
    type: String,
    enum: ['running', 'stopped', 'paused', 'error'],
    default: 'stopped'
  },
  
  stopReason: {
    type: String,
    enum: ['manual', 'insufficient_balance', 'stop_after_bets', 'stop_on_profit', 'stop_on_loss', 'error'],
    default: null
  },
  
  lastGameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MinesGame',
    default: null
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: null
  },
  
  stoppedAt: {
    type: Date,
    default: null
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

// Update the updatedAt field before saving
minesAutoModeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better performance
minesAutoModeSchema.index({ userId: 1 });
minesAutoModeSchema.index({ isActive: 1 });
minesAutoModeSchema.index({ status: 1 });

module.exports = mongoose.model('MinesAutoMode', minesAutoModeSchema); 