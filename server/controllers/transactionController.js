const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const Category = require('../models/Category');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('../config/cloudinary');

// ─── List Transactions (with search, filter, pagination) ─────
exports.getTransactions = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    startDate,
    endDate,
    search,
    minAmount,
    maxAmount,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  const filter = { userId: req.user._id };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name icon color type')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  });
};

// ─── Create Transaction ───────────────────────────────────────
exports.createTransaction = async (req, res) => {
  const transactionData = {
    ...req.body,
    userId: req.user._id,
    amount: parseFloat(req.body.amount),
  };

  if (req.file) {
    transactionData.receiptUrl = req.file.path;
    transactionData.receiptPublicId = req.file.filename;
  }

  // Set next recurrence date if recurring
  if (transactionData.isRecurring && transactionData.recurrenceRule) {
    transactionData.nextRecurrenceDate = getNextRecurrenceDate(
      new Date(transactionData.date),
      transactionData.recurrenceRule
    );
  }

  const transaction = await Transaction.create(transactionData);
  await transaction.populate('category', 'name icon color type');

  // Check budget if expense
  if (transaction.type === 'expense') {
    await checkBudgetAlert(req.user, transaction);
  }

  res.status(201).json({ success: true, data: transaction });
};

// ─── Get Single Transaction ───────────────────────────────────
exports.getTransaction = async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('category', 'name icon color type');

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  res.json({ success: true, data: transaction });
};

// ─── Update Transaction ───────────────────────────────────────
exports.updateTransaction = async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  // Handle new receipt upload
  if (req.file) {
    // Delete old receipt from Cloudinary
    if (transaction.receiptPublicId) {
      await cloudinary.uploader.destroy(transaction.receiptPublicId);
    }
    req.body.receiptUrl = req.file.path;
    req.body.receiptPublicId = req.file.filename;
  }

  const allowedUpdates = [
    'type', 'amount', 'category', 'description', 'date',
    'paymentMethod', 'receiptUrl', 'receiptPublicId',
    'isRecurring', 'recurrenceRule', 'tags', 'notes',
  ];
  allowedUpdates.forEach((key) => {
    if (req.body[key] !== undefined) transaction[key] = req.body[key];
  });

  await transaction.save();
  await transaction.populate('category', 'name icon color type');

  res.json({ success: true, data: transaction });
};

// ─── Delete Transaction ───────────────────────────────────────
exports.deleteTransaction = async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  // Delete Cloudinary receipt if exists
  if (transaction.receiptPublicId) {
    await cloudinary.uploader.destroy(transaction.receiptPublicId).catch(() => {});
  }

  await transaction.deleteOne();

  res.json({ success: true, message: 'Transaction deleted' });
};

// ─── Upload Receipt ───────────────────────────────────────────
exports.uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, url: req.file.path, publicId: req.file.filename });
};

// ─── Helper: Budget Alert Check ──────────────────────────────
const checkBudgetAlert = async (user, transaction) => {
  try {
    const date = new Date(transaction.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const budget = await Budget.findOne({
      userId: user._id,
      category: transaction.category._id || transaction.category,
      month,
      year,
    });

    if (!budget) return;

    // Sum total expenses for this category this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [result] = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          category: transaction.category._id || transaction.category,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalSpent = result?.total || 0;
    const percent = Math.round((totalSpent / budget.limitAmount) * 100);
    const categoryDoc = await Category.findById(transaction.category._id || transaction.category);
    const categoryName = categoryDoc?.name || 'Unknown';

    if (percent >= budget.alertThresholdPercent && !budget.isAlertSent) {
      // Create in-app notification
      await Notification.create({
        userId: user._id,
        title: `Budget Alert: ${categoryName}`,
        message: `You've used ${percent}% of your ${categoryName} budget ($${totalSpent.toFixed(2)} / $${budget.limitAmount.toFixed(2)})`,
        type: percent >= 100 ? 'budget_exceeded' : 'budget_alert',
        link: '/budgets',
        metadata: { category: categoryName, percent, spent: totalSpent, limit: budget.limitAmount },
      });

      // Send email alert
      if (user.notificationPreferences?.emailAlerts) {
        await sendEmail({
          to: user.email,
          template: 'budgetAlert',
          data: [user.name, categoryName, totalSpent, budget.limitAmount, percent],
        });
      }

      budget.isAlertSent = true;
      await budget.save();
    }

    // Reset alert flag if spending went back below threshold (e.g., after deletion)
    if (percent < budget.alertThresholdPercent && budget.isAlertSent) {
      budget.isAlertSent = false;
      await budget.save();
    }
  } catch (err) {
    // Don't fail the transaction if alert check errors
    console.error('Budget alert check failed:', err.message);
  }
};

// ─── Helper: Next Recurrence Date ────────────────────────────
const getNextRecurrenceDate = (date, rule) => {
  const next = new Date(date);
  switch (rule) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
};

exports.checkBudgetAlert = checkBudgetAlert;
exports.getNextRecurrenceDate = getNextRecurrenceDate;
