import { Router } from 'express';
import { getNgos } from '../controllers/ngoController.js';

const router = Router();

router.get('/', getNgos);

export default router;
