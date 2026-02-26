import { SYNC_STATUS, type SyncStatus } from '@/types';

export class LocalEntity<T> {
    private _entity: T;
    serverId?: number;
    syncStatus: SyncStatus = SYNC_STATUS.SYNCED;
    deleted: boolean = false;
    tempId?: string;
    serverUpdatedAt?: string;

    constructor(entity: T) {
        this._entity = entity;
    }

    get entity(): T {
        return this._entity;
    }

    set entity(value: T) {
        this._entity = value;
    }

    markDeleted(): void {
        this.deleted = true;
        this.syncStatus = SYNC_STATUS.PENDING;
    }

    markSynced(): void {
        this.syncStatus = SYNC_STATUS.SYNCED;
        this.tempId = undefined;
    }

    toApiPayload(): T {
        return this._entity;
    }
}