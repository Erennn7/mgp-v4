const express = require('express');
const {
  getRates,
  getRate,
  createRate,
  updateRate,
  deleteRate,
  getLatestRates,
  getRateHistory,
  toggleRateActive
} = require('../controllers/rates');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Special routes
router.get('/latest', protect, getLatestRates);
router.get('/history/:metal/:purity', protect, getRateHistory);
router.patch('/:id/toggle-active', protect, authorize('admin'), toggleRateActive);

// Standard routes
router
  .route('/')
  .get(protect, getRates)
  .post(protect, authorize('admin'), createRate);

router
  .route('/:id')
  .get(protect, getRate)
  .put(protect, authorize('admin'), updateRate)
  .delete(protect, authorize('admin'), deleteRate);

module.exports = router; 