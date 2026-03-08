import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearSessionUser, getSessionUser, setSessionUser } from '../utils/session';
import '../styles/portal.css';

const CATEGORIES = ['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'buffet', 'delivery'];

function detectCategory(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes('breakfast') || text.includes('croissant')) return 'breakfast';
  if (text.includes('salad') || text.includes('soup') || text.includes('lunch')) return 'lunch';
  if (text.includes('dessert') || text.includes('pastry') || text.includes('cake')) return 'dessert';
  if (text.includes('buffet') || text.includes('thali')) return 'buffet';
  return 'dinner';
}

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, capturedAt: new Date().toISOString() }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function statusText(order) {
  const status = order.status || 'placed';
  const map = {
    placed: 'Order Placed',
    confirmed: 'Confirmed by Hotel',
    preparing: 'Preparing Food',
    ready: order.mode === 'delivery' ? 'Ready for Dispatch' : 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: order.mode === 'delivery' ? 'Delivered' : 'Picked Up',
    cancelled: 'Cancelled',
  };
  return map[status] || 'Order Placed';
}

function trackingSteps(order) {
  const base = order.mode === 'delivery'
    ? ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']
    : ['placed', 'confirmed', 'preparing', 'ready', 'delivered'];
  const status = order.status || 'placed';
  const idx = Math.max(base.indexOf(status), 0);
  return base.map((step, i) => ({ step, done: i <= idx }));
}

function getListingId(item) {
  return item?._id || item?.id || '';
}

function CustomerPage() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();
  const [user, setUser] = useState(sessionUser);
  const [tab, setTab] = useState('deals');
  const [listings, setListings] = useState([]);
  const [donations, setDonations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [upiId, setUpiId] = useState('');
  const [upiPayment, setUpiPayment] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: sessionUser?.fullName || '',
    phone: sessionUser?.phone || '',
    deliveryAddress: sessionUser?.address || '',
    city: sessionUser?.city || '',
    pincode: sessionUser?.pincode || '',
  });

  useEffect(() => {
    if (!sessionUser) {
      navigate('/');
      return;
    }

    api.me(sessionUser.id)
      .then(({ item }) => {
        setUser(item);
        setSessionUser(item);
        setCheckoutForm({
          customerName: item.fullName || '',
          phone: item.phone || '',
          deliveryAddress: item.address || '',
          city: item.city || '',
          pincode: item.pincode || '',
        });
        setUpiId(item.phone ? `${item.phone}@upi` : '');
      })
      .catch(() => {
        clearSessionUser();
        navigate('/');
      });
  }, []);

  async function load() {
    if (!user?.id) return;
    const [listingsData, donationsData, cartData, ordersData] = await Promise.allSettled([
      api.getListings(),
      api.getDonations(),
      api.getCart(user.id),
      api.getOrders({ customerId: user.id }),
    ]);

    if (listingsData.status === 'fulfilled') setListings(listingsData.value.items || []);
    if (donationsData.status === 'fulfilled') setDonations(donationsData.value.items || []);
    if (cartData.status === 'fulfilled') {
      setCart((cartData.value.item?.items || []).map((x) => ({ ...x.listing, _id: x.listing._id, qty: x.quantity, mode: x.mode })));
    }
    if (ordersData.status === 'fulfilled') setOrders(ordersData.value.items || []);
  }

  useEffect(() => {
    load().catch((error) => setStatus(error.message));
    const timer = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const filtered = useMemo(() => {
    let rows = listings.filter((item) => {
      const cat = detectCategory(item.name, item.description);
      if (category !== 'all' && category !== 'delivery' && cat !== category) return false;
      if (category === 'delivery' && !item.delivery) return false;
      const hay = [item.name, item.hotelName, item.city].join(' ').toLowerCase();
      return hay.includes(query.toLowerCase());
    });

    if (sort === 'discount') rows = [...rows].sort((a, b) => b.discountPercent - a.discountPercent);
    if (sort === 'price') rows = [...rows].sort((a, b) => a.discountedPrice - b.discountedPrice);
    return rows;
  }, [listings, query, category, sort]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [cart]
  );

  const cartQtyByListing = useMemo(() => {
    const m = new Map();
    cart.forEach((item) => {
      const id = getListingId(item);
      if (!id) return;
      m.set(id, Number(item.qty || 0));
    });
    return m;
  }, [cart]);

  async function addCart(item) {
    try {
      const listingId = getListingId(item);
      if (!listingId) {
        setStatus('Unable to add this item right now. Please refresh.');
        return;
      }
      const currentQty = Number(cartQtyByListing.get(listingId) || 0);
      const nextQty = currentQty + 1;
      const remaining = Number(item.quantity || 0) - currentQty;
      if (remaining <= 0 || nextQty > Number(item.quantity || 0)) {
        setStatus(`Only ${Math.max(remaining, 0)} left in stock.`);
        return;
      }
      await api.upsertCartItem(user.id, listingId, { quantity: nextQty, mode: item.delivery ? 'delivery' : 'pickup' });
      await load();
      setStatus(`${item.name} added to cart.`);
      setCartOpen(true);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function qty(id, d) {
    const item = cart.find((x) => getListingId(x) === id);
    if (!item) return;
    const next = item.qty + d;

    try {
      if (next <= 0) {
        await api.removeCartItem(user.id, id);
      } else {
        if (next > Number(item.quantity || 0)) {
          setStatus(`Only ${item.quantity || 0} left in stock.`);
          return;
        }
        await api.upsertCartItem(user.id, id, { quantity: next, mode: item.mode || 'delivery' });
      }
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function setCartMode(id, mode) {
    const item = cart.find((x) => getListingId(x) === id);
    if (!item) return;
    try {
      await api.upsertCartItem(user.id, id, { quantity: Number(item.qty || 1), mode });
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  const subtotal = cart.reduce((a, x) => a + x.discountedPrice * x.qty, 0);
  const delivery = cart.some((x) => x.mode === 'delivery') ? 49 : 0;
  const discount = Math.round(subtotal * 0.02);
  const total = subtotal + delivery - discount;

  async function placeOrder() {
    try {
      if (!cart.length) {
        setStatus('Your cart is empty.');
        return;
      }
      if (paymentMethod === 'upi' && upiPayment?.status !== 'paid') {
        setStatus('Please complete UPI payment before placing order.');
        return;
      }
      const location = await getGeo();
      await api.checkoutCart(user.id, {
        ...checkoutForm,
        location,
        paymentMethod,
        paymentId: upiPayment?.id || '',
      });
      await api.updateMe(user.id, {
        fullName: checkoutForm.customerName,
        phone: checkoutForm.phone,
        address: checkoutForm.deliveryAddress,
        city: checkoutForm.city,
        pincode: checkoutForm.pincode,
      });
      setStatus('Order placed successfully.');
      setCheckout(false);
      setCartOpen(false);
      setProfileOpen(true);
      setUpiPayment(null);
      setPaymentMethod('cod');
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function startUpiPayment() {
    try {
      if (!upiId || !upiId.includes('@')) {
        setStatus('Enter valid UPI ID (example: name@bank)');
        return;
      }
      const { item } = await api.createUpiPayment({
        customerId: user.id,
        amount: total,
        upiId,
      });
      setUpiPayment(item);
      setStatus('UPI request created. Approve it in your UPI app, then click Verify Payment.');
      window.open(item.upiLink, '_blank');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function verifyUpiPayment() {
    try {
      if (!upiPayment?.id) return;
      const { item } = await api.confirmPayment(upiPayment.id);
      setUpiPayment(item);
      setStatus('UPI payment confirmed.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function logout() {
    clearSessionUser();
    navigate('/');
  }

  if (!user) return null;

  if (checkout) {
    return (
      <main className="customer-shell">
        <header className="customer-topbar">
          <div className="ll-logo">FOODBRIDGE</div>
          <div className="ct-right"><button className="pill-nav" onClick={() => setCheckout(false)}>Back</button></div>
        </header>
        <section className="checkout-wrap">
          <h2>Checkout</h2>
          <div className="checkout-grid">
            <div>
              <article className="checkout-card">
                <h4>Delivery Mode</h4>
                <div className="mode-row">
                  <button className={`mode-btn ${deliveryMode === 'delivery' ? 'on' : ''}`} onClick={() => setDeliveryMode('delivery')}>Home Delivery</button>
                  <button className={`mode-btn ${deliveryMode === 'pickup' ? 'on' : ''}`} onClick={() => setDeliveryMode('pickup')}>Self Pickup</button>
                </div>
              </article>
              <article className="checkout-card">
                <h4>Payment Method</h4>
                <div className="mode-row">
                  <button className={`mode-btn ${paymentMethod === 'cod' ? 'on' : ''}`} onClick={() => setPaymentMethod('cod')}>Cash on Delivery</button>
                  <button className={`mode-btn ${paymentMethod === 'upi' ? 'on' : ''}`} onClick={() => setPaymentMethod('upi')}>UPI</button>
                </div>
                {paymentMethod === 'upi' ? (
                  <div className="upi-box">
                    <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank" />
                    <div className="upi-actions">
                      <button className="hotel-primary-btn" onClick={startUpiPayment}>Pay via UPI App</button>
                      <button className="pill-nav" onClick={verifyUpiPayment} disabled={!upiPayment?.id}>Verify Payment</button>
                    </div>
                    {upiPayment?.paymentRef ? <p className="upi-note">Ref: {upiPayment.paymentRef} | Status: {upiPayment.status}</p> : null}
                  </div>
                ) : null}
              </article>
              <article className="checkout-card">
                <h4>Your Details</h4>
                <div className="hotel-grid-2">
                  <input value={checkoutForm.customerName} onChange={(e) => setCheckoutForm((p) => ({ ...p, customerName: e.target.value }))} placeholder="Your name" />
                  <input value={checkoutForm.phone} onChange={(e) => setCheckoutForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                  <input value={checkoutForm.deliveryAddress} onChange={(e) => setCheckoutForm((p) => ({ ...p, deliveryAddress: e.target.value }))} placeholder="Delivery address" />
                  <input value={checkoutForm.city} onChange={(e) => setCheckoutForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
                  <input value={checkoutForm.pincode} onChange={(e) => setCheckoutForm((p) => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" />
                </div>
              </article>
            </div>
            <article className="checkout-card">
              <h4>Order Summary</h4>
              {cart.map((i) => <p key={i._id}>{i.name} x {i.qty} <b>Rs {i.discountedPrice * i.qty}</b></p>)}
              <hr />
              <p>Subtotal <b>Rs {subtotal}</b></p>
              <p>Delivery <b>Rs {delivery}</b></p>
              <p>Discount <b>-Rs {discount}</b></p>
              <h3>Total Payable Rs {total}</h3>
              <button className="hotel-donate-btn" onClick={placeOrder}>
                {paymentMethod === 'upi' ? 'Place Order (UPI Paid)' : 'Place Order'}
              </button>
            </article>
          </div>
        </section>
      </main>
    );
  }

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

  return (
    <main className="customer-shell">
      <header className="customer-topbar">
        <div className="ll-logo">FOODBRIDGE</div>
        <div className="ct-right">
          <button className={`pill-nav ${tab === 'deals' ? 'on' : ''}`} onClick={() => setTab('deals')}>Deals</button>
          <button className={`pill-nav ${tab === 'donate' ? 'on' : ''}`} onClick={() => setTab('donate')}>Donate Board</button>
          <button className="pill-nav" onClick={() => setCartOpen(true)}>Cart {cartCount || ''}</button>
          <span
            className="hotel-chip"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={() => setProfileOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setProfileOpen(true); }}
            title="Open profile"
          >
            {user.fullName?.split(' ')[0] || 'USER'}
          </span>
          <button className="hotel-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      {status ? <p className="status-text">{status}</p> : null}

      {tab === 'deals' ? (
        <>
          <section className="customer-hero">
            <h1>Hotel Food at Unbeatable Prices</h1>
            <p>Fresh surplus meals delivered to your door or ready for pickup</p>
            <div className="customer-search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search food or hotel name..." />
              <select><option>All Cities</option></select>
              <button className="hotel-primary-btn">Search</button>
            </div>
          </section>

          <section className="customer-content">
            <div className="chips-row">
              {CATEGORIES.map((x) => <button key={x} className={`chip ${category === x ? 'on' : ''}`} onClick={() => setCategory(x)}>{x}</button>)}
            </div>
            <div className="sort-row"><span>Sort:</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="default">Default</option><option value="discount">Discount</option><option value="price">Price</option></select></div>
            <div className="deals-grid">
              {filtered.map((item) => (
                <article key={getListingId(item) || item.name} className="deal-card">
                  <div className="deal-cover"><span className="time-chip">{item.expiresAt || '11:00 PM'}</span><span className="disc-chip">-{item.discountPercent}%</span></div>
                  <div className="deal-body">
                    <small>{item.hotelName}</small>
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <div className="deal-tags"><span>Home Delivery</span><span>Pickup</span><span>New</span></div>
                    <div className="deal-foot">
                      <div>
                        <del>Rs {item.originalPrice}</del>
                        <b>Rs {item.discountedPrice}</b>
                        <em>{Math.max(Number(item.quantity || 0) - Number(cartQtyByListing.get(getListingId(item)) || 0), 0)} servings left</em>
                      </div>
                      <button
                        className="hotel-primary-btn"
                        onClick={() => addCart(item)}
                        disabled={Math.max(Number(item.quantity || 0) - Number(cartQtyByListing.get(getListingId(item)) || 0), 0) <= 0}
                        title={Math.max(Number(item.quantity || 0) - Number(cartQtyByListing.get(getListingId(item)) || 0), 0) <= 0 ? 'Out of stock' : 'Add to cart'}
                      >
                        {Math.max(Number(item.quantity || 0) - Number(cartQtyByListing.get(getListingId(item)) || 0), 0) <= 0 ? 'Sold Out' : '+ Cart'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="donation-board">
          <div className="donate-hero"><h3>Hotel Food Donations</h3><p>Surplus meals available for NGOs and communities.</p></div>
          <div className="deals-grid">
            {donations.map((d) => (
              <article key={d._id} className="deal-card">
                <div className="deal-body">
                  <small>{d.hotelName}</small>
                  <h4>{d.foodName}</h4>
                  <p>Servings: {d.servings} | {d.city}</p>
                  <p>Status: {d.status}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-head"><h3>Your Cart</h3><button onClick={() => setCartOpen(false)}>x</button></div>
        <div className="cart-body">
          {!cart.length ? <p style={{ color: '#7A5A43' }}>Your cart is empty.</p> : null}
          {cart.map((c) => (
            <article key={getListingId(c)} className="cart-item">
              <div><h4>{c.name}</h4><small>{c.hotelName}</small></div>
              <div className="cart-line">
                <button onClick={() => qty(getListingId(c), -1)}>-</button>
                <span>{c.qty}</span>
                <button onClick={() => qty(getListingId(c), 1)}>+</button>
                <b>Rs {c.discountedPrice * c.qty}</b>
              </div>
              <div style={{ display: 'flex', gap: '.35rem', marginTop: '.35rem' }}>
                {c.delivery ? (
                  <button
                    className={`pill-nav ${c.mode === 'delivery' ? 'on' : ''}`}
                    onClick={() => setCartMode(getListingId(c), 'delivery')}
                  >
                    Delivery
                  </button>
                ) : null}
                {c.pickup ? (
                  <button
                    className={`pill-nav ${c.mode === 'pickup' ? 'on' : ''}`}
                    onClick={() => setCartMode(getListingId(c), 'pickup')}
                  >
                    Pickup
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <div className="cart-foot">
          <p>Subtotal <b>Rs {subtotal}</b></p>
          <p>Delivery <b>Rs {delivery}</b></p>
          <p>Discount <b>-Rs {discount}</b></p>
          <h4>Total Rs {total}</h4>
          <button className="hotel-donate-btn" onClick={() => setCheckout(true)} disabled={!cart.length}>Checkout</button>
        </div>
      </aside>
      {cartOpen ? <div className="cart-overlay" onClick={() => setCartOpen(false)} /> : null}

      {profileOpen ? (
        <>
          <div className="cart-overlay" onClick={() => setProfileOpen(false)} />
          <aside className="cart-drawer open" style={{ zIndex: 120, width: 'min(520px, 100%)' }}>
            <div className="cart-head"><h3>Customer Profile</h3><button onClick={() => setProfileOpen(false)}>x</button></div>
            <div className="cart-body">
              <article className="checkout-card">
                <h4 style={{ marginTop: 0 }}>{user.fullName || 'Customer'}</h4>
                <p style={{ margin: '.2rem 0' }}>{user.email}</p>
                <p style={{ margin: '.2rem 0' }}>Phone: {user.phone || 'Not set'}</p>
                <p style={{ margin: '.2rem 0' }}>City: {user.city || 'Not set'}</p>
              </article>
              <article className="checkout-card">
                <h4 style={{ marginTop: 0 }}>Order Summary</h4>
                <p>Total Orders: <b>{totalOrders}</b></p>
                <p>Total Spend: <b>Rs {totalSpend}</b></p>
              </article>
              <article className="checkout-card">
                <h4 style={{ marginTop: 0 }}>Track Orders</h4>
                {!orders.length ? <p>No orders yet.</p> : null}
                {orders.map((order) => (
                  <div key={order._id} style={{ border: '1px solid #D8C2B4', borderRadius: 10, padding: '.55rem .65rem', marginBottom: '.5rem', background: '#fff' }}>
                    <p style={{ margin: 0, fontFamily: 'monospace' }}>#{String(order._id).slice(-8).toUpperCase()}</p>
                    <p style={{ margin: '.2rem 0' }}><b>Rs {order.totalAmount}</b> | {order.mode}</p>
                    <p style={{ margin: '.2rem 0', color: '#1B4332' }}><b>{statusText(order)}</b></p>
                    <p style={{ margin: '.2rem 0', color: '#7A5A43' }}>{new Date(order.createdAt).toLocaleString()}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.35rem' }}>
                      {trackingSteps(order).map((s) => (
                        <span
                          key={s.step}
                          style={{
                            fontSize: '.72rem',
                            borderRadius: 999,
                            padding: '.15rem .5rem',
                            background: s.done ? '#F2E9E4' : '#fff',
                            border: '1px solid #D8C2B4',
                            color: s.done ? '#1B4332' : '#7A5A43',
                          }}
                        >
                          {s.step.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </article>
            </div>
          </aside>
        </>
      ) : null}
    </main>
  );
}

export default CustomerPage;
