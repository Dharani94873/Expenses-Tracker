const Category = require('../models/Category');

const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: 'expense' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#96CEB4', type: 'expense' },
  { name: 'Health & Fitness', icon: '💊', color: '#FFEAA7', type: 'expense' },
  { name: 'Utilities', icon: '💡', color: '#DDA0DD', type: 'expense' },
  { name: 'Housing & Rent', icon: '🏠', color: '#98D8C8', type: 'expense' },
  { name: 'Education', icon: '📚', color: '#F7DC6F', type: 'expense' },
  { name: 'Travel', icon: '✈️', color: '#85C1E9', type: 'expense' },
  { name: 'Personal Care', icon: '💄', color: '#F1948A', type: 'expense' },
  { name: 'Subscriptions', icon: '📱', color: '#A9CCE3', type: 'expense' },
  { name: 'Insurance', icon: '🛡️', color: '#A3E4D7', type: 'expense' },
  { name: 'Gifts & Donations', icon: '🎁', color: '#F9E79F', type: 'expense' },
  { name: 'Other Expense', icon: '💸', color: '#BDC3C7', type: 'expense' },
  // Income categories
  { name: 'Salary', icon: '💼', color: '#00E676', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#69F0AE', type: 'income' },
  { name: 'Business', icon: '📊', color: '#B9F6CA', type: 'income' },
  { name: 'Investments', icon: '📈', color: '#00B0FF', type: 'income' },
  { name: 'Rental Income', icon: '🏘️', color: '#80D8FF', type: 'income' },
  { name: 'Gift Received', icon: '🎀', color: '#EA80FC', type: 'income' },
  { name: 'Other Income', icon: '💰', color: '#CCFF90', type: 'income' },
];

const seedCategories = async () => {
  try {
    const existingCount = await Category.countDocuments({ userId: null });
    if (existingCount > 0) return; // Already seeded

    await Category.insertMany(
      DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId: null, isDefault: true }))
    );
    console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  } catch (error) {
    console.error('❌ Category seed failed:', error.message);
  }
};

module.exports = seedCategories;
