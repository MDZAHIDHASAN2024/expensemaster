const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

const getFilteredExpenses = async (userId, query) => {
  const { startDate, endDate, month, year, itemType } = query;
  let filter = { user: userId };
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
  } else if (month && year) {
    filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
  } else if (year) {
    filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
  }
  if (itemType) filter.itemType = itemType;
  return await Expense.find(filter).sort({ date: 1 });
};

const formatDate = (date) => {
  const d = new Date(date);
  return d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0') + '/' + d.getFullYear();
};

// Export Excel with Qty sum
router.get('/excel', protect, async (req, res) => {
  try {
    const expenses = await getFilteredExpenses(req.user._id, req.query);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalQty = expenses.reduce((s, e) => s + (e.quantity || 0), 0);
    const data = expenses.map((e, i) => ({
      '#': i + 1, 'Date': formatDate(e.date),
      'Month': new Date(e.date).toLocaleString('default', { month: 'long' }),
      'Year': new Date(e.date).getFullYear(),
      'Item Type': e.itemType, 'Item Description': e.itemDescription,
      'Unit': e.unit, 'Quantity': e.quantity, 'Amount (BDT)': e.amount, 'Remarks': e.remarks
    }));
    data.push({ '#': '', 'Date': '', 'Month': '', 'Year': '', 'Item Type': '', 'Item Description': '', 'Unit': '', 'Quantity': totalQty, 'Amount (BDT)': total, 'Remarks': 'TOTAL' });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch:5 },{ wch:12 },{ wch:12 },{ wch:6 },{ wch:16 },{ wch:22 },{ wch:8 },{ wch:10 },{ wch:14 },{ wch:20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses_' + Date.now() + '.xlsx');
    res.send(buffer);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Export PDF A4 Landscape - fixed pagination
router.get('/pdf', protect, async (req, res) => {
  try {
    const expenses = await getFilteredExpenses(req.user._id, req.query);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalQty = expenses.reduce((s, e) => s + (e.quantity || 0), 0);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses_' + Date.now() + '.pdf');
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginX = 30;
    const tableW = pageW - marginX * 2;
    const rowH = 18;
    const headerH = 22;

    const headers = ['#', 'Date', 'Month', 'Item Type', 'Description', 'Unit', 'Qty', 'Amount (BDT)', 'Remarks'];
    const colRatios = [0.04, 0.09, 0.07, 0.13, 0.19, 0.06, 0.05, 0.13, 0.24];
    const colWidths = colRatios.map(r => Math.floor(tableW * r));

    const drawTableHeader = (y) => {
      doc.fillColor('#1a365d').rect(marginX, y, tableW, headerH).fill();
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      let x = marginX;
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + 6, { width: colWidths[i] - 3, align: i >= 6 ? 'right' : 'left', lineBreak: false });
        x += colWidths[i];
      });
      return y + headerH;
    };

    const drawPageTitle = (y) => {
      doc.fillColor('#1a365d').fontSize(16).font('Helvetica-Bold').text('Expense Report', marginX, y, { align: 'center', width: tableW });
      y += 22;
      let sub = 'Generated: ' + formatDate(new Date());
      if (req.query.month && req.query.year) {
        sub += '  |  Period: ' + new Date(req.query.year, req.query.month - 1).toLocaleString('default', { month: 'long' }) + ' ' + req.query.year;
      } else if (req.query.year) { sub += '  |  Year: ' + req.query.year; }
      doc.fillColor('#555').fontSize(9).font('Helvetica').text(sub, marginX, y, { align: 'center', width: tableW });
      return y + 18;
    };

    let y = 30;
    y = drawPageTitle(y);
    y = drawTableHeader(y);
    doc.font('Helvetica').fontSize(8).fillColor('#2d3748');

    expenses.forEach((e, idx) => {
      if (y + rowH + 30 > pageH - 50) {
        doc.addPage({ layout: 'landscape', size: 'A4' });
        y = 30;
        y = drawTableHeader(y);
        doc.font('Helvetica').fontSize(8).fillColor('#2d3748');
      }
      const rowColor = idx % 2 === 0 ? '#f7fafc' : '#ffffff';
      doc.fillColor(rowColor).rect(marginX, y, tableW, rowH).fill();
      doc.fillColor('#2d3748');
      const row = [(idx+1).toString(), formatDate(e.date), new Date(e.date).toLocaleString('default',{month:'short'}), e.itemType, e.itemDescription, e.unit||'', e.quantity.toString(), e.amount.toFixed(2), e.remarks||''];
      let x = marginX;
      row.forEach((cell, i) => {
        doc.text(cell, x + 3, y + 4, { width: colWidths[i] - 3, align: i >= 6 ? 'right' : 'left', lineBreak: false, ellipsis: true });
        x += colWidths[i];
      });
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(marginX, y + rowH).lineTo(marginX + tableW, y + rowH).stroke();
      y += rowH;
    });

    // Total row
    if (y + 28 > pageH - 20) { doc.addPage({ layout: 'landscape', size: 'A4' }); y = 30; }
    doc.fillColor('#ebf8ff').rect(marginX, y, tableW, 26).fill();
    doc.strokeColor('#2b6cb0').lineWidth(1.5).moveTo(marginX, y).lineTo(marginX + tableW, y).stroke();
    doc.fillColor('#1a365d').fontSize(10).font('Helvetica-Bold');
    let x = marginX;
    ['','','','','GRAND TOTAL','',totalQty.toString(),total.toFixed(2),''].forEach((cell, i) => {
      doc.text(cell, x + 3, y + 7, { width: colWidths[i] - 3, align: i >= 6 ? 'right' : (i === 4 ? 'right' : 'left'), lineBreak: false });
      x += colWidths[i];
    });

    doc.end();
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
