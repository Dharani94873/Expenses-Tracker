const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const tc = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  transactionValidator,
  updateTransactionValidator,
  listTransactionsValidator,
} = require('../middleware/validators/transactionValidator');

// Receipt upload storage (Cloudinary, in-memory — no disk)
const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'expense_tracker/receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
  },
});
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(protect);

router.get('/', listTransactionsValidator, tc.getTransactions);
router.post('/', uploadReceipt.single('receipt'), transactionValidator, tc.createTransaction);
router.get('/:id', tc.getTransaction);
router.put('/:id', uploadReceipt.single('receipt'), updateTransactionValidator, tc.updateTransaction);
router.delete('/:id', tc.deleteTransaction);
router.post('/upload/receipt', uploadLimiter, uploadReceipt.single('receipt'), tc.uploadReceipt);

module.exports = router;
