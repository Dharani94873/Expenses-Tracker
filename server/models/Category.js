const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    // null = system/default category (visible to all users)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      default: '💰',
    },
    color: {
      type: String,
      default: '#6c63ff',
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'both'],
      default: 'expense',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Category', categorySchema);
