const headers = { 'Content-Type': 'application/json' };

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (userId) => request(`/api/auth/me/${userId}`),
  updateMe: (userId, payload) => request(`/api/auth/me/${userId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getListings: (query) => request(withQuery('/api/listings', query)),
  getDonations: (query) => request(withQuery('/api/donations', query)),
  getOrders: (query) => request(withQuery('/api/orders', query)),
  getNgos: () => request('/api/ngos'),
  getHotelSettings: (hotelName) => request(`/api/hotels/settings/${encodeURIComponent(hotelName)}`),
  saveHotelSettings: (hotelName, payload) => request(`/api/hotels/settings/${encodeURIComponent(hotelName)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createListing: (payload) => request('/api/listings', { method: 'POST', body: JSON.stringify(payload) }),
  updateListing: (id, payload) => request(`/api/listings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteListing: (id) => request(`/api/listings/${id}`, { method: 'DELETE' }),
  createOrder: (payload) => request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  createDonation: (payload) => request('/api/donations', { method: 'POST', body: JSON.stringify(payload) }),
  claimDonation: (id, payload) => request(`/api/donations/${id}/claim`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getCart: (customerId) => request(`/api/cart/${encodeURIComponent(customerId)}`),
  upsertCartItem: (customerId, listingId, payload) => request(`/api/cart/${encodeURIComponent(customerId)}/items/${listingId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeCartItem: (customerId, listingId) => request(`/api/cart/${encodeURIComponent(customerId)}/items/${listingId}`, { method: 'DELETE' }),
  checkoutCart: (customerId, payload) => request(`/api/cart/${encodeURIComponent(customerId)}/checkout`, { method: 'POST', body: JSON.stringify(payload) }),
  createUpiPayment: (payload) => request('/api/payments/upi/create', { method: 'POST', body: JSON.stringify(payload) }),
  getPayment: (paymentId) => request(`/api/payments/${encodeURIComponent(paymentId)}`),
  confirmPayment: (paymentId) => request(`/api/payments/${encodeURIComponent(paymentId)}/confirm`, { method: 'POST' }),
};
