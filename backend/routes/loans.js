const express = require('express');
const {
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  getCustomerLoans,
  addPayment,
  removePayment,
  getLoanStats,
  extendLoan,
  calculateLoan
} = require('../controllers/loans');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Special routes
router.route('/stats').get(getLoanStats);
router.route('/customer/:customerId').get(getCustomerLoans);

// Calculate loan amount
router.route('/:id/calculate').get(calculateLoan);

// Payment routes
router.route('/:id/payments').post(addPayment);
router.route('/:id/payments/:paymentId').delete(authorize('admin'), removePayment);

// Extend loan
router.route('/:id/extensions').post(extendLoan);

// Standard routes
router
  .route('/')
  .get(getLoans)
  .post(createLoan);

router
  .route('/:id')
  .get(getLoan)
  .put(updateLoan)
  .delete(authorize('admin'), deleteLoan);

module.exports = router; 