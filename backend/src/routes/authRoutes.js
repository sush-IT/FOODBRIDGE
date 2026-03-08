import { Router } from 'express';
import { login, me, register, updateMe } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me/:userId', me);
router.put('/me/:userId', updateMe);

export default router;
