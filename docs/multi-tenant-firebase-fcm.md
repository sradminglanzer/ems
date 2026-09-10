# Multi-Tenant Firebase (FCM) Configuration Guide

## Overview

In the EMS white-labeled SaaS architecture, different tenants (schools, colleges, gym franchises, or PG/hostel chains) operate under their own separate Google/Firebase console projects, custom package IDs, and app store listings. 

This document explains the architecture for **Entity-Level Multi-Tenant Firebase Cloud Messaging (FCM)**, where each tenant's credentials are saved and resolved purely from the database without any server file touches.

---

## 🏗 System Architecture

```
                                  ┌───────────────────────────┐
                                  │   Push Notification Req   │
                                  │    (with req.user.entity) │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │   NotificationService     │
                                  │  getFirebaseApp(entityId) │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │  Is Entity App Cached in  │
                                  │   Map<entityId, App>?     │
                                  └──────┬─────────────┬──────┘
                                    Yes  │             │  No
                                         │             ▼
                                         │   ┌───────────────────────────┐
                                         │   │ Fetch from MongoDB        │
                                         │   │ entities.customSettings.  │
                                         │   │ firebaseConfig            │
                                         │   └─────────────┬─────────────┘
                                         │                 │
                                         │                 ▼
                                         │   ┌───────────────────────────┐
                                         │   │ Initialize & Cache App:   │
                                         │   │ admin.initializeApp(cert, │
                                         │   │       "entity_<id>")      │
                                         │   └─────────────┬─────────────┘
                                         │                 │
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                    ┌───────────────────────────┐
                                    │   app.messaging().        │
                                    │   sendEachForMulticast()  │
                                    └───────────────────────────┘
```

---

## 💾 Data Storage

### Entity Custom Settings (`entities.customSettings.firebaseConfig`)
Each tenant document in the `entities` collection stores their Firebase configuration:

```typescript
export interface EntityFirebaseConfig {
    enabled: boolean;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;     // Stored securely
    senderId?: string;
    appName?: string;
    updatedAt?: Date;
}
```

---

## ⚡ Multi-App Named Instance Cache

The Firebase Admin SDK allows multiple named app instances via `admin.initializeApp(options, name)`:

1. **Instance Caching**:
   `NotificationService` maintains an in-memory cache:
   ```typescript
   private firebaseApps = new Map<string, admin.app.App>();
   ```
2. **Dynamic Resolution**:
   When dispatching notifications for an entity, `NotificationService.getFirebaseApp(entityId)`:
   - Checks if an instance is already cached in memory for `entity_${entityId}`.
   - If not cached, loads the tenant's credentials from `entities` collection, initializes the named app, and caches it.
   - If the tenant has no Firebase configuration configured, logs a descriptive error in the console and skips dispatch.
3. **Cache Invalidation & Cleanup**:
   When an admin updates their Firebase credentials, the existing named app is deleted (`app.delete()`) and removed from the cache so the new credentials take effect immediately without restarting the server.

---

## 🔒 Security & Key Management

1. **Masked Keys in API Responses**:
   The `GET /api/entity-settings/firebase-config` endpoint never returns the plaintext `privateKey`. It returns masked metadata:
   ```json
   {
       "enabled": true,
       "isConfigured": true,
       "projectId": "school-abc-fcm",
       "clientEmail": "firebase-adminsdk@school-abc.iam.gserviceaccount.com",
       "senderId": "123456789012"
   }
   ```
2. **Missing Credentials Logging**:
   If an entity attempts to send push notifications without configuring Firebase in the database, the server logs a clean error message to the console without crashing.

---

## 📡 API Endpoints

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/entity-settings/firebase-config` | Get current entity FCM configuration status (masked) | Admin |
| `PUT` | `/api/entity-settings/firebase-config` | Update entity Firebase service account credentials | Admin |
| `POST` | `/api/entity-settings/firebase-config/test` | Send a test notification to verify credentials | Admin |
