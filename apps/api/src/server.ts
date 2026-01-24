import app from './app';
import { connectMySQL } from './config/database';
import { initializeFirebaseAdmin } from './config/firebase';

const PORT = process.env.PORT || 3000;

// Initialize database connection
async function startServer() {
  try {
    // Connect to MySQL
    await connectMySQL();
    
    // Initialize Firebase Admin (optional - will fail gracefully if not configured)
    try {
      initializeFirebaseAdmin();
    } catch (error: any) {
      console.warn('⚠️  Firebase Admin not initialized:', error.message);
      console.warn('   Authentication features may not work until Firebase is configured.');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
