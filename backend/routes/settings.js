const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Update profile (name, email, darkMode)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, darkMode } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, darkMode },
      { new: true, select: '-password' }
    );
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Change password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export backup (JSON)
router.get('/backup', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort({ date: 1 });
    const user = await User.findById(req.user._id).select('-password');
    const backup = {
      exportedAt: new Date().toISOString(),
      user: { name: user.name, email: user.email },
      totalRecords: expenses.length,
      expenses: expenses.map(e => ({
        date: e.date,
        itemType: e.itemType,
        itemDescription: e.itemDescription,
        unit: e.unit,
        quantity: e.quantity,
        amount: e.amount,
        remarks: e.remarks
      }))
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=expense_backup_${Date.now()}.json`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Restore from backup (JSON)
router.post('/restore', protect, async (req, res) => {
  try {
    const { expenses, overwrite } = req.body;
    if (!Array.isArray(expenses)) return res.status(400).json({ message: 'Invalid backup data' });

    if (overwrite) {
      await Expense.deleteMany({ user: req.user._id });
    }

    const toInsert = expenses.map(e => ({ ...e, user: req.user._id }));
    await Expense.insertMany(toInsert);
    res.json({ message: `Restored ${toInsert.length} records` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
