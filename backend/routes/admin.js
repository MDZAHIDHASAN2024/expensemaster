const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Expense = require('../models/Expense');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/admin/users — সব user + stats
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}, '-password').lean();

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const expenses = await Expense.aggregate([
          { $match: { user: user._id } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              totalCount: { $sum: 1 },
              lastExpense: { $max: '$createdAt' }
            }
          }
        ]);
        const stats = expenses[0] || { totalAmount: 0, totalCount: 0, lastExpense: null };
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin || false,
          isBanned: user.isBanned || false,
          familyRole: user.familyRole || 'none',
          createdAt: user.createdAt,
          lastLogin: user.lastLogin || null,
          totalAmount: stats.totalAmount,
          totalCount: stats.totalCount,
          lastExpense: stats.lastExpense
        };
      })
    );

    res.json({ totalUsers: users.length, users: usersWithStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/stats — overall app stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalExpenses = await Expense.countDocuments();
    const amountResult = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonth } });
    const activeUsers = await User.countDocuments({ isBanned: { $ne: true } });

    res.json({
      totalUsers,
      activeUsers,
      totalExpenses,
      totalAmount: amountResult[0]?.total || 0,
      newUsersThisMonth
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/users/:id/ban — ban/unban toggle
router.put('/users/:id/ban', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'নিজেকে ban করা যাবে না' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ message: 'Admin কে ban করা যাবে না' });

    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ message: user.isBanned ? 'User banned' : 'User unbanned', isBanned: user.isBanned });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/users/:id — user delete
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'নিজেকে delete করা যাবে না' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ message: 'Admin কে delete করা যাবে না' });

    await Expense.deleteMany({ user: user._id });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User and all expenses deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
