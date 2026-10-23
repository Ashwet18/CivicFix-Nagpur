# CivicFix Nagpur — Citizen App

React Native mobile app built with Expo (JavaScript).

## Prerequisites

- Node.js v18 or later — https://nodejs.org
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

## Project Structure

```
citizen-app/
├── app/
│   ├── _layout.jsx           Root navigation layout
│   └── (tabs)/
│       ├── _layout.jsx       Tab bar configuration
│       ├── index.jsx         Home Screen ← START HERE
│       ├── report.jsx        Report Issue (Stage 3)
│       └── complaints.jsx    My Complaints (Stage 4)
├── components/               Reusable UI components
├── constants/
│   └── colors.js             Brand colour palette
└── assets/                   Images and icons
```
