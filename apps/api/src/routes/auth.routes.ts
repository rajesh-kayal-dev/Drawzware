import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { registerHandler, loginHandler } from '../controllers/auth.controller.js';
import { RegisterInputSchema, LoginInputSchema } from '../validators/auth.validator.js';

export { RegisterInputSchema, LoginInputSchema };

const router = Router();

router.post('/register', validateBody(RegisterInputSchema), registerHandler);
router.post('/signup', validateBody(RegisterInputSchema), registerHandler);
router.post('/login', validateBody(LoginInputSchema), loginHandler);

export const authRoutes: Router = router;
export default router;
