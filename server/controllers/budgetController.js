const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// ─── Get All Budgets with Usage ───────────────────────────────
exports.getBudgets = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const budgets = await Budget.find({ userId: req.user._id, month, year })
    .populate('category', 'name icon color type')
    .lean();

  // Calculate actual spending for each budget
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const enriched = await Promise.all(
    budgets.map(async (budget) => {
      const [result] = await Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: budget.category._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const spent = result?.total || 0;
      const percent = Math.min(Math.round((spent / budget.limitAmount) * 100), 999);
      const remaining = Math.max(budget.limitAmount - spent, 0);

      return { ...budget, spent, percent, remaining };
    })
  );

  res.json({ success: true, data: enriched, month, year });
};

// ─── Create / Update Budget ───────────────────────────────────
exports.upsertBudget = async (req, res) => {
  const { category, limitAmount, month, year, alertThresholdPercent } = req.body;

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, category, month, year },
    { limitAmount, alertThresholdPercent, isAlertSent: false },
    { upsert: true, new: true, runValidators: true }
  ).populate('category', 'name icon color type');

  res.status(201).json({ success: true, data: budget });
};

// ─── Delete Budget ────────────────────────────────────────────
exports.deleteBudget = async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget not found' });
  }

  res.json({ success: true, message: 'Budget deleted' });
};

// ─── Get Budget Summary ───────────────────────────────────────
exports.getBudgetSummary = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const budgets = await Budget.find({ userId: req.user._id, month, year })
    .populate('category', 'name icon color')
    .lean();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  let totalBudget = 0;
  let totalSpent = 0;
  const alerts = [];

  for (const budget of budgets) {
    const [result] = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          category: budget.category._id,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const spent = result?.total || 0;
    const percent = Math.round((spent / budget.limitAmount) * 100);
    totalBudget += budget.limitAmount;
    totalSpent += spent;

    if (percent >= budget.alertThresholdPercent) {
      alerts.push({ category: budget.category, spent, limit: budget.limitAmount, percent });
    }
  }

  res.json({
    success: true,
    summary: {
      totalBudget,
      totalSpent,
      totalRemaining: Math.max(totalBudget - totalSpent, 0),
      overallPercent: totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0,
      alerts,
    },
  });
};
