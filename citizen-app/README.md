# CivicFix Nagpur — Citizen App

React Native mobile app built with Expo (JavaScript).

## Prerequisites

- Node.js supported by Expo SDK 58 (22.13+, 24.3+, 26+, or later) — https://nodejs.org
- Expo Go app on your phone (Android or iOS) — install from Play Store / App Store

## Setup & Run

```powershell
# 1. Open a terminal in this folder
cd citizen-app

# 2. Install dependencies
npm install

# 3. Start the Expo development server
npx expo start
```

A QR code will appear in the terminal.
- **On your phone:** open Expo Go and scan the QR code.
- **On a browser:** press `w` to open the web version.
- **Android emulator:** press `a` (requires Android Studio).

### Backend API URL (Android emulator)

Copy `.env.example` to `.env.local` in `citizen-app`; the example uses
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`, the Android emulator address
for a backend running on the development computer. Ensure the backend is
reachable on port 8000, then restart Expo after changing `.env.local`.
`EXPO_PUBLIC_` values are bundled into the app, so do not put secrets there.

### Backend integration and current limitations

- The citizen app uses `POST /api/v1/issues`, `GET /api/v1/issues`, and
  `GET /api/v1/issues/{issue_id}`. Community lists are paginated by the API and
  the app loads each page before showing the complete list.
- `reported`, `acknowledged`, `in_progress`, `resolved`, and `rejected` are
  mapped consistently to their citizen-facing labels. The API does not associate
  issues with an authenticated citizen, so home counts and complaint lists are
  community-wide.
- The report category picker sends the backend's canonical identifiers:
  `road_damage`, `garbage`, `water_supply`, `drainage`, `streetlight`,
  `electricity`, `sanitation`, `public_safety`, and `other`. Older category
  aliases are normalized for display when reading existing issues.
- Login and registration are local, in-memory demo flows only. The backend has
  no authentication endpoints; these screens do not authenticate users or
  create server accounts. Do not enter real credentials.
- A selected photo is previewed on-device only. The backend accepts an
  `image_url` reference but has no photo upload endpoint, so local photo files
  are not sent or persisted.
- The submit button prevents parallel submissions from the same screen, but
  the API does not support idempotency keys. If a connection fails after the
  server has accepted a report, retrying may create a duplicate.

### Checks

```powershell
npm test
npx expo export --platform android
```

## Project Structure

```
citizen-app/
├── app/
│   ├── _layout.jsx           Root navigation layout
│   └── (tabs)/
│       ├── _layout.jsx       Tab bar configuration
│       ├── index.jsx         Home Screen ← START HERE
│       ├── report.jsx        Report Issue (Stage 3)
│       └── complaints.jsx    Community Complaints
├── components/               Reusable UI components
├── constants/
│   └── colors.js             Brand colour palette
└── assets/                   Images and icons
```
