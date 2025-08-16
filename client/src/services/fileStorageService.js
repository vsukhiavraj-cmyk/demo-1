/**
 * File Storage Service using IndexedDB for large file storage
 * Replaces localStorage to avoid quota exceeded errors
 */

class FileStorageService {
  constructor() {
    this.dbName = 'TaskFilesDB';
    this.dbVersion = 1;
    this.storeName = 'files';
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[FileStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('taskId', 'taskId', { unique: false });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
    });
  }

  // Store file in IndexedDB
  async storeFile(fileKey, fileData) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const fileRecord = {
          id: fileKey,
          ...fileData,
          storedAt: new Date().toISOString()
        };

        const request = store.put(fileRecord);

        request.onsuccess = () => {
          resolve(fileRecord);
        };

        request.onerror = () => {
          console.error('[FileStorage] Failed to store file:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[FileStorage] Error storing file:', error);
      throw error;
    }
  }

  // Retrieve file from IndexedDB
  async getFile(fileKey) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(fileKey);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            console.warn('[FileStorage] File not found:', fileKey);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('[FileStorage] Failed to retrieve file:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[FileStorage] Error retrieving file:', error);
      throw error;
    }
  }

  // Delete file from IndexedDB
  async deleteFile(fileKey) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(fileKey);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('[FileStorage] Failed to delete file:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[FileStorage] Error deleting file:', error);
      throw error;
    }
  }

  // Get all files for a specific task
  async getFilesByTaskId(taskId) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('taskId');
        const request = index.getAll(taskId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('[FileStorage] Failed to retrieve files for task:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[FileStorage] Error retrieving files for task:', error);
      throw error;
    }
  }

  // Clear old files (optional cleanup)
  async clearOldFiles(daysOld = 30) {
    try {
      await this.init();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('uploadedAt');
        const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
        const request = index.openCursor(range);

        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          console.error('[FileStorage] Failed to cleanup old files:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[FileStorage] Error during cleanup:', error);
      throw error;
    }
  }

  // Get storage usage info
  async getStorageInfo() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      }
      return null;
    } catch (error) {
      console.error('[FileStorage] Error getting storage info:', error);
      return null;
    }
  }
}

// Create singleton instance
const fileStorageService = new FileStorageService();

export default fileStorageService;