const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const Category = require('../models/Category');

// ─── Process Recurring Transactions ──────────────────────────
// Called daily by Vercel Cron at midnight UTC
exports.processRecurringTransactions = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurringDue = await Transaction.find({
      isRecurring: true,
      nextRecurrenceDate: { $lte: today },
    }).populate('category', 'name');

    let created = 0;

    for (const template of recurringDue) {
      // Create new transaction for today
      const newTransaction = await Transaction.create({
        userId: template.userId,
        type: template.type,
        amount: template.amount,
        category: template.category._id,
        description: template.description,
        date: today,
        paymentMethod: template.paymentMethod,
        isRecurring: true,
        recurrenceRule: template.recurrenceRule,
        parentTransactionId: template._id,
        tags: template.tags,
      });

      // Advance next recurrence date
      const next = new Date(template.nextRecurrenceDate);
      switch (template.recurrenceRule) {
        case 'daily': next.setDate(next.getDate() + 1); break;
        case 'weekly': next.setDate(next.getDate() + 7); break;
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      }

      await Transaction.findByIdAndUpdate(template._id, { nextRecurrenceDate: next });
      created++;
    }

    res.json({ success: true, message: `Processed ${created} recurring transactions` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Budget Alert Check ───────────────────────────────────────
// Called daily by Vercel Cron
exports.runBudgetAlerts = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const budgets = await Budget.find({ month, year }).populate('category', 'name');
    let alertsSent = 0;

    for (const budget of budgets) {
      const [result] = await Transaction.aggregate([
        {
          $match: {
            userId: budget.userId,
            category: budget.category._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const spent = result?.total || 0;
      const percent = Math.round((spent / budget.limitAmount) * 100);

      if (percent >= budget.alertThresholdPercent && !budget.isAlertSent) {
        const user = await User.findById(budget.userId);
        if (!user) continue;

        await Notification.create({
          userId: user._id,
          title: `Budget Alert: ${budget.category.name}`,
          message: `You've used ${percent}% of your ${budget.category.name} budget`,
          type: percent >= 100 ? 'budget_exceeded' : 'budget_alert',
          link: '/budgets',
          metadata: { category: budget.category.name, percent, spent, limit: budget.limitAmount },
        });

        if (user.notificationPreferences?.emailAlerts) {
          await sendEmail({
            to: user.email,
            template: 'budgetAlert',
            data: [user.name, budget.category.name, spent, budget.limitAmount, percent],
          });
        }

        budget.isAlertSent = true;
        await budget.save();
        alertsSent++;
      }
    }

    res.json({ success: true, message: `Sent ${alertsSent} budget alerts` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
