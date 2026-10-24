import type { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service.js';
import { serverError } from '../middleware/error-handler.js';

export const registerHandler = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Email already registered') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Email already registered.' });
    }
    return serverError(res, 'Failed to register user.', err);
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }
    return serverError(res, 'Failed to log in.', err);
  }
};
