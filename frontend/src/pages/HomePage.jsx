import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { setSessionUser } from '../utils/session';
import '../styles/home.css';

const regInit = {
  fullName: '',
  email: '',
  password: '',
  role: 'customer',
  phone: '',
  address: '',
  city: '',
  pincode: '',
  hotelName: '',
  hotelLicense: '',
  hotelGst: '',
  hotelAddress: '',
};

function HomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('customer');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState(regInit);
  const [msg, setMsg] = useState('');

  function go(user) {
    const map = { customer: '/customer', hotel: '/hotel', ngo: '/ngo' };
    navigate(map[user.role] || '/customer');
  }

  async function doLogin(e) {
    e.preventDefault();
    try {
      const { item } = await api.login(loginData);
      setSessionUser(item);
      setOpen(false);
      go(item);
    } catch (error) {
      setMsg(error.message);
    }
  }

  async function doRegister(e) {
    e.preventDefault();
    try {
      const { item } = await api.register({ ...regData, role });
      setSessionUser(item);
      setOpen(false);
      go(item);
    } catch (error) {
      setMsg(error.message);
    }
  }

  return (
    <main className="home-wrap">
      <section className="hero-card">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">Food rescue network</p>
            <h1>Premium Hotel Food at Incredible Prices</h1>
            <p>Rescue surplus meals from top hotels at unbeatable prices while reducing food waste.</p>
            <div className="cta-row">
              <button className="btn btn-primary" onClick={() => { setRole('customer'); setTab('login'); setOpen(true); }}>Browse Deals</button>
              <button className="btn btn-secondary" onClick={() => { setRole('hotel'); setTab('login'); setOpen(true); }}>Hotel Dashboard</button>
              <button className="btn btn-secondary" onClick={() => { setRole('ngo'); setTab('login'); setOpen(true); }}>NGO Portal</button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="plate plate-outer">
              <div className="plate plate-inner">
                <span className="garnish g1" />
                <span className="garnish g2" />
                <span className="garnish g3" />
                <span className="garnish g4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-card">
        <h3>Contact Us</h3>
        <p>For support, partnerships, or onboarding help:</p>
        <div className="contact-grid">
          <a className="contact-item" href="mailto:support@foodbridge.com">
            <span className="contact-icon">✉️</span>
            <span className="contact-content">
              <span className="contact-label">Email</span>
              <b>support@foodbridge.com</b>
            </span>
          </a>
          <div className="contact-item">
            <span className="contact-icon">📞</span>
            <span className="contact-content">
              <span className="contact-label">Phone</span>
              <span className="contact-lines">
                <a href="tel:+919922007087"><b>+91 99220 07087</b></a>
                <a href="tel:+919764236261"><b>+91 97642 36261</b></a>
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className={`auth-modal-bg ${open ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('auth-modal-bg') && setOpen(false)}>
        <div className="auth-modal">
          <button type="button" className="auth-close" onClick={() => setOpen(false)}>✕</button>
          <h2>{tab === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p>{tab === 'login' ? 'Only registered users can login.' : 'Fill details for smooth delivery auto-fill.'}</p>
          <div className="role-picks" style={{ marginBottom: '0.4rem' }}>
            <button type="button" className={role === 'customer' ? 'on' : ''} onClick={() => setRole('customer')}>🧑‍🍽️ Customer</button>
            <button type="button" className={role === 'hotel' ? 'on' : ''} onClick={() => setRole('hotel')}>🏨 Hotel</button>
            <button type="button" className={role === 'ngo' ? 'on' : ''} onClick={() => setRole('ngo')}>🤝 NGO</button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={doLogin} className="auth-form">
              <div className="auth-field">
                <label>Email</label>
                <input type="email" placeholder="you@example.com" required value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input type="password" placeholder="••••••" required value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <button className="btn btn-primary auth-submit" type="submit">Log In</button>
            </form>
          ) : (
            <form onSubmit={doRegister} className="auth-form">
              <div className="auth-grid">
                <div className="auth-field">
                  <label>Full Name</label>
                  <input required value={regData.fullName} onChange={(e) => setRegData((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Email</label>
                  <input type="email" required value={regData.email} onChange={(e) => setRegData((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Password</label>
                  <input type="password" required value={regData.password} onChange={(e) => setRegData((p) => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Phone</label>
                  <input required value={regData.phone} onChange={(e) => setRegData((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="auth-field auth-span-2">
                  <label>Address</label>
                  <input required value={regData.address} onChange={(e) => setRegData((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>City</label>
                  <input required value={regData.city} onChange={(e) => setRegData((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label>Pincode</label>
                  <input required value={regData.pincode} onChange={(e) => setRegData((p) => ({ ...p, pincode: e.target.value }))} />
                </div>
              </div>
              {role === 'hotel' ? (
                <div className="auth-grid">
                  <div className="auth-field auth-span-2">
                    <label>Hotel Name</label>
                    <input required value={regData.hotelName} onChange={(e) => setRegData((p) => ({ ...p, hotelName: e.target.value }))} />
                  </div>
                  <div className="auth-field">
                    <label>Hotel License No.</label>
                    <input required value={regData.hotelLicense} onChange={(e) => setRegData((p) => ({ ...p, hotelLicense: e.target.value }))} />
                  </div>
                  <div className="auth-field">
                    <label>GST No. (optional)</label>
                    <input value={regData.hotelGst} onChange={(e) => setRegData((p) => ({ ...p, hotelGst: e.target.value }))} />
                  </div>
                  <div className="auth-field auth-span-2">
                    <label>Hotel Address</label>
                    <input required value={regData.hotelAddress} onChange={(e) => setRegData((p) => ({ ...p, hotelAddress: e.target.value }))} />
                  </div>
                </div>
              ) : null}
              <button className="btn btn-primary auth-submit" type="submit">Register</button>
            </form>
          )}

          {msg ? <p className="status-text" style={{ marginTop: '0.5rem' }}>{msg}</p> : null}
          <span>
            {tab === 'login' ? 'No account?' : 'Already registered?'}{' '}
            <b style={{ cursor: 'pointer' }} onClick={() => { setMsg(''); setTab(tab === 'login' ? 'register' : 'login'); }}>
              {tab === 'login' ? 'Sign up free' : 'Login'}
            </b>
          </span>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
