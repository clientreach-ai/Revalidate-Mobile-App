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

// Prisma DATABASE_URL
// Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
export const DATABASE_URL = process.env.DATABASE_URL ||
  `mysql://${MYSQL_CONFIG.user}:${MYSQL_CONFIG.password}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}${process.env.MYSQL_SSL === 'true' ? '?sslaccept=strict' : ''}`;

// Validate MySQL configuration
if (!MYSQL_CONFIG.user || !MYSQL_CONFIG.password || !MYSQL_CONFIG.database) {
  console.warn('⚠️  MySQL configuration is incomplete. Some environment variables may be missing.');
}

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  // Optional public key (for RS256 tokens). Supports literal newlines encoded as \n in env.
  publicKey: process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : undefined,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// Server Configuration
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiBaseUrl: process.env.API_BASE_URL || '',
};

// Stripe Configuration
export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // Premium plan pricing (in cents)
  premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || '',
  premiumPriceAmount: parseInt(process.env.STRIPE_PREMIUM_PRICE_AMOUNT || '999', 10), // Default: £9.99 = 999 pence
  currency: process.env.STRIPE_CURRENCY || 'gbp',
};
