
// ── Auth guard ─────────────────────────────────────
const user = requireRole('customer');
if (!user) throw new Error('redirect');
document.getElementById('navAv').textContent   = (user.name||'U')[0].toUpperCase();
document.getElementById('navName').textContent = user.name || 'Customer';

// ── State ──────────────────────────────────────────
let cart = [], listings = [], activeFilter = 'all', activeDM = 'delivery', activePM = 'upi';
let customerOrders = [];

// ── Boot: load listings ───────────────────────────
(async () => {
  listings = await FBListings.getAll();
  document.getElementById('browseLoader').style.display = 'none';
  renderCards(listings);
  prefillCheckoutFromProfile();
  updatePaymentFields();
  await loadCustomerProfile();
})();

// ── Page router ───────────────────────────────────
function showPage(p) {
  ['browse','checkout','success'].forEach(x => {
    document.getElementById('page-'+x).classList.toggle('hidden', x !== p);
  });
  if (p === 'checkout') renderCheckout();
  window.scrollTo(0, 0);
}

// ── Render food cards ─────────────────────────────
function foodPhoto(item) {
  if (item.photoURL) return item.photoURL;
  const pool = FOOD_PHOTOS[item.cat] || FOOD_PHOTOS.buffet;
  return pool[(item._seed || 0) % pool.length];
}

function renderCards(list) {
  const grid  = document.getElementById('cardsGrid');
  const empty = document.getElementById('emptyBrowse');
  if (!list.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = list.map(item => {
    const photo    = foodPhoto(item);
    const hotelName = item.hotelName || item.hotel || 'Hotel';
    return `
    <article class="food-card">
      <div class="fc-img-wrap">
        <img class="fc-photo" src="${photo}" alt="${item.name}" loading="lazy" onerror="this.src='${FOOD_PHOTOS.buffet[0]}'">
        <div class="fc-grad"></div>
        <span class="fc-badge fc-disc">-${item.disc}%</span>
        <span class="fc-badge fc-time">⏱ ${item.expires}</span>
        <span class="fc-badge fc-tag ${item.delivery?'fc-del-tag':'fc-pku-tag'}">${item.delivery?'🛵 Delivery':'🏨 Pickup'}</span>
        ${item.qty<=3?`<span class="fc-badge fc-hot">🔥 Only ${item.qty} left!</span>`:''}
      </div>
      <div class="fc-body">
        <div class="fc-hotel">${hotelName}</div>
        <h3 class="fc-name">${item.name}</h3>
        <p class="fc-desc">${item.desc||''}</p>
        <div class="fc-tags">
          ${item.delivery?'<span class="tag tg">🛵 Delivery</span>':''}
          ${item.pickup?'<span class="tag ta">🏨 Pickup</span>':''}
          ${item.rating?`<span class="tag tb">⭐ ${item.rating}</span>`:'<span class="tag tb">⭐ New</span>'}
        </div>
        <div class="fc-foot">
          <div class="fc-price-col">
            <span class="fc-old">₹${item.orig.toLocaleString('en-IN')}</span>
            <span class="fc-new">₹${item.newPrice.toLocaleString('en-IN')}</span>
            <span class="fc-qty">${item.qty} servings left</span>
          </div>
          <button class="btn btn-amber btn-sm" onclick="addToCart('${item.id}')">+ Cart</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function setFilter(btn, cat) {
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on'); activeFilter = cat; applyFilters();
}

function applyFilters() {
  const q    = document.getElementById('searchQ').value.toLowerCase();
  const city = document.getElementById('searchCity').value;
  const sort = document.getElementById('searchSort').value;
  let l = [...listings];
  if (activeFilter === 'delivery') l = l.filter(x => x.delivery);
  else if (activeFilter !== 'all') l = l.filter(x => x.cat === activeFilter);
  if (q)    l = l.filter(x => (x.name+(x.hotelName||x.hotel||'')+x.desc).toLowerCase().includes(q));
  if (city) l = l.filter(x => x.city === city);
  if (sort === 'disc')     l.sort((a,b) => b.disc - a.disc);
  else if (sort === 'price_lo') l.sort((a,b) => a.newPrice - b.newPrice);
  else if (sort === 'price_hi') l.sort((a,b) => b.newPrice - a.newPrice);
  else if (sort === 'exp')      l.sort((a,b) => a.expires.localeCompare(b.expires));
  renderCards(l);
}

// ── Cart ──────────────────────────────────────────
function addToCart(id) {
  const item = listings.find(x => x.id === id); if (!item) return;
  const ex   = cart.find(x => x.id === id);
  if (ex) {
    const maxQty = ex.maxQty || item.qty;
    if (ex.qty < maxQty) { ex.qty++; } else { toast('Max quantity reached','warn'); return; }
  } else {
    cart.push({ ...item, maxQty: item.qty, qty: 1, dm: item.delivery ? 'delivery' : 'pickup' });
  }
  toast(`${item.name} added to cart 🛒`);
  renderCart();
}
function removeFromCart(id) { cart = cart.filter(x => x.id !== id); renderCart(); }
function changeQty(id, d)   {
  const i = cart.find(x => x.id === id); if (!i) return;
  if (d > 0 && i.qty >= (i.maxQty || 99)) { toast('Max quantity reached','warn'); return; }
  i.qty += d;
  if (i.qty < 1) removeFromCart(id); else renderCart();
}
function setItemDM(id, dm)  { const i = cart.find(x => x.id === id); if (i) { i.dm = dm; renderCart(); } }

function cartTotals() {
  const sub       = cart.reduce((a,i) => a + i.newPrice * i.qty, 0);
  const hasDel    = cart.some(i => i.dm === 'delivery') && activeDM === 'delivery';
  const del       = hasDel ? 49 : 0;
  const disc      = Math.round(sub * 0.02);
  return { sub, del, disc, total: sub + del - disc };
}

function renderCart() {
  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFoot');
  const dot  = document.getElementById('cartDot');
  const cnt  = cart.reduce((a,i) => a + i.qty, 0);
  dot.textContent = cnt; dot.classList.toggle('hidden', cnt === 0);
  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>';
    foot.style.display = 'none'; return;
  }
  foot.style.display = 'block';
  body.innerHTML = cart.map(i => `
    <div class="ci">
      <img class="ci-thumb" src="${foodPhoto(i)}" onerror="this.src='${FOOD_PHOTOS.buffet[0]}'">
      <div class="ci-body">
        <div class="ci-name">${i.name}</div>
        <div class="ci-hotel">${i.hotelName||i.hotel||''}</div>
        <div class="ci-dm">
          ${i.delivery?`<span class="dm-pill ${i.dm==='delivery'?'sel-del':''}" onclick="setItemDM('${i.id}','delivery')">🛵 Deliver</span>`:''}
          ${i.pickup?`<span class="dm-pill ${i.dm==='pickup'?'sel-pku':''}" onclick="setItemDM('${i.id}','pickup')">🏨 Pickup</span>`:''}
        </div>
        <div class="ci-qrow">
          <button class="qb" onclick="changeQty('${i.id}',-1)">−</button>
          <span class="qn">${i.qty}</span>
          <button class="qb" onclick="changeQty('${i.id}',1)">+</button>
          <button class="ci-rm" onclick="removeFromCart('${i.id}')">Remove</button>
        </div>
      </div>
      <span class="ci-price">₹${(i.newPrice*i.qty).toLocaleString('en-IN')}</span>
    </div>`).join('');
  const t = cartTotals();
  document.getElementById('cfSubtotal').textContent = '₹' + t.sub.toLocaleString('en-IN');
  document.getElementById('cfDelivery').textContent = t.del ? '₹49' : 'Free';
  document.getElementById('cfTotal').textContent    = '₹' + t.total.toLocaleString('en-IN');
}

function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOv').classList.toggle('open');
}

function goCheckoutFromCart() {
  if (!cart.length) {
    toggleCart();
    toast('Add at least one item to checkout','warn');
    return;
  }
  toggleCart();
  showPage('checkout');
}

// ── Checkout ──────────────────────────────────────
function setDeliveryMode(dm) {
  activeDM = dm;
  ['delivery','pickup'].forEach(x => document.getElementById('dm-'+x).classList.toggle('on', x === dm));
  document.getElementById('addrFields').style.display = dm === 'delivery' ? 'block' : 'none';
  renderCheckout();
}

function setPM(el) {
  activePM = el.value;
  document.querySelectorAll('.pm-opt').forEach(x => x.classList.remove('on'));
  el.closest('.pm-opt').classList.add('on');
  updatePaymentFields();
}

function updatePaymentFields() {
  ['upi','card','cod','nb'].forEach(pm => {
    document.getElementById('pmFields-'+pm).classList.toggle('hidden', pm !== activePM);
  });
}

function renderCheckout() {
  const t = cartTotals();
  document.getElementById('osSubtotal').textContent = '₹' + t.sub.toLocaleString('en-IN');
  document.getElementById('osDelivery').textContent = t.del ? '₹49' : 'Free';
  document.getElementById('osDiscount').textContent = '-₹' + t.disc.toLocaleString('en-IN');
  document.getElementById('osTotal').textContent    = '₹' + t.total.toLocaleString('en-IN');
  document.getElementById('osSummaryItems').innerHTML = cart.map(i => `
    <div class="os-item">
      <img class="os-thumb" src="${foodPhoto(i)}" onerror="this.src='${FOOD_PHOTOS.buffet[0]}'">
      <div class="os-name">${i.name}</div>
      <div class="os-sub">${i.qty}× ₹${i.newPrice.toLocaleString('en-IN')}</div>
    </div>`).join('');
}

function validatePhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

function luhnCheck(cardDigits) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardDigits.length - 1; i >= 0; i--) {
    let digit = Number(cardDigits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function getPaymentDetails() {
  if (activePM === 'upi') {
    const upiId = document.getElementById('pmUpiId').value.trim();
    if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      throw new Error('Enter a valid UPI ID');
    }
    return { type:'upi', upiIdMasked: upiId.replace(/^(.{2}).+(@.+)$/, '$1***$2') };
  }
  if (activePM === 'card') {
    const cardNo = document.getElementById('pmCardNo').value.replace(/\s+/g, '');
    const cardName = document.getElementById('pmCardName').value.trim();
    const exp = document.getElementById('pmCardExp').value.trim();
    const cvv = document.getElementById('pmCardCvv').value.trim();
    if (!/^\d{12,19}$/.test(cardNo) || !luhnCheck(cardNo)) throw new Error('Enter a valid card number');
    if (!cardName) throw new Error('Enter name on card');
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) throw new Error('Enter expiry as MM/YY');
    const [mm, yy] = exp.split('/').map(Number);
    const now = new Date();
    const year = 2000 + yy;
    const expDate = new Date(year, mm, 0, 23, 59, 59);
    if (expDate < now) throw new Error('Card is expired');
    if (!/^\d{3,4}$/.test(cvv)) throw new Error('Enter valid CVV');
    return { type:'card', cardLast4: cardNo.slice(-4), cardName, exp };
  }
  if (activePM === 'nb') {
    const bank = document.getElementById('pmNbBank').value;
    const accountName = document.getElementById('pmNbName').value.trim();
    if (!bank) throw new Error('Select a bank for net banking');
    if (!accountName) throw new Error('Enter account holder name');
    return { type:'nb', bank, accountName };
  }
  return { type:'cod' };
}

async function placeOrder() {
  if (!cart.length) { toast('Your cart is empty','warn'); return; }
  const name  = document.getElementById('coName').value.trim();
  const phone = validatePhone(document.getElementById('coPhone').value.trim());
  if (!name || !phone) { toast('Please enter your name and phone number','warn'); return; }
  if (activeDM === 'delivery' && !document.getElementById('coAddr').value.trim()) {
    toast('Please enter your delivery address','warn'); return;
  }
  let paymentDetails;
  try {
    paymentDetails = getPaymentDetails();
  } catch (e) {
    toast(e.message || 'Invalid payment details', 'warn');
    return;
  }
  const btn = document.getElementById('placeBtn');
  btn.disabled = true; btn.textContent = 'Placing order…';
  try {
    const t       = cartTotals();
    const hotelId = cart[0].hotelId || 'unknown';
    const order   = await FBOrders.place({
      customerId:    user.uid,
      customerName:  name,
      customerPhone: phone,
      hotelId,
      hotelName:     cart[0].hotelName || cart[0].hotel || '',
      items:         cart.map(i => ({ id:i.id, name:i.name, qty:i.qty, price:i.newPrice, dm:i.dm })),
      total:         t.total,
      mode:          activeDM,
      payment:       activePM,
      paymentDetails,
      address:       activeDM === 'delivery' ? document.getElementById('coAddr').value : 'Self pickup at hotel',
    });
    customerOrders = [{ ...order, createdAt: Date.now() }, ...customerOrders];
    cart = []; renderCart();
    btn.disabled = false; btn.textContent = 'Place Order 🎉';
    showSuccess(order, t);
    renderProfile();
  } catch(e) {
    toast(e.message || 'Order failed. Please try again.','err');
    btn.disabled = false; btn.textContent = 'Place Order 🎉';
  }
}

function showSuccess(order, totals) {
  showPage('success');
  const pm = { upi:'UPI', card:'Card', cod:'Cash on Delivery', nb:'Net Banking' };
  const paymentDetailsText = order.paymentDetails?.type === 'card' ? `Card ending ${order.paymentDetails.cardLast4}`
    : order.paymentDetails?.type === 'upi' ? order.paymentDetails.upiIdMasked
    : order.paymentDetails?.type === 'nb' ? order.paymentDetails.bank
    : 'Pay on delivery/pickup';
  document.getElementById('successBox').innerHTML = `
    <div class="ob-row"><span>Order ID</span><span style="font-family:monospace;font-weight:700">${order.id}</span></div>
    <div class="ob-row"><span>Total Paid</span><span>₹${totals.total.toLocaleString('en-IN')}</span></div>
    <div class="ob-row"><span>Mode</span><span>${activeDM==='delivery'?'🛵 Home Delivery':'🏨 Self Pickup'}</span></div>
    <div class="ob-row"><span>Payment</span><span>${pm[activePM]||activePM}</span></div>
    <div class="ob-row"><span>Paid Via</span><span>${paymentDetailsText}</span></div>
    <div class="ob-row"><span>ETA</span><span>${activeDM==='delivery'?'30–45 mins':'Ready in 20 mins'}</span></div>
    <div class="ob-row"><span>Status</span><span style="color:var(--gr);font-weight:700">✅ Confirmed</span></div>`;
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function prefillCheckoutFromProfile() {
  document.getElementById('coName').value = user.name || '';
  document.getElementById('coCity').value = user.city || '';
  document.getElementById('profileAv').textContent = (user.name || 'U')[0].toUpperCase();
  document.getElementById('profileName').textContent = user.name || 'Customer';
  document.getElementById('profileEmail').textContent = user.email || '-';
}

function orderDateText(order) {
  if (!order?.createdAt) return 'Recently';
  if (typeof order.createdAt === 'number') return new Date(order.createdAt).toLocaleString('en-IN');
  if (order.createdAt?.toDate) return order.createdAt.toDate().toLocaleString('en-IN');
  return 'Recently';
}

function renderProfile() {
  const totalSpend = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('profileTotalOrders').textContent = String(customerOrders.length);
  document.getElementById('profileTotalSpend').textContent = 'Rs ' + totalSpend.toLocaleString('en-IN');
  const recentEl = document.getElementById('profileRecentOrders');
  if (!customerOrders.length) {
    recentEl.innerHTML = '<p class="modal-sub" style="margin-top:8px">No orders yet. Place your first order to see details here.</p>';
    return;
  }
  recentEl.innerHTML = customerOrders.slice(0, 8).map(o => `
    <div class="profile-order">
      <div class="profile-order-top">
        <div class="profile-order-id">${o.id}</div>
        <strong>Rs ${(o.total||0).toLocaleString('en-IN')}</strong>
      </div>
      <div class="profile-order-meta">${o.hotelName || 'Hotel'} · ${o.mode === 'delivery' ? 'Delivery' : 'Pickup'} · ${orderDateText(o)}</div>
      <div class="profile-order-meta">Status: ${(o.status || 'pending').toUpperCase()}</div>
    </div>
  `).join('');
}

async function loadCustomerProfile() {
  try {
    customerOrders = await FBOrders.getByCustomer(user.uid);
  } catch {
    customerOrders = [];
  }
  renderProfile();
}

function openProfileModal() {
  renderProfile();
  openModal('profileModal');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-bg')) {
    closeModal(e.target.id);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('profileModal').classList.contains('open')) closeModal('profileModal');
    if (document.getElementById('cartDrawer').classList.contains('open')) toggleCart();
  }
});

function toast(msg, type='ok') {
  const b = document.getElementById('toastBox'), t = document.createElement('div');
  const ic = { ok:'✅', err:'❌', info:'ℹ️', warn:'⚠️' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${ic[type]||'ℹ️'}</span> ${msg}`;
  b.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3600);
}

