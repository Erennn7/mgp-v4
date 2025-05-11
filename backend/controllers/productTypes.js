const ProductType = require('../models/ProductType');
const asyncHandler = require('../middleware/async');

// @desc    Get all product types
// @route   GET /api/product-types
// @access  Private
exports.getProductTypes = asyncHandler(async (req, res, next) => {
  const productTypes = await ProductType.find();
  
  res.status(200).json({
    success: true,
    count: productTypes.length,
    data: productTypes
  });
});

// @desc    Create new product type
// @route   POST /api/product-types
// @access  Private
exports.createProductType = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Check if type already exists
  const existingType = await ProductType.findOne({ value: req.body.value });
  
  if (existingType) {
    return res.status(400).json({
      success: false,
      error: 'Product type already exists'
    });
  }
  
  const productType = await ProductType.create(req.body);
  
  res.status(201).json({
    success: true,
    data: productType
  });
}); 