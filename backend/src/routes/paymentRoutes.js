import { Router } from 'express';
import { confirmPayment, createUpiPayment, getPayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/upi/create', createUpiPayment);
router.get('/:id', getPayment);
router.post('/:id/confirm', confirmPayment);

export default router;
