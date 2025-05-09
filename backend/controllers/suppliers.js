const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get all supplier purchases
// @route   GET /api/suppliers
// @access  Private
exports.getSuppliers = asyncHandler(async (req, res, next) => {
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
  let query = Supplier.find(JSON.parse(queryStr))
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
  const total = await Supplier.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const suppliers = await query;

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
    count: suppliers.length,
    pagination,
    data: suppliers
  });
});

// @desc    Get single supplier purchase
// @route   GET /api/suppliers/:id
// @access  Private
exports.getSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id)
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!supplier) {
    return res.status(404).json({
      success: false,
      error: 'Supplier purchase not found'
    });
  }

  res.status(200).json({
    success: true,
    data: supplier
  });
});

// @desc    Create new supplier purchase
// @route   POST /api/suppliers
// @access  Private
exports.createSupplier = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Create the supplier purchase
  const supplier = await Supplier.create(req.body);

  // Update product stock for matching products
  for (const item of supplier.items) {
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
    data: supplier
  });
});

// @desc    Update supplier purchase
// @route   PUT /api/suppliers/:id
// @access  Private
exports.updateSupplier = asyncHandler(async (req, res, next) => {
  let supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({
      success: false,
      error: 'Supplier purchase not found'
    });
  }

  supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: supplier
  });
});

// @desc    Delete supplier purchase
// @route   DELETE /api/suppliers/:id
// @access  Private
exports.deleteSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({
      success: false,
      error: 'Supplier purchase not found'
    });
  }

  await supplier.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get supplier purchase stats
// @route   GET /api/suppliers/stats
// @access  Private
exports.getSupplierStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Default to current month if no dates provided
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  
  // Basic stats
  const stats = await Supplier.aggregate([
    {
      $match: {
        purchaseDate: { $gte: start, $lte: end },
        createdBy: req.user._id
      }
    },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        avgAmount: { $avg: '$totalAmount' }
      }
    }
  ]);
  
  // Purchases by category
  const itemsByCategory = await Supplier.aggregate([
    { $match: { purchaseDate: { $gte: start, $lte: end }, createdBy: req.user._id } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        count: { $sum: 1 },
        totalWeight: { $sum: '$items.weight' },
        totalAmount: { $sum: '$items.totalAmount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
  
  // Purchases by payment method
  const purchasesByPaymentMethod = await Supplier.aggregate([
    { $match: { purchaseDate: { $gte: start, $lte: end }, createdBy: req.user._id } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Purchases by month (for the last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const purchasesByMonth = await Supplier.aggregate([
    { $match: { purchaseDate: { $gte: sixMonthsAgo }, createdBy: req.user._id } },
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
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  // Format the data for frontend chart display
  const monthlyData = purchasesByMonth.map(item => ({
    month: `${item._id.year}-${item._id.month}`,
    count: item.count,
    amount: item.totalAmount
  }));
  
  res.status(200).json({
    success: true,
    data: {
      stats: stats.length ? stats[0] : { totalPurchases: 0, totalAmount: 0, avgAmount: 0 },
      itemsByCategory,
      purchasesByPaymentMethod,
      purchasesByMonth: monthlyData
    }
  });
}); 