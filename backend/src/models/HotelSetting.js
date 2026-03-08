import mongoose from 'mongoose';

const hotelSettingSchema = new mongoose.Schema(
  {
    hotelName: { type: String, required: true, trim: true, unique: true },
    city: { type: String, default: '', trim: true },
    contact: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    notificationsEnabled: { type: Boolean, default: true },
    autoAcceptOrders: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('HotelSetting', hotelSettingSchema);
