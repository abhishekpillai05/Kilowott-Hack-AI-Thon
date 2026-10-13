import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, isAiEnabled, isWcEnabled, isDemoMode } from './config/env';
import { logger } from './config/logger';
import { initDatabase, closeDatabase, getDb } from './database/db';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

import { productsRouter } from './routes/products';
import { catalogDoctorRouter } from './routes/catalogDoctor';
import { agentsRouter } from './routes/agents';
import { approvalsRouter } from './routes/approvals';
import { proposalsRouter } from './routes/proposals';
import { syncRouter } from './routes/sync';
import { reportsRouter } from './routes/reports';
import { importExportRouter } from './routes/importExport';
import { aiCopilotRouter } from './routes/aiCopilot';
import { integrationRouter } from './routes/integration';

const app = express();

// Security & utility middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [config.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint
const healthHandler: express.RequestHandler = (_req, res) => {
  let dbStatus = 'disconnected';
  let productCount = 0;
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    dbStatus = 'connected';
    productCount = row.count;
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      products_count: productCount,
    },
    ai: {
      mode: isAiEnabled() ? 'live_gemini' : 'demo_fixtures',
      demo_mode: isDemoMode(),
      model: config.GEMINI_MODEL,
    },
    woocommerce: {
      mode: isWcEnabled() ? 'live' : 'demo',
      site_url: config.WC_SITE_URL || 'demo-store.catalogpilot.local',
    },
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API route registration
app.use('/api/products', productsRouter);
app.use('/api/catalog-doctor', catalogDoctorRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import-export', importExportRouter);
app.use('/api/copilot', aiCopilotRouter);
app.use('/api/integration', integrationRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler
app.use(errorHandler);

// Start server function
export async function startServer() {
  await initDatabase();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 CatalogPilot API running on http://localhost:${config.PORT}`);
    logger.info(`   Mode: ${config.NODE_ENV} | Demo Mode: ${isDemoMode()}`);
    logger.info(
      `   AI Provider: ${isAiEnabled() ? 'Gemini (' + config.GEMINI_MODEL + ')' : 'Demo Fixtures'}`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await closeDatabase();
      logger.info('Server terminated cleanly');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server };
}

// Auto-run if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
