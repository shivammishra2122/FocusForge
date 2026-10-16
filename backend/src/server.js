import app from './app.js';
import config from './config/index.js';
import { getDb, closeDb } from './db/database.js';

// Initialize Database connection and schemas
try {
  const db = getDb();
  console.log(`[Database] SQLite connected successfully: ${config.dbPath}`);
} catch (error) {
  console.error('[Database] Failed to initialize database:', error);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`===================================================`);
  console.log(`   FOCUSFORGE BACKEND SERVER (Obsidian Protocol)  `);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Listening on: http://localhost:${config.port}`);
  console.log(`   Health Check: http://localhost:${config.port}/api/health`);
  console.log(`===================================================`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    closeDb();
    console.log('[Database] Database connection closed.');
    process.exit(0);
  });

  // Force shutdown if taking too long
  setTimeout(() => {
    console.error('[Server] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
