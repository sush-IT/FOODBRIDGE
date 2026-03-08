import { Router } from 'express';
import { claimDonation, createDonation, getDonations } from '../controllers/donationController.js';

const router = Router();

router.get('/', getDonations);
router.post('/', createDonation);
router.patch('/:id/claim', claimDonation);

export default router;
