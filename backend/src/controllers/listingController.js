import Listing from '../models/Listing.js';

export async function getListings(req, res, next) {
  try {
    const { hotelName } = req.query;
    const query = { isActive: true };
    if (hotelName) query.hotelName = hotelName;
    const items = await Listing.find(query).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createListing(req, res, next) {
  try {
    const payload = req.body;
    if (Number(payload.quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    const discountedPrice = Math.round(payload.originalPrice * (1 - payload.discountPercent / 100));
    const item = await Listing.create({ ...payload, discountedPrice });
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const payload = req.body;
    if (Number(payload.quantity) <= 0) {
      const deleted = await Listing.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Listing not found' });
      }
      return res.json({ item: null, deleted: true });
    }
    const discountedPrice = Math.round(payload.originalPrice * (1 - payload.discountPercent / 100));
    const item = await Listing.findByIdAndUpdate(id, { ...payload, discountedPrice }, { new: true });

    if (!item) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function deleteListing(req, res, next) {
  try {
    const { id } = req.params;
    const item = await Listing.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!item) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
}
