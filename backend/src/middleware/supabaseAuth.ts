/**
 * PostgreSQL Authentication Middleware
 * JWT verification for backend authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        organizationId?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using backend-issued JWT
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
        timestamp: Date.now()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token with backend JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.userId) {
      logger.warn('Invalid token provided - missing userId');
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: Date.now()
      });
    }

    // Add user info to request from JWT payload
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      organizationId: decoded.organizationId
    };

    logger.info('User authenticated', { 
      userId: decoded.userId, 
      email: decoded.email 
    });

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        timestamp: Date.now()
      });
    }
    
    logger.error('Authentication error', { error: error.message });
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or malformed token',
      timestamp: Date.now()
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    // Verify JWT token with backend JWT_SECRET (same as authenticateUser)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (decoded && decoded.userId) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        organizationId: decoded.organizationId
      };
    }

    next();
  } catch (error) {
    logger.error('Optional auth error', { error });
    next(); // Continue even if auth fails
  }
};

/**
 * Middleware to check if user has admin/regulator role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      timestamp: Date.now()
    });
  }

  // Check if user has admin or regulator role
  if (req.user.role !== 'admin' && req.user.role !== 'regulator') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Regulator access required',
      timestamp: Date.now()
    });
  }

  next();
};

/**
 * Middleware to ensure user owns the resource
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: Date.now()
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user.id !== resourceUserId) {
      logger.warn('Ownership check failed', { 
        authenticatedUser: req.user.id, 
        resourceUser: resourceUserId 
      });
      
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied: resource ownership required',
        timestamp: Date.now()
      });
    }

    next();
  };
};

/**
 * NOTE: createUserProfile and getUserProfile functions have been removed.
 * User profile operations should now use PostgreSQL pool directly
 * via the authService or a dedicated user profile service.
 */
