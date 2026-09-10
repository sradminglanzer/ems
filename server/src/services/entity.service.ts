import { BaseService } from './base.service';

class EntityService extends BaseService<any> {
    constructor() {
        super('entities');
    }
}

export default new EntityService();
