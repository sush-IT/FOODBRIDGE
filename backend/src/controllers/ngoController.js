import User from '../models/User.js';

export async function getNgos(req, res, next) {
  try {
    const users = await User.find({ role: 'ngo' }).sort({ city: 1, fullName: 1 }).lean();
    const items = users.map((u) => ({
      id: String(u._id),
      org: u.fullName,
      city: u.city || '',
      contact: u.phone || '',
      capacity: 25,
      type: 'Any food',
      verified: true,
    }));
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
