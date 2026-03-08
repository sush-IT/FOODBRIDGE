# FOODBRIDGE V4 (React + Vite + Express + MongoDB)

This project is now split into:

- `frontend`: React + Vite application
- `backend`: Express API with MongoDB (Mongoose)

## New Structure

```text
foodbridge-v3/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── package.json
```

## Setup

1. Install dependencies:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

2. Configure backend env:

```bash
cp backend/.env.example backend/.env
```

3. Start MongoDB locally (or update `MONGO_URI` in `backend/.env` to your Atlas URL).

4. Run both apps:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Endpoints

- `GET /api/health`
- `GET /api/listings`
- `POST /api/listings`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/donations`
- `POST /api/donations`
- `PATCH /api/donations/:id/claim`

## Notes

- Old static HTML files are still present for reference.
- New portal pages are componentized in React and use separated CSS files.
- Backend auto-seeds sample listings/donations when collections are empty.
