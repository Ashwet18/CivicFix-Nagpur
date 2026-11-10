# CivicFix Nagpur — Frontend Handoff Documentation

**Integration branch:** `feature/stage-6-frontend-handoff`  
**Date:** 2026-10-30  
**Prepared by:** Dev2

---

## Overview

This document covers setup, configuration, and known limitations for both
frontend applications. It is intended for any team member picking up Dev2 work
or integrating the frontends with the backend.

---

## 1. Citizen Mobile App Setup

**Location:** `citizen-app/`  
**Technology:** React Native · Expo SDK 58 · Expo Router 4  
**Requires:** Node.js 22.13+ / 24.3+ / 26+ (Expo SDK 58 requirement)

### Install

```powershell
cd citizen-app
npm install
```

### Configure the API base URL

Create `citizen-app/.env.local` from the example:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and set `EXPO_PUBLIC_API_BASE_URL` to the address
where the FastAPI backend is reachable **from the device running the app**:

| Runtime | Value |
|---|---|
| Android emulator (default) | `http://10.0.2.2:8000` |
| Physical Android device | `http://<host-LAN-IP>:8000` |
| iOS simulator | `http://localhost:8000` |
| Expo web (browser) | `http://localhost:8000` |

The app throws an explicit startup error if `EXPO_PUBLIC_API_BASE_URL` is
unset or malformed.

### Run

```powershell
npx expo start          # starts Metro; scan QR with Expo Go, or press w for browser
npx expo start --android  # Android emulator
npx expo start --ios      # iOS simulator (macOS only)
```

### Test

```powershell
node --test tests/issues.test.cjs
```

Expected: 8 tests, 8 passed, 0 failed.

### Export (verify build)

```powershell
npx expo export --platform android
```

Expected: 1169 modules bundled, 2.5–2.6 MB `.hbc` bundle in `dist/`.

---

## 2. Admin Dashboard Setup

**Location:** `admin-dashboard/`  
**Technology:** React 18 · Vite 5 · react-router-dom 6  
**Requires:** Node.js 18+

### Install

```powershell
cd admin-dashboard
npm install
```

### Configure the API base URL (optional)

The dashboard defaults to `http://localhost:8000`. To use a different URL,
create `admin-dashboard/.env.local`:

```
VITE_API_BASE_URL=http://your-backend-host:8000
```

If `.env.local` is absent, the dashboard calls `http://localhost:8000`.

### Run (development)

```powershell
npm run dev
# Opens at http://localhost:5174
```

### Build (production)

```powershell
npm run build
# Output: admin-dashboard/dist/
```

Expected: 46 modules, build completes in under 3 seconds.

---

## 3. Backend Setup (required for real data)

**Location:** project root  
**Technology:** Python 3.11+ · FastAPI · PostgreSQL · psycopg3

### Install

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Configure

```powershell
Copy-Item .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string
```

Minimum required `.env` content:

```
ENVIRONMENT=development
DATABASE_URL=postgresql://user:password@localhost:5432/civicfix_nagpur
```

### Create database and tables

```powershell
psql -U postgres -c "CREATE DATABASE civicfix_nagpur;"
python -m app.db.init_db
```

`init_db` creates missing tables. It does not delete existing data.

### Start

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://localhost:8000`  
Swagger UI: `http://localhost:8000/docs`

### CORS

CORS is enabled automatically when `ENVIRONMENT=development`.
Default allowed origins:

```
http://localhost:3000   http://127.0.0.1:3000
http://localhost:5173   http://127.0.0.1:5173
http://localhost:5174   http://127.0.0.1:5174   (admin dashboard)
http://localhost:8081   http://127.0.0.1:8081   (Expo web)
```

To add additional origins, set `ALLOWED_ORIGINS` in `.env` as a
comma-separated list.

---

## 4. Required Backend Endpoints

Both frontends use these endpoints. All are under the prefix `/api/v1/issues`.

| Method | Path | Used by | Description |
|---|---|---|---|
| `POST` | `/api/v1/issues` | Citizen | Submit a new complaint |
| `GET` | `/api/v1/issues` | Both | List issues (paginated; `skip`, `limit`, `status`, `category`) |
| `GET` | `/api/v1/issues/{id}` | Both | Get single issue detail |
| `PATCH` | `/api/v1/issues/{id}` | Admin | Update issue fields |
| `PATCH` | `/api/v1/issues/{id}/status` | Admin | Update issue status |
| `GET` | `/health` | — | Health check (requires live DB) |

### Status values

Both frontends use the same lowercase backend status values:

| Backend value | Display label |
|---|---|
| `reported` | Reported |
| `acknowledged` | Acknowledged |
| `in_progress` | In Progress |
| `resolved` | Resolved |
| `rejected` | Rejected |

### Request body for POST /api/v1/issues

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | ✅ | 5–150 characters |
| `description` | string | ✅ | 10–5000 characters |
| `category` | string | No | max 100 chars; lowercased before storage |
| `severity` | string | No | max 50 chars |
| `latitude` | float | No | −90 to 90 |
| `longitude` | float | No | −180 to 180 |
| `image_url` | string | No | HTTP/HTTPS URL, max 500 chars |

---

## 5. Known Limitations

### 5.1 Authentication — not implemented

**Impact:** Critical for production; acceptable for development demo.

The backend has no authentication endpoints. All API calls are anonymous.
The citizen app's login and registration screens use a mock `AuthContext`
(`citizen-app/context/auth.jsx`) that does not connect to any real endpoint.

**Mock credentials (dev only):** `citizen@civicfix.dev` / `Demo@1234`

**What is needed:**
- Backend: `POST /api/v1/auth/register` and `POST /api/v1/auth/login`
  returning a JWT or session token
- Backend: issue ownership (associate issues with the authenticated user)
- Citizen app: replace mock `login()` / `register()` in `context/auth.jsx`
  with real API calls; store token with `expo-secure-store`

### 5.2 Photo upload — not implemented

**Impact:** Photos collected by the citizen app are not sent to the server.

`expo-image-picker` returns a local device URI (e.g. `file:///data/...`).
The API field `image_url` accepts only HTTP/HTTPS URLs.
The citizen service layer (`services/issues.js`) explicitly rejects local
URIs with a user-readable error; `image_url` is never transmitted.

**What is needed:**
- A file upload endpoint (e.g. `POST /api/v1/issues/{id}/photo`) or
  integration with cloud storage (S3, Firebase Storage, Cloudinary)
- Once a public URL is available, it can be passed as `image_url`

### 5.3 Department assignment — not implemented

**Impact:** The admin dashboard shows "Not provided by API" for department.

The API has no department model, no `assigned_to` field on issues, and no
assignment endpoint. The admin Complaints page labels this column explicitly
as "Not provided by API" so it is visible but not misleading.

**What is needed:**
- Backend: `departments` table, `GET /api/v1/departments`, and
  `PATCH /api/v1/issues/{id}/assign`
- Admin dashboard: replace static label with a department dropdown

### 5.4 scikit-learn missing — 3 backend tests fail

**Impact:** 3 of 124 backend tests fail. API and frontend are unaffected.

`tests/test_duplicate_detection.py` contains 3 tests that require
`scikit-learn` for text similarity scoring. `scikit-learn` is not in
`requirements.txt` and is not installed.

**Root cause:** Dev1 ML feature; not a Dev2 regression.

**Failing tests:**
- `TestDuplicateDetectorLocationBased::test_detect_duplicates_within_5_meters`
- `TestDuplicateDetectorNoLocation::test_no_location_data_provided`
- `TestDuplicateDetectorTextSimilarity::test_high_text_similarity_ranked_higher`

**Fix:** Add `scikit-learn>=1.3,<2.0` to `requirements.txt` and run
`pip install -r requirements.txt`.

### 5.5 Status history — not stored by backend

**Impact:** The citizen complaint detail screen cannot show a timeline.

The API returns `created_at` and `updated_at` timestamps but no history of
previous status transitions. The original `complaint/[id].jsx` timeline
component relies on a `timeline[]` array that no longer exists after the
mock context was replaced with real API data.

**What is needed:**
- Backend: an `issue_status_history` table and
  `GET /api/v1/issues/{id}/history` endpoint
- Citizen app: restore timeline rendering once endpoint is available

### 5.6 .env.local not committed (by design)

Both frontends require a local `.env.local` file that is excluded from Git
(covered by `.gitignore`). Each developer must create this file manually
from the `.env.example` in each sub-project. The app throws a readable
startup error if the file is absent.

---

## 6. File Structure Reference

```
CivicFix-Nagpur/
├── citizen-app/
│   ├── .env.example              API URL configuration template
│   ├── services/
│   │   ├── api.js                Base fetch wrapper; reads EXPO_PUBLIC_API_BASE_URL
│   │   └── issues.js             listIssues, getIssue, createIssue, mapIssue
│   ├── context/
│   │   ├── auth.jsx              Mock auth (replace in auth integration)
│   │   └── complaints.jsx        Real API-backed complaint store
│   ├── app/
│   │   ├── (auth)/login.jsx      Login screen (mock auth)
│   │   ├── (auth)/register.jsx   Registration screen (mock auth)
│   │   ├── (tabs)/index.jsx      Home — live stats from context
│   │   ├── (tabs)/report.jsx     Report issue form → createIssue()
│   │   ├── (tabs)/complaints.jsx Complaint list → listIssues()
│   │   └── complaint/[id].jsx    Complaint detail → getIssue()
│   └── tests/issues.test.cjs     Unit tests for services/issues.js
│
├── admin-dashboard/
│   ├── .env.example              API URL configuration template
│   └── src/
│       ├── services/issues.js    fetchAllIssues, fetchIssue, updateIssueStatus
│       ├── pages/Dashboard.jsx   Overview stats + recent issues
│       ├── pages/Complaints.jsx  Full table: filter, search, status update
│       └── pages/Departments.jsx Department list (static — no API yet)
│
└── app/                          FastAPI backend (Dev1)
    ├── main.py                   CORS middleware registered here
    ├── core/config.py            ALLOWED_ORIGINS, DATABASE_URL
    ├── api/routes/issues.py      All issue endpoints
    ├── models/issue.py           Issue SQLAlchemy model
    └── schemas/issue.py          IssueCreate, IssueUpdate, IssueResponse
```

---

## 7. Quick Start Checklist

```
□ pip install -r requirements.txt
□ Create .env from .env.example; set DATABASE_URL
□ psql: CREATE DATABASE civicfix_nagpur;
□ python -m app.db.init_db
□ uvicorn app.main:app --reload --port 8000

□ cd citizen-app && npm install
□ Create citizen-app/.env.local; set EXPO_PUBLIC_API_BASE_URL
□ npx expo start

□ cd admin-dashboard && npm install
□ npm run dev  (opens at http://localhost:5174)
```
