import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        code: 'MISSING_CREDENTIALS',
        message: 'Email and password are required',
        timestamp: Date.now(),
      });
    }

    const result = await authService.login({ email, password });

    if (!result.success) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: result.message || 'Login failed',
        timestamp: Date.now(),
      });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Login route error:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred during login',
      timestamp: Date.now(),
    });
  }
});

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No token provided',
        timestamp: Date.now(),
      });
    }

    const token = authHeader.substring(7);
    const decoded = await authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: Date.now(),
      });
    }

    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: Date.now(),
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        did: user.did,
        organizationId: user.organization_id,
        publicKey: user.public_key,
        walletAddress: user.wallet_address,
        createdAt: user.created_at,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Get user info error:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred',
      timestamp: Date.now(),
    });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    timestamp: Date.now(),
  });
});
