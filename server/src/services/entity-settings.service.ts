import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { EntitySettings, EntityFirebaseConfig } from '../models/entity-settings.model';
import { getDB } from '../config/db';
import notificationService from './notification.service';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/constants';

export class EntitySettingsService extends BaseService<EntitySettings> {
    constructor() {
        super('entity-settings');
    }

    async getByEntity(entityIdStr: string): Promise<EntitySettings> {
        const entityIdObj = new ObjectId(entityIdStr);

        // 1. Fetch Entity document to get entityType and optional tenant customSettings
        const entityDoc = await getDB().collection('entities').findOne({ _id: entityIdObj });
        const entityType = entityDoc?.type || 'gym';

        // 2. Fetch Category Master Template from entity-settings collection by entityType
        const templateDoc = await this.getOne({ entityType });
        const resolvedSettings = new EntitySettings(templateDoc || { entityType }, entityType);

        // 3. If tenant has custom white-label overrides on their entity document, merge them
        if (entityDoc?.customSettings) {
            if (entityDoc.customSettings.labels) {
                resolvedSettings.labels = { ...resolvedSettings.labels, ...entityDoc.customSettings.labels };
            }
            if (Array.isArray(entityDoc.customSettings.staffRoles) && entityDoc.customSettings.staffRoles.length > 0) {
                resolvedSettings.staffRoles = entityDoc.customSettings.staffRoles;
            }
            if (entityDoc.customSettings.admissionConfig) {
                resolvedSettings.admissionConfig = { ...resolvedSettings.admissionConfig, ...entityDoc.customSettings.admissionConfig };
            }
            if (entityDoc.customSettings.firebaseConfig) {
                const fb = entityDoc.customSettings.firebaseConfig;
                resolvedSettings.firebaseConfig = {
                    enabled: fb.enabled !== false,
                    projectId: fb.projectId,
                    clientEmail: fb.clientEmail,
                    senderId: fb.senderId,
                    appName: fb.appName,
                    updatedAt: fb.updatedAt
                };
            }
        }

        return resolvedSettings;
    }

    async updateByEntity(entityIdStr: string, updateData: { staffRoles?: any[]; labels?: any; admissionConfig?: any }): Promise<boolean> {
        const entityIdObj = new ObjectId(entityIdStr);
        const customSettingsData: any = {};
        if (updateData.staffRoles) customSettingsData['customSettings.staffRoles'] = updateData.staffRoles;
        if (updateData.labels) customSettingsData['customSettings.labels'] = updateData.labels;
        if (updateData.admissionConfig) customSettingsData['customSettings.admissionConfig'] = updateData.admissionConfig;
        customSettingsData.updatedAt = new Date();

        // Write custom white-label overrides directly to the tenant's entities document
        const result = await getDB().collection('entities').updateOne(
            { _id: entityIdObj },
            { $set: customSettingsData }
        );
        return result.acknowledged;
    }

    /**
     * Get entity's Firebase configuration with masked private key
     */
    async getFirebaseConfig(entityIdStr: string) {
        const entityIdObj = new ObjectId(entityIdStr);
        const entityDoc = await getDB().collection('entities').findOne({ _id: entityIdObj });
        const fb = entityDoc?.customSettings?.firebaseConfig;

        if (!fb || !fb.projectId) {
            return {
                isConfigured: false,
                enabled: false,
                projectId: null,
                clientEmail: null,
                senderId: null,
                appName: null
            };
        }

        return {
            isConfigured: true,
            enabled: fb.enabled !== false,
            projectId: fb.projectId,
            clientEmail: fb.clientEmail,
            senderId: fb.senderId || null,
            appName: fb.appName || null,
            updatedAt: fb.updatedAt || null
        };
    }

    /**
     * Save or update entity's Firebase service account configuration
     */
    async updateFirebaseConfig(entityIdStr: string, input: any) {
        const entityIdObj = new ObjectId(entityIdStr);

        let configToSave: EntityFirebaseConfig;

        // Support pasted full service account JSON or raw string
        if (typeof input === 'string') {
            try {
                input = JSON.parse(input);
            } catch (e) {
                throw new AppError('Invalid JSON format for Firebase Service Account', HTTP_STATUS.BAD_REQUEST);
            }
        }

        if (input.type === 'service_account' || input.project_id) {
            // Raw Google Service Account JSON
            configToSave = {
                enabled: input.enabled !== false,
                projectId: input.project_id || input.projectId,
                clientEmail: input.client_email || input.clientEmail,
                privateKey: input.private_key || input.privateKey,
                senderId: input.senderId || null,
                appName: input.appName || null,
                updatedAt: new Date()
            };
        } else {
            // Structured form input
            configToSave = {
                enabled: input.enabled !== false,
                projectId: input.projectId?.trim(),
                clientEmail: input.clientEmail?.trim(),
                privateKey: input.privateKey?.trim(),
                senderId: input.senderId?.trim() || null,
                appName: input.appName?.trim() || null,
                updatedAt: new Date()
            };
        }

        // Validate if enabled
        if (configToSave.enabled) {
            if (!configToSave.projectId || !configToSave.clientEmail || !configToSave.privateKey) {
                throw new AppError('projectId, clientEmail, and privateKey are required to enable custom Firebase config', HTTP_STATUS.BAD_REQUEST);
            }
            if (!configToSave.privateKey.includes('PRIVATE KEY')) {
                throw new AppError('Invalid privateKey format. Must be a valid RSA private key PEM', HTTP_STATUS.BAD_REQUEST);
            }
        }

        // Clear existing in-memory cached app so new credentials apply immediately
        await notificationService.clearFirebaseApp(entityIdStr);

        const result = await getDB().collection('entities').updateOne(
            { _id: entityIdObj },
            {
                $set: {
                    'customSettings.firebaseConfig': configToSave,
                    updatedAt: new Date()
                }
            }
        );

        if (!result.acknowledged) {
            throw new AppError('Failed to update Firebase configuration', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }

        return await this.getFirebaseConfig(entityIdStr);
    }

    /**
     * Test entity's Firebase credentials by checking app initialization
     */
    async testFirebaseConfig(entityIdStr: string, testToken?: string) {
        const app = await notificationService.getFirebaseApp(entityIdStr);
        if (!app) {
            throw new AppError('Could not initialize Firebase App with the configured credentials', HTTP_STATUS.BAD_REQUEST);
        }

        if (testToken) {
            const res = await notificationService.sendToTokens(
                [testToken],
                {
                    title: '🔥 Firebase Test Notification',
                    body: 'Your custom entity Firebase FCM connection is active and working!'
                },
                entityIdStr
            );
            return {
                success: res.successCount > 0,
                message: res.successCount > 0 ? 'Test push notification dispatched successfully' : 'Push dispatch failed',
                details: res
            };
        }

        return {
            success: true,
            appName: app.name,
            projectId: app.options.credential ? (app.options as any).projectId : undefined,
            message: `Firebase App "${app.name}" initialized successfully.`
        };
    }
}

export default new EntitySettingsService();
