const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config/config');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Initialize Express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/rates', require('./routes/rates'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/reports', require('./routes/reports'));

// Error handling middleware
app.use(errorHandler);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('frontend/dist'));

  app.get('*', (req, res) => {
    try {
      const indexPath = path.resolve(__dirname, '../frontend', 'dist', 'index.html');
      // Check if file exists first
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // If frontend index.html doesn't exist, return API information instead
        res.json({ 
          message: 'Jewelry Management System API', 
          version: '1.0.0',
          endpoints: [
            '/api/health', 
            '/api/auth', 
            '/api/products',
            '/api/customers',
            '/api/sales',
            '/api/purchases',
            '/api/suppliers'
          ]
        });
      }
    } catch (err) {
      console.error('Error serving frontend:', err);
      res.json({ message: 'API is running, but frontend is not available' });
    }
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 