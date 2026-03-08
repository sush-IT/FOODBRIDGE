import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    mode: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, trim: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
