/**
 * IndexedDB-based offline storage service for files
 * Handles local caching of files for offline access
 */

const DB_NAME = 'deskive-offline-files';
const DB_VERSION = 1;

// Store names
const STORES = {
  FILES_METADATA: 'files_metadata',
  FILE_BLOBS: 'file_blobs',
  SYNC_QUEUE: 'sync_queue'
} as const;

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'outdated';

export interface OfflineFileMetadata {
  fileId: string;
  workspaceId: string;
  fileName: string;
  mimeType: string;
  size: number;
  serverVersion: number;
  localVersion: number;
  syncStatus: SyncStatus;
  autoSync: boolean;
  lastSyncedAt: string | null;
  cachedAt: string;
  fileUrl?: string;
}

export interface OfflineFileBlob {
  fileId: string;
  blob: Blob;
  cachedAt: string;
}

export interface SyncQueueItem {
  id: string;
  fileId: string;
  workspaceId: string;
  operation: 'download' | 'sync' | 'remove';
  status: 'pending' | 'in_progress' | 'failed';
  retryCount: number;
  createdAt: string;
  errorMessage?: string;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files metadata store
        if (!db.objectStoreNames.contains(STORES.FILES_METADATA)) {
          const metadataStore = db.createObjectStore(STORES.FILES_METADATA, { keyPath: 'fileId' });
          metadataStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          metadataStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          metadataStore.createIndex('autoSync', 'autoSync', { unique: false });
        }

        // Create file blobs store
        if (!db.objectStoreNames.contains(STORES.FILE_BLOBS)) {
          db.createObjectStore(STORES.FILE_BLOBS, { keyPath: 'fileId' });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('fileId', 'fileId', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // ============================================
  // FILE METADATA OPERATIONS
  // ============================================

  /**
   * Save file metadata to IndexedDB
   */
  async saveFileMetadata(metadata: OfflineFileMetadata): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILES_METADATA, 'readwrite');
      const store = tx.objectStore(STORES.FILES_METADATA);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<OfflineFileMetadata | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILES_METADATA, 'readonly');
      const store = tx.objectStore(STORES.FILES_METADATA);
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all offline files for a workspace
   */
  async getOfflineFiles(workspaceId: string): Promise<OfflineFileMetadata[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILES_METADATA, 'readonly');
      const store = tx.objectStore(STORES.FILES_METADATA);
      const index = store.index('workspaceId');
      const request = index.getAll(workspaceId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all offline files across all workspaces
   */
  async getAllOfflineFiles(): Promise<OfflineFileMetadata[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILES_METADATA, 'readonly');
      const store = tx.objectStore(STORES.FILES_METADATA);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete file metadata
   */
  async deleteFileMetadata(fileId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILES_METADATA, 'readwrite');
      const store = tx.objectStore(STORES.FILES_METADATA);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync status for a file
   */
  async updateSyncStatus(fileId: string, syncStatus: SyncStatus, syncedVersion?: number): Promise<void> {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) return;

    metadata.syncStatus = syncStatus;
    if (syncedVersion !== undefined) {
      metadata.localVersion = syncedVersion;
    }
    if (syncStatus === 'synced') {
      metadata.lastSyncedAt = new Date().toISOString();
    }

    await this.saveFileMetadata(metadata);
  }

  // ============================================
  // FILE BLOB OPERATIONS
  // ============================================

  /**
   * Save file blob to IndexedDB
   */
  async saveFileBlob(fileId: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORES.FILE_BLOBS);
      const data: OfflineFileBlob = {
        fileId,
        blob,
        cachedAt: new Date().toISOString()
      };
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get file blob by ID
   */
  async getFileBlob(fileId: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILE_BLOBS, 'readonly');
      const store = tx.objectStore(STORES.FILE_BLOBS);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const result = request.result as OfflineFileBlob | undefined;
        resolve(result?.blob || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete file blob
   */
  async deleteFileBlob(fileId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FILE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORES.FILE_BLOBS);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // SYNC QUEUE OPERATIONS
  // ============================================

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const db = await this.getDB();
    const id = `${item.fileId}-${Date.now()}`;
    const queueItem: SyncQueueItem = {
      ...item,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.put(queueItem);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending sync queue items
   */
  async getPendingSyncItems(workspaceId?: string): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        let items = request.result || [];
        if (workspaceId) {
          items = items.filter(item => item.workspaceId === workspaceId);
        }
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync queue item status
   */
  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          resolve();
          return;
        }

        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear completed sync queue items for a file
   */
  async clearSyncQueueForFile(fileId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('fileId');
      const request = index.getAllKeys(fileId);

      request.onsuccess = () => {
        const keys = request.result;
        keys.forEach(key => store.delete(key));
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // HIGH-LEVEL OPERATIONS
  // ============================================

  /**
   * Mark a file for offline access and cache it
   */
  async cacheFile(
    fileId: string,
    workspaceId: string,
    fileData: {
      fileName: string;
      mimeType: string;
      size: number;
      version: number;
      url?: string;
    },
    blob: Blob,
    autoSync: boolean = true
  ): Promise<void> {
    const now = new Date().toISOString();

    // Save metadata
    const metadata: OfflineFileMetadata = {
      fileId,
      workspaceId,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      serverVersion: fileData.version,
      localVersion: fileData.version,
      syncStatus: 'synced',
      autoSync,
      lastSyncedAt: now,
      cachedAt: now,
      fileUrl: fileData.url
    };

    await this.saveFileMetadata(metadata);
    await this.saveFileBlob(fileId, blob);
  }

  /**
   * Remove file from offline cache
   */
  async removeFile(fileId: string): Promise<void> {
    await this.deleteFileMetadata(fileId);
    await this.deleteFileBlob(fileId);
    await this.clearSyncQueueForFile(fileId);
  }

  /**
   * Check if a file is available offline
   */
  async isFileAvailableOffline(fileId: string): Promise<boolean> {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) return false;

    const blob = await this.getFileBlob(fileId);
    return blob !== null;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(workspaceId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    pendingCount: number;
    syncedCount: number;
    errorCount: number;
    outdatedCount: number;
  }> {
    const files = workspaceId
      ? await this.getOfflineFiles(workspaceId)
      : await this.getAllOfflineFiles();

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      pendingCount: 0,
      syncedCount: 0,
      errorCount: 0,
      outdatedCount: 0
    };

    files.forEach(file => {
      stats.totalSize += file.size;

      switch (file.syncStatus) {
        case 'pending':
        case 'syncing':
          stats.pendingCount++;
          break;
        case 'synced':
          stats.syncedCount++;
          break;
        case 'error':
          stats.errorCount++;
          break;
        case 'outdated':
          stats.outdatedCount++;
          break;
      }
    });

    return stats;
  }

  /**
   * Get files that need syncing
   */
  async getFilesNeedingSync(workspaceId?: string): Promise<OfflineFileMetadata[]> {
    const files = workspaceId
      ? await this.getOfflineFiles(workspaceId)
      : await this.getAllOfflineFiles();

    return files.filter(file =>
      file.autoSync &&
      (file.syncStatus === 'outdated' || file.serverVersion > file.localVersion)
    );
  }

  /**
   * Mark files as outdated when server version changes
   */
  async markAsOutdated(fileId: string, newServerVersion: number): Promise<void> {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) return;

    if (newServerVersion > metadata.localVersion) {
      metadata.serverVersion = newServerVersion;
      metadata.syncStatus = 'outdated';
      await this.saveFileMetadata(metadata);
    }
  }

  /**
   * Clear all offline data for a workspace
   */
  async clearWorkspaceData(workspaceId: string): Promise<void> {
    const files = await this.getOfflineFiles(workspaceId);
    for (const file of files) {
      await this.removeFile(file.fileId);
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORES.FILES_METADATA, STORES.FILE_BLOBS, STORES.SYNC_QUEUE],
        'readwrite'
      );

      tx.objectStore(STORES.FILES_METADATA).clear();
      tx.objectStore(STORES.FILE_BLOBS).clear();
      tx.objectStore(STORES.SYNC_QUEUE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Estimate available storage space (if supported)
   */
  async getAvailableStorage(): Promise<{ used: number; available: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    }
    return null;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
