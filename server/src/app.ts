import express from 'express';
import cors from 'cors';
import { createApiRouter } from './routes/api';
import { SessionManager } from './services/sessionManager';
import { getDatabase } from './db';
import { config } from './config';

export function createApp(sessionManager?: SessionManager) {
  const app = express();
  const db = getDatabase();
  const sm = sessionManager || new SessionManager(db);

  // CORS Configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development, allow localhost; in production, match CLIENT_URL
      if (
        config.nodeEnv !== 'production' ||
        origin === config.clientUrl ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for initial workshop setup
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  app.use(express.json());

  // Structured request logging
  app.use((req, res, next) => {
    if (req.path !== '/health') {
      console.log(`[HTTP] ${req.method} ${req.path}`);
    }
    next();
  });

  // Mount API router
  app.use('/', createApiRouter(sm));

  return { app, sessionManager: sm };
}
