import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
  {
    org: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Ngo', ngoSchema);
