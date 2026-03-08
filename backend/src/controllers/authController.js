import crypto from 'crypto';
import User from '../models/User.js';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function toPublicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    city: user.city,
    pincode: user.pincode,
    hotelName: user.hotelName || '',
    hotelLicense: user.hotelLicense || '',
    hotelGst: user.hotelGst || '',
    hotelAddress: user.hotelAddress || '',
  };
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password, role, phone, address, city, pincode, hotelName, hotelLicense, hotelGst, hotelAddress } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Account already exists. Please login.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    if (role === 'hotel' && (!hotelName || !hotelLicense || !hotelAddress)) {
      return res.status(400).json({ message: 'Hotel name, license and hotel address are required for hotel registration' });
    }

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      passwordSalt: salt,
      role: role || 'customer',
      phone: phone || '',
      address: address || '',
      city: city || '',
      pincode: pincode || '',
      hotelName: role === 'hotel' ? hotelName || '' : '',
      hotelLicense: role === 'hotel' ? hotelLicense || '' : '',
      hotelGst: role === 'hotel' ? hotelGst || '' : '',
      hotelAddress: role === 'hotel' ? hotelAddress || '' : '',
    });

    res.status(201).json({ item: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const hash = hashPassword(password || '', user.passwordSalt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({ item: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ item: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { userId } = req.params;
    const allowed = (({ fullName, phone, address, city, pincode, hotelName, hotelLicense, hotelGst, hotelAddress }) => ({
      fullName, phone, address, city, pincode, hotelName, hotelLicense, hotelGst, hotelAddress,
    }))(req.body || {});
    const user = await User.findByIdAndUpdate(userId, allowed, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ item: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}
