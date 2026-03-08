import Order from '../models/Order.js';

export async function createOrder(req, res, next) {
  try {
    const item = await Order.create(req.body);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function getOrders(req, res, next) {
  try {
    const { hotelName, customerId, status } = req.query;
    const query = {};
    if (hotelName) query.hotelNames = hotelName;
    if (customerId) query.customerId = String(customerId);
    if (status) query.status = status;
    const items = await Order.find(query).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
