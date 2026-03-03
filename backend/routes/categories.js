const express = require('express');
const router = express.Router();
const { ItemType, ItemDescription, IncomeType } = require('../models/Category');
const { protect } = require('../middleware/auth');

// Seed default data
const DEFAULT_ITEM_TYPES = [
  'Vegetables',
  'Fruits',
  'Fish & Meat',
  'Grocery Essentials',
  'Spices',
  'Personal & Family Care',
  'Clothing',
  'Transportation',
  'Bills',
  'Medical',
  'Food & Dining',
  'Gifts',
  'Travel',
  'Housing',
  'Others',
];

const DEFAULT_ITEM_DESCRIPTIONS = [
  // 🥦 Vegetables
  'Potato',
  'Onion',
  'Garlic',
  'Ginger',
  'Tomato',
  'Carrot',
  'Cabbage',
  'Cauliflower',
  'Radish',
  'Radish Leaves',
  'Sweet Pumpkin',
  'Bottle Gourd',
  'Bitter Gourd',
  'Okra',
  'Eggplant',
  'Green Chili',
  'Yardlong Bean',
  'Malabar Spinach',
  'Red Spinach',
  'Palong Shak',
  'Mustard Leaves',

  // 🍎 Fruits
  'Apple',
  'Banana',
  'Mango',
  'Green Mango',
  'Guava',
  'Papaya',
  'Pineapple',
  'Watermelon',
  'Orange',
  'Malta',
  'Litchi',
  'Jackfruit',
  'Dragon Fruit',
  'Strawberry',
  'Jujube',
  'Olive',
  'Hog Plum',
  'Dates',

  // 🐟 Fish & Meat
  'Hilsa Fish',
  'Rui Fish',
  'Katla Fish',
  'Tilapia Fish',
  'Pangash',
  'Small Fish',
  'Prawn',
  'Beef',
  'Chicken',
  'Duck',
  'Egg',
  'Chicken Egg',
  'Duck Egg',

  // 🥣 Grocery Essentials
  'Rice',
  'Atta',
  'Red Lentils',
  'Black Gram',
  'Mustard Oil',
  'Soybean Oil',
  'Salt',
  'Sugar',
  'Milk',
  'Milk Powder',
  'Tea',
  'Coffee',
  'Noodles',
  'Semai',
  'Peanut',
  'Almond',
  'Honey',
  'Puffed Rice',
  'Cheera',

  // 🌶 Spices
  'Turmeric Powder',
  'Coriander Powder',
  'Cumin Seed',
  'Black Cumin',
  'Dry Chili',
  'Garam Masala',

  // 🧼 Personal Care
  'Soap',
  'Shampoo',
  'Face Wash',
  'Toothpaste',
  'Toothbrush',
  'Hair Oil',
  'Sanitary Pad',
  'Cosmetics',

  // 🏠 Household
  'Dish Wash',
  'Toilet Tissue',
  'Mosquito Coil',
  'Gas',
  'Gas Lighter',
  'Home Appliances',
  'Container',
  'Water Jug',
  'Water Glass',

  // 👕 Clothing
  'Shirt',
  'T-Shirt',
  'Pant',
  'Short Pant',
  'Panjabi',
  'Lungi',
  'Shoes',

  // 🚗 Transport
  'Bus Fare',
  'CNG Fare',
  'Auto Van Fare',

  // 💳 Bills
  'Electricity Bill',
  'WIFI Bill',
  'Mobile Recharge',
  'Service Charge',

  // 🏥 Medical
  'Medicine',
  'Medical Test',
  'Treatment',

  // 🍽 Food Outside
  'Breakfast',
  'Hotel Food',
  'Ice Cream',
  'Snacks',

  // 🎁 Others
  'Gift',
  'Tour',
  'Miscellaneous',
];

// Initialize defaults
router.post('/seed', protect, async (req, res) => {
  try {
    for (const name of DEFAULT_ITEM_TYPES) {
      await ItemType.findOneAndUpdate({ name }, { name }, { upsert: true });
    }
    for (const name of DEFAULT_ITEM_DESCRIPTIONS) {
      await ItemDescription.findOneAndUpdate(
        { name },
        { name },
        { upsert: true },
      );
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
    const type = await ItemType.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true },
    );
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
    const desc = await ItemDescription.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true },
    );
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
  try {
    res.json(await IncomeType.find().sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/income-types', protect, async (req, res) => {
  try {
    res.status(201).json(await IncomeType.create({ name: req.body.name }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/income-types/:id', protect, async (req, res) => {
  try {
    res.json(
      await IncomeType.findByIdAndUpdate(
        req.params.id,
        { name: req.body.name },
        { new: true },
      ),
    );
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/income-types/:id', protect, async (req, res) => {
  try {
    await IncomeType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
