const mongoose = require('mongoose');

const itemTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const itemDescriptionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const incomeTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const ItemType = mongoose.model('ItemType', itemTypeSchema);
const ItemDescription = mongoose.model('ItemDescription', itemDescriptionSchema);
const IncomeType = mongoose.model('IncomeType', incomeTypeSchema);

module.exports = { ItemType, ItemDescription, IncomeType };
