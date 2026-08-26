import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { EntitySettings } from '../models/entity-settings.model';
import { getDB } from '../config/db';

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
        }

        return resolvedSettings;
    }

    async updateByEntity(entityIdStr: string, updateData: { staffRoles?: any[]; labels?: any }): Promise<boolean> {
        const entityIdObj = new ObjectId(entityIdStr);
        const customSettingsData: any = {};
        if (updateData.staffRoles) customSettingsData['customSettings.staffRoles'] = updateData.staffRoles;
        if (updateData.labels) customSettingsData['customSettings.labels'] = updateData.labels;
        customSettingsData.updatedAt = new Date();

        // Write custom white-label overrides directly to the tenant's entities document
        const result = await getDB().collection('entities').updateOne(
            { _id: entityIdObj },
            { $set: customSettingsData }
        );
        return result.acknowledged;
    }
}

export default new EntitySettingsService();
