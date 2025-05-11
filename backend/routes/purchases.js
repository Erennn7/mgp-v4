const express = require('express');
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchaseStats,
  getPurchasesBySupplier
} = require('../controllers/purchases');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Special routes
router.get('/stats', protect, getPurchaseStats);
router.get('/supplier/:id', protect, getPurchasesBySupplier);

// Standard routes
router
  .route('/')
  .get(protect, getPurchases)
  .post(protect, createPurchase);

router
  .route('/:id')
  .get(protect, getPurchase)
  .put(protect, updatePurchase)
  .delete(protect, authorize('admin'), deletePurchase);

module.exports = router; 
module.exports = router; 
