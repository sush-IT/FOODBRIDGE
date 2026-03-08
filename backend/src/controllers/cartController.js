import Cart from '../models/Cart.js';
import Listing from '../models/Listing.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

async function expandCart(cart) {
  const ids = cart.items.map((i) => i.listingId);
  const listings = await Listing.find({ _id: { $in: ids }, isActive: true }).lean();
  const map = new Map(listings.map((l) => [String(l._id), l]));

  const items = cart.items
    .map((i) => {
      const listing = map.get(String(i.listingId));
      if (!listing) return null;
      return {
        listingId: String(i.listingId),
        quantity: i.quantity,
        mode: i.mode,
        listing,
      };
    })
    .filter(Boolean);

  return { customerId: cart.customerId, items };
}

export async function getCart(req, res, next) {
  try {
    const { customerId } = req.params;
    const user = await User.findById(customerId);
    if (!user) {
      return res.status(401).json({ message: 'Please login to access cart' });
    }
    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      cart = await Cart.create({ customerId, items: [] });
    }

    const item = await expandCart(cart);
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function upsertCartItem(req, res, next) {
  try {
    const { customerId, listingId } = req.params;
    const user = await User.findById(customerId);
    if (!user) {
      return res.status(401).json({ message: 'Please login to update cart' });
    }
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const mode = req.body.mode === 'pickup' ? 'pickup' : 'delivery';

    const listing = await Listing.findOne({ _id: listingId, isActive: true });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (quantity > listing.quantity) {
      return res.status(400).json({ message: `Only ${listing.quantity} left in stock` });
    }

    let cart = await Cart.findOne({ customerId });
    if (!cart) cart = await Cart.create({ customerId, items: [] });

    const idx = cart.items.findIndex((i) => String(i.listingId) === listingId);
    if (idx >= 0) {
      cart.items[idx].quantity = quantity;
      cart.items[idx].mode = mode;
    } else {
      cart.items.push({ listingId, quantity, mode });
    }

    await cart.save();
    const item = await expandCart(cart);
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const { customerId, listingId } = req.params;
    const user = await User.findById(customerId);
    if (!user) {
      return res.status(401).json({ message: 'Please login to update cart' });
    }
    let cart = await Cart.findOne({ customerId });
    if (!cart) cart = await Cart.create({ customerId, items: [] });

    cart.items = cart.items.filter((i) => String(i.listingId) !== listingId);
    await cart.save();

    const item = await expandCart(cart);
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function checkoutCart(req, res, next) {
  try {
    const { customerId } = req.params;
    const { customerName, phone, deliveryAddress, city, pincode, location, paymentMethod = 'cod', paymentId = '' } = req.body;
    const user = await User.findById(customerId);
    if (!user) {
      return res.status(401).json({ message: 'Please login to place order' });
    }
    if (!['cod', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Unsupported payment method' });
    }

    const cart = await Cart.findOne({ customerId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let total = 0;
    const orderItems = [];
    const hotelNames = new Set();
    let hasDelivery = false;
    const resolvedItems = [];

    for (const item of cart.items) {
      const listing = await Listing.findOne({ _id: item.listingId, isActive: true });
      if (!listing || listing.quantity < item.quantity) {
        return res.status(409).json({ message: 'Stock changed. Please refresh cart.' });
      }

      if (item.mode === 'delivery') hasDelivery = true;
      const line = listing.discountedPrice * item.quantity;
      total += line;
      if (listing.hotelName) hotelNames.add(listing.hotelName);
      resolvedItems.push({ item, listing });
      orderItems.push({ listingId: listing._id, name: listing.name, hotelName: listing.hotelName || '', quantity: item.quantity });
    }

    let payment = null;
    if (paymentMethod === 'upi') {
      if (!paymentId) {
        return res.status(400).json({ message: 'UPI payment is required before placing order' });
      }
      payment = await Payment.findOne({ _id: paymentId, customerId: String(customerId), method: 'upi' });
      if (!payment || payment.status !== 'paid') {
        return res.status(400).json({ message: 'UPI payment is not confirmed yet' });
      }
      if (Math.round(Number(payment.amount)) !== Math.round(Number(total))) {
        return res.status(400).json({ message: 'Payment amount mismatch. Please pay exact order total.' });
      }
    }

    for (const entry of resolvedItems) {
      const listing = await Listing.findOneAndUpdate(
        { _id: entry.listing._id, isActive: true, quantity: { $gte: entry.item.quantity } },
        { $inc: { quantity: -entry.item.quantity } },
        { new: true }
      );

      if (!listing) {
        return res.status(409).json({ message: 'Stock changed during checkout. Please retry.' });
      }

      if (listing.quantity <= 0) {
        await Listing.findByIdAndDelete(listing._id);
      }
    }

    const order = await Order.create({
      customerId,
      customerName: customerName || user.fullName || 'Customer',
      phone: phone || user.phone || '0000000000',
      mode: hasDelivery ? 'delivery' : 'pickup',
      status: 'placed',
      paymentMethod,
      paymentStatus: paymentMethod === 'upi' ? 'paid' : 'pending',
      paymentRef: payment?.paymentRef || '',
      totalAmount: total,
      hotelNames: Array.from(hotelNames),
      deliveryAddress: deliveryAddress || user.address || '',
      city: city || user.city || '',
      pincode: pincode || user.pincode || '',
      location: location || undefined,
      items: orderItems,
    });

    cart.items = [];
    await cart.save();

    res.json({ item: order });
  } catch (error) {
    next(error);
  }
}
