const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/auth');

// Item-wise month comparison
router.get('/item-comparison', protect, async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();

    const data = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, itemType: '$itemType' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Reshape to { itemType: { month1: total, month2: total, ... } }
    const byType = {};
    data.forEach(d => {
      const type = d._id.itemType;
      if (!byType[type]) byType[type] = {};
      byType[type][d._id.month] = d.total;
    });

    res.json(byType);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Weekly breakdown
router.get('/weekly', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const expenses = await Expense.find({ user: req.user._id, date: { $gte: start, $lte: end } }).sort({ date: 1 });

    const weeks = [
      { label: 'Week 1 (1-7)', days: [1,7], total: 0, count: 0 },
      { label: 'Week 2 (8-14)', days: [8,14], total: 0, count: 0 },
      { label: 'Week 3 (15-21)', days: [15,21], total: 0, count: 0 },
      { label: 'Week 4 (22+)', days: [22,31], total: 0, count: 0 }
    ];

    expenses.forEach(e => {
      const day = new Date(e.date).getDate();
      const w = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      weeks[w].total += e.amount;
      weeks[w].count++;
    });

    res.json(weeks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Top 10 items
router.get('/top-items', protect, async (req, res) => {
  try {
    const { month, year, limit: lim } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    let dateFilter = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) };
    if (month) {
      const m = parseInt(month);
      dateFilter = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
    }

    const data = await Expense.aggregate([
      { $match: { user: req.user._id, date: dateFilter } },
      { $group: { _id: '$itemDescription', total: { $sum: '$amount' }, count: { $sum: 1 }, itemType: { $first: '$itemType' } } },
      { $sort: { total: -1 } },
      { $limit: parseInt(lim) || 10 }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Budget vs actual
router.get('/budget-vs-actual', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const budgets = await Budget.find({ user: req.user._id, month: m, year: y });

    const result = await Promise.all(budgets.map(async (b) => {
      const exp = await Expense.aggregate([
        { $match: { user: req.user._id, itemType: b.itemType, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      return {
        itemType: b.itemType,
        budget: b.limit,
        actual: exp[0]?.total || 0
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Month vs Month comparison (last 6 months)
router.get('/month-comparison', protect, async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const results = await Promise.all(months.map(async ({ month, year }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const exp = await Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      const label = start.toLocaleString('default', { month: 'short', year: '2-digit' });
      return { label, month, year, total: exp[0]?.total || 0, count: exp[0]?.count || 0 };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// Expense vs Income comparison
const Income = require('../models/Income');
router.get('/expense-vs-income', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const expData = await Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: new Date(year,0,1), $lte: new Date(year,11,31,23,59,59) } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const incData = await Income.aggregate([
      { $match: { user: req.user._id, date: { $gte: new Date(year,0,1), $lte: new Date(year,11,31,23,59,59) } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = months.map((name, i) => {
      const exp = expData.find(e => e._id === i+1);
      const inc = incData.find(e => e._id === i+1);
      const expense = exp?.total || 0;
      const income = inc?.total || 0;
      return { name, expense, income, balance: income - expense };
    });

    const totalExpense = expData.reduce((s, e) => s + e.total, 0);
    const totalIncome = incData.reduce((s, e) => s + e.total, 0);
    res.json({ monthly: result, totalExpense, totalIncome, balance: totalIncome - totalExpense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
