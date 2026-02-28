const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// Get all budgets for a month/year
router.get('/', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const budgets = await Budget.find({ user: req.user._id, month: m, year: y });

    // Calculate actual spending for each budget
    const budgetsWithSpending = await Promise.all(budgets.map(async (b) => {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const expenses = await Expense.aggregate([
        { $match: { user: req.user._id, itemType: b.itemType, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = expenses[0]?.total || 0;
      const pct = b.limit > 0 ? (spent / b.limit * 100) : 0;
      return {
        ...b.toObject(),
        spent,
        percentage: Math.round(pct),
        isAlert: pct >= b.alertAt,
        isOver: spent > b.limit
      };
    }));

    res.json(budgetsWithSpending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create/Update budget (upsert)
router.post('/', protect, async (req, res) => {
  try {
    const { itemType, month, year, limit, alertAt } = req.body;
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, itemType, month, year },
      { limit, alertAt: alertAt || 80 },
      { upsert: true, new: true }
    );
    res.json(budget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete budget
router.delete('/:id', protect, async (req, res) => {
  try {
    await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get budget alerts for current month
router.get('/alerts', protect, async (req, res) => {
  try {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const budgets = await Budget.find({ user: req.user._id, month: m, year: y });
    const alerts = [];

    for (const b of budgets) {
      const expenses = await Expense.aggregate([
        { $match: { user: req.user._id, itemType: b.itemType, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = expenses[0]?.total || 0;
      const pct = b.limit > 0 ? (spent / b.limit * 100) : 0;
      if (pct >= b.alertAt) {
        alerts.push({ itemType: b.itemType, spent, limit: b.limit, percentage: Math.round(pct), isOver: spent > b.limit });
      }
    }
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
