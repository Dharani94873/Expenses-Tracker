const { body, param, query } = require('express-validator');
const { validate } = require('./authValidator');

const transactionValidator = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO date'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'upi', 'other']),
  body('isRecurring').optional().isBoolean(),
  body('recurrenceRule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly']),
  body('tags').optional().isArray(),
  body('notes').optional().trim().isLength({ max: 500 }),
  validate,
];

const updateTransactionValidator = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('category').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('description').optional().trim().isLength({ max: 200 }),
  body('paymentMethod').optional().isIn(['cash', 'card', 'bank_transfer', 'upi', 'other']),
  body('tags').optional().isArray(),
  body('notes').optional().trim().isLength({ max: 500 }),
  validate,
];

const listTransactionsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['income', 'expense']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().isMongoId(),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  validate,
];

const budgetValidator = [
  body('category').notEmpty().isMongoId().withMessage('Invalid category ID'),
  body('limitAmount').isFloat({ min: 1 }).withMessage('Limit must be at least 1'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  body('year').isInt({ min: 2020, max: 2100 }).withMessage('Invalid year'),
  body('alertThresholdPercent').optional().isInt({ min: 1, max: 100 }),
  validate,
];

const categoryValidator = [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('icon').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  body('type').optional().isIn(['income', 'expense', 'both']),
  validate,
];

module.exports = {
  transactionValidator,
  updateTransactionValidator,
  listTransactionsValidator,
  budgetValidator,
  categoryValidator,
};
