const express = require('express');
const router = express.Router();
const Family = require('../models/Family');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

// Create family group
router.post('/create', protect, async (req, res) => {
  try {
    if (req.user.family) return res.status(400).json({ message: 'Already in a family group' });
    const family = await Family.create({
      name: req.body.name,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await User.findByIdAndUpdate(req.user._id, { family: family._id, familyRole: 'owner' });
    res.status(201).json(family);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my family
router.get('/mine', protect, async (req, res) => {
  try {
    if (!req.user.family) return res.json(null);
    const family = await Family.findById(req.user.family).populate('members.user', 'name email');
    res.json(family);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate invite code
router.post('/invite', protect, async (req, res) => {
  try {
    if (!req.user.family) return res.status(400).json({ message: 'No family group' });
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await Family.findByIdAndUpdate(req.user.family, {
      $push: { inviteCodes: { code, role: req.body.role || 'member', expiresAt } }
    });
    res.json({ code, expiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Join via invite code
router.post('/join', protect, async (req, res) => {
  try {
    if (req.user.family) return res.status(400).json({ message: 'Already in a family group' });
    const { code } = req.body;
    const family = await Family.findOne({
      'inviteCodes.code': code,
      'inviteCodes.used': false,
      'inviteCodes.expiresAt': { $gt: new Date() }
    });
    if (!family) return res.status(400).json({ message: 'Invalid or expired code' });

    const invite = family.inviteCodes.find(ic => ic.code === code && !ic.used);
    family.members.push({ user: req.user._id, role: invite.role });
    invite.used = true;
    await family.save();
    await User.findByIdAndUpdate(req.user._id, { family: family._id, familyRole: invite.role });
    res.json({ message: 'Joined!', family });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Leave family
router.post('/leave', protect, async (req, res) => {
  try {
    if (!req.user.family) return res.status(400).json({ message: 'Not in a family' });
    await Family.findByIdAndUpdate(req.user.family, {
      $pull: { members: { user: req.user._id } }
    });
    await User.findByIdAndUpdate(req.user._id, { family: null, familyRole: null });
    res.json({ message: 'Left family' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove member (owner only)
router.delete('/member/:userId', protect, async (req, res) => {
  try {
    if (req.user.familyRole !== 'owner' && req.user.familyRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Family.findByIdAndUpdate(req.user.family, {
      $pull: { members: { user: req.params.userId } }
    });
    await User.findByIdAndUpdate(req.params.userId, { family: null, familyRole: null });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// Get family members' expenses (owner/admin)
router.get('/expenses', protect, async (req, res) => {
  try {
    if (!req.user.family) return res.status(400).json({ message: 'Not in a family' });
    const family = await Family.findById(req.user.family).populate('members.user', 'name email');
    if (!family) return res.status(404).json({ message: 'Family not found' });

    const role = req.user.familyRole;
    const Expense = require('../models/Expense');

    // owner sees all members; admin sees all except owner
    let memberIds;
    if (role === 'owner') {
      memberIds = family.members.map(m => m.user._id);
    } else if (role === 'admin') {
      memberIds = family.members
        .filter(m => m.user._id.toString() !== family.owner.toString())
        .map(m => m.user._id);
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { month, year, startDate, endDate, memberId } = req.query;
    let filter = { user: { $in: memberId ? [memberId] : memberIds } };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (month && year) {
      filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
    } else if (year) {
      filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
    }

    const expenses = await Expense.find(filter).populate('user', 'name email').sort({ date: -1 });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalQty = expenses.reduce((s, e) => s + (e.quantity || 0), 0);

    res.json({ expenses, total, totalQty, members: family.members, ownerId: family.owner });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update member role (owner only)
router.put('/member/:userId/role', protect, async (req, res) => {
  try {
    if (req.user.familyRole !== 'owner') return res.status(403).json({ message: 'Owner only' });
    const family = await Family.findById(req.user.family);
    const member = family.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    member.role = req.body.role;
    await family.save();
    await require('../models/User').findByIdAndUpdate(req.params.userId, { familyRole: req.body.role });
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
