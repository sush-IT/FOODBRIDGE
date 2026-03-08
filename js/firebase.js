/* ═══════════════════════════════════════════════════════════════
   LEFTOVERLUX V3  ·  js/firebase.js
   Firebase service layer — all pages import this.

   ┌─────────────────────────────────────────────────────────┐
   │  SETUP (5 min, free tier):                              │
   │  1. firebase.google.com → New project "foodbridge"     │
   │  2. Build → Firestore Database → Create (test mode)     │
   │  3. Build → Storage → Get started (test mode)           │
   │  4. Build → Authentication → Email/Password → Enable    │
   │  5. Project Settings ⚙ → Web app → Copy firebaseConfig  │
   │  6. Paste values into FIREBASE_CONFIG below              │
   │  7. git push → GitHub Pages auto-deploys                │
   └─────────────────────────────────────────────────────────┘

   Without real config the app runs in DEMO MODE using
   localStorage — everything works, data just isn't shared
   across different devices/browsers.
═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/* ── Demo mode detection ────────────────────────────────────── */
const DEMO = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";

/* ── Firebase internals ─────────────────────────────────────── */
let DB, _auth, _storage;

function _boot() {
  if (DEMO || DB) return;
  try {
    if (!firebase.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
    DB       = firebase.firestore();
    _auth    = firebase.auth();
    _storage = firebase.storage();
  } catch(e) { console.error("Firebase init failed:", e); }
}

/* ── Unsplash food photos (free, no key needed) ─────────────── */
const FOOD_PHOTOS = {
  breakfast: [
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
  ],
  dinner: [
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80',
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600&q=80',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80',
  ],
  buffet: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
    'https://images.unsplash.com/photo-1567608285969-48e4bbe0d399?w=600&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
  ],
};

function getFoodPhoto(cat, seed) {
  const pool = FOOD_PHOTOS[cat] || FOOD_PHOTOS.buffet;
  const idx  = typeof seed === 'number' ? seed : (typeof seed === 'string' ? seed.charCodeAt(0) : 0);
  return pool[idx % pool.length];
}

/* ════════════════════════════════════════════════════════════
   SESSION  —  shared across all pages
════════════════════════════════════════════════════════════ */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('ll_user')); } catch { return null; }
}
function setSession(u) {
  if (u) sessionStorage.setItem('ll_user', JSON.stringify(u));
  else   sessionStorage.removeItem('ll_user');
}
function requireRole(role) {
  const u = getSession();
  if (!u) { window.location.href = 'index.html'; return null; }
  if (u.role !== role) {
    const map = { customer: 'customer.html', hotel: 'pages/hotel.html', ngo: 'ngo.html' };
    window.location.href = map[u.role] || 'index.html';
    return null;
  }
  return u;
}

/* ════════════════════════════════════════════════════════════
   FBAuth  —  sign up / sign in / sign out
════════════════════════════════════════════════════════════ */
const FBAuth = {

  async signUp(email, password, profile) {
    if (DEMO) return _LS.signUp(email, password, profile);
    _boot();
    const { user } = await _auth.createUserWithEmailAndPassword(email, password);
    const u = { uid: user.uid, email, ...profile, createdAt: Date.now() };
    await DB.collection('users').doc(user.uid).set(u);
    setSession(u);
    return u;
  },

  async signIn(email, password) {
    if (DEMO) return _LS.signIn(email, password);
    _boot();
    const { user } = await _auth.signInWithEmailAndPassword(email, password);
    const snap = await DB.collection('users').doc(user.uid).get();
    if (!snap.exists) throw new Error('Account found but profile missing. Please sign up again.');
    const u = { uid: user.uid, ...snap.data() };
    setSession(u);
    return u;
  },

  async logOut() {
    setSession(null);
    if (!DEMO) { _boot(); try { await _auth.signOut(); } catch {} }
    window.location.href = 'index.html';
  },

  requireRole,
  getSession,
};

/* ════════════════════════════════════════════════════════════
   FBListings  —  food items listed by hotels
════════════════════════════════════════════════════════════ */
const FBListings = {

  async getAll(filters = {}) {
    if (DEMO) return _LS.getListings(filters);
    _boot();
    let q = DB.collection('listings').where('active', '==', true).orderBy('createdAt', 'desc');
    if (filters.city)    q = q.where('city',    '==', filters.city);
    if (filters.hotelId) q = q.where('hotelId', '==', filters.hotelId);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async add(data) {
    const item = {
      ...data,
      active:    true,
      status:    'live',
      createdAt: firebase?.firestore?.FieldValue?.serverTimestamp?.() || Date.now(),
      newPrice:  Math.round(data.orig * (1 - data.disc / 100)),
    };
    if (DEMO) {
      const id = 'l' + Date.now();
      _LS.addListing({ id, ...item, createdAt: Date.now() });
      return { id, ...item };
    }
    _boot();
    const ref = await DB.collection('listings').add(item);
    return { id: ref.id, ...item };
  },

  async archive(id) {
    if (DEMO) { _LS.updateListing(id, { active: false, status: 'archived' }); return; }
    _boot();
    await DB.collection('listings').doc(id).update({ active: false, status: 'archived' });
  },

  async update(id, data) {
    if (DEMO) { _LS.updateListing(id, data); return; }
    _boot();
    if (data.orig !== undefined || data.disc !== undefined) {
      const snap = await DB.collection('listings').doc(id).get();
      const cur  = snap.data();
      data.newPrice = Math.round((data.orig ?? cur.orig) * (1 - (data.disc ?? cur.disc) / 100));
    }
    await DB.collection('listings').doc(id).update(data);
  },
};

/* ════════════════════════════════════════════════════════════
   FBOrders  —  customer orders
════════════════════════════════════════════════════════════ */
const FBOrders = {

  async place(data) {
    const order = {
      ...data,
      status:    'pending',
      createdAt: firebase?.firestore?.FieldValue?.serverTimestamp?.() || Date.now(),
    };
    if (DEMO) {
      const id = 'ORD-' + Math.random().toString(36).slice(2,8).toUpperCase();
      _LS.addOrder({ id, ...order, createdAt: Date.now() });
      return { id, ...order };
    }
    _boot();
    const ref = await DB.collection('orders').add(order);
    return { id: ref.id, ...order };
  },

  async getByHotel(hotelId) {
    if (DEMO) return _LS.getOrders(hotelId);
    _boot();
    const snap = await DB.collection('orders')
      .where('hotelId', '==', hotelId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByCustomer(customerId) {
    if (DEMO) {
      return _LS.getOrders()
        .filter(x => x.customerId === customerId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    _boot();
    const snap = await DB.collection('orders')
      .where('customerId', '==', customerId)
      .get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const av = a?.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const bv = b?.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return bv - av;
      });
  },

  async updateStatus(id, status) {
    if (DEMO) { _LS.updateOrder(id, { status }); return; }
    _boot();
    await DB.collection('orders').doc(id).update({ status, updatedAt: Date.now() });
  },

  // Real-time listener — returns unsubscribe function
  listen(hotelId, callback) {
    if (DEMO) {
      // Poll every 2s in demo mode
      callback(_LS.getOrders(hotelId));
      const iv = setInterval(() => callback(_LS.getOrders(hotelId)), 2000);
      return () => clearInterval(iv);
    }
    _boot();
    return DB.collection('orders')
      .where('hotelId', '==', hotelId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },
};

/* ══════════════════════════════════════════════════════════════════════
   FBPayments  —  payment transaction records
══════════════════════════════════════════════════════════════════════ */
const FBPayments = {

  async create(data) {
    const method = data?.method || 'cod';
    const isInstantPaid = ['upi', 'card', 'nb'].includes(method);
    const payment = {
      customerId:  data.customerId,
      orderId:     data.orderId || null,
      amount:      Number(data.amount || 0),
      method,
      details:     data.details || {},
      status:      isInstantPaid ? 'paid' : 'pending',
      paymentRef:  isInstantPaid ? ('PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase()) : '',
      createdAt:   firebase?.firestore?.FieldValue?.serverTimestamp?.() || Date.now(),
      updatedAt:   Date.now(),
    };

    if (DEMO) {
      const id = 'PMT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      _LS.addPayment({ id, ...payment, createdAt: Date.now() });
      return { id, ...payment };
    }
    _boot();
    const ref = await DB.collection('payments').add(payment);
    return { id: ref.id, ...payment };
  },

  async getByCustomer(customerId) {
    if (DEMO) {
      return _LS.getPayments().filter(x => x.customerId === customerId);
    }
    _boot();
    const snap = await DB.collection('payments')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async attachOrder(paymentId, orderId) {
    if (!paymentId || !orderId) return;
    const update = { orderId, updatedAt: Date.now() };
    if (DEMO) { _LS.updatePayment(paymentId, update); return; }
    _boot();
    await DB.collection('payments').doc(paymentId).update(update);
  },
};

/* ════════════════════════════════════════════════════════════
   FBDonations  —  hotel surplus food donated to NGOs
════════════════════════════════════════════════════════════ */
const FBDonations = {

  // All available donations (for NGO portal) — optionally filtered by city
  async getAvailable(city = null) {
    if (DEMO) return _LS.getDonations({ status: 'available', city });
    _boot();
    let q = DB.collection('donations').where('status', '==', 'available').orderBy('createdAt', 'desc');
    if (city) q = q.where('city', '==', city);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // All donations (any status) — for NGO history and hotel panel
  async getAll(filters = {}) {
    if (DEMO) return _LS.getDonations(filters);
    _boot();
    let q = DB.collection('donations').orderBy('createdAt', 'desc');
    if (filters.hotelId) q = q.where('hotelId', '==', filters.hotelId);
    if (filters.city)    q = q.where('city',    '==', filters.city);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async add(data) {
    const item = {
      ...data,
      status:    'available',
      createdAt: firebase?.firestore?.FieldValue?.serverTimestamp?.() || Date.now(),
    };
    if (DEMO) {
      const id = 'don-' + Date.now();
      _LS.addDonation({ id, ...item, createdAt: Date.now() });
      return { id, ...item };
    }
    _boot();
    const ref = await DB.collection('donations').add(item);
    return { id: ref.id, ...item };
  },

  // NGO claims a donation
  async claim(donationId, ngoProfile) {
    const update = {
      status:        'claimed',
      claimedById:   ngoProfile.uid || ngoProfile.id,
      claimedByName: ngoProfile.orgName || ngoProfile.name,
      claimedAt:     Date.now(),
    };
    if (DEMO) { _LS.updateDonation(donationId, update); return; }
    _boot();
    await DB.collection('donations').doc(donationId).update(update);
  },

  async markCompleted(id) {
    if (DEMO) { _LS.updateDonation(id, { status: 'completed' }); return; }
    _boot();
    await DB.collection('donations').doc(id).update({ status: 'completed' });
  },

  async delete(id) {
    if (DEMO) { _LS.deleteDonation(id); return; }
    _boot();
    await DB.collection('donations').doc(id).delete();
  },

  // Real-time listener for NGO portal
  listen(callback, city = null) {
    if (DEMO) {
      callback(_LS.getDonations({ status: 'available', city }));
      const iv = setInterval(() => callback(_LS.getDonations({ status: 'available', city })), 2000);
      return () => clearInterval(iv);
    }
    _boot();
    let q = DB.collection('donations').where('status', '==', 'available').orderBy('createdAt', 'desc');
    if (city) q = q.where('city', '==', city);
    return q.onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },
};

/* ════════════════════════════════════════════════════════════
   FBPhoto  —  image upload + preview
════════════════════════════════════════════════════════════ */
const FBPhoto = {

  // Returns a data URL for local preview (no upload)
  previewFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // Upload to Firebase Storage, returns download URL
  // In demo mode returns the data URL directly (stored in localStorage)
  async upload(file, path = 'uploads') {
    const dataUrl = await this.previewFile(file);
    if (DEMO) return dataUrl; // store base64 in localStorage
    _boot();
    if (!_storage) throw new Error('Firebase Storage not initialized');
    const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ref = _storage.ref(`${path}/${safeName}`);
    await ref.put(file);
    return await ref.getDownloadURL();
  },
};

/* ════════════════════════════════════════════════════════════
   FBNGOs  —  NGO registration + profiles
════════════════════════════════════════════════════════════ */
const FBNGOs = {

  async register(uid, data) {
    const profile = { ...data, uid, verified: false, createdAt: Date.now() };
    if (DEMO) { _LS.addNGO({ id: uid, ...profile }); return { id: uid, ...profile }; }
    _boot();
    await DB.collection('ngos').doc(uid).set(profile, { merge: true });
    return { id: uid, ...profile };
  },

  async getProfile(uid) {
    if (DEMO) return _LS.getNGOByUid(uid);
    _boot();
    const snap = await DB.collection('ngos').doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async getByCity(city) {
    if (DEMO) return _LS.getNGOs(city);
    _boot();
    const snap = await DB.collection('ngos')
      .where('city', '==', city)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async update(uid, data) {
    if (DEMO) { _LS.updateNGO(uid, data); return; }
    _boot();
    await DB.collection('ngos').doc(uid).update(data);
  },
};

/* ════════════════════════════════════════════════════════════
   localStorage FALLBACK  (demo mode — all data local)
════════════════════════════════════════════════════════════ */
const _uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const _get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const _set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* Default seed data shown in demo mode */
const _LISTINGS = [
  { id:'l1', hotelId:'h1', hotelName:'The Grand Oberoi',   name:'Continental Breakfast Platter', desc:'Croissants, scrambled eggs, fresh seasonal fruit, orange juice & freshly brewed coffee.',             cat:'breakfast', orig:800,  disc:60, qty:8,  expires:'11:00 AM', delivery:true,  pickup:true, rating:4.8, city:'Mumbai',    active:true, status:'live', photoURL:'', _seed:0, createdAt:Date.now()-1000 },
  { id:'l2', hotelId:'h2', hotelName:'Taj Palace Hotel',   name:'Gourmet Salad & Soup Combo',    desc:'Mixed greens, cream of mushroom soup with truffle oil, served with rosemary garlic bread.',           cat:'lunch',     orig:650,  disc:50, qty:12, expires:'3:00 PM',  delivery:true,  pickup:true, rating:4.6, city:'Delhi',     active:true, status:'live', photoURL:'', _seed:0, createdAt:Date.now()-2000 },
  { id:'l3', hotelId:'h3', hotelName:'ITC Maratha',        name:'Royal Lunch Buffet Thali',      desc:'Dal makhani, paneer butter masala, jeera rice, butter naan, raita & achar.',                         cat:'buffet',    orig:1200, disc:70, qty:5,  expires:'5:00 PM',  delivery:false, pickup:true, rating:4.9, city:'Mumbai',    active:true, status:'live', photoURL:'', _seed:0, createdAt:Date.now()-3000 },
  { id:'l4', hotelId:'h4', hotelName:'Hyatt Regency',      name:'Three-Course Dinner Set',       desc:'Roasted tomato bisque, herb-crusted grilled chicken, seasonal vegetables & chocolate fondant.',       cat:'dinner',    orig:2000, disc:55, qty:3,  expires:'9:00 PM',  delivery:true,  pickup:true, rating:4.7, city:'Bangalore', active:true, status:'live', photoURL:'', _seed:0, createdAt:Date.now()-4000 },
  { id:'l5', hotelId:'h5', hotelName:'Marriott Mumbai',    name:'Artisan Pastry & Dessert Box',  desc:'Tiramisu, burnt caramel crème brûlée, Belgian chocolate mousse & French macarons.',                  cat:'dessert',   orig:900,  disc:65, qty:7,  expires:'8:00 PM',  delivery:true,  pickup:true, rating:4.5, city:'Mumbai',    active:true, status:'live', photoURL:'', _seed:0, createdAt:Date.now()-5000 },
  { id:'l6', hotelId:'h6', hotelName:'Radisson Blu',       name:'Sourdough Bakery Basket',       desc:'Freshly baked sourdough, butter croissants, blueberry muffins, banana bread with seasonal jams.',   cat:'breakfast', orig:550,  disc:45, qty:15, expires:'10:30 AM', delivery:true,  pickup:true, rating:4.4, city:'Hyderabad', active:true, status:'live', photoURL:'', _seed:1, createdAt:Date.now()-6000 },
  { id:'l7', hotelId:'h7', hotelName:'The Leela Palace',   name:'Thai Basil Noodle Bowl',        desc:'Hand-pulled noodles, silken tofu, bok choy & bean sprouts in spicy lemongrass broth.',               cat:'lunch',     orig:750,  disc:55, qty:9,  expires:'4:00 PM',  delivery:true,  pickup:true, rating:4.6, city:'Bangalore', active:true, status:'live', photoURL:'', _seed:1, createdAt:Date.now()-7000 },
  { id:'l8', hotelId:'h8', hotelName:'JW Marriott',        name:'Signature Grill Platter',       desc:'Chicken tikka, seekh kebabs, lamb chops & malai kofta with mint chutney & tandoori naan.',           cat:'dinner',    orig:2500, disc:60, qty:4,  expires:'10:00 PM', delivery:true,  pickup:true, rating:4.8, city:'Mumbai',    active:true, status:'live', photoURL:'', _seed:1, createdAt:Date.now()-8000 },
].map(l => ({ ...l, newPrice: Math.round(l.orig * (1 - l.disc / 100)) }));

const _DONATIONS = [
  { id:'dn1', hotelId:'h1', hotelName:'The Grand Oberoi', name:'Veg Biryani Packs',        servings:40, expires:'6:00 PM',  city:'Mumbai',    status:'available', pickupAddress:'Nariman Point, Mumbai 400021',       notes:'Fully vegetarian. Hygienically packed in sealed containers.', cat:'buffet',    _seed:2, createdAt:Date.now()-1800000 },
  { id:'dn2', hotelId:'h3', hotelName:'ITC Maratha',      name:'Bread & Breakfast Boxes',  servings:60, expires:'5:00 PM',  city:'Mumbai',    status:'available', pickupAddress:'Andheri East, Mumbai 400069',         notes:'Fresh breakfast items. Suitable for all ages including children.', cat:'breakfast', _seed:2, createdAt:Date.now()-3600000 },
  { id:'dn3', hotelId:'h2', hotelName:'Taj Palace Hotel', name:'Dal Rice Meal Packs',       servings:30, expires:'7:00 PM',  city:'Delhi',     status:'claimed',   pickupAddress:'Chanakyapuri, New Delhi 110021',      notes:'High-protein meal packs. Claimed by Seva Sadan NGO.', cat:'lunch', _seed:0, claimedByName:'Seva Sadan NGO', claimedAt:Date.now()-900000, createdAt:Date.now()-7200000 },
  { id:'dn4', hotelId:'h7', hotelName:'The Leela Palace', name:'Soup & Salad Portions',     servings:25, expires:'4:00 PM',  city:'Bangalore', status:'available', pickupAddress:'HAL Airport Road, Bangalore 560008',  notes:'Contains dairy. Suitable for soup kitchens.', cat:'lunch', _seed:1, createdAt:Date.now()-900000 },
];

const _NGOS_DEFAULT = [
  { id:'ngo1', uid:'ngo1', name:'Roti Bank Mumbai',  orgName:'Roti Bank Mumbai',  city:'Mumbai',    email:'rotibank@example.com',    contact:'9876543210', capacity:50, foodPref:'Any food',        verified:true,  role:'ngo' },
  { id:'ngo2', uid:'ngo2', name:'Seva Sadan NGO',    orgName:'Seva Sadan NGO',    city:'Delhi',     email:'sevasadan@example.com',   contact:'9812345678', capacity:30, foodPref:'Cooked meals',    verified:true,  role:'ngo' },
  { id:'ngo3', uid:'ngo3', name:'Asha Foundation',   orgName:'Asha Foundation',   city:'Bangalore', email:'asha@example.com',         contact:'9845678901', capacity:40, foodPref:'Any food',        verified:true,  role:'ngo' },
  { id:'ngo4', uid:'ngo4', name:'Uday Shelter Home', orgName:'Uday Shelter Home', city:'Mumbai',    email:'uday@example.com',         contact:'9867890123', capacity:20, foodPref:'Vegetarian only', verified:false, role:'ngo' },
];

const _LS = {
  /* Auth */
  signUp(email, pass, profile) {
    const users = _get('ll_users', []);
    if (users.find(u => u.email === email)) throw new Error('Email already registered. Please sign in.');
    const u = { ...profile, email, uid: 'u-' + _uid(), role: profile.role || 'customer', createdAt: Date.now() };
    _set('ll_users', [...users, u]);
    // Auto-create NGO profile if role is ngo
    if (u.role === 'ngo') { const ngos = _get('ll_ngos', _NGOS_DEFAULT); ngos.unshift({ id: u.uid, uid: u.uid, ...profile }); _set('ll_ngos', ngos); }
    setSession(u);
    return u;
  },
  signIn(email, pass) {
    const u = _get('ll_users', []).find(u => u.email === email);
    if (!u) throw new Error('No account found. Please sign up first.');
    setSession(u);
    return u;
  },

  /* Listings */
  getListings(f = {}) {
    let l = _get('ll_listings', _LISTINGS);
    l = l.filter(x => x.active !== false);
    if (f.city)    l = l.filter(x => x.city === f.city);
    if (f.hotelId) l = l.filter(x => x.hotelId === f.hotelId);
    return l;
  },
  addListing(item)    { const l = _get('ll_listings', _LISTINGS); l.unshift(item); _set('ll_listings', l); },
  updateListing(id,d) { _set('ll_listings', _get('ll_listings', _LISTINGS).map(x => x.id===id ? {...x,...d} : x)); },

  /* Orders */
  getOrders(hotelId) { const o = _get('ll_orders', []); return hotelId ? o.filter(x => x.hotelId === hotelId) : o; },
  addOrder(o)        { const l = _get('ll_orders', []); l.unshift(o); _set('ll_orders', l); return o; },
  updateOrder(id, d) { _set('ll_orders', _get('ll_orders', []).map(x => x.id===id ? {...x,...d} : x)); },

  /* Payments */
  getPayments()      { return _get('ll_payments', []); },
  addPayment(p)      { const l = _get('ll_payments', []); l.unshift(p); _set('ll_payments', l); return p; },
  updatePayment(id,d){ _set('ll_payments', _get('ll_payments', []).map(x => x.id===id ? {...x,...d} : x)); },

  /* Donations */
  getDonations(f = {}) {
    let d = _get('ll_donations', _DONATIONS);
    if (f.status)  d = d.filter(x => x.status === f.status);
    if (f.hotelId) d = d.filter(x => x.hotelId === f.hotelId);
    if (f.city)    d = d.filter(x => x.city === f.city);
    return d;
  },
  addDonation(item)    { const l = _get('ll_donations', _DONATIONS); l.unshift(item); _set('ll_donations', l); },
  updateDonation(id,d) { _set('ll_donations', _get('ll_donations', _DONATIONS).map(x => x.id===id ? {...x,...d} : x)); },
  deleteDonation(id)   { _set('ll_donations', _get('ll_donations', _DONATIONS).filter(x => x.id !== id)); },

  /* NGOs */
  getNGOs(city)    { let n = _get('ll_ngos', _NGOS_DEFAULT); return city ? n.filter(x => x.city===city) : n; },
  addNGO(n)        { const l = _get('ll_ngos', _NGOS_DEFAULT); l.unshift(n); _set('ll_ngos', l); },
  getNGOByUid(uid) { return _get('ll_ngos', _NGOS_DEFAULT).find(n => n.uid===uid) || null; },
  updateNGO(uid,d) { _set('ll_ngos', _get('ll_ngos', _NGOS_DEFAULT).map(x => x.uid===uid ? {...x,...d} : x)); },
};

/* dev helper */
window.resetDB = () => {
  ['ll_listings','ll_donations','ll_orders','ll_payments','ll_users','ll_ngos'].forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  location.reload();
};
