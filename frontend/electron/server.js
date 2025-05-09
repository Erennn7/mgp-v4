const express = require('express');
const path = require('path');
const fs = require('fs');

// Create a basic Express server
function createServer(distPath) {
  const app = express();
  const port = 8765; // Use a port different from the development server
  
  // Serve static files
  app.use(express.static(distPath));
  
  // Fallback to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  // Start the server
  const server = app.listen(port, () => {
    console.log(`Local server running at http://localhost:${port}`);
  });
  
  return {
    url: `http://localhost:${port}`,
    close: () => server.close()
  };
}

module.exports = { createServer }; 