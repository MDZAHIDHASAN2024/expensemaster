const express = require('express');
const router = express.Router();
const { ItemType, ItemDescription, IncomeType } = require('../models/Category');
const { protect } = require('../middleware/auth');

// Seed default data
const DEFAULT_ITEM_TYPES = [
  'Debt', 'First', 'Food', 'Fish', 'Fruits', 'Gifts', 'Grocery', 'Housing',
  'Meat', 'Medical', 'Others', 'Personal', 'Savings', 'Shopping', 'Transportation', 'Vegetables'
];

const DEFAULT_ITEM_DESCRIPTIONS = [
  'Accessories', 'Anchor Dal', 'Apple', 'Atta', 'Auto Van Rent', 'Balsam Apple', 'Banana',
  'Bata Fish', 'Bazar Bag', 'BDT', 'Beans', 'Beef', 'Biscuit', 'Bkash', 'Blade',
  'Bottle Gourd', 'Bottle Leaves', 'Bowl', 'Bread', 'Breakfast', 'Bus Rent', 'Cabbage',
  'Care', 'Carp', 'Carrot', 'Cauliflower', 'Chanachur', 'Cheera', 'Chicken', 'Chicken Egg',
  'Clothes', 'CNG Rent', 'Coconut', 'Coffee', 'Combo', 'Coriander Leaf', 'Coriander Powder',
  'Cosmetics', 'Cucumber', 'Data Shak', 'Date', 'Dhundul', 'Dish Wash', 'Dried Red Chili Power',
  'Dry Chilli', 'Dry Fish', 'Duck Egg', 'Eggplant', 'Electricity Bill', 'Etc…', 'Family',
  'Face Wash', 'Garam Masala', 'Garlic', 'Gas', 'Ginger', 'Green Banana', 'Green Chili',
  'Green Mango', 'Guava', 'Hair Cut', 'Hair Oil', 'Hilsa Fish', 'Home Appliances', 'Home Rent',
  'Honey', 'Hotel Food Bill', 'Ice Cream', 'Iftar', 'Jackfruit', 'Jaggery', 'Jali Kumra',
  'Jambura', 'Jar', 'Juice', 'Kakrol', 'Katla Fish', 'Lemon', 'Litchi', 'Lotkon', 'Lungi',
  'Maa', 'Malabar Spinach', 'Malta', 'Mango', 'Mashkalai Daler Bori', 'Medicine', 'Milk',
  'Milk Powder', 'Mirror', 'Mobile Recharge', 'Mosquito coil', 'Mrigal Carp', 'Mustard Oil',
  'Nagad', 'Noodles', 'Okra', 'Onion', 'Others', 'Palong shak', 'Pangush', 'Panjabi', 'Pant',
  'Papaya', 'Papor', 'Parwal', 'Peanut', 'Pen', 'Pilau Rice', 'Pineapple', 'Pink Plum',
  'Potato', 'Prawn', 'Puffed Rice', 'Quail Egg', 'Radish', 'Radish Leaves', 'Red Lentils',
  'Red Spinach', 'Rice', 'Roket', 'Sajne Data', 'Salt', 'Scent', 'Semai', 'Service Charge',
  'Shampoo', 'Shirt', 'Shoes', 'Short-Pant', 'Silver Carp', 'Small Fish', 'Soap Bar',
  'Soyabean Oil', 'Spoon', 'Sugar', 'Sweet', 'Sweet Potato', 'Sweet Pumpkin', 'Taro',
  'Tea Bags', 'Tilapia Fish', 'Toilet Tissue', 'Tomato', 'Tooth Peste', 'Toothbrushes',
  'Tour', 'Towel', 'T-Shirt', 'Turmeric Powder', 'Visit', 'Washing Power', 'Water Glass',
  'Watermelon', 'WIFI Bill', 'Yardlong bean', 'Duck', 'Jhatka', 'Hog Plum', 'Dragon Fruit',
  'Gas Lighter', 'Almond', 'Bitter Gourd', 'Olive', 'Medical Test', 'Turnip', 'Mustard Leave',
  'Jujube', 'Toast', 'Shal Gom', 'Black Gram Powder', 'Cumin Seed', 'Black Cumin', 'Treatment',
  'Sobeda Fall', 'Achar', 'Strawberry', 'Water Jug', 'Dates', 'Solaboot', 'Sanitary Pad',
  'Treat', 'Orange', 'Container'
];

// Initialize defaults
router.post('/seed', protect, async (req, res) => {
  try {
    for (const name of DEFAULT_ITEM_TYPES) {
      await ItemType.findOneAndUpdate({ name }, { name }, { upsert: true });
    }
    for (const name of DEFAULT_ITEM_DESCRIPTIONS) {
      await ItemDescription.findOneAndUpdate({ name }, { name }, { upsert: true });
    }
    res.json({ message: 'Seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all item types
router.get('/types', protect, async (req, res) => {
  try {
    const types = await ItemType.find().sort({ name: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add item type
router.post('/types', protect, async (req, res) => {
  try {
    const type = await ItemType.create({ name: req.body.name });
    res.status(201).json(type);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update item type
router.put('/types/:id', protect, async (req, res) => {
  try {
    const type = await ItemType.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    res.json(type);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete item type
router.delete('/types/:id', protect, async (req, res) => {
  try {
    await ItemType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all item descriptions
router.get('/descriptions', protect, async (req, res) => {
  try {
    const descs = await ItemDescription.find().sort({ name: 1 });
    res.json(descs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add item description
router.post('/descriptions', protect, async (req, res) => {
  try {
    const desc = await ItemDescription.create({ name: req.body.name });
    res.status(201).json(desc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update item description
router.put('/descriptions/:id', protect, async (req, res) => {
  try {
    const desc = await ItemDescription.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    res.json(desc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete item description
router.delete('/descriptions/:id', protect, async (req, res) => {
  try {
    await ItemDescription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

// === Income Types ===
router.get('/income-types', protect, async (req, res) => {
  try { res.json(await IncomeType.find().sort({ name: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/income-types', protect, async (req, res) => {
  try { res.status(201).json(await IncomeType.create({ name: req.body.name })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/income-types/:id', protect, async (req, res) => {
  try { res.json(await IncomeType.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/income-types/:id', protect, async (req, res) => {
  try { await IncomeType.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
