const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const Expense = require('../models/Expense');
const User = require('../models/User');

const protectQuery = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
      req.query.token;
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const { protect } = require('../middleware/auth');

const getFilteredExpenses = async (userId, query) => {
  const { startDate, endDate, month, year, itemType } = query;
  let filter = { user: userId };
  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate + 'T23:59:59'),
    };
  } else if (month && year) {
    filter.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59),
    };
  } else if (year) {
    filter.date = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59),
    };
  }
  if (itemType) filter.itemType = itemType;
  return await Expense.find(filter).sort({ date: 1 });
};

const formatDate = (date) => {
  const d = new Date(date);
  return (
    d.getDate().toString().padStart(2, '0') +
    '/' +
    (d.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
};

const formatDateTime = (date) => {
  const now = new Date(
    new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
  );
  const dd = now.getDate().toString().padStart(2, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min + ':' + ss;
};

const MONTH_NAMES = [
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

// ── Export Excel (filtered) ──────────────────────────────────────────────────
router.get('/excel', protectQuery, async (req, res) => {
  try {
    const expenses = await getFilteredExpenses(req.user._id, req.query);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalQty = expenses.reduce((s, e) => s + (e.quantity || 0), 0);
    const data = expenses.map((e, i) => ({
      '#': i + 1,
      Date: formatDate(e.date),
      Month: new Date(e.date).toLocaleString('default', { month: 'long' }),
      Year: new Date(e.date).getFullYear(),
      'Item Type': e.itemType,
      'Item Description': e.itemDescription,
      Unit: e.unit,
      Quantity: e.quantity,
      'Amount (BDT)': e.amount,
      Remarks: e.remarks,
    }));
    data.push({
      '#': '',
      Date: '',
      Month: '',
      Year: '',
      'Item Type': '',
      'Item Description': '',
      Unit: '',
      Quantity: totalQty,
      'Amount (BDT)': total,
      Remarks: 'TOTAL',
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 12 },
      { wch: 6 },
      { wch: 16 },
      { wch: 22 },
      { wch: 8 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=expenses_' + Date.now() + '.xlsx',
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Export PDF (filtered, A4 Portrait) ──────────────────────────────────────
router.get('/pdf', protectQuery, async (req, res) => {
  try {
    const expenses = await getFilteredExpenses(req.user._id, req.query);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalQty = expenses.reduce((s, e) => s + (e.quantity || 0), 0);

    const fmtQty = (q) => {
      const n = parseFloat(q) || 0;
      return Number.isInteger(n)
        ? n.toString()
        : parseFloat(n.toFixed(3)).toString();
    };

    const PAGE_W = 595.28,
      PAGE_H = 841.89,
      MARGIN_X = 30;
    const TABLE_W = PAGE_W - MARGIN_X * 2;
    const ROW_H = 18,
      HEADER_H = 22,
      FOOTER_H = 20;
    const CONTENT_MAX_Y = PAGE_H - FOOTER_H - 10;
    const FONT_SIZE = 7.5,
      HEADER_FONT_SIZE = 7.5,
      CELL_PAD = 6;

    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: true,
      bufferPages: true,
    });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=expenses_' + Date.now() + '.pdf',
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    });
    doc.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    });

    const headers = [
      '#',
      'Date',
      'Month',
      'Year',
      'Item Type',
      'Description',
      'Unit',
      'Qty',
      'Amount (BDT)',
      'Remarks',
    ];
    const measureText = (text, font, size) => {
      doc.font(font).fontSize(size);
      return doc.widthOfString(String(text));
    };
    const minWidths = [4, 28, 20, 16, 30, 40, 14, 14, 30, 30];
    const colAlign = (i) => (i === 7 || i === 8 ? 'right' : 'left');

    const rawWidths = headers.map((h, i) => {
      let max = measureText(h, 'Helvetica-Bold', HEADER_FONT_SIZE);
      expenses.forEach((e) => {
        const vals = [
          '',
          formatDate(e.date),
          new Date(e.date).toLocaleString('default', { month: 'short' }),
          new Date(e.date).getFullYear().toString(),
          e.itemType || '',
          e.itemDescription || '',
          e.unit || '',
          fmtQty(e.quantity),
          e.amount.toFixed(2),
          e.remarks || '',
        ];
        const w = measureText(vals[i], 'Helvetica', FONT_SIZE);
        if (w > max) max = w;
      });
      if (i === 0) {
        const n = measureText(
          expenses.length.toString(),
          'Helvetica',
          FONT_SIZE,
        );
        if (n > max) max = n;
      }
      const tv = [
        '',
        '',
        '',
        '',
        '',
        'GRAND TOTAL',
        '',
        fmtQty(totalQty),
        total.toFixed(2),
        '',
      ];
      const tw = measureText(tv[i], 'Helvetica-Bold', 9);
      if (tw > max) max = tw;
      return max;
    });

    const paddedWidths = rawWidths.map((w, i) =>
      Math.max(w + CELL_PAD * 2, minWidths[i]),
    );
    const rawTotal = paddedWidths.reduce((a, b) => a + b, 0);
    let colWidths;
    if (rawTotal > TABLE_W) {
      const scale = TABLE_W / rawTotal;
      colWidths = paddedWidths.map((w) => Math.floor(w * scale));
    } else {
      colWidths = [...paddedWidths];
      const extra = TABLE_W - rawTotal;
      colWidths[5] += Math.floor(extra * 0.6);
      colWidths[9] += Math.floor(extra * 0.4);
    }
    colWidths[9] += TABLE_W - colWidths.reduce((a, b) => a + b, 0);

    const drawTableHeader = (y) => {
      doc.fillColor('#1a365d').rect(MARGIN_X, y, TABLE_W, HEADER_H).fill();
      doc.fillColor('white').fontSize(HEADER_FONT_SIZE).font('Helvetica-Bold');
      let x = MARGIN_X;
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + 6, {
          width: colWidths[i] - 3,
          align: colAlign(i),
          lineBreak: false,
        });
        x += colWidths[i];
      });
      return y + HEADER_H;
    };

    const getDateRange = () => {
      const { startDate, endDate, month, year } = req.query;
      if (startDate && endDate)
        return {
          from: formatDate(new Date(startDate)),
          to: formatDate(new Date(endDate)),
        };
      else if (month && year)
        return {
          from: formatDate(new Date(year, month - 1, 1)),
          to: formatDate(new Date(year, month, 0)),
        };
      else if (year)
        return {
          from: formatDate(new Date(year, 0, 1)),
          to: formatDate(new Date(year, 11, 31)),
        };
      else if (expenses.length > 0) {
        const dates = expenses.map((e) => new Date(e.date));
        return {
          from: formatDate(new Date(Math.min(...dates))),
          to: formatDate(new Date(Math.max(...dates))),
        };
      }
      return { from: '-', to: '-' };
    };

    const drawPageTitle = (y) => {
      doc
        .fillColor('#1a365d')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Expense Report', MARGIN_X, y, {
          align: 'center',
          width: TABLE_W,
        });
      y += 22;
      const { from, to } = getDateRange();
      doc
        .fillColor('#555')
        .fontSize(9)
        .font('Helvetica')
        .text('Generated: ' + formatDateTime(new Date()), MARGIN_X, y, {
          align: 'center',
          width: TABLE_W,
        });
      y += 14;
      doc
        .fillColor('#555')
        .fontSize(9)
        .font('Helvetica')
        .text('From: ' + from + '   To: ' + to, MARGIN_X, y, {
          align: 'center',
          width: TABLE_W,
        });
      return y + 18;
    };

    let y = 30;
    y = drawPageTitle(y);
    y += 6;
    y = drawTableHeader(y);
    doc.font('Helvetica').fontSize(FONT_SIZE).fillColor('#2d3748');

    expenses.forEach((e, idx) => {
      if (y + ROW_H > CONTENT_MAX_Y) {
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
        y = 30;
        y = drawTableHeader(y);
        doc.font('Helvetica').fontSize(FONT_SIZE).fillColor('#2d3748');
      }
      const rowColor = idx % 2 === 0 ? '#f7fafc' : '#ffffff';
      doc.fillColor(rowColor).rect(MARGIN_X, y, TABLE_W, ROW_H).fill();
      doc.fillColor('#2d3748');
      const row = [
        (idx + 1).toString(),
        formatDate(e.date),
        new Date(e.date).toLocaleString('default', { month: 'short' }),
        new Date(e.date).getFullYear().toString(),
        e.itemType || '',
        e.itemDescription || '',
        e.unit || '',
        fmtQty(e.quantity),
        e.amount.toFixed(2),
        e.remarks || '',
      ];
      let x = MARGIN_X;
      row.forEach((cell, i) => {
        doc.text(cell, x + 3, y + 4, {
          width: colWidths[i] - 6,
          align: colAlign(i),
          lineBreak: false,
          ellipsis: true,
        });
        x += colWidths[i];
      });
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(MARGIN_X, y + ROW_H)
        .lineTo(MARGIN_X + TABLE_W, y + ROW_H)
        .stroke();
      y += ROW_H;
    });

    const TOTAL_PADDING_Y = 7,
      TOTAL_FONT_SIZE = 9;
    const totalRow = [
      '',
      '',
      '',
      '',
      '',
      'GRAND TOTAL',
      '',
      fmtQty(totalQty),
      total.toFixed(2),
      '',
    ];
    doc.fontSize(TOTAL_FONT_SIZE).font('Helvetica-Bold');
    let maxTotalRowH = 26;
    totalRow.forEach((cell, i) => {
      if (!cell) return;
      const h =
        doc.heightOfString(cell, {
          width: colWidths[i] - 6,
          lineBreak: false,
        }) +
        TOTAL_PADDING_Y * 2;
      if (h > maxTotalRowH) maxTotalRowH = h;
    });
    if (y + maxTotalRowH > CONTENT_MAX_Y) {
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      y = 30;
    }
    doc.fillColor('#ebf8ff').rect(MARGIN_X, y, TABLE_W, maxTotalRowH).fill();
    doc
      .strokeColor('#2b6cb0')
      .lineWidth(1.5)
      .moveTo(MARGIN_X, y)
      .lineTo(MARGIN_X + TABLE_W, y)
      .stroke();
    doc.fillColor('#1a365d').fontSize(TOTAL_FONT_SIZE).font('Helvetica-Bold');
    let x = MARGIN_X;
    totalRow.forEach((cell, i) => {
      doc.text(cell, x + 3, y + TOTAL_PADDING_Y, {
        width: colWidths[i] - 6,
        align: colAlign(i),
        lineBreak: false,
        ellipsis: false,
      });
      x += colWidths[i];
    });

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const fy = PAGE_H - 16;
      doc.save();
      doc
        .strokeColor('#cbd5e0')
        .lineWidth(0.5)
        .moveTo(MARGIN_X, fy - 5)
        .lineTo(MARGIN_X + TABLE_W, fy - 5)
        .stroke();
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#777')
        .text(
          'expensemasterone.vercel.app  |  Developed by Zahid Hasan Mobile: 01745940065',
          MARGIN_X,
          fy,
          {
            width: TABLE_W * 0.6,
            align: 'left',
            lineBreak: false,
          },
        );
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#777')
        .text('Page ' + (i + 1) + ' of ' + totalPages, MARGIN_X, fy, {
          width: TABLE_W,
          align: 'right',
          lineBreak: false,
        });
      doc.restore();
    }
    doc.flushPages();
    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: error.message });
  }
});

// ── Helper: build date filter for yearly/monthly summary ─────────────────────
const buildSummaryDateFilter = (year, month) => {
  const y = parseInt(year);
  const m = month ? parseInt(month) : null;
  if (m) {
    return {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59),
    };
  }
  return {
    $gte: new Date(y, 0, 1),
    $lte: new Date(y, 11, 31, 23, 59, 59),
  };
};

// ── Yearly/Monthly Summary API (JSON — for preview) ──────────────────────────
router.get('/yearly-summary', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : null;

    const rows = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: buildSummaryDateFilter(year, month),
        },
      },
      {
        $group: {
          _id: '$itemType',
          totalQty: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = rows.map((r) => ({
      itemType: r._id,
      totalQty: parseFloat((r.totalQty || 0).toFixed(3)),
      totalAmount: r.totalAmount,
      count: r.count,
    }));
    const totalQty = result.reduce((s, r) => s + r.totalQty, 0);
    const totalAmount = result.reduce((s, r) => s + r.totalAmount, 0);
    res.json({ rows: result, totalQty, totalAmount, year, month });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Yearly/Monthly Summary Excel ──────────────────────────────────────────────
router.get('/yearly-excel', protectQuery, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : null;
    const periodLabel = month
      ? MONTH_NAMES[month - 1] + ' ' + year
      : 'Full Year ' + year;

    const rows = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: buildSummaryDateFilter(year, month),
        },
      },
      {
        $group: {
          _id: '$itemType',
          totalQty: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalQty = rows.reduce((s, r) => s + (r.totalQty || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0);

    const data = rows.map((r, i) => ({
      '#': i + 1,
      'Item Type': r._id,
      'Total Qty': parseFloat((r.totalQty || 0).toFixed(3)),
      'Total Amount (BDT)': r.totalAmount,
    }));
    data.push({
      '#': '',
      'Item Type': 'TOTAL',
      'Total Qty': parseFloat(totalQty.toFixed(3)),
      'Total Amount (BDT)': totalAmount,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Summary ' + (month ? MONTH_NAMES[month - 1].slice(0, 3) : year),
    );
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = month
      ? 'summary_' +
        MONTH_NAMES[month - 1].toLowerCase() +
        '_' +
        year +
        '_' +
        Date.now() +
        '.xlsx'
      : 'yearly_summary_' + year + '_' + Date.now() + '.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Yearly/Monthly Summary PDF ────────────────────────────────────────────────
router.get('/yearly-pdf', protectQuery, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : null;
    const periodLabel = month
      ? MONTH_NAMES[month - 1] + ' ' + year
      : 'Year ' + year;

    const rows = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: buildSummaryDateFilter(year, month),
        },
      },
      {
        $group: {
          _id: '$itemType',
          totalQty: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalQty = rows.reduce((s, r) => s + (r.totalQty || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0);

    const fmtQty = (q) => {
      const n = parseFloat(q) || 0;
      return Number.isInteger(n)
        ? n.toString()
        : parseFloat(n.toFixed(3)).toString();
    };

    const PAGE_W = 595.28,
      PAGE_H = 841.89,
      MARGIN_X = 30;
    const TABLE_W = PAGE_W - MARGIN_X * 2;
    const ROW_H = 18,
      HEADER_H = 22,
      FOOTER_H = 20;
    const CONTENT_MAX_Y = PAGE_H - FOOTER_H - 10;

    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: true,
      bufferPages: true,
    });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      const filename = month
        ? 'summary_' +
          MONTH_NAMES[month - 1].toLowerCase() +
          '_' +
          year +
          '_' +
          Date.now() +
          '.pdf'
        : 'yearly_summary_' + year + '_' + Date.now() + '.pdf';
      res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    });
    doc.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    });

    const headers = ['#', 'Item Type', 'Total Qty', 'Total Amount (BDT)'];
    const colRatios = [0.06, 0.52, 0.18, 0.24];
    const colWidths = colRatios.map((r) => Math.floor(TABLE_W * r));
    colWidths[3] += TABLE_W - colWidths.reduce((a, b) => a + b, 0);
    const colAlign = (i) => (i === 2 || i === 3 ? 'right' : 'left');

    const drawHeader = (y) => {
      doc.fillColor('#1a365d').rect(MARGIN_X, y, TABLE_W, HEADER_H).fill();
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
      let x = MARGIN_X;
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + 6, {
          width: colWidths[i] - 3,
          align: colAlign(i),
          lineBreak: false,
        });
        x += colWidths[i];
      });
      return y + HEADER_H;
    };

    let y = 30;
    doc
      .fillColor('#1a365d')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Item Type Summary — ' + periodLabel, MARGIN_X, y, {
        align: 'center',
        width: TABLE_W,
      });
    y += 22;
    doc
      .fillColor('#555')
      .fontSize(9)
      .font('Helvetica')
      .text('Generated: ' + formatDateTime(new Date()), MARGIN_X, y, {
        align: 'center',
        width: TABLE_W,
      });
    y += 20;
    y = drawHeader(y);
    doc.font('Helvetica').fontSize(8).fillColor('#2d3748');

    rows.forEach((r, idx) => {
      if (y + ROW_H > CONTENT_MAX_Y) {
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
        y = 30;
        y = drawHeader(y);
        doc.font('Helvetica').fontSize(8).fillColor('#2d3748');
      }
      const rowColor = idx % 2 === 0 ? '#f7fafc' : '#ffffff';
      doc.fillColor(rowColor).rect(MARGIN_X, y, TABLE_W, ROW_H).fill();
      doc.fillColor('#2d3748');
      const row = [
        (idx + 1).toString(),
        r._id,
        fmtQty(r.totalQty),
        r.totalAmount.toFixed(2),
      ];
      let x = MARGIN_X;
      row.forEach((cell, i) => {
        doc.text(cell, x + 3, y + 4, {
          width: colWidths[i] - 6,
          align: colAlign(i),
          lineBreak: false,
          ellipsis: true,
        });
        x += colWidths[i];
      });
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(MARGIN_X, y + ROW_H)
        .lineTo(MARGIN_X + TABLE_W, y + ROW_H)
        .stroke();
      y += ROW_H;
    });

    if (y + 28 > CONTENT_MAX_Y) {
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      y = 30;
    }
    doc.fillColor('#ebf8ff').rect(MARGIN_X, y, TABLE_W, 26).fill();
    doc
      .strokeColor('#2b6cb0')
      .lineWidth(1.5)
      .moveTo(MARGIN_X, y)
      .lineTo(MARGIN_X + TABLE_W, y)
      .stroke();
    doc.fillColor('#1a365d').fontSize(9).font('Helvetica-Bold');
    let x = MARGIN_X;
    ['', 'GRAND TOTAL', fmtQty(totalQty), totalAmount.toFixed(2)].forEach(
      (cell, i) => {
        doc.text(cell, x + 3, y + 7, {
          width: colWidths[i] - 6,
          align: colAlign(i),
          lineBreak: false,
        });
        x += colWidths[i];
      },
    );

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const fy = PAGE_H - 16;
      doc.save();
      doc
        .strokeColor('#cbd5e0')
        .lineWidth(0.5)
        .moveTo(MARGIN_X, fy - 5)
        .lineTo(MARGIN_X + TABLE_W, fy - 5)
        .stroke();
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#777')
        .text(
          'expensemasterone.vercel.app  |  Developed by Zahid Hasan Mobile: 01745940065',
          MARGIN_X,
          fy,
          {
            width: TABLE_W * 0.6,
            align: 'left',
            lineBreak: false,
          },
        );
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#777')
        .text('Page ' + (i + 1) + ' of ' + totalPages, MARGIN_X, fy, {
          width: TABLE_W,
          align: 'right',
          lineBreak: false,
        });
      doc.restore();
    }
    doc.flushPages();
    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: error.message });
  }
});

module.exports = router;
