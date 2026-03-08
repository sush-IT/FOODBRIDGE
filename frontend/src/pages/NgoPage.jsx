import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSessionUser } from '../utils/session';
import '../styles/portal.css';

function NgoPage() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();
  const [donations, setDonations] = useState([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');

  async function loadDonations() {
    const data = await api.getDonations();
    setDonations(data.items || []);
  }

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== 'ngo') {
      navigate('/');
      return;
    }
    loadDonations().catch((error) => setStatus(error.message));
    const timer = setInterval(() => {
      loadDonations().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function claim(id) {
    setStatus('Claiming donation...');
    try {
      await api.claimDonation(id, { ngoName: sessionUser?.fullName || 'NGO Partner' });
      await loadDonations();
      setStatus('Donation claimed.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  const available = donations.filter((item) => item.status === 'available');
  const claimedByMe = donations.filter((item) => item.claimedByNgo === (sessionUser?.fullName || ''));
  const cities = Array.from(new Set(donations.map((x) => x.city).filter(Boolean)));

  const filteredAvailable = available.filter((item) => {
    const inCity = city === 'all' ? true : item.city === city;
    const matches = [item.foodName, item.hotelName, item.city, item.notes].join(' ').toLowerCase().includes(query.toLowerCase());
    return inCity && matches;
  });

  return (
    <main className="ngo-shell">
      <section className="ngo-hero">
        <p className="ngo-eyebrow">Community Relief Network</p>
        <h1>NGO Donation Dashboard</h1>
        <p>Track real-time hotel donations, claim pickups quickly, and monitor your impact.</p>
      </section>

      <section className="ngo-stats">
        <article>
          <h3>{available.length}</h3>
          <p>Available Donations</p>
        </article>
        <article>
          <h3>{claimedByMe.length}</h3>
          <p>Claimed By You</p>
        </article>
        <article>
          <h3>{donations.reduce((a, b) => a + (b.servings || 0), 0)}</h3>
          <p>Total Servings Listed</p>
        </article>
      </section>

      {status ? <p className="status-text">{status}</p> : null}

      <section className="ngo-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search food, hotel, city..." />
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </section>

      <section className="ngo-grid">
        {filteredAvailable.map((item) => (
          <article key={item._id} className="ngo-card">
            <div className="ngo-card-head">
              <span>{item.emoji || '🥘'}</span>
              <small>{item.hotelName}</small>
            </div>
            <h3>{item.foodName}</h3>
            <p>📍 {item.city}</p>
            <p>🍽 Servings: {item.servings}</p>
            <p>⏱ Expires: {item.expiresAt || 'Soon'}</p>
            <p>🚚 Pickup: {item.pickupAddress || 'Contact hotel'}</p>
            {item.notes ? <p className="ngo-note">{item.notes}</p> : null}
            <button className="btn btn-primary" onClick={() => claim(item._id)}>Claim Pickup</button>
          </article>
        ))}
      </section>

      <section className="ngo-history">
        <h2>Your Claimed Donations</h2>
        <div className="ngo-history-list">
          {claimedByMe.length ? claimedByMe.map((item) => (
            <article key={item._id} className="ngo-history-item">
              <b>{item.foodName}</b>
              <span>{item.hotelName} · {item.city}</span>
              <span>{item.servings} servings</span>
            </article>
          )) : <p>No claimed donations yet.</p>}
        </div>
      </section>
    </main>
  );
}

export default NgoPage;
