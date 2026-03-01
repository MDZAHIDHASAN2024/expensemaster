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
  const d = new Date(date);
  const time =
    d.getHours().toString().padStart(2, '0') +
    ':' +
    d.getMinutes().toString().padStart(2, '0') +
    ':' +
    d.getSeconds().toString().padStart(2, '0');
  return formatDate(d) + ' ' + time;
};

// Export Excel
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

// Export PDF - A4 Portrait
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

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN_X = 30;
    const TABLE_W = PAGE_W - MARGIN_X * 2;
    const ROW_H = 18;
    const HEADER_H = 22;
    const FOOTER_H = 20;
    const CONTENT_MAX_Y = PAGE_H - FOOTER_H - 10;
    const FONT_SIZE = 7.5;
    const HEADER_FONT_SIZE = 7.5;
    const CELL_PAD = 6;

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

    // প্রতিটি column-এর সব data (header + rows + total) থেকে সবচেয়ে চওড়া text measure করে dynamic width বের করা
    const measureText = (text, font, size) => {
      doc.font(font).fontSize(size);
      return doc.widthOfString(String(text));
    };

    // প্রতিটি column-এর max content width বের করা
    const minWidths = [
      4, // #       — সংখ্যা ছোট
      28, // Date    — dd/mm/yyyy
      20, // Month   — short month
      16, // Year    — 4 digit
      30, // Item Type
      40, // Description
      14, // Unit
      14, // Qty
      30, // Amount
      30, // Remarks
    ];

    // col index যেগুলো right align
    const colAlign = (i) => (i === 7 || i === 8 ? 'right' : 'left');

    // প্রতিটি column-এর raw max text width (pt) বের করা
    const rawWidths = headers.map((h, i) => {
      // header width
      let max = measureText(h, 'Helvetica-Bold', HEADER_FONT_SIZE);

      // data rows
      expenses.forEach((e) => {
        const cellValues = [
          '', // # — placeholder, আলাদা handle
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
        const w = measureText(cellValues[i], 'Helvetica', FONT_SIZE);
        if (w > max) max = w;
      });

      // # column — row number সর্বোচ্চ কত digit
      if (i === 0) {
        const maxNum = measureText(
          expenses.length.toString(),
          'Helvetica',
          FONT_SIZE,
        );
        if (maxNum > max) max = maxNum;
      }

      // Grand Total row
      const totalRowVals = [
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
      const tw = measureText(totalRowVals[i], 'Helvetica-Bold', 9);
      if (tw > max) max = tw;

      return max;
    });

    // raw width + padding, কিন্তু minimum enforce করা
    const paddedWidths = rawWidths.map((w, i) =>
      Math.max(w + CELL_PAD * 2, minWidths[i]),
    );

    const rawTotal = paddedWidths.reduce((a, b) => a + b, 0);

    // যদি মোট বেশি হয় TABLE_W থেকে — proportionally scale down
    // যদি কম হয় — বাকি জায়গা Description (5) ও Remarks (9) তে দেওয়া
    let colWidths;
    if (rawTotal > TABLE_W) {
      const scale = TABLE_W / rawTotal;
      colWidths = paddedWidths.map((w) => Math.floor(w * scale));
    } else {
      colWidths = [...paddedWidths];
      const extra = TABLE_W - rawTotal;
      // extra space Description ও Remarks এ ভাগ করা (60/40)
      colWidths[5] += Math.floor(extra * 0.6);
      colWidths[9] += Math.floor(extra * 0.4);
    }

    // floating point gap fix — শেষ column-এ বাকি দেওয়া
    const widthSum = colWidths.reduce((a, b) => a + b, 0);
    colWidths[9] += TABLE_W - widthSum;

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
      if (startDate && endDate) {
        return {
          from: formatDate(new Date(startDate)),
          to: formatDate(new Date(endDate)),
        };
      } else if (month && year) {
        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 0);
        return { from: formatDate(from), to: formatDate(to) };
      } else if (year) {
        return {
          from: formatDate(new Date(year, 0, 1)),
          to: formatDate(new Date(year, 11, 31)),
        };
      } else if (expenses.length > 0) {
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
      const generatedLine = 'Generated: ' + formatDateTime(new Date());
      const periodLine = 'From: ' + from + '   To: ' + to;
      doc
        .fillColor('#555')
        .fontSize(9)
        .font('Helvetica')
        .text(generatedLine, MARGIN_X, y, { align: 'center', width: TABLE_W });
      y += 14;
      doc
        .fillColor('#555')
        .fontSize(9)
        .font('Helvetica')
        .text(periodLine, MARGIN_X, y, { align: 'center', width: TABLE_W });
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

    // Grand Total row — auto height, no wrap
    const TOTAL_PADDING_Y = 7;
    const TOTAL_FONT_SIZE = 9;

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

    // Footer on every page
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
        .text('expensemasterone.vercel.app  |  Dev by Zahid', MARGIN_X, fy, {
          width: TABLE_W * 0.6,
          align: 'left',
          lineBreak: false,
        });
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
