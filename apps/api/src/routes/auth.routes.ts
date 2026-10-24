import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { registerHandler, loginHandler } from '../controllers/auth.controller.js';

export const RegisterInputSchema = z.object({
  name: z.string({ message: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required'),
  password: z.string({ message: 'Password must be at least 6 characters' }).min(6, 'Password must be at least 6 characters'),
});

export const LoginInputSchema = z.object({
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

const router = Router();

router.post('/register', validateBody(RegisterInputSchema), registerHandler);
router.post('/signup', validateBody(RegisterInputSchema), registerHandler);
router.post('/login', validateBody(LoginInputSchema), loginHandler);

export const authRoutes: Router = router;
export default router;
