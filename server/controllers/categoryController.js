const Category = require('../models/Category');

// ─── Get All Categories (system + user's custom) ──────────────
exports.getCategories = async (req, res) => {
  const categories = await Category.find({
    $or: [{ userId: null }, { userId: req.user._id }],
  }).sort({ isDefault: -1, name: 1 });

  res.json({ success: true, data: categories });
};

// ─── Create Custom Category ───────────────────────────────────
exports.createCategory = async (req, res) => {
  const { name, icon, color, type } = req.body;

  // Check for duplicate name (case-insensitive) for this user
  const existing = await Category.findOne({
    $or: [{ userId: req.user._id }, { userId: null }],
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  });

  if (existing) {
    return res.status(409).json({ success: false, message: 'Category with this name already exists' });
  }

  const category = await Category.create({
    userId: req.user._id,
    name,
    icon: icon || '💰',
    color: color || '#6c63ff',
    type: type || 'expense',
  });

  res.status(201).json({ success: true, data: category });
};

// ─── Update Custom Category ───────────────────────────────────
exports.updateCategory = async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id, // Can only update own categories
  });

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found or cannot be modified' });
  }

  const { name, icon, color, type } = req.body;
  if (name) category.name = name;
  if (icon) category.icon = icon;
  if (color) category.color = color;
  if (type) category.type = type;

  await category.save();
  res.json({ success: true, data: category });
};

// ─── Delete Custom Category ───────────────────────────────────
exports.deleteCategory = async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found or cannot be deleted' });
  }

  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
};
