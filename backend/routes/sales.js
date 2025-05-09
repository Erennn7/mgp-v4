const express = require('express');
const {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  getCustomerSales,
  getSalesStats
} = require('../controllers/sales');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Special routes
router.get('/stats', protect, getSalesStats);
router.get('/customer/:customerId', protect, getCustomerSales);

// Standard routes
router
  .route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router
  .route('/:id')
  .get(protect, getSale)
  .put(protect, updateSale)
  .delete(protect, authorize('admin'), deleteSale);

module.exports = router; 