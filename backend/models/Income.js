const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  incomeType: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Income', incomeSchema);
