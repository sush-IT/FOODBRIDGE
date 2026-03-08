import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearSessionUser, getSessionUser } from '../utils/session';
import '../styles/portal.css';

const listingInitialState = {
  name: '',
  description: '',
  hotelName: 'PRATHAMHOTEL',
  city: 'Mumbai',
  cat: 'dinner',
  originalPrice: 550,
  discountPercent: 40,
  quantity: 4,
  expiresAt: '11:00 PM',
  emoji: '🍽️',
  delivery: true,
  pickup: true,
};

const donationInitialState = {
  foodName: '',
  hotelName: 'PRATHAMHOTEL',
  city: 'Mumbai',
  servings: 10,
  emoji: '🥘',
  preparedAt: '01:00 PM',
  expiresAt: '07:00 PM',
  pickupAddress: '',
  notes: 'Fully vegetarian. Hygienically packed. Suitable for all ages.',
};

function HotelPage() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();
  const [tab, setTab] = useState('add');
  const [listingForm, setListingForm] = useState(listingInitialState);
  const [donationForm, setDonationForm] = useState(donationInitialState);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [donations, setDonations] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [status, setStatus] = useState('');
  const [editingListingId, setEditingListingId] = useState('');
  const [settings, setSettings] = useState({
    hotelName: listingInitialState.hotelName,
    city: listingInitialState.city,
    contact: '',
    email: '',
    notificationsEnabled: true,
    autoAcceptOrders: false,
  });
  const currentHotelName = sessionUser?.hotelName || sessionUser?.fullName || listingInitialState.hotelName;

  async function loadAll() {
    const [listingsData, ordersData, donationsData, ngosData] = await Promise.allSettled([
      api.getListings({ hotelName: currentHotelName }),
      api.getOrders({ hotelName: currentHotelName }),
      api.getDonations({ hotelName: currentHotelName }),
      api.getNgos(),
    ]);

    if (listingsData.status === 'fulfilled') setListings(listingsData.value.items || []);
    if (ordersData.status === 'fulfilled') setOrders(ordersData.value.items || []);
    if (donationsData.status === 'fulfilled') setDonations(donationsData.value.items || []);
    if (ngosData.status === 'fulfilled') setNgos(ngosData.value.items || []);
  }

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== 'hotel') {
      navigate('/');
      return;
    }
    setListingForm((prev) => ({ ...prev, hotelName: currentHotelName, city: sessionUser.city || prev.city }));
    setDonationForm((prev) => ({ ...prev, hotelName: currentHotelName, city: sessionUser.city || prev.city }));
    setSettings((prev) => ({
      ...prev,
      hotelName: currentHotelName,
      city: sessionUser.city || prev.city,
      email: sessionUser.email || prev.email,
      contact: sessionUser.phone || prev.contact,
    }));
    loadAll().catch((error) => setStatus(error.message));
    const timer = setInterval(() => {
      loadAll().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function onListingChange(e) {
    const { name, value, type, checked } = e.target;
    setListingForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : ['originalPrice', 'discountPercent', 'quantity'].includes(name) ? Number(value) : value,
    }));
  }

  function onDonationChange(e) {
    const { name, value } = e.target;
    setDonationForm((prev) => ({
      ...prev,
      [name]: name === 'servings' ? Number(value) : value,
    }));
  }

  async function createListing(e) {
    e.preventDefault();
    setStatus(editingListingId ? 'Updating listing...' : 'Publishing listing...');
    try {
      if (editingListingId) {
        await api.updateListing(editingListingId, listingForm);
      } else {
        await api.createListing(listingForm);
      }
      setEditingListingId('');
      setListingForm((prev) => ({ ...prev, name: '', description: '' }));
      await loadAll();
      setStatus(editingListingId ? 'Listing updated.' : 'Listing published! Customers can see it now.');
      setTab('listings');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function createDonation(e) {
    e.preventDefault();
    setStatus('Posting donation...');
    try {
      await api.createDonation(donationForm);
      await loadAll();
      setStatus('Donation posted successfully.');
      setTab('mydonations');
    } catch (error) {
      setStatus(error.message);
    }
  }

  const kpis = useMemo(() => {
    const totalDonations = donations.length;
    const servings = donations.reduce((acc, d) => acc + (d.servings || 0), 0);
    return {
      activeListings: listings.length,
      totalDonations,
      servings,
      ngoPartners: ngos.length,
    };
  }, [donations, ngos, listings]);

  const listingAutoPrice = Math.round(listingForm.originalPrice * (1 - listingForm.discountPercent / 100));

  async function editListing(item) {
    setEditingListingId(item._id);
    setListingForm({
      name: item.name || '',
      description: item.description || '',
      hotelName: item.hotelName || listingInitialState.hotelName,
      city: item.city || listingInitialState.city,
      cat: item.cat || 'dinner',
      originalPrice: item.originalPrice || 0,
      discountPercent: item.discountPercent || 50,
      quantity: item.quantity || 1,
      expiresAt: item.expiresAt || '',
      emoji: item.emoji || '🍽️',
      delivery: !!item.delivery,
      pickup: !!item.pickup,
    });
    setTab('add');
  }

  async function removeListing(id) {
    try {
      setStatus('Removing listing...');
      await api.deleteListing(id);
      await loadAll();
      setStatus('Listing removed.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function onSettingsChange(e) {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function saveSettings(e) {
    e.preventDefault();
    try {
      setStatus('Saving settings...');
      const { item } = await api.saveHotelSettings(settings.hotelName, settings);
      setSettings(item);
      setListingForm((prev) => ({ ...prev, hotelName: item.hotelName, city: item.city || prev.city }));
      setDonationForm((prev) => ({ ...prev, hotelName: item.hotelName, city: item.city || prev.city }));
      setStatus('Settings saved.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function openSettings() {
    try {
      const { item } = await api.getHotelSettings(settings.hotelName);
      setSettings(item);
      setTab('settings');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function logOut() {
    clearSessionUser();
    navigate('/');
  }

  const sidebarItems = [
    { key: 'overview', label: 'Overview', icon: '📊', group: 'MAIN' },
    { key: 'listings', label: 'My Listings', icon: '📋', group: 'MAIN' },
    { key: 'orders', label: 'Orders', icon: '📦', group: 'MAIN' },
    { key: 'add', label: 'Add Listing', icon: '➕', group: 'MAIN' },
    { key: 'donate', label: 'Donate Food', icon: '🤝', group: 'GIVE BACK' },
    { key: 'mydonations', label: 'My Donations', icon: '📄', group: 'GIVE BACK' },
    { key: 'ngos', label: 'NGO Partners', icon: '🏢', group: 'GIVE BACK' },
    { key: 'settings', label: 'Settings', icon: '⚙️', group: 'ACCOUNT' },
  ];

  function renderPanel() {
    if (tab === 'overview') {
      return (
        <section className="hotel-panel">
          <h2 className="hotel-title">Good day, {listingForm.hotelName}! 👋</h2>
          <p className="hotel-sub">Here's your hotel's performance today.</p>
          <div className="hotel-kpi-row">
            <article><h3>{kpis.activeListings}</h3><p>ACTIVE LISTINGS</p></article>
            <article><h3>{orders.length}</h3><p>ORDERS TODAY</p></article>
            <article><h3>₹{orders.reduce((a, b) => a + (b.totalAmount || 0), 0)}</h3><p>REVENUE RECOVERED</p></article>
            <article><h3>{kpis.servings}</h3><p>MEALS DONATED</p></article>
          </div>
          <div className="hotel-table-wrap" style={{ marginBottom: '0.8rem' }}>
            <table className="hotel-table">
              <thead>
                <tr><th>ORDER ID</th><th>CUSTOMER</th><th>ITEMS</th><th>AMOUNT</th><th>MODE</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                {orders.length ? orders.slice(0, 5).map((o) => (
                  <tr key={o._id}>
                    <td>{String(o._id).slice(-6).toUpperCase()}</td>
                    <td>{o.customerName}</td>
                    <td>{o.items?.map((i) => i.name).join(', ')}</td>
                    <td>₹{o.totalAmount}</td>
                    <td>{o.mode}</td>
                    <td><span className="live-dot">Live</span></td>
                  </tr>
                )) : <tr><td colSpan="6">No orders yet - they'll appear here when customers order!</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="donation-nudge">
            <div>
              <b>🤝 Have extra food at end of day?</b>
              <p style={{ margin: 0 }}>Donate surplus to NGOs and shelters instead of discarding.</p>
            </div>
            <button className="hotel-pill-btn" onClick={() => setTab('donate')}>Donate Now →</button>
          </div>
        </section>
      );
    }

    if (tab === 'listings') {
      return (
        <section className="hotel-panel">
          <div className="hotel-panel-head">
            <div>
              <h2 className="hotel-title">All Listings</h2>
            </div>
            <button className="hotel-pill-btn" onClick={() => setTab('add')}>+ Add New</button>
          </div>
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Discount</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Expires</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item._id}>
                    <td>{item.emoji || '🍽️'} {item.name}</td>
                    <td>{item.discountPercent}%</td>
                    <td>₹{item.originalPrice} → <b>₹{item.discountedPrice}</b></td>
                    <td>{item.quantity}</td>
                    <td>{item.expiresAt || '--'}</td>
                    <td>{item.delivery ? 'Yes' : 'No'}</td>
                    <td><span className="live-dot">Live</span></td>
                    <td>
                      <button className="ghost-btn" onClick={() => editListing(item)}>Edit</button>
                      <button className="danger-btn" onClick={() => removeListing(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (tab === 'orders') {
      return (
        <section className="hotel-panel">
          <h2 className="hotel-title">Orders</h2>
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead>
                <tr><th>Customer</th><th>Mode</th><th>Amount</th><th>Items</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>{o.customerName}</td>
                    <td>{o.mode}</td>
                    <td>₹{o.totalAmount}</td>
                    <td>{o.items?.map((i) => i.name).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (tab === 'add') {
      return (
        <section className="hotel-panel">
          <h2 className="hotel-title">Add New Listing</h2>
          <p className="hotel-sub">List your surplus food with a discount for customers to order.</p>

          <form className="hotel-form-card" onSubmit={createListing}>
            <h3>📝 Listing Details</h3>
            <div className="hotel-grid-2">
              <div>
                <label>FOOD ITEM NAME *</label>
                <input name="name" value={listingForm.name} onChange={onListingChange} required />
              </div>
              <div>
                <label>CATEGORY *</label>
                <select name="cat" value={listingForm.cat} onChange={onListingChange}>
                  <option value="breakfast">🍳 Breakfast</option>
                  <option value="lunch">🥗 Lunch</option>
                  <option value="dinner">🍽️ Dinner</option>
                  <option value="dessert">🍮 Dessert</option>
                  <option value="buffet">🍱 Buffet</option>
                </select>
              </div>
              <div>
                <label>ORIGINAL PRICE (₹) *</label>
                <input type="number" name="originalPrice" value={listingForm.originalPrice} onChange={onListingChange} min="1" required />
              </div>
              <div>
                <label>DISCOUNT (%) *</label>
                <input type="number" name="discountPercent" value={listingForm.discountPercent} onChange={onListingChange} min="1" max="90" required />
              </div>
              <div>
                <label>DISCOUNTED PRICE (AUTO)</label>
                <input value={listingAutoPrice} readOnly />
              </div>
              <div>
                <label>QUANTITY *</label>
                <input type="number" name="quantity" value={listingForm.quantity} onChange={onListingChange} min="1" required />
              </div>
              <div>
                <label>EXPIRES AT *</label>
                <input name="expiresAt" value={listingForm.expiresAt} onChange={onListingChange} required />
              </div>
              <div>
                <label>EMOJI ICON</label>
                <input name="emoji" value={listingForm.emoji} onChange={onListingChange} />
              </div>
              <div>
                <label>HOTEL NAME *</label>
                <input name="hotelName" value={listingForm.hotelName} onChange={onListingChange} required />
              </div>
              <div>
                <label>CITY *</label>
                <input name="city" value={listingForm.city} onChange={onListingChange} required />
              </div>
            </div>
            <div>
              <label>DESCRIPTION</label>
              <textarea name="description" value={listingForm.description} onChange={onListingChange} rows="3" />
            </div>
            <div className="hotel-checks">
              <label><input type="checkbox" name="delivery" checked={listingForm.delivery} onChange={onListingChange} /> Enable Home Delivery</label>
              <label><input type="checkbox" name="pickup" checked={listingForm.pickup} onChange={onListingChange} /> Enable Pickup</label>
            </div>
            <button className="hotel-primary-btn" type="submit">{editingListingId ? 'Update Listing' : 'Publish Listing'}</button>
          </form>
        </section>
      );
    }

    if (tab === 'donate') {
      return (
        <section className="hotel-panel">
          <div className="donate-hero">
            <h3>🤝 Donate Surplus Food</h3>
            <p>Instead of discarding leftover food, donate it to NGOs, homeless shelters, and community kitchens.</p>
          </div>
          <div className="donate-kpis">
            <article><h4>{kpis.totalDonations}</h4><p>TOTAL DONATIONS</p></article>
            <article><h4>{kpis.servings}</h4><p>SERVINGS DONATED</p></article>
            <article><h4>{kpis.ngoPartners}</h4><p>NGO PARTNERS</p></article>
          </div>
          <div className="donate-strip">📝 Create Donation Listing</div>

          <form className="hotel-form-card" onSubmit={createDonation}>
            <h3>Donation Details</h3>
            <div className="hotel-grid-2">
              <div><label>FOOD NAME *</label><input name="foodName" value={donationForm.foodName} onChange={onDonationChange} required /></div>
              <div><label>EMOJI</label><input name="emoji" value={donationForm.emoji} onChange={onDonationChange} /></div>
              <div><label>NUMBER OF SERVINGS *</label><input type="number" min="1" name="servings" value={donationForm.servings} onChange={onDonationChange} required /></div>
              <div><label>PREPARED AT</label><input name="preparedAt" value={donationForm.preparedAt} onChange={onDonationChange} /></div>
              <div><label>EXPIRES AT *</label><input name="expiresAt" value={donationForm.expiresAt} onChange={onDonationChange} required /></div>
              <div><label>PICKUP ADDRESS *</label><input name="pickupAddress" value={donationForm.pickupAddress} onChange={onDonationChange} required /></div>
              <div><label>HOTEL NAME *</label><input name="hotelName" value={donationForm.hotelName} onChange={onDonationChange} required /></div>
              <div><label>CITY *</label><input name="city" value={donationForm.city} onChange={onDonationChange} required /></div>
            </div>
            <div><label>NOTES</label><textarea name="notes" value={donationForm.notes} onChange={onDonationChange} rows="3" /></div>
            <p className="donate-note">Your donation will be visible to registered NGOs in your city.</p>
            <button className="hotel-donate-btn" type="submit">🤝 Post Donation</button>
          </form>
        </section>
      );
    }

    if (tab === 'mydonations') {
      return (
        <section className="hotel-panel">
          <h2 className="hotel-title">My Donations</h2>
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead>
                <tr><th>Food</th><th>Servings</th><th>Expires</th><th>Status</th><th>Claimed By</th></tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d._id}>
                    <td>{d.emoji || '🥘'} {d.foodName}</td>
                    <td>{d.servings}</td>
                    <td>{d.expiresAt || '--'}</td>
                    <td>{d.status}</td>
                    <td>{d.claimedByNgo || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (tab === 'settings') {
      return (
        <section className="hotel-panel">
          <h2 className="hotel-title">Settings</h2>
          <p className="hotel-sub">Manage hotel profile and system preferences.</p>
          <form className="hotel-form-card" onSubmit={saveSettings}>
            <div className="hotel-grid-2">
              <div><label>HOTEL NAME</label><input name="hotelName" value={settings.hotelName} onChange={onSettingsChange} required /></div>
              <div><label>CITY</label><input name="city" value={settings.city || ''} onChange={onSettingsChange} /></div>
              <div><label>CONTACT</label><input name="contact" value={settings.contact || ''} onChange={onSettingsChange} /></div>
              <div><label>EMAIL</label><input name="email" value={settings.email || ''} onChange={onSettingsChange} /></div>
            </div>
            <div className="hotel-checks">
              <label><input type="checkbox" name="notificationsEnabled" checked={!!settings.notificationsEnabled} onChange={onSettingsChange} /> Enable notifications</label>
              <label><input type="checkbox" name="autoAcceptOrders" checked={!!settings.autoAcceptOrders} onChange={onSettingsChange} /> Auto-accept orders</label>
            </div>
            <button className="hotel-primary-btn" type="submit">Save Settings</button>
          </form>
        </section>
      );
    }

    return (
      <section className="hotel-panel">
        <h2 className="hotel-title">NGO & Shelter Partners</h2>
        <p className="hotel-sub">Verified organisations that collect donated food in your city.</p>
        <div className="ngo-list">
          {ngos.map((ngo) => (
            <article key={ngo._id} className="ngo-row">
              <div className="ngo-avatar">🏢</div>
              <div className="ngo-main">
                <h4>{ngo.org} {ngo.verified ? <span>✓ Verified</span> : null}</h4>
                <p>📍 {ngo.city} &nbsp; 📞 {ngo.contact} &nbsp; 🍽 Capacity: {ngo.capacity} servings/day &nbsp; 🥘 {ngo.type}</p>
              </div>
              <button className="hotel-pill-btn" onClick={() => window.location.assign(`tel:${ngo.contact}`)}>Contact</button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="hotel-shell">
      <aside className="hotel-sidebar">
        <div className="hotel-brand">FOODBRIDGE <span>Hotel Admin</span></div>
        {['MAIN', 'GIVE BACK', 'ACCOUNT'].map((group) => (
          <div key={group} className="hotel-nav-group">
            <p>{group}</p>
            {sidebarItems.filter((item) => item.group === group).map((item) => (
              <button
                key={item.key}
                className={`hotel-nav-btn ${tab === item.key ? 'on' : ''} ${group === 'GIVE BACK' ? 'gb' : ''}`}
                onClick={() => setTab(item.key)}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="hotel-nav-group">
          <button className="hotel-nav-btn" onClick={logOut}>🚪 Logout</button>
        </div>
      </aside>

      <section className="hotel-main">
        <div className="hotel-topbar">
          <div className="hotel-chip">🟡 {listingForm.hotelName}</div>
          <button className="hotel-logout" onClick={openSettings}>Settings</button>
          <button className="hotel-logout" onClick={logOut}>Logout</button>
        </div>
        {status ? <p className="status-text">{status}</p> : null}
        {renderPanel()}
      </section>
    </main>
  );
}

export default HotelPage;
