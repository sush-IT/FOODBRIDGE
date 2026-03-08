import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    hotelName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 1 },
    discountPercent: { type: Number, required: true, min: 1, max: 90 },
    discountedPrice: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    cat: { type: String, default: 'dinner', trim: true },
    expiresAt: { type: String, default: '' },
    emoji: { type: String, default: '🍽️' },
    delivery: { type: Boolean, default: true },
    pickup: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Listing', listingSchema);
