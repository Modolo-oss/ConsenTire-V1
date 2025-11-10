/**
 * Express type extensions
 */

import { Request } from 'express';
import { UserRegistrationResponse } from '@consentire/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        did: string;
      };
    }
  }
}
