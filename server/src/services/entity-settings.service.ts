import { ObjectId } from 'mongodb';
import { BaseService } from './base.service';
import { EntitySettings, DEFAULT_GYM_STAFF_ROLES } from '../models/entity-settings.model';

export class EntitySettingsService extends BaseService<EntitySettings> {
    constructor() {
        super('entity-settings');
    }

    async getByEntity(entityId: string): Promise<EntitySettings> {
        const entityIdObj = new ObjectId(entityId);
        const settings = await this.getOne({ entityId: entityIdObj });
        if (settings) {
            return new EntitySettings(settings);
        }
        // Fallback default settings if collection document is empty
        return new EntitySettings({
            entityId: entityIdObj,
            staffRoles: DEFAULT_GYM_STAFF_ROLES
        });
    }

    async updateByEntity(entityId: string, staffRoles: any[]): Promise<boolean> {
        const entityIdObj = new ObjectId(entityId);
        const result = await this.getCollection().updateOne(
            { entityId: entityIdObj },
            {
                $set: {
                    entityId: entityIdObj,
                    staffRoles,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        return result.acknowledged;
    }
}

export default new EntitySettingsService();
