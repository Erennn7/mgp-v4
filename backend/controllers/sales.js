const Sale = require('../models/Sale');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = asyncHandler(async (req, res, next) => {
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
  let query = Sale.find(JSON.parse(queryStr))
    .populate({
      path: 'customer',
      select: 'name phone'
    })
    .populate({
      path: 'items.product',
      select: 'name category'
    })
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
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Sale.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const sales = await query;

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
    count: sales.length,
    pagination,
    data: sales
  });
});

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
exports.getSale = asyncHandler(async (req, res, next) => {
  const sale = await Sale.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'name phone email address'
    })
    .populate({
      path: 'items.product',
      select: 'name category type'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Sale not found'
    });
  }

  res.status(200).json({
    success: true,
    data: sale
  });
});

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private
exports.createSale = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.createdBy = req.user.id;
  
  // Create the sale
  const sale = await Sale.create(req.body);

  // Update product stock for each item sold
  for (const item of sale.items) {
    // Skip stock updates for custom products
    if (item.isCustomItem) {
      continue;
    }
    
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } },
      { new: true, runValidators: true }
    );
  }

  res.status(201).json({
    success: true,
    data: sale
  });
});

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private
exports.updateSale = asyncHandler(async (req, res, next) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Sale not found'
    });
  }

  // If items are being updated, we need to adjust stock
  if (req.body.items) {
    // Restore original stock
    for (const item of sale.items) {
      // Skip stock updates for custom products
      if (item.isCustomItem) {
        continue;
      }
      
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { new: true, runValidators: true }
      );
    }

    // Deduct new stock
    for (const item of req.body.items) {
      // Skip stock updates for custom products
      if (item.isCustomItem) {
        continue;
      }
      
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { new: true, runValidators: true }
      );
    }
  }

  // Update the sale record
  const updatedSale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: updatedSale
  });
});

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private
exports.deleteSale = asyncHandler(async (req, res, next) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Sale not found'
    });
  }

  // Restore stock before deleting
  for (const item of sale.items) {
    // Skip stock updates for custom products
    if (item.isCustomItem) {
      continue;
    }
    
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } },
      { new: true, runValidators: true }
    );
  }

  await sale.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get sales by customer
// @route   GET /api/sales/customer/:customerId
// @access  Private
exports.getCustomerSales = asyncHandler(async (req, res, next) => {
  const sales = await Sale.find({ customer: req.params.customerId })
    .populate({
      path: 'items.product',
      select: 'name category'
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: sales.length,
    data: sales
  });
});

// @desc    Get sales stats
// @route   GET /api/sales/stats
// @access  Private
exports.getSalesStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Default to current month if no dates provided
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();
  
  // Sales aggregation
  const salesStats = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageSale: { $avg: '$total' }
      }
    }
  ]);

  // Sales by product category
  const salesByCategory = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    {
      $unwind: '$productDetails'
    },
    {
      $group: {
        _id: '$productDetails.category',
        count: { $sum: 1 },
        revenue: { $sum: '$items.total' }
      }
    },
    {
      $sort: { revenue: -1 }
    }
  ]);

  // Sales by day
  const salesByDay = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: salesStats.length > 0 ? salesStats[0] : { totalSales: 0, totalRevenue: 0, averageSale: 0 },
      byCategory: salesByCategory,
      byDay: salesByDay
    }
  });
}); 