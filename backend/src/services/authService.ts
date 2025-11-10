import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    did: string;
    organizationId?: string;
  };
  message?: string;
}

export class AuthService {
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      const result = await pool.query(
        `SELECT 
          ac.user_id, 
          ac.email, 
          ac.password_hash, 
          ac.role,
          u.did,
          u.public_key,
          c.organization_id,
          c.controller_hash
         FROM auth_credentials ac
         JOIN users u ON ac.user_id = u.id
         LEFT JOIN controllers c ON c.metadata->>'email' = ac.email
         WHERE ac.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        logger.warn(`Login attempt failed: user not found - ${email}`);
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        logger.warn(`Login attempt failed: invalid password - ${email}`);
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      const payload = {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        did: user.did,
        organizationId: user.organization_id,
        controllerHash: user.controller_hash,
      };
      // @ts-ignore - JWT_EXPIRES_IN is a valid string format for expiresIn
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      logger.info(`User logged in successfully: ${email} (role: ${user.role})`);

      return {
        success: true,
        token,
        user: {
          id: user.user_id,
          email: user.email,
          role: user.role,
          did: user.did,
          organizationId: user.organization_id,
        },
      };
    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login',
      };
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          ac.email,
          ac.role,
          u.did,
          u.public_key,
          u.wallet_address,
          u.created_at,
          c.organization_id,
          c.controller_hash
         FROM users u
         JOIN auth_credentials ac ON u.id = ac.user_id
         LEFT JOIN controllers c ON c.metadata->>'email' = ac.email
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching user:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
