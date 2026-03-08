import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: { type: String, enum: ['customer', 'hotel', 'ngo'], default: 'customer' },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    hotelName: { type: String, default: '', trim: true },
    hotelLicense: { type: String, default: '', trim: true },
    hotelGst: { type: String, default: '', trim: true },
    hotelAddress: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
