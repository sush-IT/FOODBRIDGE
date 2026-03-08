import { Router } from 'express';
import { checkoutCart, getCart, removeCartItem, upsertCartItem } from '../controllers/cartController.js';

const router = Router();

router.get('/:customerId', getCart);
router.put('/:customerId/items/:listingId', upsertCartItem);
router.delete('/:customerId/items/:listingId', removeCartItem);
router.post('/:customerId/checkout', checkoutCart);

export default router;
