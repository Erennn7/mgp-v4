const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'searchTerm'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Base query object
  let queryObj = JSON.parse(queryStr);

  // Add search term filter if provided (search by purchase number or vendor name)
  if (req.query.searchTerm) {
    queryObj = {
      ...queryObj,
      $or: [
        { purchaseNumber: { $regex: req.query.searchTerm, $options: 'i' } },
        { 'vendor.name': { $regex: req.query.searchTerm, $options: 'i' } }
      ]
    };
  }

  // Finding resource
  let query = Purchase.find(queryObj)
    .populate({
      path: 'createdBy',
      select: 'name'
    });

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
    query = query.sort('-purchaseDate');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Purchase.countDocuments(queryObj);

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const purchases = await query;

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
    count: purchases.length,
    pagination,
    total,
    data: purchases
  });
});

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private
exports.getPurchase = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!purchase) {
    return res.status(404).json({
      success: false,
      error: 'Purchase not found'
    });
  }

  res.status(200).json({
    success: true,
    data: purchase
  });
});

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private
exports.createPurchase = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Create the purchase
  const purchase = await Purchase.create(req.body);

  // Update product stock for matching products
  for (const item of purchase.items) {
    // Only update existing products, not entirely new items
    if (item.category && (item.category.includes('Raw') || item.category === 'Other')) {
      continue; // Skip raw materials and other items
    }

    // Try to find a matching product by category, description, weight and purity
    const matchingProducts = await Product.find({
      category: item.category,
      name: { $regex: item.description, $options: 'i' },
      weight: item.weight,
      purity: item.purity
    });

    if (matchingProducts.length > 0) {
      // Update the first matching product's stock
      await Product.findByIdAndUpdate(
        matchingProducts[0]._id,
        { $inc: { stock: item.quantity } },
        { new: true }
      );
    }
  }

  res.status(201).json({
    success: true,
    data: purchase
  });
});

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private
exports.updatePurchase = asyncHandler(async (req, res, next) => {
  let purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    return res.status(404).json({
      success: false,
      error: 'Purchase not found'
    });
  }

  purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: purchase
  });
});

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private
exports.deletePurchase = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    return res.status(404).json({
      success: false,
      error: 'Purchase not found'
    });
  }

  await purchase.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get purchase stats
// @route   GET /api/purchases/stats
// @access  Private
exports.getPurchaseStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Default to current month if no dates provided
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  
  // Purchases by category
  const purchasesByCategory = await Purchase.aggregate([
    {
      $match: {
        purchaseDate: { $gte: start, $lte: end }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$items.totalAmount' },
        totalWeight: { $sum: '$items.weight' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
  
  // Purchases by month
  const purchasesByMonth = await Purchase.aggregate([
    {
      $group: {
        _id: { 
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' } 
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
  
  // Top vendors
  const topVendors = await Purchase.aggregate([
    {
      $match: {
        purchaseDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$vendor.name',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: 5
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      purchasesByCategory,
      purchasesByMonth,
      topVendors
    }
  });
});

// @desc    Get purchases by supplier
// @route   GET /api/purchases/supplier/:id
// @access  Private
exports.getPurchasesBySupplier = asyncHandler(async (req, res, next) => {
  // First get the customer to find their name
  const Customer = require('../models/Customer');
  const customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
  }
  
  // Find purchases where vendor.name matches customer name
  const purchases = await Purchase.find({ 'vendor.name': customer.name })
    .sort('-purchaseDate');

  res.status(200).json({
    success: true,
    count: purchases.length,
    data: purchases
  });
});
