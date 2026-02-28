const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, required: true },
  itemDescription: { type: String, required: true },
  unit: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  remarks: { type: String, default: '' },
  dayOfMonth: { type: Number, default: 1 }, // which day to add each month
  isActive: { type: Boolean, default: true },
  lastAdded: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recurring', recurringSchema);
