# LifeOS Mobile App

Expo-based mobile app for LifeOS Agent with real device notifications, calendar integration, and chat interface.

## Prerequisites

- Node.js 18+
- Expo Go app on your phone (iOS/Android)
- FastAPI backend running at `http://localhost:8000`

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start
```

Then scan the QR code with Expo Go app, or press:
- `a` for Android emulator
- `i` for iOS simulator

## Backend URL

The app connects to your FastAPI backend via the environment variable:

```env
EXPO_PUBLIC_FASTAPI_URL=http://localhost:8000
```

If running on a physical device, replace `localhost` with your computer's LAN IP.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Chat | `/` | Main chat interface with AI assistant |
| Tasks | `/tasks` | Add and view tasks |
| Alarms | `/alarms` | Set alarms and reminders |
| Learning | `/learning` | Vocabulary, quotes, music |
| Calendar | `/calendar` | Calendar events |

## Permissions

The app requests the following permissions:
- **Notifications**: For alarms and reminders
- **Calendar**: To read/write calendar events (optional)

## Architecture

```
mobile/
├── app/
│   ├── _layout.tsx      # Root layout with navigation
│   ├── index.tsx        # Chat screen (home)
│   ├── tasks.tsx        # Tasks screen
│   ├── alarms.tsx       # Alarms screen
│   ├── learning.tsx     # Learning screen
│   └── calendar.tsx     # Calendar screen
├── src/
│   ├── types/           # TypeScript interfaces
│   ├── api/             # API client for FastAPI
│   ├── hooks/           # Custom React hooks
│   └── components/      # Reusable components
├── app.json             # Expo configuration
├── package.json
└── tsconfig.json
```

## Features

- 💬 Real-time chat with LifeOS backend
- 📋 Task management with natural language input
- ⏰ Alarm setting and notifications
- 📚 Learning hub for Nepali/English vocabulary
- 📅 Calendar integration
- 🔔 Push notifications via Expo Notifications
