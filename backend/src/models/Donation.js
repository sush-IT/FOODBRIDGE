import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true, trim: true },
    hotelName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    servings: { type: Number, required: true, min: 1 },
    emoji: { type: String, default: '🥘' },
    preparedAt: { type: String, default: '' },
    expiresAt: { type: String, default: '' },
    pickupAddress: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['available', 'claimed'], default: 'available' },
    claimedByNgo: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Donation', donationSchema);
