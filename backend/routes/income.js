const express = require('express');
const router = express.Router();
const Income = require('../models/Income');
const { protect } = require('../middleware/auth');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

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

const getFilter = (userId, query) => {
  const { startDate, endDate, month, year, incomeType } = query;
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
  if (incomeType) filter.incomeType = incomeType;
  return filter;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTimeBD = () => {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
  );
  const dd = now.getDate().toString().padStart(2, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

// Dynamic period label
const getPeriodLabel = (query, incomes) => {
  const { startDate, endDate, month, year } = query;
  if (startDate && endDate) {
    return `${formatDate(new Date(startDate))} — ${formatDate(new Date(endDate))}`;
  } else if (month && year) {
    return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
  } else if (year) {
    return `Year ${year}`;
  } else if (incomes.length > 0) {
    const dates = incomes.map((i) => new Date(i.date));
    return `${formatDate(new Date(Math.min(...dates)))} — ${formatDate(new Date(Math.max(...dates)))}`;
  }
  return '';
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
      req.body,
      { new: true },
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
          _id: { month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
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
      Date: formatDate(inc.date),
      Month: new Date(inc.date).toLocaleString('default', { month: 'long' }),
      Year: new Date(inc.date).getFullYear(),
      'Income Type': inc.incomeType,
      Description: inc.description,
      Quantity: inc.quantity,
      'Amount (BDT)': inc.amount,
      Remarks: inc.remarks,
    }));
    data.push({
      '#': '',
      Date: '',
      Month: '',
      Year: '',
      'Income Type': '',
      Description: '',
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
      { wch: 18 },
      { wch: 22 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=income_${Date.now()}.xlsx`,
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export PDF - A4 Landscape
router.get('/report/pdf', protect, async (req, res) => {
  try {
    const filter = getFilter(req.user._id, req.query);
    const incomes = await Income.find(filter).sort({ date: 1 });
    const total = incomes.reduce((s, i) => s + i.amount, 0);
    const totalQty = incomes.reduce((s, i) => s + (i.quantity || 0), 0);
    const periodLabel = getPeriodLabel(req.query, incomes);

    const PAGE_W = 595.28; // A4 portrait width
    const PAGE_H = 841.89; // A4 portrait height
    const MARGIN_X = 30;
    const TABLE_W = PAGE_W - MARGIN_X * 2;
    const ROW_H = 18;
    const HEADER_H = 22;
    const FOOTER_H = 20;
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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=income_${Date.now()}.pdf`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    });

    const headers = [
      '#',
      'Date',
      'Income Type',
      'Description',
      'Qty',
      'Amount (BDT)',
      'Remarks',
    ];
    const colRatios = [0.04, 0.1, 0.15, 0.2, 0.06, 0.15, 0.3];
    const colWidths = colRatios.map((r) => Math.floor(TABLE_W * r));
    colWidths[6] += TABLE_W - colWidths.reduce((a, b) => a + b, 0);

    const REMARKS_PAD_RIGHT = 5;

    const drawTableHeader = (yPos) => {
      let xPos = MARGIN_X;
      doc.fillColor('#276749').rect(MARGIN_X, yPos, TABLE_W, HEADER_H).fill();
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        const isRight = i >= 4;
        const w =
          i === 6 ? colWidths[i] - REMARKS_PAD_RIGHT - 3 : colWidths[i] - 3;
        doc.text(h, xPos + 3, yPos + 5, {
          width: w,
          align: isRight ? 'right' : 'left',
          lineBreak: false,
        });
        xPos += colWidths[i];
      });
      return yPos + HEADER_H;
    };

    // Title section — fixed y positions
    let y = 28;
    doc
      .fontSize(18)
      .fillColor('#276749')
      .font('Helvetica-Bold')
      .text('Income Report', MARGIN_X, y, { align: 'center', width: TABLE_W });
    y += 26;

    if (periodLabel) {
      doc
        .fontSize(11)
        .fillColor('#276749')
        .font('Helvetica-Bold')
        .text(periodLabel, MARGIN_X, y, { align: 'center', width: TABLE_W });
      y += 18;
    }

    doc
      .fontSize(9)
      .fillColor('#555')
      .font('Helvetica')
      .text(`Generated: ${formatDateTimeBD()}`, MARGIN_X, y, {
        align: 'center',
        width: TABLE_W,
      });
    y += 20;

    y = drawTableHeader(y);
    doc.font('Helvetica').fontSize(8).fillColor('#2d3748');

    incomes.forEach((inc, idx) => {
      if (y + ROW_H > CONTENT_MAX_Y) {
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
        y = 30;
        y = drawTableHeader(y);
        doc.font('Helvetica').fontSize(8).fillColor('#2d3748');
      }

      const rowColor = idx % 2 === 0 ? '#f7fdf9' : 'white';
      doc.fillColor(rowColor).rect(MARGIN_X, y, TABLE_W, ROW_H).fill();
      doc.fillColor('#2d3748');

      const row = [
        (idx + 1).toString(),
        formatDate(inc.date),
        inc.incomeType,
        inc.description,
        inc.quantity.toString(),
        inc.amount.toFixed(2),
        inc.remarks || '',
      ];

      let x = MARGIN_X;
      row.forEach((cell, i) => {
        const isRight = i >= 4;
        const w =
          i === 6 ? colWidths[i] - REMARKS_PAD_RIGHT - 3 : colWidths[i] - 3;
        doc.text(cell, x + 3, y + 4, {
          width: w,
          align: isRight ? 'right' : 'left',
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

    // Total row
    if (y + 28 > CONTENT_MAX_Y) {
      doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
      y = 30;
    }
    doc.fillColor('#d4edda').rect(MARGIN_X, y, TABLE_W, 24).fill();
    doc
      .strokeColor('#276749')
      .lineWidth(1.5)
      .moveTo(MARGIN_X, y)
      .lineTo(MARGIN_X + TABLE_W, y)
      .stroke();
    doc.fillColor('#276749').fontSize(10).font('Helvetica-Bold');
    let x = MARGIN_X;
    ['', '', '', 'TOTAL', totalQty.toString(), total.toFixed(2), ''].forEach(
      (cell, i) => {
        const isRight = i >= 4;
        doc.text(cell, x + 3, y + 6, {
          width: colWidths[i] - 3,
          align: isRight ? 'right' : 'left',
          lineBreak: false,
        });
        x += colWidths[i];
      },
    );

    // Footer — every page
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
