// models/AviatorSettings.js
const mongoose = require('mongoose');

const AviatorSettingsSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['normal', 'easy', 'hard'],
    default: 'normal'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AviatorSettings', AviatorSettingsSchema);
