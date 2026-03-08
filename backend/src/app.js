import cors from 'cors';
import express from 'express';
import cartRoutes from './routes/cartRoutes.js';
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import hotelSettingRoutes from './routes/hotelSettingRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import ngoRoutes from './routes/ngoRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'foodbridge-backend' });
});

app.use('/api/listings', listingRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/hotels/settings', hotelSettingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(400).json({ message: error.message || 'Server error' });
});

export default app;
