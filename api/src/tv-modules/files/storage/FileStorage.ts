import type { FileStorageProvider } from 'taskview-db-schemas';
import type { StorageGetResult, StoragePutArgs, StoredObject } from './storage.types';

export interface FileStorage {
    readonly provider: FileStorageProvider;
    put(args: StoragePutArgs): Promise<StoredObject>;
    get(key: string): Promise<StorageGetResult>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
