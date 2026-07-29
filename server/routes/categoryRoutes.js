const express = require('express');
const router = express.Router();
const cc = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { categoryValidator } = require('../middleware/validators/transactionValidator');

router.use(protect);

router.get('/', cc.getCategories);
router.post('/', categoryValidator, cc.createCategory);
router.put('/:id', cc.updateCategory);
router.delete('/:id', cc.deleteCategory);

module.exports = router;
