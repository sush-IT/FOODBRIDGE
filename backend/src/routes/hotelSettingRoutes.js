import { Router } from 'express';
import { getHotelSettings, upsertHotelSettings } from '../controllers/hotelSettingController.js';

const router = Router();

router.get('/:hotelName', getHotelSettings);
router.put('/:hotelName', upsertHotelSettings);

export default router;
