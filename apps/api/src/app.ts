import express from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './config/env';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { logger } from './common/logger';

const app = express();

// Middleware
// CORS configuration - allow all origins for mobile apps
// When CORS_ORIGIN is "*", use a function to allow all origins (required when credentials: true)
app.use(cors({
  origin: SERVER_CONFIG.corsOrigin === '*' 
    ? (_origin, callback) => callback(null, true) 
    : SERVER_CONFIG.corsOrigin,
  credentials: true,
}));

// Stripe webhook endpoint needs raw body, so handle it before JSON parsing
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));

// JSON body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Serve uploaded documents
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Revalidation Tracker API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
import apiRoutes from './routes';
app.use(apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Revalidation Tracker API',
    version: '1.0.0',
    docs: '/api/docs', // TODO: Add API documentation
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
