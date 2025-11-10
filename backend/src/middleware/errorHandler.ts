/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { APIError } from '@consentire/shared';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const error: APIError = {
    code: err.name || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    timestamp: Date.now()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json(error);
  } else if (err.name === 'UnauthorizedError') {
    res.status(401).json(error);
  } else if (err.name === 'ForbiddenError') {
    res.status(403).json(error);
  } else if (err.name === 'NotFoundError') {
    res.status(404).json(error);
  } else {
    res.status(500).json(error);
  }
};
