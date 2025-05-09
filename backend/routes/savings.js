const express = require('express');
const {
  getSavings,
  getSaving,
  createSaving,
  updateSaving,
  deleteSaving,
  getCustomerSavings,
  updateInstallment,
  getSavingsStats,
  processInstallmentPayment,
  redeemSaving
} = require('../controllers/savings');

// Import redemption controllers
const {
  getRedemptions,
  getRedemption,
  createRedemption
} = require('../controllers/savingRedemptions');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Special routes
router.get('/stats', protect, getSavingsStats);
router.get('/customer/:customerId', protect, getCustomerSavings);

// Installment routes
router.route('/:id/installments/:installmentId')
  .put(protect, updateInstallment);

// Payment route
router.route('/:id/installments/:installmentId/pay')
  .post(protect, processInstallmentPayment);

// Redemption route
router.route('/:id/redeem')
  .post(protect, redeemSaving);

// Redemption routes through SavingRedemption model
router
  .route('/redemptions')
  .get(protect, getRedemptions)
  .post(protect, createRedemption);

router
  .route('/redemptions/:id')
  .get(protect, getRedemption);

// Standard routes
router
  .route('/')
  .get(protect, getSavings)
  .post(protect, createSaving);

router
  .route('/:id')
  .get(protect, getSaving)
  .put(protect, updateSaving)
  .delete(protect, authorize('admin'), deleteSaving);

module.exports = router; 