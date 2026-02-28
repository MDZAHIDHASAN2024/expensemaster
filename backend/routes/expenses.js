const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// Get all expenses with filters
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, itemType, month, year } = req.query;
    let filter = { user: req.user._id };

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (year) {
      filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
    }

    if (itemType) filter.itemType = itemType;

    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalQty = expenses.reduce((sum, e) => sum + (e.quantity || 0), 0);
    res.json({ expenses, total, totalQty });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add expense
router.post('/', protect, async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, user: req.user._id });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update expense
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete expense
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Summary stats
router.get('/stats', protect, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();
    
    const monthlyStats = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31, 23, 59, 59) }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    const categoryStats = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31, 23, 59, 59) }
        }
      },
      {
        $group: {
          _id: '$itemType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({ monthlyStats, categoryStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
