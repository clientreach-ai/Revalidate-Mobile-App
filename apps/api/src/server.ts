// Ensure runtime path aliases resolve when compiled JS still contains `@/...` imports.
// `module-alias/register` will read `_moduleAliases` from package.json and map `@` -> `dist/src`.
import 'module-alias/register';
import app from './app';
import { connectMySQL } from './config/database';

const PORT = process.env.PORT || 3000;

// Initialize database connection
async function startServer() {
  try {
    // Connect to MySQL
    await connectMySQL();
    
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
