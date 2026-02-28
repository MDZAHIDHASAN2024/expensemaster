const express = require('express');
const router = express.Router();
const Recurring = require('../models/Recurring');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// Get all recurring
router.get('/', protect, async (req, res) => {
  try {
    const items = await Recurring.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create recurring
router.post('/', protect, async (req, res) => {
  try {
    const item = await Recurring.create({ ...req.body, user: req.user._id });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update recurring
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await Recurring.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, req.body, { new: true }
    );
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete recurring
router.delete('/:id', protect, async (req, res) => {
  try {
    await Recurring.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manually trigger add for this month
router.post('/:id/add-now', protect, async (req, res) => {
  try {
    const rec = await Recurring.findOne({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ message: 'Not found' });

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), rec.dayOfMonth);

    const expense = await Expense.create({
      user: req.user._id,
      date,
      itemType: rec.itemType,
      itemDescription: rec.itemDescription,
      unit: rec.unit,
      quantity: rec.quantity,
      amount: rec.amount,
      remarks: `[Auto] ${rec.remarks}`
    });

    await Recurring.findByIdAndUpdate(rec._id, { lastAdded: new Date() });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auto-process all due recurring (call on login or cron)
router.post('/process-due', protect, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.getDate();

    const items = await Recurring.find({ user: req.user._id, isActive: true });
    const added = [];

    for (const rec of items) {
      const shouldAdd = rec.dayOfMonth <= today;
      const alreadyAdded = rec.lastAdded &&
        rec.lastAdded.getMonth() === currentMonth &&
        rec.lastAdded.getFullYear() === currentYear;

      if (shouldAdd && !alreadyAdded) {
        const date = new Date(currentYear, currentMonth, rec.dayOfMonth);
        await Expense.create({
          user: req.user._id,
          date,
          itemType: rec.itemType,
          itemDescription: rec.itemDescription,
          unit: rec.unit,
          quantity: rec.quantity,
          amount: rec.amount,
          remarks: `[Auto] ${rec.remarks}`
        });
        await Recurring.findByIdAndUpdate(rec._id, { lastAdded: new Date() });
        added.push(rec.itemDescription);
      }
    }

    res.json({ added, count: added.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
