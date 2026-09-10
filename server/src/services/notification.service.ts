import { getDB } from '../config/db';
import { ObjectId } from 'mongodb';
import { initializeApp, cert, getApps, deleteApp, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

class NotificationService {
    private firebaseApps = new Map<string, App>();

    private getDeviceCollection() {
        return getDB().collection('parent_devices');
    }

    /**
     * Helper to normalize various Firebase Service Account formats (snake_case, camelCase, JSON string)
     */
    parseServiceAccount(input: any): ServiceAccount | null {
        if (!input) return null;

        let parsed = input;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch (_) {
                return null;
            }
        }

        if (parsed.serviceAccount) {
            return this.parseServiceAccount(parsed.serviceAccount);
        }
        if (parsed.serviceAccountJson) {
            return this.parseServiceAccount(parsed.serviceAccountJson);
        }

        const projectId = parsed.projectId || parsed.project_id;
        const clientEmail = parsed.clientEmail || parsed.client_email;
        let privateKey = parsed.privateKey || parsed.private_key;

        if (projectId && clientEmail && privateKey) {
            if (typeof privateKey === 'string') {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }
            return {
                projectId,
                clientEmail,
                privateKey
            };
        }

        return null;
    }

    /**
     * Resolve the Firebase App for a specific entity (tenant) strictly from the database.
     * Returns null and logs an error if the entity has not configured Firebase.
     */
    async getFirebaseApp(entityId?: string | ObjectId): Promise<App | null> {
        if (!entityId) {
            console.error('❌ [FCM Error] Cannot resolve Firebase App: No entityId provided.');
            return null;
        }

        const entityIdStr = entityId.toString();

        // 1. Check in-memory cache
        if (this.firebaseApps.has(entityIdStr)) {
            return this.firebaseApps.get(entityIdStr)!;
        }

        // 2. Fetch Entity document from database
        try {
            const entityDoc = await getDB().collection('entities').findOne({ _id: new ObjectId(entityIdStr) });
            if (!entityDoc) {
                console.error(`❌ [FCM Error] Entity "${entityIdStr}" not found in database.`);
                return null;
            }

            const fbConfig = entityDoc?.customSettings?.firebaseConfig;
            if (!fbConfig || fbConfig.enabled === false) {
                console.error(`❌ [FCM Error] Firebase credentials not configured or disabled for entity "${entityDoc.name || entityIdStr}".`);
                return null;
            }

            const serviceAccount = this.parseServiceAccount(fbConfig);
            if (!serviceAccount) {
                console.error(`❌ [FCM Error] Invalid Firebase credentials format for entity "${entityDoc.name || entityIdStr}".`);
                return null;
            }

            const appName = `entity_${entityIdStr}`;
            
            // If already registered in getApps() by name
            const existing = getApps().find(a => a.name === appName);
            if (existing) {
                this.firebaseApps.set(entityIdStr, existing);
                return existing;
            }

            const app = initializeApp({
                credential: cert(serviceAccount)
            }, appName);

            this.firebaseApps.set(entityIdStr, app);
            console.log(`🔥 [Multi-Tenant FCM] Initialized Firebase App for entity "${entityDoc.name || entityIdStr}" (${serviceAccount.projectId})`);
            return app;
        } catch (err: any) {
            console.error(`❌ [FCM Error] Failed to initialize Firebase App for entity ${entityIdStr}:`, err.message);
            return null;
        }
    }

    /**
     * Clear cached Firebase app when entity credentials change
     */
    async clearFirebaseApp(entityId: string | ObjectId): Promise<void> {
        const entityIdStr = entityId.toString();
        const appName = `entity_${entityIdStr}`;

        const app = this.firebaseApps.get(entityIdStr) || getApps().find(a => a.name === appName);
        if (app) {
            try {
                await deleteApp(app);
            } catch (_) {}
            this.firebaseApps.delete(entityIdStr);
            console.log(`🔄 [Multi-Tenant FCM] Cleared Firebase App cache for entity ${entityIdStr}`);
        }
    }

    /**
     * Register or update an FCM token for a parent's contact number
     */
    async registerToken(contactNumber: string, fcmToken: string, entityId?: string, deviceName?: string) {
        if (!contactNumber || !fcmToken) return;
        const normalizedPhone = contactNumber.trim().replace(/\D/g, '').slice(-10);
        
        await this.getDeviceCollection().updateOne(
            { contactNumber: normalizedPhone, fcmToken },
            {
                $set: {
                    contactNumber: normalizedPhone,
                    fcmToken,
                    ...(entityId && { entityId: new ObjectId(entityId) }),
                    ...(deviceName && { deviceName }),
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log(`📱 Registered FCM token for parent: ${normalizedPhone}`);
    }

    /**
     * Send push notification to a list of specific FCM tokens
     */
    async sendToTokens(
        tokens: string[],
        payload: PushPayload,
        entityId?: string | ObjectId
    ): Promise<{ successCount: number; failureCount: number }> {
        if (!tokens || tokens.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }

        const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
        console.log(`📡 [Push Notification] Sending "${payload.title}" to ${uniqueTokens.length} device(s): ${payload.body}`);

        const app = await this.getFirebaseApp(entityId);

        if (!app) {
            console.error(`❌ [FCM Error] Cannot dispatch push notification "${payload.title}" to ${uniqueTokens.length} device(s): Firebase is not configured for entity.`);
            return { successCount: 0, failureCount: uniqueTokens.length };
        }

        try {
            const message: MulticastMessage = {
                tokens: uniqueTokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    ...(payload.imageUrl && { imageUrl: payload.imageUrl })
                },
                data: payload.data || {},
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'ems_parent_alerts',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true
                    }
                }
            };

            const response = await getMessaging(app).sendEachForMulticast(message);
            console.log(`✅ [FCM Dispatch] (${app.name}) ${response.successCount} succeeded, ${response.failureCount} failed`);

            // Clean up invalid or expired tokens
            if (response.failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errCode = resp.error?.code;
                        if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
                            const tok = uniqueTokens[idx];
                            if (tok) tokensToRemove.push(tok);
                        }
                    }
                });
                if (tokensToRemove.length > 0) {
                    await this.getDeviceCollection().deleteMany({ fcmToken: { $in: tokensToRemove } });
                }
            }

            return { successCount: response.successCount, failureCount: response.failureCount };
        } catch (error: any) {
            console.error('❌ Error sending FCM notification:', error);
            return { successCount: 0, failureCount: uniqueTokens.length };
        }
    }

    /**
     * Send push notification to parents of specific students (members)
     */
    async sendToStudentsParents(
        memberIds: (string | ObjectId)[],
        payload: PushPayload,
        entityId?: string | ObjectId
    ) {
        if (!memberIds || memberIds.length === 0) {
            console.warn(`⚠️ [Push Notification] No memberIds provided to sendToStudentsParents.`);
            return { successCount: 0, failureCount: 0 };
        }
        
        const objIds = memberIds.map(id => typeof id === 'string' ? new ObjectId(id) : id);
        const members = await getDB().collection('members').find({ _id: { $in: objIds } }).toArray();

        // If entityId wasn't passed, infer from first member
        const resolvedEntityId = entityId || members[0]?.entityId;

        const contactNumbers: string[] = [];
        members.forEach(m => {
            const phones = [m.contact, m.fatherPhone, m.motherPhone, m.guardianPhone, m.altContact];
            phones.forEach(p => {
                if (p) {
                    const norm = p.toString().trim().replace(/\D/g, '').slice(-10);
                    if (norm.length === 10) contactNumbers.push(norm);
                }
            });
        });

        const uniquePhones = Array.from(new Set(contactNumbers));
        console.log(`👨‍👩‍👧 [Push Notification] Resolved ${members.length} student(s) -> ${uniquePhones.length} unique parent phone(s): [${uniquePhones.join(', ')}]`);

        if (uniquePhones.length === 0) {
            console.warn(`⚠️ [Push Notification] No parent contact numbers found for the selected students.`);
            return { successCount: 0, failureCount: 0 };
        }

        const devices = await this.getDeviceCollection().find({ contactNumber: { $in: uniquePhones } }).toArray();
        const tokens = devices.map(d => d.fcmToken).filter(Boolean);

        console.log(`📱 [Push Notification] Found ${devices.length} device(s) registered in parent_devices with ${tokens.length} active FCM token(s).`);

        if (tokens.length === 0) {
            console.warn(`⚠️ [Push Notification] No devices/tokens found in parent_devices for these parent phones.`);
            return { successCount: 0, failureCount: 0 };
        }

        return await this.sendToTokens(tokens, payload, resolvedEntityId);
    }

    /**
     * Send push notification to all parents of a specific class / feeGroup
     */
    async sendToClassParents(
        classId: string | ObjectId,
        payload: PushPayload,
        entityId?: string | ObjectId,
        academicYearId?: string | ObjectId
    ) {
        const classIdObj = typeof classId === 'string' ? new ObjectId(classId) : classId;
        console.log(`🏫 [Push Notification] Looking up students for classId=${classIdObj}, academicYearId=${academicYearId || 'None'}...`);

        const memberConditions: any[] = [
            { feeGroupId: classIdObj }
        ];

        if (academicYearId) {
            const feeGroup = await getDB().collection('fee_groups').findOne({ _id: classIdObj });
            if (feeGroup && Array.isArray(feeGroup.yearlyRosters)) {
                const roster = feeGroup.yearlyRosters.find((r: any) => r?.academicYearId && r.academicYearId.toString() === academicYearId.toString());
                if (roster && Array.isArray(roster.members) && roster.members.length > 0) {
                    const memberIdObjs = roster.members.map((m: any) => new ObjectId(m.toString()));
                    memberConditions.push({ _id: { $in: memberIdObjs } });
                }
            }
        }

        const members = await getDB().collection('members').find({
            $or: memberConditions,
            status: { $ne: 'checked_out' }
        }).toArray();

        console.log(`👥 [Push Notification] Found ${members.length} enrolled student(s) in classId=${classIdObj}`);

        if (members.length === 0) {
            console.warn(`⚠️ [Push Notification] No enrolled students found for class ${classIdObj}`);
            return { successCount: 0, failureCount: 0 };
        }

        const resolvedEntityId = entityId || members[0]?.entityId;
        return await this.sendToStudentsParents(members.map(m => m._id!), payload, resolvedEntityId);
    }

    /**
     * Send broadcast notification to all parents in the entire school / entity
     */
    async sendToEntityParents(entityId: string | ObjectId, payload: PushPayload) {
        const entityIdObj = typeof entityId === 'string' ? new ObjectId(entityId) : entityId;
        const devices = await this.getDeviceCollection().find({
            entityId: entityIdObj
        }).toArray();

        const tokens = devices.map(d => d.fcmToken).filter(Boolean);
        return await this.sendToTokens(tokens, payload, entityIdObj);
    }
}

export default new NotificationService();
