import mysql from 'mysql2/promise';

// Database configuration - you'll need to set these environment variables in Vercel
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mvb_bot',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

let pool = null;

export async function openDb() {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
    }
    
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
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
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
      )
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
      )
    `);
    
    // Create device_registrations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS device_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_info TEXT,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_license_device (license_id, device_fingerprint)
      )
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}