import http from 'http';
import { createApp } from './api';
import { wsService } from './services/wsService';
import { storageService } from './services/storageService';
import { startNetworkCollector } from './collectors/networkCollector';
import { startLogCollector } from './collectors/logCollector';
import { startFileCollector } from './collectors/fileCollector';
import { config } from './config';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  logger.info('🚀 IDS/SIEM starting up...', { version: '2.0.0', env: config.server.nodeEnv });

  // Create HTTP server + Express app
  const app = createApp();
  const server = http.createServer(app);

  // Attach WebSocket server
  wsService.attach(server);

  // Start collectors
  startFileCollector();
  startLogCollector();
  startNetworkCollector(); // requires root + libpcap; gracefully skips if unavailable

  // Start HTTP server
  server.listen(config.server.port, () => {
    logger.info(`✅ IDS API server listening on port ${config.server.port}`);
    logger.info(`📊 Dashboard API: http://localhost:${config.server.port}/api`);
    logger.info(`🔌 WebSocket: ws://localhost:${config.server.port}`);
    logger.info(`❤️  Health check: http://localhost:${config.server.port}/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  // Reference storageService to ensure it's initialized on startup
  void storageService;
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
