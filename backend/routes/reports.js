const express = require('express');
const {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getCustomerReport
} = require('../controllers/reports');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Dashboard stats
router.get('/dashboard', getDashboardStats);

// Sales reports
router.get('/sales', getSalesReport);

// Inventory reports
router.get('/inventory', getInventoryReport);

// Customer reports
router.get('/customers', getCustomerReport);

module.exports = router; 