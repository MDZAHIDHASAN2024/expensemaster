const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  itemType: { type: String, required: true },
  itemDescription: { type: String, required: true },
  unit: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
