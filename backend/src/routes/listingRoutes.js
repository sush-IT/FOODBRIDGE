import { Router } from 'express';
import { createListing, deleteListing, getListings, updateListing } from '../controllers/listingController.js';

const router = Router();

router.get('/', getListings);
router.post('/', createListing);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);

export default router;
