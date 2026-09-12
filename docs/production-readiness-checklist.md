# 🚀 EMS Production Readiness & Pre-Deployment Checklist

This document serves as the official pre-production verification guide and smoke-testing manual for the **EMS (Educational Management System)**. Complete and check off each section prior to releasing the application to schools, staff, teachers, and parents.

---

## 📋 Table of Contents
1. [Security & Multi-Tenancy](#1-security--multi-tenancy)
2. [Database & MongoDB Optimization](#2-database--mongodb-optimization)
3. [Android Mobile App Release](#3-android-mobile-app-release)
4. [Backend, Push Notifications (FCM) & Media Storage](#4-backend-push-notifications-fcm--media-storage)
5. [Server Infrastructure & Monitoring](#5-server-infrastructure--monitoring)
6. [End-to-End (E2E) Testing Protocols](#6-end-to-end-e2e-testing-protocols)

---

## 1. 🔒 Security & Multi-Tenancy

- [ ] **Environment Variables & Secrets**:
  - `NODE_ENV` is set to `production`.
  - `JWT_SECRET` is strong, randomly generated, and unique per environment.
  - Database connection strings, AWS credentials, and Firebase service account keys are stored securely in production `.env` and **never** committed to version control.
- [ ] **Strict Multi-Tenant Isolation**:
  - All DB queries for Diaries, Attendance, Members/Students, Exams, and Fee Payments strictly enforce `tenantId` (or `schoolId`).
  - No user or parent can access records outside their tenant organization.
- [ ] **CORS Configuration**:
  - Express server CORS whitelist is restricted strictly to production web domain(s) and mobile API endpoints (no wildcards `*` in production).
- [ ] **Rate Limiting**:
  - Rate limiting is enabled on public/authentication endpoints (`/api/v1/auth/login`, `/api/v1/auth/parent-login`, OTP request routes) to prevent brute-force attacks.

---

## 2. ⚡ Database & MongoDB Optimization

### Compound Indexes
Run the following index creations in MongoDB to ensure high query performance and prevent unindexed full-collection scans under multi-tenant load:

```javascript
// Diaries Collection
db.diaries.createIndex({ tenantId: 1, classId: 1, date: -1 });
db.diaries.createIndex({ tenantId: 1, date: -1 });

// Attendance Collection
db.attendance.createIndex({ tenantId: 1, classId: 1, date: 1 }, { unique: true });
db.attendance.createIndex({ tenantId: 1, "records.studentId": 1, date: 1 });

// Members / Students Collection
db.members.createIndex({ tenantId: 1, classId: 1, role: 1 });
db.members.createIndex({ tenantId: 1, parentPhone: 1 });
db.members.createIndex({ tenantId: 1, phone: 1 });

// Fee Payments & Structures
db.feepayments.createIndex({ tenantId: 1, studentId: 1, academicYearId: 1 });
db.feegroups.createIndex({ tenantId: 1, academicYearId: 1 });

// Push Tokens / Devices
db.devicetokens.createIndex({ tenantId: 1, userId: 1 });
db.devicetokens.createIndex({ token: 1 }, { unique: true });
```

- [ ] **Automated Backups**:
  - Automated daily backup snapshots enabled (e.g., MongoDB Atlas Backup or cron-based `mongodump` to S3).
  - Test restoring a backup at least once to ensure data recovery integrity.

---

## 3. 📱 Android Mobile App Release

- [ ] **Production API Base URL**:
  - Ensure `BASE_URL` in `ApiService.kt` points to the production HTTPS domain (e.g., `https://api.yourdomain.com/api/v1/`).
  - No references to `10.0.2.2`, `localhost`, or internal development IPs in the release build.
- [ ] **Release Keystore & App Signing**:
  - Generate a secure production `.jks` / `.keystore` key.
  - Store the keystore file and key passwords in a safe offline vault.
  - Configure `signingConfigs` in `app/build.gradle.kts` using environment variables.
- [ ] **Firebase Cloud Messaging (`google-services.json`)**:
  - Package the official production `google-services.json` matching the application ID `com.srgs.ems`.
  - Verify that notification channels (`default_channel_id`, `diary_channel`, `attendance_channel`) are registered with high importance.
- [ ] **ProGuard & R8 Obfuscation**:
  - Run `./gradlew assembleRelease` to confirm R8 shrinking does not strip DTO fields.
  - Confirm all API DTO classes preserve field names (via `@SerializedName` or `@Keep`).

---

## 4. ☁️ Backend, Push Notifications (FCM) & Media Storage

- [ ] **FCM Service Account Key**:
  - Backend Firebase Admin SDK initialized with valid production credentials (`firebase-service-account.json`).
  - Broadcast notifications successfully dispatch to multiple device tokens without truncation.
- [ ] **AWS S3 / Object Storage**:
  - S3 bucket permissions configured with proper CORS for image uploading and presigned URLs.
  - Maximum upload size restricted (e.g., max 10MB per diary attachment).
  - Media attachments (photos of homework) load reliably on both mobile and web clients.

---

## 5. 🖥️ Server Infrastructure & Monitoring

- [ ] **Process Management (PM2)**:
  - Run backend with PM2 in cluster mode:
    ```bash
    pm2 start dist/index.js --name ems-backend -i max
    pm2 save
    pm2 startup
    ```
- [ ] **Reverse Proxy & SSL**:
  - Nginx or Caddy configured as reverse proxy with HTTP/2 and auto-renewing Let's Encrypt SSL.
  - Client request body limit set appropriately (`client_max_body_size 20M;`).
- [ ] **Health Check & Logging**:
  - Health check endpoint `/health` or `/api/v1/health` returning `200 OK`.
  - Centralized log collection (PM2 logs, Winston, or Datadog/CloudWatch) with log rotation enabled.

---

## 6. 🧪 End-to-End (E2E) Testing Protocols

Run through this complete test flow today before production sign-off:

### A. Admin & Teacher Workflow
1. **Login**: Log in as Admin/Teacher on web and mobile.
2. **Subject Setup**: Verify all subjects for the class are listed with correct icons/colors.
3. **Diary Entry Creation**:
   - Create a Diary Entry with **only a Title** (verify optional description works).
   - Create another Diary Entry with **Title + Detailed Instructions + Image Attachment**.
   - Verify both entries appear in the **Two-Column School Diary Ledger Table**.
4. **Edit / Delete**:
   - Edit an existing entry and update the text.
   - Delete a test entry and verify the ledger updates immediately.
5. **Broadcast Trigger**:
   - Tap `📢 Broadcast` for the day.
   - Confirm confirmation dialog shows correct task count.
   - Confirm server triggers FCM push notifications to all enrolled parents.

### B. Parent Workflow
1. **Parent Login**:
   - Log in using registered parent phone number.
   - Select student profile if multi-child parent.
2. **Push Notification Verification**:
   - Confirm push notification appears on the device tray with sound/vibration.
   - Tapping notification opens the app directly to the Diary Tab.
3. **Two-Column Ledger View**:
   - Verify date selector (`< Today >`) loads today's homework correctly.
   - Verify subject chips, task titles, and optional descriptions display cleanly.
   - Tap photo attachment thumbnail and verify the full image dialog opens with zoom/fit.
4. **Task Completion Checklist**:
   - Tap the completion checkmark circle (`DONE`) on completed tasks.
   - Confirm progress bar updates and status persists upon app restart.
5. **Academics & Attendance Tabs**:
   - Check Monthly Attendance percentages and present/absent counts.
   - Check Report Cards / Exam results rendering.

---

## ✅ Sign-off Checklist

| Component | Tested By | Date | Status |
|---|---|---|---|
| Admin & Teacher Portal | | | ⬜ Pending |
| Parent Android App | | | ⬜ Pending |
| FCM Push Notification Dispatch | | | ⬜ Pending |
| MongoDB Indexes & Performance | | | ⬜ Pending |
| S3 Attachment Uploads | | | ⬜ Pending |
| Production Release Build (.apk / .aab) | | | ⬜ Pending |

---
*Created for EMS Project Release — SRGS Team*
