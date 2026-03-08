import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['delivery', 'pickup'], required: true },
    paymentMethod: { type: String, enum: ['cod', 'upi'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentRef: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    totalAmount: { type: Number, required: true, min: 1 },
    hotelNames: { type: [String], default: [] },
    deliveryAddress: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      capturedAt: { type: Date, default: null },
    },
    items: [
      {
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
        name: { type: String, required: true },
        hotelName: { type: String, default: '', trim: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
