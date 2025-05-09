const express = require('express');
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats
} = require('../controllers/suppliers');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Apply the protect middleware to all routes
router.use(protect);

// Stats route
router.route('/stats').get(getSupplierStats);

// Main routes
router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .get(getSupplier)
  .put(updateSupplier)
  .delete(deleteSupplier);

module.exports = router; 