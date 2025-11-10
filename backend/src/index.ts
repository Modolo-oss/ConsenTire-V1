/**
 * ConsenTide API Gateway
 * RESTful API for GDPR consent management
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authRouter } from './routes/auth';
import { consentRouter } from './routes/consent';
import { userRouter } from './routes/user';
import { controllerRouter } from './routes/controller';
import { complianceRouter } from './routes/compliance';
import { governanceRouter } from './routes/governance';
import { analyticsRouter } from './routes/analytics';
import statusRouter from './routes/status';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { initializeDatabaseSchema } from './utils/initDatabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: join(__dirname, '../.env.production') });

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Dynamic CORS configuration for Replit
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5000',
  'https://consentide.live',
  'http://consentide.live',
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
].filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => origin.includes(allowed as string));
    
    if (isAllowed) {
      callback(null, true);
    } else if (isDevelopment) {
      // In development, allow all origins but log warning
      logger.warn(`CORS: Allowing non-whitelisted origin in development: ${origin}`);
      callback(null, true);
    } else {
      // In production, reject non-whitelisted origins
      logger.error(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic in-memory rate limiter (production-friendly without extra deps)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window per IP
type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();

app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX) {
      const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.',
        timestamp: now
      });
    }
    return next();
  } catch {
    return next();
  }
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ConsenTide API Gateway',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/status', statusRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/consent', consentRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/controllers', controllerRouter);
app.use('/api/v1/compliance', complianceRouter);
app.use('/api/v1/governance', governanceRouter);
app.use('/api/v1/analytics', analyticsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: Date.now()
  });
});

// Error handler
app.use(errorHandler);

// Initialize database schema and start server
async function startServer() {
  try {
    await initializeDatabaseSchema();
    
    app.listen(PORT, () => {
      logger.info(`🚀 consentire API Gateway running on port ${PORT}`);
      logger.info(`📖 API Documentation: http://localhost:${PORT}/api/v1`);
      logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
