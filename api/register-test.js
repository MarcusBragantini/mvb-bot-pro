const bcrypt = require('bcryptjs');
const { openDb } = require('./lib/database.js');
const { generateLicenseKey } = require('./lib/utils.js');

module.exports = async function handler(req, res) {
  // Configure CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Register Test API called with method:', req.method);

  if (req.method === 'GET') {
    // Return API status and test data
    try {
      const db = await openDb();
      
      // Test database connection
      const testResult = await db.get('SELECT 1 as test');
      
      // Check if tables exist
      const usersTable = await db.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'users'
      `);
      
      const licensesTable = await db.get(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'licenses'
      `);
      
      res.status(200).json({
        message: 'Register Test API Status',
        database: 'Connected',
        testQuery: testResult,
        tables: {
          users: usersTable.count > 0 ? 'Exists' : 'Missing',
          licenses: licensesTable.count > 0 ? 'Exists' : 'Missing'
        },
        environment: process.env.NODE_ENV,
        method: req.method,
        note: 'Use POST method with {name, email, password} to test registration'
      });
      
    } catch (error) {
      console.error('Register Test GET error:', error);
      res.status(500).json({
        error: 'Test failed',
        message: error.message
      });
    }
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST'],
      receivedMethod: req.method
    });
  }

  console.log('Register Test POST called');
  console.log('Request body:', req.body);

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Nome, email e senha são obrigatórios',
        received: { name: !!name, email: !!email, password: !!password }
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    console.log('Attempting to connect to database...');
    const db = await openDb();
    console.log('Database connection successful');
    
    // Check if user already exists
    console.log('Checking if user exists for email:', email);
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    console.log('Existing user check result:', existingUser);

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Password hashed successfully');

    // Create user
    console.log('Creating user...');
    const result = await db.run(
      `INSERT INTO users (name, email, password, role, status, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name, email, hashedPassword, 'user', 'active']
    );
    console.log('User created with ID:', result.lastID);

    const userId = result.lastID;

    // Generate free trial license
    console.log('Generating license...');
    const licenseKey = generateLicenseKey('FREE');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days free trial
    console.log('License generated:', licenseKey);

    // Create license
    console.log('Creating license...');
    await db.run(
      `INSERT INTO licenses (user_id, license_key, license_type, expires_at, max_devices, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, licenseKey, 'free', expiresAt.toISOString(), 1, 1]
    );
    console.log('License created successfully');

    // Get created user
    const user = await db.get(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    console.log('Registration completed successfully');
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user,
      license: licenseKey
    });

  } catch (error) {
    console.error('Register Test POST error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    // Return more detailed error information
    const errorResponse = {
      error: 'Erro interno do servidor',
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(500).json(errorResponse);
  }
};
