# EMS — White-Label Architecture Guide

## Overview

This product is a **multi-tenant white-label SaaS** — a single codebase that builds into separately branded apps, each with its own:

- Package name / Bundle ID
- App name
- Icons & branding
- Client entity ID (links the app to a specific tenant's data on the server)

The server is **shared** across all clients. Each client app connects to the same API but is pre-configured with their unique `entityId` so it fetches only their data.

---

## Current Architecture — React Native + Expo

### How it works

Each client has a dedicated `.bat` build script inside `mobile/scripts/`. When you want to release a new build for a client, you run their script. It:

1. Sets environment variables (tenant ID, app name, package, entity ID, API URL)
2. Runs `expo prebuild --clean` to regenerate the native `android/` folder with those values injected
3. Runs `gradlew bundleRelease` to produce the final `.aab` for the Play Store

### Existing clients

| Client | Script | Package | Entity Mode |
|---|---|---|---|
| VitaDesk (shared gyms) | `build-gyms.bat` | `com.srgs.vitadesk` | Shared (no entity ID — resolved at login) |
| Lakeshore School | `build-lakeshore.bat` | `com.srgs.lakeshoreschool` | Fixed entity ID |
| Revilation | `build-revilation.bat` | — | Fixed entity ID |
| SRGS | `build-srgs.bat` | — | Fixed entity ID |

### Adding a new client (current approach)

1. Copy any existing `.bat` file, rename it `build-clientname.bat`
2. Update the following variables:
   ```bat
   set TENANT_ID=clientname
   set TENANT_APP_NAME=Client Display Name
   set TENANT_PACKAGE=com.clientname.app
   set EXPO_PUBLIC_ENTITY_ID=<entity_id_from_db>
   set EXPO_PUBLIC_API_URL=https://api.server.com/api
   ```
3. Add client icons to the appropriate assets folder
4. Run the script → upload the `.aab` to Play Store as a new app

### Limitations of this approach

- `expo prebuild --clean` **wipes and regenerates** the entire `android/` folder on every build — slow (~5–10 min per client)
- All client configs are spread across multiple `.bat` files
- No per-client color/theme overrides without additional scripting
- Icons must be manually managed outside the build system

---

## Future Architecture — Android Native + Product Flavors

### How it works

Android's native build system (Gradle) has **Product Flavors** built in. Each client is declared as a flavor directly in `build.gradle`. No scripts, no prebuild step — just one command per client.

### Structure

```
android-native/
└── app/
    ├── src/
    │   ├── main/               ← All shared code (all clients use this)
    │   │   ├── java/com/srgs/ems/
    │   │   └── res/
    │   │       └── values/
    │   │           └── strings.xml   ← Default strings
    │   │
    │   ├── vitadesk/           ← VitaDesk overrides
    │   │   └── res/
    │   │       ├── mipmap-*/       ← VitaDesk icons
    │   │       └── values/
    │   │           └── strings.xml ← app_name = "VitaDesk"
    │   │
    │   ├── lakeshore/          ← Lakeshore overrides
    │   │   └── res/
    │   │       ├── mipmap-*/
    │   │       └── values/
    │   │           └── strings.xml ← app_name = "Lakeshore School"
    │   │
    │   └── revilation/         ← Revilation overrides
    │       └── res/
    │           ├── mipmap-*/
    │           └── values/
    │               └── strings.xml
    │
    └── build.gradle
```

### build.gradle flavor config

```kotlin
android {
    flavorDimensions += "client"

    productFlavors {

        create("vitadesk") {
            applicationId = "com.srgs.vitadesk"
            resValue("string", "app_name", "VitaDesk")
            buildConfigField("String", "API_URL", "\"https://smsapi.srglanzsoftware.com/api\"")
            buildConfigField("String", "ENTITY_ID", "\"\"")  // shared mode
        }

        create("lakeshore") {
            applicationId = "com.srgs.lakeshoreschool"
            resValue("string", "app_name", "Lakeshore School")
            buildConfigField("String", "API_URL", "\"https://smsapi.srglanzsoftware.com/api\"")
            buildConfigField("String", "ENTITY_ID", "\"69a3240d669273408df1969f\"")
        }

        create("revilation") {
            applicationId = "com.revilation.app"
            resValue("string", "app_name", "Revilation Fitness")
            buildConfigField("String", "API_URL", "\"https://smsapi.srglanzsoftware.com/api\"")
            buildConfigField("String", "ENTITY_ID", "\"<entity_id>\"")
        }

    }
}
```

### Build commands (one per client)

```bash
# Build a specific client
./gradlew assembleVitadeskRelease
./gradlew assembleLakeshoreRelease
./gradlew assembleRevilationRelease

# Build all clients at once
./gradlew assembleRelease
```

### Adding a new client (future approach)

1. Add ~6 lines to `build.gradle`:
   ```kotlin
   create("newclient") {
       applicationId = "com.newclient.app"
       resValue("string", "app_name", "New Client Name")
       buildConfigField("String", "API_URL", "\"https://api.server.com/api\"")
       buildConfigField("String", "ENTITY_ID", "\"<entity_id_from_db>\"")
   }
   ```
2. Create `src/newclient/res/mipmap-*/` folders and drop in the client's icons
3. Optionally add `src/newclient/res/values/colors.xml` for per-client theme colors
4. Run `./gradlew assembleNewclientRelease` → upload `.aab` to Play Store

### What you can override per client (with no code changes)

| What | How |
|---|---|
| Package name | `applicationId` in flavor |
| App display name | `resValue("string", "app_name", ...)` |
| Icons | Icon files in `src/clientName/res/mipmap-*/` |
| Colors / theme | `src/clientName/res/values/colors.xml` |
| API URL | `buildConfigField("String", "API_URL", ...)` |
| Entity ID | `buildConfigField("String", "ENTITY_ID", ...)` |
| Firebase config | `src/clientName/google-services.json` |
| Splash screen | `src/clientName/res/drawable/` |
| Any string | `src/clientName/res/values/strings.xml` |

---

## iOS White-Labeling — Xcode Targets + Schemes

iOS has the equivalent of Android Product Flavors — it's called **Xcode Targets + Schemes**.

### Structure

Each client is an **Xcode Target** sharing the same source code. Each target has its own:

- Bundle ID (equivalent to Android's `applicationId`)
- Display name (`CFBundleDisplayName` in `Info.plist`)
- Icon asset catalog
- `GoogleService-Info.plist` (Firebase config)
- `xcconfig` file (for build variables like API URL, Entity ID)

```
EMS.xcodeproj
├── Targets/
│   ├── VitaDesk          → Bundle ID: com.srgs.vitadesk
│   ├── Lakeshore         → Bundle ID: com.srgs.lakeshoreschool
│   └── Revilation        → Bundle ID: com.revilation.app
└── Shared Source Code    → Used by all targets
```

### Build commands

```bash
# Build for a specific client
xcodebuild -scheme VitaDesk -configuration Release archive
xcodebuild -scheme Lakeshore -configuration Release archive
xcodebuild -scheme Revilation -configuration Release archive
```

### Adding a new iOS client

1. In Xcode: **File → Duplicate Target** → rename to client name
2. Update Bundle ID in Target settings
3. Replace icon asset catalog with client icons
4. Update `Info.plist` → `CFBundleDisplayName`
5. Add client-specific `xcconfig` for API URL and Entity ID
6. Add client's `GoogleService-Info.plist`
7. Archive and upload to App Store Connect

---

## Comparison Summary

| | React Native / Expo (current) | Android Native | iOS Native |
|---|---|---|---|
| Multi-client config | One `.bat` script per client | One flavor block in `build.gradle` | One Xcode Target per client |
| Icons per client | Manual asset management | `src/client/res/mipmap/` folder | Asset Catalog per target |
| Build command | `scripts/build-client.bat` | `./gradlew assembleClientRelease` | `xcodebuild -scheme Client archive` |
| Build time | ~10 min (includes prebuild) | ~2–3 min (direct Gradle) | ~3–5 min (direct Xcode) |
| Per-client colors | Requires scripting | `colors.xml` per client | `xcconfig` per client |
| Adding new client | Copy + edit `.bat` | 6 lines in `build.gradle` | Duplicate target in Xcode |
| Firebase per client | Manual file swap | `google-services.json` per flavor folder | `GoogleService-Info.plist` per target |

---

## Server — No Changes Required

The server is shared across all clients. Client isolation is handled by:

- `entityId` — stored in the JWT token and included in every API request
- Every DB query is scoped to `entityId`, so clients never see each other's data
- The server does not need to know which branded app is making the request

---

## Tenant Modes

| Mode | How it works | Used by |
|---|---|---|
| **Fixed Entity** | `ENTITY_ID` is baked into the app at build time. App always connects to that specific client's data. | Lakeshore, Revilation, SRGS |
| **Shared / Login Mode** | `ENTITY_ID` is empty. User logs in with phone number, server resolves their entity from the database. | VitaDesk (shared gym app) |
