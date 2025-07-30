const mongoose = require('mongoose');

const AccountStatementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  transaction: { type: String, required: true }, // e.g., "Casino Bet Placement"
  event: { type: String }, // e.g., "Aviator X"
  marketType: { type: String }, // e.g., "Casino"
  gameType: { type: String }, // e.g., "Aviator", "Dice", "Slots", "CoinFlip"
  roundId: { type: String }, // round/game id
  betAmount: { type: Number },
  payout: { type: Number },
  result: { type: String }, // e.g., "win", "loss", "cashout", "crash"
  details: { type: mongoose.Schema.Types.Mixed }, // extra info (JSON)
  credit: { type: Number, default: 0 }, // positive for credit, negative for debit
  closeBalance: { type: Number, required: true },
  transactionId: { type: String, required: true }
});

module.exports = mongoose.model('AccountStatement', AccountStatementSchema); 