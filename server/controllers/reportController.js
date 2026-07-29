
const Transaction = require('../models/Transaction');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ─── Summary (for Dashboard Charts) ──────────────────────────
exports.getSummary = async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || null;

  const userId = req.user._id;

  // Monthly trend (12 months of the year)
  const monthlyTrend = await Transaction.aggregate([
    {
      $match: {
        userId,
        date: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  // Category breakdown (current month or full year)
  const catFilter = { userId, type: 'expense' };
  if (month) {
    catFilter.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59),
    };
  } else {
    catFilter.date = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
  }

  const categoryBreakdown = await Transaction.aggregate([
    { $match: catFilter },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $project: {
        name: '$category.name',
        icon: '$category.icon',
        color: '$category.color',
        total: 1,
        count: 1,
      },
    },
  ]);

  // Overall totals for current month
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = month ? year : now.getFullYear();
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const [totals] = await Transaction.aggregate([
    { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Re-structure monthly trend into { month, income, expense }[] format
  const trendMap = {};
  monthlyTrend.forEach(({ _id, total }) => {
    if (!trendMap[_id.month]) trendMap[_id.month] = { month: _id.month, income: 0, expense: 0 };
    trendMap[_id.month][_id.type] = total;
  });
  const trend = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: trendMap[i + 1]?.income || 0,
    expense: trendMap[i + 1]?.expense || 0,
  }));

  // Current month totals
  const monthTotals = await Transaction.aggregate([
    { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const income = monthTotals.find((t) => t._id === 'income')?.total || 0;
  const expense = monthTotals.find((t) => t._id === 'expense')?.total || 0;

  // Previous month comparison
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const prevTotals = await Transaction.aggregate([
    { $match: { userId, date: { $gte: prevStart, $lte: prevEnd } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const prevIncome = prevTotals.find((t) => t._id === 'income')?.total || 0;
  const prevExpense = prevTotals.find((t) => t._id === 'expense')?.total || 0;

  res.json({
    success: true,
    data: {
      summary: {
        income,
        expense,
        balance: income - expense,
        savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
        incomeChange: prevIncome ? Math.round(((income - prevIncome) / prevIncome) * 100) : null,
        expenseChange: prevExpense ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null,
      },
      trend,
      categoryBreakdown,
    },
  });
};

// ─── Export as PDF ────────────────────────────────────────────
exports.exportPDF = async (req, res) => {
  const { month, year } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    userId: req.user._id,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('category', 'name icon')
    .sort({ date: -1 })
    .lean();

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="expense-report-${monthName}-${y}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#6c63ff').text('💰 ExpenseTracker', { align: 'center' });
  doc.fontSize(14).fillColor('#333').text(`${monthName} ${y} — Financial Report`, { align: 'center' });
  doc.moveDown();

  // Summary box
  doc.fontSize(11).fillColor('#555');
  doc.text(`Total Income:   $${income.toFixed(2)}`);
  doc.text(`Total Expenses: $${expense.toFixed(2)}`);
  doc.text(`Net Balance:    $${(income - expense).toFixed(2)}`);
  doc.moveDown();

  // Transactions table header
  doc.fontSize(10).fillColor('#6c63ff').text('Date', 50, doc.y, { width: 80, continued: true });
  doc.text('Type', { width: 60, continued: true });
  doc.text('Category', { width: 100, continued: true });
  doc.text('Description', { width: 150, continued: true });
  doc.text('Amount', { width: 80, align: 'right' });
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#6c63ff');
  doc.moveDown(0.3);

  transactions.forEach((t) => {
    const color = t.type === 'income' ? '#00c853' : '#f44336';
    const dateStr = new Date(t.date).toLocaleDateString();
    const amount = `${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)}`;

    doc.fontSize(9).fillColor('#333').text(dateStr, 50, doc.y, { width: 80, continued: true });
    doc.text(t.type, { width: 60, continued: true });
    doc.text(t.category?.name || '-', { width: 100, continued: true });
    doc.text(t.description || '-', { width: 150, continued: true });
    doc.fillColor(color).text(amount, { width: 80, align: 'right' });
    doc.fillColor('#eee').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  });

  doc.end();
};

// ─── Export as Excel ──────────────────────────────────────────
exports.exportExcel = async (req, res) => {
  const { month, year } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);
  const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'long' });

  const transactions = await Transaction.find({
    userId: req.user._id,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('category', 'name')
    .sort({ date: -1 })
    .lean();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ExpenseTracker';
  const sheet = workbook.addWorksheet(`${monthName} ${y}`);

  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Payment Method', key: 'paymentMethod', width: 18 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Tags', key: 'tags', width: 20 },
  ];

  // Style header row
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C63FF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });

  transactions.forEach((t) => {
    const row = sheet.addRow({
      date: new Date(t.date).toLocaleDateString(),
      type: t.type,
      category: t.category?.name || '-',
      description: t.description || '-',
      paymentMethod: t.paymentMethod || '-',
      amount: t.type === 'income' ? t.amount : -t.amount,
      tags: (t.tags || []).join(', '),
    });

    // Color income/expense rows
    const color = t.type === 'income' ? 'FFE8F5E9' : 'FFFFEBEE';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  });

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  summarySheet.addRow(['Period', `${monthName} ${y}`]);
  summarySheet.addRow(['Total Income', income]);
  summarySheet.addRow(['Total Expenses', expense]);
  summarySheet.addRow(['Net Balance', income - expense]);
  summarySheet.addRow(['Savings Rate', income > 0 ? `${Math.round(((income - expense) / income) * 100)}%` : '0%']);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="expense-report-${monthName}-${y}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

// ─── Notifications ────────────────────────────────────────────
const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

  res.json({ success: true, data: notifications, unreadCount });
};

exports.markNotificationRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true }
  );
  res.json({ success: true });
};

exports.markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};
