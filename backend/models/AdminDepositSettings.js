const mongoose = require('mongoose');

const AdminDepositSettingsSchema = new mongoose.Schema({
  qrImage: { type: String }, // file path or URL
  utr: { type: String }, // admin's UTR to show to users
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminDepositSettings', AdminDepositSettingsSchema); 