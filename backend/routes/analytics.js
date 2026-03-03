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
          date: {
            $gte: new Date(y, 0, 1),
            $lte: new Date(y, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, itemType: '$itemType' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);
    const byType = {};
    data.forEach((d) => {
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
    const expenses = await Expense.find({
      user: req.user._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
    const weeks = [
      { label: 'Week 1 (1-7)', total: 0, count: 0 },
      { label: 'Week 2 (8-14)', total: 0, count: 0 },
      { label: 'Week 3 (15-21)', total: 0, count: 0 },
      { label: 'Week 4 (22+)', total: 0, count: 0 },
    ];
    expenses.forEach((e) => {
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
    let dateFilter = {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59),
    };
    if (month) {
      const m = parseInt(month);
      dateFilter = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59),
      };
    }
    const data = await Expense.aggregate([
      { $match: { user: req.user._id, date: dateFilter } },
      {
        $group: {
          _id: '$itemDescription',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          itemType: { $first: '$itemType' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: parseInt(lim) || 10 },
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
    const budgets = await Budget.find({
      user: req.user._id,
      month: m,
      year: y,
    });
    const result = await Promise.all(
      budgets.map(async (b) => {
        const exp = await Expense.aggregate([
          {
            $match: {
              user: req.user._id,
              itemType: b.itemType,
              date: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return {
          itemType: b.itemType,
          budget: b.limit,
          actual: exp[0]?.total || 0,
        };
      }),
    );
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
    const results = await Promise.all(
      months.map(async ({ month, year }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        const exp = await Expense.aggregate([
          { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]);
        const label = start.toLocaleString('default', {
          month: 'short',
          year: '2-digit',
        });
        return {
          label,
          month,
          year,
          total: exp[0]?.total || 0,
          count: exp[0]?.count || 0,
        };
      }),
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Expense vs Income comparison
const Income = require('../models/Income');
router.get('/expense-vs-income', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const expData = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    const incData = await Income.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const result = months.map((name, i) => {
      const exp = expData.find((e) => e._id === i + 1);
      const inc = incData.find((e) => e._id === i + 1);
      const expense = exp?.total || 0;
      const income = inc?.total || 0;
      return { name, expense, income, balance: income - expense };
    });
    const totalExpense = expData.reduce((s, e) => s + e.total, 0);
    const totalIncome = incData.reduce((s, e) => s + e.total, 0);
    res.json({
      monthly: result,
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Need Items Analytics ──────────────────────────────────────────────────────
router.get('/need-items', protect, async (req, res) => {
  try {
    const { groupBy = 'month', itemType, itemDescription } = req.query;
    const days = parseInt(req.query.days) || 365;

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const matchStage = { user: req.user._id, date: { $gte: start, $lte: now } };
    if (itemType) matchStage.itemType = itemType;
    if (itemDescription) matchStage.itemDescription = itemDescription;

    let groupId;
    if (groupBy === 'month') {
      groupId = {
        period: { $month: '$date' },
        year: { $year: '$date' },
        itemType: '$itemType',
        itemDescription: '$itemDescription',
      };
    } else if (groupBy === 'week') {
      groupId = {
        period: { $week: '$date' },
        year: { $year: '$date' },
        itemType: '$itemType',
        itemDescription: '$itemDescription',
      };
    } else {
      groupId = {
        period: { $dayOfWeek: '$date' },
        itemType: '$itemType',
        itemDescription: '$itemDescription',
      };
    }

    const rows = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          totalQty: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.period': 1 } },
    ]);

    const result = rows.map((r) => ({
      period: r._id.period,
      year: r._id.year || null,
      itemType: r._id.itemType,
      itemDescription: r._id.itemDescription,
      totalQty: parseFloat((r.totalQty || 0).toFixed(3)),
      avgQty: r.count > 0 ? parseFloat((r.totalQty / r.count).toFixed(3)) : 0,
      totalAmount: r.totalAmount,
      avgAmount: r.count > 0 ? Math.round(r.totalAmount / r.count) : 0,
      count: r.count,
    }));

    const itemTypes = await Expense.distinct('itemType', {
      user: req.user._id,
      date: { $gte: start, $lte: now },
    });

    const descRaw = await Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: { description: '$itemDescription', itemType: '$itemType' },
        },
      },
      { $sort: { '_id.description': 1 } },
    ]);
    const itemDescs = descRaw.map((d) => ({
      description: d._id.description,
      itemType: d._id.itemType,
    }));

    res.json({ rows: result, itemTypes: itemTypes.sort(), itemDescs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Expense vs Income PDF Export ─────────────────────────────────────────────
const PDFDocument = require('pdfkit');

router.get('/expense-vs-income-pdf', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const token = req.query.token;
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Not authorized' });

    const year = parseInt(req.query.year) || new Date().getFullYear();

    const expData = await Expense.aggregate([
      {
        $match: {
          user: user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
    ]);
    const incData = await Income.aggregate([
      {
        $match: {
          user: user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59),
          },
        },
      },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
    ]);

    const MONTHS = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthly = MONTHS.map((name, i) => {
      const exp = expData.find((e) => e._id === i + 1);
      const inc = incData.find((e) => e._id === i + 1);
      const expense = exp?.total || 0;
      const income = inc?.total || 0;
      return { name, expense, income, balance: income - expense };
    });
    const totalExpense = expData.reduce((s, e) => s + e.total, 0);
    const totalIncome = incData.reduce((s, e) => s + e.total, 0);
    const balance = totalIncome - totalExpense;

    // ── helpers ──────────────────────────────────────────────────────────────
    const fmt = (n) => 'BDT ' + Math.round(n).toLocaleString();
    const fmtBal = (n) =>
      (n >= 0 ? '+' : '') + 'BDT ' + Math.round(Math.abs(n)).toLocaleString();

    // ── PDF setup ─────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=expense-vs-income-${year}.pdf`,
    );
    doc.pipe(res);

    const PW = doc.page.width; // 595
    const PH = doc.page.height; // 842
    const ML = 40; // left margin
    const MR = 40; // right margin
    const CW = PW - ML - MR; // content width = 515

    // ── 1. Header bar ─────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 60).fill('#2b6cb0');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Expense vs Income Report', ML, 14, { width: CW, align: 'center' });
    const nowDhaka = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Year: ${year}   |   Generated: ${nowDhaka} (Dhaka)`, ML, 38, {
        width: CW,
        align: 'center',
      });

    // ── 2. Summary cards ─────────────────────────────────────────────────────
    const CARD_Y = 75;
    const CARD_H = 46;
    const CARD_W = (CW - 20) / 3;
    const cards = [
      { label: 'Total Income', value: fmt(totalIncome), color: '#38a169' },
      { label: 'Total Expense', value: fmt(totalExpense), color: '#e53e3e' },
      {
        label: 'Net Balance',
        value: fmtBal(balance),
        color: balance >= 0 ? '#38a169' : '#e53e3e',
      },
    ];
    cards.forEach((c, i) => {
      const cx = ML + i * (CARD_W + 10);
      doc.rect(cx, CARD_Y, CARD_W, CARD_H).fill(c.color);
      doc
        .fillColor('#ffffff')
        .font('Helvetica')
        .fontSize(9)
        .text(c.label, cx, CARD_Y + 9, { width: CARD_W, align: 'center' });
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(c.value, cx, CARD_Y + 24, { width: CARD_W, align: 'center' });
    });

    // ── 3. Section title ─────────────────────────────────────────────────────
    const SEC_Y = CARD_Y + CARD_H + 14;
    doc
      .fillColor('#1a202c')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Monthly Breakdown', ML, SEC_Y);

    // ── 4. Table ──────────────────────────────────────────────────────────────
    // columns: Month | Income | Expense | Balance
    const COL_X = [ML, ML + 160, ML + 295, ML + 425];
    const COL_W = [155, 130, 125, 85];
    const ROW_H = 22;
    let CY = SEC_Y + 18; // current Y

    // table header
    doc.rect(ML, CY, CW, ROW_H).fill('#2b6cb0');
    ['Month', 'Income (BDT)', 'Expense (BDT)', 'Balance (BDT)'].forEach(
      (h, i) => {
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(h, COL_X[i], CY + 6, {
            width: COL_W[i],
            align: i === 0 ? 'left' : 'right',
          });
      },
    );
    CY += ROW_H;

    // data rows
    monthly.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? '#f0f4ff' : '#ffffff';
      doc.rect(ML, CY, CW, ROW_H).fill(bg);

      doc
        .fillColor('#1a202c')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(row.name, COL_X[0], CY + 6, { width: COL_W[0], align: 'left' });
      doc
        .fillColor('#276749')
        .font('Helvetica')
        .fontSize(9)
        .text(fmt(row.income), COL_X[1], CY + 6, {
          width: COL_W[1],
          align: 'right',
        });
      doc
        .fillColor('#9b2c2c')
        .font('Helvetica')
        .fontSize(9)
        .text(fmt(row.expense), COL_X[2], CY + 6, {
          width: COL_W[2],
          align: 'right',
        });
      doc
        .fillColor(row.balance >= 0 ? '#276749' : '#9b2c2c')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(fmtBal(row.balance), COL_X[3], CY + 6, {
          width: COL_W[3],
          align: 'right',
        });

      // thin row border
      doc.rect(ML, CY, CW, ROW_H).stroke('#d1d5db').strokeOpacity(0.4);
      CY += ROW_H;
    });

    // TOTAL row
    doc.rect(ML, CY, CW, ROW_H + 2).fill('#dbeafe');
    doc
      .fillColor('#1a202c')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TOTAL', COL_X[0], CY + 6, { width: COL_W[0], align: 'left' });
    doc
      .fillColor('#276749')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(fmt(totalIncome), COL_X[1], CY + 6, {
        width: COL_W[1],
        align: 'right',
      });
    doc
      .fillColor('#9b2c2c')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(fmt(totalExpense), COL_X[2], CY + 6, {
        width: COL_W[2],
        align: 'right',
      });
    doc
      .fillColor(balance >= 0 ? '#276749' : '#9b2c2c')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(fmtBal(balance), COL_X[3], CY + 6, {
        width: COL_W[3],
        align: 'right',
      });

    // ── 5. Footer (absolute bottom) ───────────────────────────────────────────
    const FOOTER_Y = PH - 28;
    doc.rect(0, FOOTER_Y - 6, PW, 34).fill('#f1f5f9');
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'expensemasterone.vercel.app   |   Developed by Zahid Hasan   Mobile: 01745940065',
        ML,
        FOOTER_Y,
        { width: CW - 80, align: 'left' },
      );
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(8)
      .text('Page 1 of 1', ML, FOOTER_Y, { width: CW, align: 'right' });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
