const express = require('express');
const router = express.Router();
const bc = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { budgetValidator } = require('../middleware/validators/transactionValidator');

router.use(protect);

router.get('/', bc.getBudgets);
router.get('/summary', bc.getBudgetSummary);
router.post('/', budgetValidator, bc.upsertBudget);
router.delete('/:id', bc.deleteBudget);

module.exports = router;
