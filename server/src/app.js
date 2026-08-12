import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { db } from './config/db.js';

import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

/**
 * Builds and returns a fully configured Express app, without binding to a
 * port. Split out from server.js so tests can import and exercise the app
 * (via supertest) without needing a real database connection or an actual
 * listening socket.
 */
export function buildApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientBaseUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use('/api', apiLimiter);

  // Kept intentionally cheap and dependency-light (see /api/health/deep for
  // a version that also checks the database) so an external uptime monitor
  // hitting this every few minutes both proves the process is alive AND
  // keeps a free-tier host (e.g. Render) from spinning down due to inactivity.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  });

  // Same idea, but also confirms the database connection is actually
  // reachable — useful for a monitor you want to alert on, not just one
  // that's pinging to keep the instance warm.
  app.get('/api/health/deep', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({
        status: 'ok',
        database: 'reachable',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({ status: 'error', database: 'unreachable', error: err.message });
    }
  });

  app.get('/api/event', (req, res) => res.json({ event: env.event }));

  app.use('/api/auth', authRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/checkin', checkinRoutes);
  app.use('/api/system/backup', systemRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
