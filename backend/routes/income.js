const express = require('express');
const router = express.Router();
const Income = require('../models/Income');
const { protect } = require('../middleware/auth');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const getFilter = (userId, query) => {
  const { startDate, endDate, month, year, incomeType } = query;
  let filter = { user: userId };
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
  } else if (month && year) {
    filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
  } else if (year) {
    filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
  }
  if (incomeType) filter.incomeType = incomeType;
  return filter;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
};

// Get all incomes
router.get('/', protect, async (req, res) => {
  try {
    const filter = getFilter(req.user._id, req.query);
    const incomes = await Income.find(filter).sort({ date: -1 });
    const total = incomes.reduce((s, i) => s + i.amount, 0);
    const totalQty = incomes.reduce((s, i) => s + (i.quantity || 0), 0);
    res.json({ incomes, total, totalQty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add income
router.post('/', protect, async (req, res) => {
  try {
    const income = await Income.create({ user: req.user._id, ...req.body });
    res.status(201).json(income);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update income
router.put('/:id', protect, async (req, res) => {
  try {
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body, { new: true }
    );
    if (!income) return res.status(404).json({ message: 'Not found' });
    res.json(income);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete income
router.delete('/:id', protect, async (req, res) => {
  try {
    await Income.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Monthly stats for analytics
router.get('/stats', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await Income.aggregate([
      { $match: { user: req.user._id, date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) } } },
      { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export Excel
router.get('/report/excel', protect, async (req, res) => {
  try {
    const filter = getFilter(req.user._id, req.query);
    const incomes = await Income.find(filter).sort({ date: 1 });
    const total = incomes.reduce((s, i) => s + i.amount, 0);
    const totalQty = incomes.reduce((s, i) => s + (i.quantity || 0), 0);

    const data = incomes.map((inc, i) => ({
      '#': i + 1,
      'Date': formatDate(inc.date),
      'Month': new Date(inc.date).toLocaleString('default', { month: 'long' }),
      'Year': new Date(inc.date).getFullYear(),
      'Income Type': inc.incomeType,
      'Description': inc.description,
      'Quantity': inc.quantity,
      'Amount (BDT)': inc.amount,
      'Remarks': inc.remarks
    }));
    data.push({ '#': '', 'Date': '', 'Month': '', 'Year': '', 'Income Type': '', 'Description': '', 'Quantity': totalQty, 'Amount (BDT)': total, 'Remarks': 'TOTAL' });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 18 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=income_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export PDF - A4 fixed
router.get('/report/pdf', protect, async (req, res) => {
  try {
    const filter = getFilter(req.user._id, req.query);
    const incomes = await Income.find(filter).sort({ date: 1 });
    const total = incomes.reduce((s, i) => s + i.amount, 0);
    const totalQty = incomes.reduce((s, i) => s + (i.quantity || 0), 0);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=income_${Date.now()}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginX = 30;
    const tableW = pageW - marginX * 2;

    doc.fontSize(18).fillColor('#276749').text('Income Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#555').text(`Generated: ${formatDate(new Date())}`, { align: 'center' });
    doc.moveDown(0.5);

    const headers = ['#', 'Date', 'Income Type', 'Description', 'Qty', 'Amount (BDT)', 'Remarks'];
    const colRatios = [0.04, 0.1, 0.15, 0.2, 0.06, 0.15, 0.3];
    const colWidths = colRatios.map(r => tableW * r);
    const rowH = 18;
    const headerH = 22;

    let y = doc.y;
    let x = marginX;

    // Header row
    doc.fillColor('#276749').rect(marginX, y, tableW, headerH).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, x + 3, y + 5, { width: colWidths[i] - 3, align: i >= 4 ? 'right' : 'left' });
      x += colWidths[i];
    });
    y += headerH;

    doc.font('Helvetica').fontSize(8).fillColor('#2d3748');
    incomes.forEach((inc, idx) => {
      if (y + rowH > pageH - 50) {
        doc.addPage({ layout: 'landscape', size: 'A4' });
        y = 30;
        x = marginX;
        doc.fillColor('#276749').rect(marginX, y, tableW, headerH).fill();
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(h, x + 3, y + 5, { width: colWidths[i] - 3, align: i >= 4 ? 'right' : 'left' });
          x += colWidths[i];
        });
        y += headerH;
        doc.font('Helvetica').fontSize(8).fillColor('#2d3748');
      }

      const rowColor = idx % 2 === 0 ? '#f7fdf9' : 'white';
      doc.fillColor(rowColor).rect(marginX, y, tableW, rowH).fill();
      doc.fillColor('#2d3748');
      const row = [(idx+1).toString(), formatDate(inc.date), inc.incomeType, inc.description, inc.quantity.toString(), inc.amount.toFixed(2), inc.remarks || ''];
      x = marginX;
      row.forEach((cell, i) => {
        doc.text(cell, x + 3, y + 4, { width: colWidths[i] - 3, align: i >= 4 ? 'right' : 'left', lineBreak: false, ellipsis: true });
        x += colWidths[i];
      });
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(marginX, y + rowH).lineTo(marginX + tableW, y + rowH).stroke();
      y += rowH;
    });

    // Total row
    doc.fillColor('#d4edda').rect(marginX, y, tableW, 24).fill();
    doc.fillColor('#276749').fontSize(10).font('Helvetica-Bold');
    x = marginX;
    const totalRow = ['', '', '', 'TOTAL', totalQty.toString(), total.toFixed(2), ''];
    totalRow.forEach((cell, i) => {
      doc.text(cell, x + 3, y + 6, { width: colWidths[i] - 3, align: i >= 4 ? 'right' : 'left', lineBreak: false });
      x += colWidths[i];
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
