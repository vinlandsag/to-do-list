# Flowlist — Your Daily Tasks

A beautifully designed, premium to-do list and reminder web application built with React and Vite. Featuring a stunning 3D interactive ballpit background, glassmorphism UI, dark mode support, and a complete authentication system.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication Flow](#authentication-flow)
- [Design System](#design-system)
- [Component Reference](#component-reference)
- [Responsive Breakpoints](#responsive-breakpoints)

---

## Features

### 🔐 Authentication
- **Login & Sign Up** — Full-featured login page with toggle between modes
- **localStorage-based auth** — No backend required; users and sessions persist locally
- **Remember me** — Option to persist session across browser restarts
- **Password visibility toggle** — Show/hide password with animated eye icon
- **Error handling** — Shake animation + contextual error/success alerts

### ✅ Task Management
- **To-do list** — Create, edit, delete, and complete tasks
- **Reminder list** — Separate list with optional date/time reminders
- **Notification System** — Real-time browser notifications, in-app toast alerts with snooze, and a notification history center
- **Filters** — View All, Active, or Completed tasks
- **Inline editing** — Edit tasks without navigating away
- **Persistent storage** — All tasks saved to localStorage

### 🎨 Design & UX
- **Glassmorphism** — Frosted-glass card effects with `backdrop-filter`
- **3D Ballpit background** — Interactive Three.js particle simulation
- **Dark mode** — System-aware toggle with smooth transitions
- **Micro-animations** — Hover effects, card entrance, shake on error, floating orbs
- **Premium typography** — DM Sans + Playfair Display from Google Fonts
- **Fully responsive** — Mobile-first design with 3 breakpoint tiers

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React** (latest) | UI component library |
| **Vite** (latest) | Build tool and dev server |
| **Three.js** (0.180.0) | 3D ballpit background animation |
| **Vanilla CSS** | All styling — no CSS framework |
| **localStorage** | Data persistence for tasks and authentication |

---

## Project Structure

```
flowlist/
├── index.html              # Entry HTML — loads fonts, CSS, and main.jsx
├── package.json            # Dependencies and scripts
├── styles.css              # All application styles (design system + components)
├── app.js                  # Legacy vanilla JS version (unused by React app)
├── components.json         # Component configuration
├── tsconfig.json           # TypeScript configuration (for IDE support)
│
├── src/
│   ├── main.jsx            # App entry point — auth routing, task management logic
│   ├── LoginPage.jsx       # Login/Sign Up page component
│   ├── ThemeToggle.jsx     # Dark mode toggle switch component
│   └── Ballpit.jsx         # Three.js interactive particle background
│
└── dist/                   # Production build output (generated)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** installed

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flowlist

# Install dependencies
npm install
```

### Development

```bash
# Start the dev server (default: http://localhost:5173)
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## Authentication Flow

Flowlist uses a client-side authentication system powered by `localStorage`. No backend server is required.

### How It Works

```
┌─────────────────────────────┐
│        First Visit          │
│   No session in storage     │
│         ↓                   │
│   Show LoginPage            │
│         ↓                   │
│   User Signs Up / Logs In   │
│         ↓                   │
│   Session saved to          │
│   localStorage (remember)   │
│   or sessionStorage         │
│         ↓                   │
│   Show App (Tasks)          │
│         ↓                   │
│   User clicks "Sign out"    │
│         ↓                   │
│   Session cleared           │
│   → Back to LoginPage       │
└─────────────────────────────┘
```

### Storage Keys

| Key | Storage | Contents |
|---|---|---|
| `flowlist-users-v1` | localStorage | Registered user accounts (email → { name, passwordHash, createdAt }) |
| `flowlist-session-v1` | localStorage or sessionStorage | Current session ({ email, name }) |
| `flowlist-tasks-v1` | localStorage | All tasks and reminders |
| `theme` | localStorage | Dark/light mode preference |

### Security Note

> ⚠️ This is a **client-side demo authentication** system. Passwords are hashed with a simple non-cryptographic hash and stored in localStorage. **Do not use this for production applications** that require real security. For production, integrate a proper backend auth service (e.g., Firebase Auth, Auth0, Supabase Auth).

---

## Design System

### Color Palette

The design uses a warm, earthy color palette defined as CSS custom properties:

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--ink` | `#4A4238` | `#F5F0E8` | Primary text |
| `--muted` | `#8C7D6B` | `#A99985` | Secondary text, icons |
| `--purple` | `#A67B5B` | `#A67B5B` | Accent, buttons, links |
| `--lilac` | `#F5F0E8` | `#4A4238` | Subtle backgrounds |
| `--line` | `#EAE3D9` | `#3D352E` | Borders, dividers |
| `--paper` | `#FFFCF7` | `#2C2823` | Card backgrounds |
| `--cream` | `#FDFBF7` | `#1E1C1A` | Page background |
| `--shadow` | `rgba(74,66,56,0.07)` | `rgba(0,0,0,0.2)` | Box shadows |
| `--shadow-purple` | `rgba(166,123,91,0.22)` | — | Accent shadows |

### Typography

| Font | Weight | Usage |
|---|---|---|
| **Playfair Display** | 700, 800 | Headings, brand logo, date card |
| **DM Sans** | 400, 500, 600, 700 | Body text, UI elements |

### Key Design Patterns

- **Glassmorphism**: Semi-transparent backgrounds with `backdrop-filter: blur(24px) saturate(1.4)` and subtle borders
- **Layered shadows**: Multiple box-shadow layers for realistic depth
- **`color-mix()`**: Used extensively for transparent tints derived from palette colors
- **`@starting-style`**: Modern CSS entry animations for cards and alerts
- **`prefers-reduced-motion`**: All animations respect user motion preferences

---

## Component Reference

### `<App />` — [main.jsx](src/main.jsx)

The root component managing authentication state and the entire task management interface.

| State | Type | Description |
|---|---|---|
| `session` | `object \| null` | Current user session; `null` shows login page |
| `tasks` | `array` | All tasks/reminders (persisted to localStorage) |
| `listType` | `'tasks' \| 'reminders'` | Active list tab |
| `filter` | `'all' \| 'active' \| 'completed'` | Task filter |
| `editingId` | `string \| null` | ID of task being edited |
| `title` | `string` | Form title input |
| `description` | `string` | Form description input |
| `remindAt` | `string` | Reminder datetime input |

---

### `<LoginPage />` — [LoginPage.jsx](src/LoginPage.jsx)

Full-screen login/sign-up page with glassmorphism card design.

| Prop | Type | Description |
|---|---|---|
| `onLogin` | `(session) => void` | Callback when user successfully authenticates |

**Features:**
- Toggle between Sign In and Sign Up modes
- Email + password fields with floating labels and SVG icons
- Password visibility toggle
- "Remember me" checkbox (localStorage vs sessionStorage)
- Error shake animation
- Success message with auto-redirect

---

### `<ThemeToggle />` — [ThemeToggle.jsx](src/ThemeToggle.jsx)

Dark/light mode toggle switch.

- Reads initial theme from localStorage or system preference
- Applies `data-theme` attribute to `<body>`
- Persists preference to localStorage

---

### `<Ballpit />` — [Ballpit.jsx](src/Ballpit.jsx)

Three.js interactive 3D particle background.

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | — | Number of particles |
| `colors` | `number[]` | — | Array of hex colors for particles |
| `radiusCm` | `number` | — | Particle radius in centimeters |
| `gravity` | `number` | — | Gravity force (0 = floating) |
| `friction` | `number` | — | Velocity damping factor |
| `wallBounce` | `number` | — | Wall bounce elasticity |
| `maxVelocity` | `number` | — | Maximum particle speed |
| `cursorForce` | `number` | — | Force applied by cursor interaction |
| `followCursor` | `boolean` | — | Whether particles react to cursor |

---

## Responsive Breakpoints

| Breakpoint | Target | Key Changes |
|---|---|---|
| `> 760px` | Desktop | Full two-column layout, sticky add-card |
| `≤ 760px` | Tablet | Single column, static add-card, visible task actions |
| `≤ 480px` | Mobile (login) | Compact login card, larger touch targets |
| `≤ 420px` | Mobile (app) | Hidden date card, compact list switcher |

---

## License

This project is private and not licensed for redistribution.
