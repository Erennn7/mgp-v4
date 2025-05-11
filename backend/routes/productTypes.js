const express = require('express');
const {
  getProductTypes,
  createProductType
} = require('../controllers/productTypes');

const router = express.Router();

const { protect } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getProductTypes)
  .post(protect, createProductType);

module.exports = router; 