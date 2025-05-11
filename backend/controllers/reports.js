const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Loan = require('../models/Loan');
const Saving = require('../models/Saving');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get counts
  const customerCount = await Customer.countDocuments();
  const productCount = await Product.countDocuments();
  const saleCount = await Sale.countDocuments();
  const loanCount = await Loan.countDocuments();
  
  // Get low stock products
  const lowStockProducts = await Product.find({ stock: { $lt: 5 } })
    .sort('stock')
    .limit(5)
    .select('name category stock');
  
  // Get recent sales
  const recentSales = await Sale.find()
    .sort('-createdAt')
    .limit(5)
    .select('invoiceNumber customer total createdAt')
    .populate({
      path: 'customer',
      select: 'name'
    });
  
  // Get overdue loans
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdueLoans = await Loan.find({
    status: 'Active',
    dueDate: { $lt: today }
  })
  .sort('dueDate')
  .limit(5)
  .select('loanNumber customer principal dueDate')
  .populate({
    path: 'customer',
    select: 'name'
  });
  
  // Get sales by month for current year
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  
  const salesByMonth = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear }
      }
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        totalSales: { $sum: 1 },
        revenue: { $sum: '$total' }
      }
    },
    {
      $sort: { '_id.month': 1 }
    }
  ]);

  // Get today's sales
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const todaySales = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        revenue: { $sum: '$total' }
      }
    }
  ]);
  
  // Get current month's sales by metal type (gold and silver)
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  // Get sales by metal type for the current month
  const salesByMetalType = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
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
        as: 'productInfo'
      }
    },
    {
      $unwind: {
        path: '$productInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        // If it's a custom item, use the category from customProductDetails
        itemCategory: { 
          $cond: [
            '$items.isCustomItem', 
            '$items.customProductDetails.category', 
            '$productInfo.category'
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          // Determine if it's gold, silver, or other based on category
          metalType: {
            $cond: {
              if: { $regexMatch: { input: '$itemCategory', regex: /gold/i } },
              then: 'Gold',
              else: {
                $cond: {
                  if: { $regexMatch: { input: '$itemCategory', regex: /silver/i } },
                  then: 'Silver',
                  else: 'Other'
                }
              }
            }
          }
        },
        salesCount: { $sum: 1 },
        totalAmount: { $sum: '$items.total' }
      }
    },
    {
      $sort: { '_id.metalType': 1 }
    }
  ]);
  
  // Fill in missing months for sales chart
  const salesData = Array(12).fill(0).map((_, index) => {
    const monthData = salesByMonth.find(item => item._id.month === index + 1);
    return {
      month: index + 1,
      revenue: monthData ? monthData.revenue : 0,
      totalSales: monthData ? monthData.totalSales : 0
    };
  });
  
  // Format metal type sales data
  const monthlySalesByMetal = {
    Gold: { salesCount: 0, totalAmount: 0 },
    Silver: { salesCount: 0, totalAmount: 0 },
    Other: { salesCount: 0, totalAmount: 0 }
  };
  
  salesByMetalType.forEach(item => {
    const metalType = item._id.metalType;
    monthlySalesByMetal[metalType] = {
      salesCount: item.salesCount,
      totalAmount: item.totalAmount
    };
  });
  
  res.status(200).json({
    success: true,
    data: {
      counts: {
        customers: customerCount,
        products: productCount,
        sales: saleCount,
        loans: loanCount,
        todaySales: todaySales.length > 0 ? todaySales[0].totalSales : 0,
        todayRevenue: todaySales.length > 0 ? todaySales[0].revenue : 0
      },
      lowStockProducts,
      recentSales,
      overdueLoans,
      salesData,
      monthlySalesByMetal
    }
  });
});

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy } = req.query;
  
  // Validate date range
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Please provide start and end dates'
    });
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Basic match criteria
  const matchCriteria = {
    createdAt: { $gte: start, $lte: end }
  };
  
  // Group by options
  let groupCriteria = {};
  let sortCriteria = {};
  
  switch (groupBy) {
    case 'day':
      groupCriteria = {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      };
      sortCriteria = { '_id': 1 };
      break;
    case 'month':
      groupCriteria = {
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      };
      sortCriteria = { '_id.year': 1, '_id.month': 1 };
      break;
    case 'category':
      // First we need to unwind items to group by product category
      const salesByCategory = await Sale.aggregate([
        {
          $match: matchCriteria
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
      
      return res.status(200).json({
        success: true,
        data: salesByCategory
      });
    case 'customer':
      groupCriteria = {
        _id: '$customer',
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      };
      sortCriteria = { 'revenue': -1 };
      break;
    default:
      // Default to day
      groupCriteria = {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      };
      sortCriteria = { '_id': 1 };
  }
  
  // Run the aggregation
  let salesReport = await Sale.aggregate([
    {
      $match: matchCriteria
    },
    {
      $group: groupCriteria
    },
    {
      $sort: sortCriteria
    }
  ]);
  
  // If grouping by customer, populate customer details
  if (groupBy === 'customer') {
    salesReport = await Customer.populate(salesReport, {
      path: '_id',
      select: 'name phone'
    });
    
    // Format the response
    salesReport = salesReport.map(item => ({
      customer: item._id,
      count: item.count,
      revenue: item.revenue
    }));
  }
  
  // Get summary stats
  const summary = await Sale.aggregate([
    {
      $match: matchCriteria
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgSale: { $avg: '$total' }
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      summary: summary.length > 0 ? summary[0] : { totalSales: 0, totalRevenue: 0, avgSale: 0 },
      report: salesReport
    }
  });
});

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private
exports.getInventoryReport = asyncHandler(async (req, res, next) => {
  // Get stock by category
  const stockByCategory = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        avgPrice: { $avg: { $multiply: ['$weight', '$purity'] } }
      }
    },
    {
      $sort: { totalStock: -1 }
    }
  ]);
  
  // Get low stock products
  const lowStockProducts = await Product.find({ stock: { $lt: 5 } })
    .sort('stock')
    .select('name category weight stock');
  
  // Get out of stock products
  const outOfStockProducts = await Product.find({ stock: 0 })
    .sort('category')
    .select('name category weight');
  
  // Get most stocked products
  const mostStockedProducts = await Product.find()
    .sort('-stock')
    .limit(10)
    .select('name category weight stock');
  
  res.status(200).json({
    success: true,
    data: {
      stockByCategory,
      lowStockProducts,
      outOfStockProducts,
      mostStockedProducts
    }
  });
});

// @desc    Get customer report
// @route   GET /api/reports/customers
// @access  Private
exports.getCustomerReport = asyncHandler(async (req, res, next) => {
  // Get top customers by sales amount
  const topCustomersBySales = await Sale.aggregate([
    {
      $group: {
        _id: '$customer',
        totalSales: { $sum: 1 },
        totalSpent: { $sum: '$total' }
      }
    },
    {
      $sort: { totalSpent: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  // Populate customer details
  const populatedTopCustomers = await Customer.populate(topCustomersBySales, {
    path: '_id',
    select: 'name phone'
  });
  
  // Format the response
  const formattedTopCustomers = populatedTopCustomers.map(item => ({
    customer: item._id,
    totalSales: item.totalSales,
    totalSpent: item.totalSpent
  }));
  
  // Get customers with active loans
  const customersWithLoans = await Loan.aggregate([
    {
      $match: { status: 'Active' }
    },
    {
      $group: {
        _id: '$customer',
        loanCount: { $sum: 1 },
        totalAmount: { $sum: '$principal' },
        totalPaid: { $sum: '$totalPaid' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  // Populate customer details
  const populatedLoanCustomers = await Customer.populate(customersWithLoans, {
    path: '_id',
    select: 'name phone'
  });
  
  // Format the response
  const formattedLoanCustomers = populatedLoanCustomers.map(item => ({
    customer: item._id,
    loanCount: item.loanCount,
    totalAmount: item.totalAmount,
    totalPaid: item.totalPaid
  }));
  
  // Get customers with active savings
  const customersWithSavings = await Saving.aggregate([
    {
      $match: { status: 'Active' }
    },
    {
      $group: {
        _id: '$customer',
        schemeCount: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$totalPaid' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  // Populate customer details
  const populatedSavingCustomers = await Customer.populate(customersWithSavings, {
    path: '_id',
    select: 'name phone'
  });
  
  // Format the response
  const formattedSavingCustomers = populatedSavingCustomers.map(item => ({
    customer: item._id,
    schemeCount: item.schemeCount,
    totalAmount: item.totalAmount,
    totalPaid: item.totalPaid
  }));
  
  res.status(200).json({
    success: true,
    data: {
      topCustomersBySales: formattedTopCustomers,
      customersWithLoans: formattedLoanCustomers,
      customersWithSavings: formattedSavingCustomers
    }
  });
});
