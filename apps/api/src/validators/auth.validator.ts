import { z } from 'zod';

export const RegisterInputSchema = z.object({
  name: z.string({ message: 'Name is required' }).trim().min(1, 'Name is required').max(100),
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required'),
  password: z.string({ message: 'Password must be at least 6 characters' }).min(6, 'Password must be at least 6 characters'),
});

export const LoginInputSchema = z.object({
  email: z.string({ message: 'Valid email is required' }).trim().email('Valid email is required'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

export type RegisterInputDto = z.infer<typeof RegisterInputSchema>;
export type LoginInputDto = z.infer<typeof LoginInputSchema>;
