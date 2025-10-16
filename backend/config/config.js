const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: 'mongodb+srv://naruto:naruto7@cluster0.hfbrxy0.mongodb.net/jewelry-management',
  jwtSecret: process.env.JWT_SECRET || 'mgp-secret-key-for-jewelry-management-system-2024',
  jwtExpire: process.env.JWT_EXPIRE || '5m',
  nodeEnv: process.env.NODE_ENV || 'development'
}; 