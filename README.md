# FOODBRIDGE V4 (React + Vite + Express + MongoDB)

T#  FoodBridge

Surplus food rescue platform that connects:
- `Hotels` with unsold food
- `Customers` who buy discounted meals
- `NGOs` that claim donations

This repository currently includes two app flows:
- Modern app: `frontend/` (React + Vite) + `backend/` (Express + MongoDB)
- Legacy static app: `index.html`, `customer.html`, `hotel.html`, `ngo.html` using `js/firebase.js` (Firebase or local demo storage)

## Core Features

- Role-based flows: customer, hotel, NGO
- Hotel listings with pricing, discounts, quantity, and expiry
- Customer cart and checkout
- Payment handling (UPI-based API in backend, and transaction flow in static app)
- Donation posting and NGO claim workflow
- Order tracking for hotel and customer
- Dynamic sold-out handling (sold-out listings are removed from backend listing set)

## Project Structure

```text
leftoverlux-v3/
├── frontend/                  # React + Vite web app
│   ├── src/
│   │   ├── pages/             # Home, Customer, Hotel, NGO pages
│   │   ├── services/          # API client
│   │   ├── styles/
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── backend/                   # Express + MongoDB API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── customer.html              # Legacy customer portal
├── hotel.html                 # Legacy hotel portal
├── ngo.html                   # Legacy NGO portal
├── index.html                 # Legacy landing/auth
└── js/firebase.js             # Legacy data/auth/payment service layer
```

## Tech Stack

- Frontend: React 18, React Router, Vite
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Legacy mode: Firebase SDK (optional), otherwise localStorage demo mode

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB local or MongoDB Atlas

## Installation

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## Environment Setup

Create backend env:

```bash
cp backend/.env.example backend/.env
```

`backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/foodbridge
CORS_ORIGIN=http://localhost:5173
```

Optional:
- `SEED_DEMO=true` to seed demo listings/donations when DB collections are empty
- `UPI_MERCHANT_ID` and `UPI_MERCHANT_NAME` for backend UPI payment link generation

## Important Port Note

Current frontend Vite proxy in `frontend/vite.config.js` is:

```js
proxy: {
  '/api': 'http://localhost:5001',
}
```

So either:
1. Run backend on `5001` (set `PORT=5001` in `backend/.env`)  
or
2. Change Vite proxy to `http://localhost:5000`

## Run the Project

Run both apps:

```bash
npm run dev
```

Run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000` or `http://localhost:5001` (based on your config)

## API Overview

Health:
- `GET /api/health`

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me/:id`
- `PUT /api/auth/me/:id`

Listings:
- `GET /api/listings`
- `POST /api/listings`
- `PUT /api/listings/:id`
- `DELETE /api/listings/:id`

Cart + Checkout:
- `GET /api/cart/:customerId`
- `PUT /api/cart/:customerId/items/:listingId`
- `DELETE /api/cart/:customerId/items/:listingId`
- `POST /api/cart/:customerId/checkout`

Orders:
- `GET /api/orders`
- `POST /api/orders`

Donations:
- `GET /api/donations`
- `POST /api/donations`
- `PATCH /api/donations/:id/claim`

NGO + Hotel Settings:
- `GET /api/ngos`
- `GET /api/hotels/settings/:hotelName`
- `PUT /api/hotels/settings/:hotelName`

Payments:
- `POST /api/payments/upi/create`
- `GET /api/payments/:id`
- `POST /api/payments/:id/confirm`

## Legacy Static App Notes

- `js/firebase.js` runs in two modes:
  - Firebase mode (when valid config is provided)
  - Demo mode (default placeholders): data stored in browser localStorage
- Static customer flow now includes:
  - Payment transaction creation
  - Payment reference/status in order success
  - Order-placed popup after successful payment/order

## Troubleshooting

- `CORS` errors:
  - Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Requests failing from frontend:
  - Check backend port vs Vite proxy mismatch (`5000` vs `5001`)
- Mongo connection errors:
  - Verify `MONGO_URI` and that MongoDB is running

## Future Improvements

- Real payment gateway integration (Razorpay/Stripe)
- JWT auth and route protection in backend APIs
- Automated tests (unit + integration + e2e)
- Docker setup for one-command local environment


## Notes

- Old static HTML files are still present for reference.
- New portal pages are componentized in React and use separated CSS files.
- Backend auto-seeds sample listings/donations when collections are empty.

## Drive Link
https://drive.google.com/drive/folders/1ROzox2AbRdATqez2Pg6yFGuAf7PUjPNO
drive content:
1.Prototype 
2.PPT
3.Pitch Video
