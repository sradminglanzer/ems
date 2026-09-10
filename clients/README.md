# Clients Configuration Directory (White-Label SaaS)

This directory houses client-specific configuration, branding, and Firebase credentials for **all white-labeled Android apps**.

---

## 📁 Directory Structure

```
clients/
├── lakeshore/
│   ├── client.json            <-- App name, Package ID, Entity ID, API URL
│   ├── google-services.json   <-- Client's Firebase Cloud Messaging key
│   └── res/                   <-- (Optional) Custom app icons & mipmap folders
├── revilation/
│   ├── client.json
│   ├── google-services.json
│   └── res/
└── vitadesk/
    ├── client.json
    ├── google-services.json
    └── res/
```

---

## 🚀 Running & Testing on Connected Device in Android Studio

### Method A: Use Android Studio's Green Run (▶️) Button
1. Select which client you want to test in your terminal:
   ```cmd
   build-client lakeshore switch
   ```
2. In Android Studio, connect your physical phone or emulator and click **Run (▶️)**.
3. Android Studio automatically compiles and runs Lakeshore with its package ID, app name, and Firebase keys!

### Method B: 1-Command Deploy & Run via ADB
With your Android phone connected via USB:
```cmd
build-client lakeshore run
```
This builds, installs, and launches the app directly onto your phone screen!

---

## ➕ Adding a New Client (In 1 Minute)

1. Create a new folder under `clients/<client_id>/` (e.g., `clients/oakwood_academy/`).
2. Add a `client.json` file:
   ```json
   {
     "id": "oakwood_academy",
     "appName": "Oakwood Academy",
     "applicationId": "com.oakwood.academy.app",
     "entityId": "69a3240d669273408df1969f",
     "apiUrl": "https://smsapi.srglanzsoftware.com/api",
     "versionCode": 1,
     "versionName": "1.0.0"
   }
   ```
3. Copy the client's `google-services.json` into `clients/oakwood_academy/google-services.json`.
4. (Optional) Put their custom app icons inside `clients/oakwood_academy/res/`.

---

## 🔨 Building Release APK for Play Store

```bash
build-client lakeshore release
```
The compiled APK will be in `dist-apps/lakeshore/`.
