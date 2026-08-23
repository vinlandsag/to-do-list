# Flowlist

A beautifully designed, local-first to-do list and daily planner. Flowlist is built with modern web technologies and functions as a Progressive Web App (PWA) with offline support and installability across devices.

## Features
- **Cloud Sync & Offline First**: Data is saved to your local device for instant, offline access, and seamlessly synced to Supabase in the background when online.
- **Secure Authentication**: Built-in email/password authentication via Supabase Auth with Row Level Security (RLS) ensuring total privacy for your data.
- **Dynamic Interactions**: Features a stunning, interactive 3D background powered by Three.js (lazy-loaded for performance).
- **Progressive Web App**: Installable on iOS and Android devices, with a fully responsive mobile interface.
- **Offline Capable**: Works entirely offline with Service Worker caching.

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo>
   cd flowlist
   npm install
   ```

2. **Supabase Setup**
   - Create a free project on [Supabase](https://supabase.com/).
   - Execute the SQL from `supabase/schema.sql` in the SQL Editor to create tables and RLS policies.
   - Copy `.env.example` to `.env` and fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.

---

## 📱 Running Natively (iOS & Android)

Flowlist uses [Capacitor](https://capacitorjs.com/) to compile into true native apps with offline support and background notifications.

### Prerequisites
- **iOS**: Mac with Xcode installed via the Mac App Store.
- **Android**: Android Studio installed.

### Native Build Steps
Whenever you change web code, you must build and sync it to the native projects:
```bash
npm run build
npm run cap:sync
```

### Running on a Physical iPhone (iOS)
1. Ensure your iPhone is connected via USB and trusted.
2. Run `npm run cap:open:ios` (this opens Xcode).
3. In Xcode, click the top status bar (where it says "App") and select your physical iPhone device from the list.
4. If you see a "Signing" error, click your project in the left sidebar, navigate to "Signing & Capabilities", and select a Personal Team (you will need to log in with your Apple ID).
5. Press the **Play (▶)** button in Xcode to compile and install Flowlist onto your device.

### Running on a Physical Android Phone
1. Enable **Developer Options** and **USB Debugging** on your Android device (usually by tapping "Build Number" 7 times in Settings).
2. Connect your phone via USB.
3. Run `npm run cap:open:android` (this opens Android Studio).
4. Wait for Gradle to finish syncing (watch the bottom status bar).
5. Select your device from the dropdown near the top.
6. Press the **Play (▶) "Run app"** button.

*Note: Native configuration (like `capacitor.config.json`) does not contain hardcoded API keys. The app reads keys dynamically.*

---

## 🏗 Data Architecture

## Production Build & Deployment

Flowlist is a static Single Page Application (SPA) and can be deployed to any static web host (e.g., Netlify, Vercel, GitHub Pages, or AWS S3).

1. **Generate the Production Build**
   ```bash
   npm run build
   ```
   This command optimizes assets, creates manual chunks for dependencies like Three.js to keep the main bundle under 300 kB, and generates the Service Worker and PWA manifest.

2. **Test the Production Build Locally**
   ```bash
   npm run preview
   ```
   This will serve the `dist/` folder locally, allowing you to test the PWA features and offline functionality before deploying.

3. **Deploy**
   Upload the contents of the `dist/` directory to your static hosting provider. 

## Technology Stack
- **Framework**: React 18 + Vite
- **Database & Auth**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: Vanilla CSS (Responsive & Mobile-first)
- **PWA**: `vite-plugin-pwa` for manifest generation and Workbox integration
- **3D Graphics**: `three.js` (Lazy-loaded via React Suspense)
