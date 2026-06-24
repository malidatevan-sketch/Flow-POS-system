# Flow POS System

Cafe POS system with React frontend (PWA) and Node.js/Express/SQLite backend.

## Quick Start
```
npm run install:all
npm run seed
npm run dev
```

## Architecture
- **Backend**: `backend/` - Express + better-sqlite3, port 3001
- **Frontend**: `frontend/` - React + Vite + Tailwind CSS, port 5173
- **Database**: SQLite at `backend/data/flow-pos.db`

## API Endpoints
- `GET/POST /api/categories` - Category CRUD
- `GET/POST /api/products` - Product CRUD with search/filter
- `GET/POST /api/orders` - Order management, `PATCH /:id/void` to void
- `GET /api/stock/levels|alerts`, `POST /api/stock/adjust` - Stock management
- `GET /api/analytics/today|range` - Sales analytics

## Key Commands
- `npm run dev` - Start both servers (backend + frontend)
- `npm run build` - Build frontend for production
- `npm run seed` - Reset database with sample cafe data
- `npm start` - Production mode (serves built frontend from backend)
