module.exports = async function handler(req, res) {
  // Configure CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Test API called');
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
    DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
    DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET'
  });

  try {
    // Test database connection
    const { openDb } = require('./lib/database.js');
    console.log('Attempting database connection...');
    
    const db = await openDb();
    console.log('Database connection successful');
    
    // Test a simple query
    const result = await db.get('SELECT 1 as test');
    console.log('Test query result:', result);
    
    res.status(200).json({
      message: 'Test successful',
      database: 'Connected',
      testQuery: result,
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
};
