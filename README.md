# idx-property-search

A property search app built on IDX real estate listing data. Browse and filter
listings, page through results, and open a detail page with photos, a map, and
open house times.

Node/Express + MySQL on the backend, React on the frontend.

## Team

Ana Clara · Shuwen Wen · Janie Tran · Westin Mathies · Ethan Li · Jenny Huynh

## Setup

You'll need Node 18+ and MySQL running locally.

**1. Load the data**

```bash
mysql -u root -p -e "CREATE DATABASE rets"
mysql -u root -p rets < rets_property.sql
mysql -u root -p rets < rets_openhouse.sql
```

**2. Backend**

```bash
cd backend
npm install
```

Create `backend/.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rets
PORT=5001
```

Port 5001, not 5000 — macOS AirPlay Receiver already uses 5000.

```bash
npm run dev
```

**3. Frontend**

```bash
cd frontend
npm install
npm start
```

Runs on port 3000 and proxies API calls to 5001.

For the map, create `frontend/.env`:

```
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
```

Get a key from the Google Cloud console with the Maps Embed API enabled, and
restrict it to `localhost:3000`. Without a key everything still works — the map
just shows a placeholder. Restart the dev server after adding it.

**4. Optional: indexes**

```bash
mysql -u root -p rets < backend/sql/001-filter-indexes.sql
```

Speeds up filtered searches. See `backend/docs/performance.md`.

## API

Base path `/api/properties`.

| Endpoint | What it does |
|---|---|
| `GET /` | Paginated listings. Filters: `city`, `zipcode`, `minPrice`, `maxPrice`, `beds`, `baths`. Sort with `sortBy` (price, date, sqft, beds) and `sortOrder` (asc, desc). Paging with `limit` and `offset`. |
| `GET /:id` | One property, or 404. |
| `GET /:id/openhouses` | Open house events. Empty array if none. |
| `GET /price-distribution` | Price histogram for the filter slider. |
| `GET /api/health` | Database connection check. |

Example:

```
GET /api/properties?city=Palm Springs&minPrice=500000&sortBy=price&sortOrder=desc&limit=20
```

```json
{
  "total": 693,
  "limit": 20,
  "offset": 0,
  "results": [ { "L_ListingID": "1169421541", "L_Address": "696 S Warm Sands Drive", "...": "..." } ]
}
```

## Database

Two tables, joined on `L_ListingID`.

**rets_property** — one row per listing. Column names come from the RETS feed
and aren't obvious: `L_SystemPrice` is price, `L_Keyword2` is beds, `LM_Dec_3`
is baths, `LM_Int2_3` is square feet. `L_Photos` is a JSON array stored as text.

**rets_openhouse** — open house events. Remarks aren't a column; they're inside
the `all_data` JSON blob under `OpenHouseRemarks`.

## Project layout

```
backend/
  routes/      API endpoints
  utils/       query building, sort whitelist
  middleware/  request logging
  sql/         index migrations
  docs/        performance notes

frontend/src/
  api/         the only place that calls fetch
  pages/       listings, detail, favorites — own the state
  components/  presentational, props in and callbacks out
  hooks/       useFavorites
  utils/       parsing and formatting, no React
```

## Commands

```bash
npm run dev     # backend, port 5001
npm start       # frontend, port 3000
npm test        # frontend tests
npm run lint    # frontend linter
npm run build   # production build
```

## Git workflow

Work goes on a feature branch off `develop`, then merges back. Nothing commits
straight to `main`. Commit messages use `type(scope): description` — types are
feat, fix, refactor, test, docs, chore.

## Known issues

The feed data is messy and the app works around it:

- Some listings have no photos, or photo data that isn't valid JSON
- Price, beds, and baths can be null
- Missing lat/lng on some properties, so the map only renders when both exist
- Only about 1% of listings have open houses

Other things worth knowing:

- Favorites are stored in localStorage, so they're per browser, not per account
- The favorites page fetches each saved property separately. Fine for a handful,
  slow for a lot — a batch endpoint would fix it
- Going back from a detail page returns to page 1 with filters cleared, since
  filter state lives in React and not the URL
