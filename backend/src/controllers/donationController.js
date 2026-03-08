import Donation from '../models/Donation.js';

export async function getDonations(req, res, next) {
  try {
    const { hotelName } = req.query;
    const query = {};
    if (hotelName) query.hotelName = hotelName;
    const items = await Donation.find(query).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createDonation(req, res, next) {
  try {
    const item = await Donation.create(req.body);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function claimDonation(req, res, next) {
  try {
    const { id } = req.params;
    const { ngoName } = req.body;

    const item = await Donation.findOneAndUpdate(
      { _id: id, status: 'available' },
      { status: 'claimed', claimedByNgo: ngoName || 'Unknown NGO' },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Donation not available' });
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
}
