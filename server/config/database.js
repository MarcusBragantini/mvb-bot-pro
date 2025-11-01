const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'zeus_user',
  password: process.env.DB_PASSWORD || 'Mvb985674',
  database: process.env.DB_NAME || 'bot_mvb_saas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Criar tabela de usuários
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        status ENUM('active', 'suspended', 'expired') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de licenças
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        license_type ENUM('free', 'basic', 'standard', 'premium') DEFAULT 'free',
        expires_at DATETIME NOT NULL,
        max_devices INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Criar tabela de dispositivos/sessões
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS device_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_license_device (license_id, device_fingerprint)
      )
    `);

    // Criar tabela de logs de atividade
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Criar tabela de configurações do usuário
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        settings JSON,
        deriv_token_demo TEXT,
        deriv_token_real TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_settings (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ✅ NOVO: Criar tabela de performance do bot
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bot_performance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_profit DECIMAL(10,2) DEFAULT 0.00,
        total_trades INT DEFAULT 0,
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        win_rate DECIMAL(5,2) DEFAULT 0.00,
        monthly_return DECIMAL(5,2) DEFAULT 0.00,
        last_session_profit DECIMAL(10,2) DEFAULT 0.00,
        last_session_trades INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_performance (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ✅ NOVO: Criar tabela de sessões do bot
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        telegram_chat_id VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        source VARCHAR(50) DEFAULT 'web',
        symbol VARCHAR(20) DEFAULT 'R_10',
        account_type ENUM('demo', 'real') DEFAULT 'demo',
        stake DECIMAL(10,2) DEFAULT 1.00,
        martingale DECIMAL(10,2) DEFAULT 2.00,
        duration INT DEFAULT 15,
        stop_win DECIMAL(10,2) DEFAULT 3.00,
        stop_loss DECIMAL(10,2) DEFAULT -5.00,
        confidence INT DEFAULT 70,
        strategy VARCHAR(50) DEFAULT 'zeus',
        current_profit DECIMAL(10,2) DEFAULT 0.00,
        trades_count INT DEFAULT 0,
        wins_count INT DEFAULT 0,
        losses_count INT DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        stopped_at TIMESTAMP NULL,
        last_trade_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ✅ NOVO: Criar tabela de trades do usuário
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_trades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        trade_signal VARCHAR(50) NOT NULL,
        trade_type VARCHAR(20) NOT NULL,
        stake DECIMAL(10,2) NOT NULL,
        result VARCHAR(20) NOT NULL,
        profit DECIMAL(10,2) DEFAULT 0.00,
        confidence INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'completed',
        account_type ENUM('demo', 'real') DEFAULT 'demo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ✅ NOVO: Criar tabela de conta Deriv do usuário
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_deriv_account (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        deriv_balance DECIMAL(10,2) DEFAULT 0.00,
        deriv_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_deriv (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ✅ NOVO: Adicionar campo telegram_chat_id na tabela users
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS telegram_token VARCHAR(255) NULL
    `);

    connection.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { pool, initializeDatabase };


