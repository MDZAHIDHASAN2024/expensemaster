const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  limit: { type: Number, required: true },
  alertAt: { type: Number, default: 80 }, // alert at 80% by default
  createdAt: { type: Date, default: Date.now }
});

budgetSchema.index({ user: 1, itemType: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
