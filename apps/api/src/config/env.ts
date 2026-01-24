/**
 * Environment variable configuration
 * Loads and validates environment variables
 */

// Load .env file if dotenv is available (for scripts and development)
try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (e) {
  // dotenv not available or already loaded - that's okay
}

// MySQL Configuration
// For HostGator:
// - If API runs on HostGator server: use MYSQL_HOST=localhost
// - If API runs remotely: use the MySQL hostname from HostGator cPanel
//   (usually found in cPanel > MySQL Databases > Current Databases)
export const MYSQL_CONFIG = {
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || '',
  host: process.env.MYSQL_HOST || 'localhost',
};

// Validate MySQL configuration
if (!MYSQL_CONFIG.user || !MYSQL_CONFIG.password || !MYSQL_CONFIG.database) {
  console.warn('⚠️  MySQL configuration is incomplete. Some environment variables may be missing.');
}

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// Server Configuration
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
