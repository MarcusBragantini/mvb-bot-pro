const mysql = require('mysql2/promise');

// Hostinger Database Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'srv806.hstgr.io',
  user: process.env.DB_USER || 'u950457610_bot_mvb_saas',
  password: process.env.DB_PASSWORD || 'Mvb985674',
  database: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

let pool = null;

async function openDb() {
  try {
    console.log('Database config:', {
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      database: DB_CONFIG.database,
      port: DB_CONFIG.port
    });
    
    if (!pool) {
      pool = mysql.createPool(DB_CONFIG);
      console.log('✅ Database pool created successfully');
    }
    
    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection test successful');
    
    return {
      async get(query, params = []) {
        const [rows] = await pool.execute(query, params);
        return rows[0] || null;
      },
      
      async all(query, params = []) {
        const [rows] = await pool.execute(query, params);
        return rows;
      },
      
      async run(query, params = []) {
        const [result] = await pool.execute(query, params);
        return {
          lastID: result.insertId,
          changes: result.affectedRows
        };
      }
    };
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    const db = await openDb();
    
    // Create users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create licenses table
    await db.run(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        license_type ENUM('free', 'basic', 'standard', 'pro') DEFAULT 'free',
        expires_at TIMESTAMP NOT NULL,
        max_devices INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create device_sessions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS device_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_license_device (license_id, device_fingerprint)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = {
  openDb,
  initializeDatabase
};