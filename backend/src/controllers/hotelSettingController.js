import HotelSetting from '../models/HotelSetting.js';

export async function getHotelSettings(req, res, next) {
  try {
    const { hotelName } = req.params;
    const item = await HotelSetting.findOne({ hotelName }).lean();

    if (!item) {
      return res.json({
        item: {
          hotelName,
          city: '',
          contact: '',
          email: '',
          notificationsEnabled: true,
          autoAcceptOrders: false,
        },
      });
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function upsertHotelSettings(req, res, next) {
  try {
    const { hotelName } = req.params;
    const payload = req.body;

    const item = await HotelSetting.findOneAndUpdate(
      { hotelName },
      { ...payload, hotelName },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ item });
  } catch (error) {
    next(error);
  }
}
