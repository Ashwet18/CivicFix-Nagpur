# CivicFix Admin Dashboard

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the reachable FastAPI origin before
starting Vite. It defaults to `http://localhost:8000`. Vite public environment
variables are included in browser code and must not contain credentials.
The backend must allow the dashboard origin in its CORS configuration and
permit `GET`, `PATCH`, and `OPTIONS` requests with the `Content-Type` header.

## Backend integration

- The dashboard reads `GET /api/v1/issues` using `skip`/`limit` pagination and
  `GET /api/v1/issues/{issue_id}` for details. Dashboard counts, local filters,
  search, and table pagination are based on the complete list loaded from every
  backend page; the backend currently has no search endpoint.
- Complaint statuses can be changed through
  `PATCH /api/v1/issues/{issue_id}/status` with
  `{"status":"reported|acknowledged|in_progress|resolved|rejected"}`. The
  dashboard updates only after the backend confirms and then reloads the list.
- The backend does not provide areas/addresses, department assignment,
  department records, department CRUD, or status history. The complaints
  screen displays absent fields as unavailable; the Departments page explains
  the data and endpoints Dev 1 must add before a persistent workflow can exist.
- Admin authentication is not implemented. This dashboard is not an
  authenticated administrative interface and must not be exposed as one.

## Checks

```powershell
npm run build
```
