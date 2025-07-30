const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  balance: { type: Number, default: 0 },
  hasFirstDeposit: { type: Boolean, default: false },
  awaitingBonus: { type: Number, default: 0 },
  firstDepositAmount: { type: Number, default: 0 },
  totalBetsAfterFirstDeposit: { type: Number, default: 0 },
  diceServerSeed: { type: String }, // For provably fair dice
  diceNonce: { type: Number, default: 0 }, // For provably fair dice
  withdrawalAccounts: [{
    name: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    mobile: { type: String, required: true },
    withdrawPassword: { type: String },
  }],
});

module.exports = mongoose.model('User', userSchema); 