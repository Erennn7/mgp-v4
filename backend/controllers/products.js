const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Product.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const products = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Handle field mapping for backward compatibility
    const productData = { ...req.body };
    
    // Map legacy fields if present
    if (productData.itemCode && !productData.huidNumber) {
      productData.huidNumber = productData.itemCode;
      delete productData.itemCode;
    }
    
    // IMPORTANT: Skip HUID field completely if empty instead of setting to null
    if (productData.huidNumber === '') {
      delete productData.huidNumber;
    }
    
    if (productData.weight && (!productData.netWeight || !productData.grossWeight)) {
      // If only weight is provided, use it for both net and gross
      if (!productData.netWeight) productData.netWeight = productData.weight;
      if (!productData.grossWeight) productData.grossWeight = productData.weight;
      delete productData.weight;
    }
    
    // Handle stone fields - if hasStone is false, clear the related fields
    if (productData.hasStone === false) {
      productData.stoneDetails = '';
      productData.stonePrice = 0;
    }
    
    // Create the product directly with the modified data
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product creation error:', error.message);
    
    // Special handling for duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate HUID number. Please use a unique HUID or leave it empty.'
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Handle field mapping for backward compatibility
    const productData = { ...req.body };
    
    // Map legacy fields if present
    if (productData.itemCode && !productData.huidNumber) {
      productData.huidNumber = productData.itemCode;
      delete productData.itemCode;
    }
    
    // Special handling for HUID field - if it's empty or null, completely remove it from the update
    if (productData.huidNumber === '' || productData.huidNumber === null) {
      delete productData.huidNumber;
      
      // If this product already has a HUID in the database, we need to manually remove it using $unset
      if (product.huidNumber) {
        await Product.updateOne({ _id: req.params.id }, { $unset: { huidNumber: 1 } });
        
        // After unsetting, proceed with the rest of the updates
        delete productData.huidNumber; // Make sure it's deleted from the update
      }
    }
    
    // Process weight fields
    if (productData.weight && (!productData.netWeight || !productData.grossWeight)) {
      // If only weight is provided, use it for both net and gross
      if (!productData.netWeight) productData.netWeight = productData.weight;
      if (!productData.grossWeight) productData.grossWeight = productData.weight;
      delete productData.weight;
    }
    
    // Handle stone fields - if hasStone is false, clear the related fields
    if (productData.hasStone === false) {
      productData.stoneDetails = '';
      productData.stonePrice = 0;
    }

    product = await Product.findByIdAndUpdate(req.params.id, productData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product update error:', error.message);
    
    // Special handling for duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate HUID number. Please use a unique HUID or leave it empty.'
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
}); 