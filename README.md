# 📱 Contactly - Offline-First Contact Management App

## 🚀 Overview
Contactly is a **React Native (Expo) application** that provides offline-first functionality using **SQLite** for local data storage and **Supabase** for authentication. The app supports **offline login**, **scheduled notifications**, and **syncing data when online**.

## 🛠️ Tech Stack
- **React Native (Expo)** - For cross-platform mobile development.
- **SQLite (expo-sqlite)** - Offline database for storing user data.
- **Supabase** - Authentication and backend services.
- **expo-secure-store** - Securely stores user sessions for offline login.
- **expo-notifications** - Scheduled push notifications.
- **@react-native-community/netinfo** - Network status monitoring.

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/your-repo/contactly.git
cd contactly
```

### 2️⃣ Install Dependencies
```sh
npm install  # or yarn install
```

### 3️⃣ Set Up Supabase
- Create an account on **[Supabase](https://supabase.com/)**.
- Set up authentication (email/password) in **Supabase Auth**.
- Get your **SUPABASE_URL** and **SUPABASE_ANON_KEY** from the dashboard.
- Create a `.env` file and add:

```env
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 4️⃣ Set Up SQLite Database
The app automatically creates and initializes a local SQLite database on the first launch.

### 5️⃣ Run the App
```sh
npx expo start
```

## 🔐 Authentication (Online & Offline Login)
- Uses **Supabase Auth** for user authentication.
- **Stores session securely** using `expo-secure-store` for offline login.
- **Restores session** when the app is restarted without internet.

### Offline Login Flow:
1. On the first login (while online), the app stores the session.
2. If the user is offline, it retrieves the session and allows access.

## 📂 Local Storage (SQLite)
- **User data** is stored locally using `expo-sqlite`.
- Queries are **queued** when offline and synced when the app goes online.

## 🔔 Scheduled Notifications
- Uses `expo-notifications` to schedule reminders.
- Sends **3 notifications per event** (30 min, 15 min, and event time).

### Example:
```ts
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Reminder: Meeting in 30 minutes",
    body: "Your scheduled meeting is coming up soon!",
    sound: "default",
  },
  trigger: { date: notificationDate },
});
```

## 🔄 Offline Syncing
- **Detects network status** using `@react-native-community/netinfo`.
- **Queues API calls** when offline and syncs when back online.

---
🚀 **Built with love using Expo, SQLite, and Supabase!**

