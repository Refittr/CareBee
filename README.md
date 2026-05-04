# CareBee & BUZZ

CareBee is a comprehensive care management ecosystem designed to simplify and enhance the lives of individuals receiving care ("Achievers") and those supporting them ("Supporters"). The project consists of a full-featured web platform and a specialized mobile companion app called **BUZZ**.

## 🐝 Project Vision
To bridge the gap between complex care requirements and simple, human-centric interaction. CareBee handles the logistics (scheduling, records, household management), while BUZZ provides a high-accessibility interface for the daily "buzz" of life—routines, nudges, and emotional check-ins.

---

## 🏗️ Architecture Overview

The system is built on a modern, decoupled architecture with a shared realtime backend:

1.  **CareBee Web (PWA)**
    *   **Logic**: Next.js 16 (App Router), TypeScript.
    *   **Role**: Primary management hub for Supporters. Handles household administration, calendar, detailed care notes, analytics, and billing.
    *   **Deployment**: Vercel (PWA optimized).

2.  **BUZZ Mobile**
    *   **Logic**: Flutter, Dart.
    *   **Role**: Dual-mode application.
        *   **Achiever Mode**: A high-contrast, large-target tablet interface for checking routines and logging moods. Locked via a "Router Lock" to prevent accidental navigation.
        *   **Supporter Mode**: Realtime management of routines, device pairing, and "Nudges" (messages).
    *   **State Management**: Riverpod.

3.  **Shared Backend (Supabase)**
    *   **PostgreSQL Database**: Single source of truth for both platforms.
    *   **Authentication**: Unified Auth via Supabase. BUZZ uses anonymous auth for tablet devices, linked via a secure 2-way handshake.
    *   **Realtime**: powers the pairing mechanism and instant notifications.
    *   **Storage**: Manages avatars and care documents.
    *   **Edge Functions**: Handles complex logic like digest generations and Stripe integrations.

---

## 🛠️ Technology Stack

### Frontend (Web)
*   **Framework**: Next.js 16.2.1
*   **Styling**: Tailwind CSS 4, Google Fonts (Geist/Inter/Outfit)
*   **Components**: Custom UI system using Radix-like patterns (Honey/Sage/Warmstone palette)
*   **Icons**: Lucide React
*   **Payments**: Stripe API

### Mobile (BUZZ)
*   **Framework**: Flutter
*   **Navigation**: GoRouter (with role-based locking)
*   **Local Storage**: SharedPreferences
*   **Connectivity**: Supabase SDK (Realtime, Postgres)

### Infrastructure
*   **Database**: Supabase (PostgreSQL)
*   **Security**: Row Level Security (RLS) ensuring strict data isolation per household and role.
*   **PWA**: `next-pwa` for offline-capable web application.

---

## ✨ Feature Breakdown

### 🏠 CareBee Web
*   **Household Management**: Create and manage "Households"—the core security boundary.
*   **Care Notes & Analytics**: Detailed logging and digest logs for care history.
*   **Calendar & Events**: Unified scheduling for appointments and medication.
*   **Document Vault**: Secure storage for care-related documents.
*   **Onboarding Checklist**: Guided setup for new households.

### ⚡ BUZZ Mobile
*   **Achiever Tablet**:
    *   **Routine Timeline**: Chronological view of daily tasks.
    *   **Mood Check-in**: Large emoji-based emotional tracking.
    *   **My Circle**: Simple view of connected supporters.
    *   **Accessibility**: High contrast, no technical jargon, large tap targets.
*   **Supporter Dashboard**:
    *   **Device Pairing**: Secure QR and 4-digit PIN handshake to link tablet devices.
    *   **Routine Management**: Create bespoke tasks (e.g., "Brush teeth", "Watch favorite show").
    *   **Nudges**: Instant messages or push notifications sent to the Achiever's tablet.
    *   **Notification Preferences**: Fine-grained control over routine completion alerts.

---

## 🎨 Design System: Honey, Sage & Warmstone
The project follows a specific visual identity designed to be calming yet vibrant:
*   **Honey (#E8A817)**: Used for primary actions and brand presence.
*   **Sage**: Used for success states and secondary elements.
*   **Warmstone**: The grounding neutral palette (e.g., `warmstone-900` for text).
*   **Principle**: Avoid "em dashes" and overly technical language in all copy.

---

## 📂 Repository Structure
```text
CAREBEE/
├── src/                  # Next.js Web Application
│   ├── app/              # Routes (Dashboard, Household, etc.)
│   ├── components/       # Custom UI & Design System
│   ├── hooks/            # State & Supabase Logic
│   └── lib/              # Core Utilities (Supabase client, Stripe)
├── carebee_buzz/         # Flutter Mobile Application
│   ├── lib/
│   │   ├── core/         # Routing, State, Repository
│   │   └── features/     # Achiever, Supporter, Auth logic
├── supabase/             # Backend Infrastructure
│   ├── migrations/       # PostgreSQL Schema & RLS Policies
│   └── functions/        # Edge Functions
└── README.md             # This file
```

---

## 🚀 Setup & Installation

### Web App
1.  Navigate to the root: `cd CAREBEE`
2.  Install dependencies: `npm install`
3.  Configure `.env.local` with your Supabase and Stripe keys.
4.  Run development server: `npm run dev`

### BUZZ Mobile
1.  Navigate to the mobile folder: `cd carebee_buzz`
2.  Install Flutter dependencies: `flutter pub get`
3.  Ensure your `.env` or configuration file points to the same Supabase instance as the web app.
4.  Run on an emulator or device: `flutter run`

### Database
1.  Use the `supabase/migrations` files to set up your local or hosted Supabase project.
2.  The `20260405_buzz_schema.sql` file contains the core schema for all BUZZ-related features.

---

## 📝 Recent Work Done
*   **Handshake Implementation**: Finalized the secure pairing flow for BUZZ tablets.
*   **Achiever Timeline**: Built the chronological daily overview for the tablet interface.
*   **Supporter Dashboard**: Dynamically scoped management tools per linked Achiever.
*   **RLS Hardening**: Implemented strict policies for `buzz_routines` and `buzz_completions`.
*   **Profile Suite**: Full avatar and display name management for Supporters.

## 🔮 Future Roadmap & Handover
*   **FCM Integration**: Finalize Firebase Cloud Messaging for persistent push notifications on the tablet.
*   **Historical Timeline**: Add a "History" view for the Achiever to see past completions.
*   **AI Digest**: Utilize the Anthropic SDK to generate natural language summaries of care notes for Supporters.
*   **PWA Sync**: Fine-tune the logic that detects if a user has already completed onboarding via the mobile app vs. the web app.
