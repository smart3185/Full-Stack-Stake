const mongoose = require('mongoose');

const AdminAviatorSettingsSchema = new mongoose.Schema({
  volatilityMode: {
    type: String,
    enum: ['normal', 'mild', 'hard'],
    default: 'normal'
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  houseEdge: {
    type: Number,
    default: 0.05, // 5% house edge
    min: 0.01,
    max: 0.20
  },
  siteMaintenance: { type: Boolean, default: false },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
});

// Ensure only one settings document exists
AdminAviatorSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('AdminAviatorSettings', AdminAviatorSettingsSchema); 