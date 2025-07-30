const mongoose = require('mongoose');

const HouseStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  totalProfit: { type: Number, default: 0 },
  totalBets: { type: Number, default: 0 },
  totalPayouts: { type: Number, default: 0 },
  dynamicBias: { type: Number, default: 0.1 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HouseStats', HouseStatsSchema); 