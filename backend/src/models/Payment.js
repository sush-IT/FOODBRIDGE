import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR', trim: true },
    method: { type: String, enum: ['upi'], default: 'upi' },
    upiId: { type: String, required: true, trim: true },
    paymentRef: { type: String, required: true, trim: true, unique: true },
    upiLink: { type: String, required: true, trim: true },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
