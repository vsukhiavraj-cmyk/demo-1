/**
 * Migration utilities to move files from localStorage to IndexedDB
 */

import fileStorageService from '../services/fileStorageService';

export const migrateLocalStorageToIndexedDB = async () => {
  try {
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Find all localStorage keys that look like task files
    const taskFileKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('task_') && key.includes('_')) {
        taskFileKeys.push(key);
      }
    }

    for (const key of taskFileKeys) {
      try {
        const dataString = localStorage.getItem(key);
        if (!dataString) continue;

        const fileData = JSON.parse(dataString);
        
        // Check if this looks like a file object
        if (fileData.data && fileData.name && fileData.type) {
          // Convert base64 data URL to ArrayBuffer
          let arrayBuffer;
          if (fileData.data.startsWith('data:')) {
            // It's a data URL, convert to ArrayBuffer
            const response = await fetch(fileData.data);
            arrayBuffer = await response.arrayBuffer();
          } else {
            // Skip if data format is unexpected
            console.warn(`[Migration] Skipping ${key}: unexpected data format`);
            continue;
          }

          // Prepare data for IndexedDB
          const indexedDBData = {
            data: arrayBuffer,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size || arrayBuffer.byteLength,
            taskId: fileData.taskId,
            submissionType: fileData.submissionType,
            uploadedAt: fileData.uploadedAt || new Date().toISOString()
          };

          // Store in IndexedDB
          await fileStorageService.storeFile(key, indexedDBData);
          
          // Remove from localStorage after successful migration
          localStorage.removeItem(key);
          
          migratedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push({ key, error: error.message });
        console.error(`[Migration] Failed to migrate ${key}:`, error);
      }
    }

    const result = {
      success: true,
      migratedCount,
      errorCount,
      errors,
      message: `Migration completed: ${migratedCount} files migrated, ${errorCount} errors`
    };

    return result;

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    return {
      success: false,
      message: error.message || 'Migration failed',
      migratedCount: 0,
      errorCount: 0,
      errors: [{ error: error.message }]
    };
  }
};

export const checkForLegacyFiles = () => {
  const taskFileKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('task_') && key.includes('_')) {
      taskFileKeys.push(key);
    }
  }
  return taskFileKeys;
};

export const getLocalStorageUsage = () => {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (key && value) {
      totalSize += key.length + value.length;
    }
  }
  return {
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    itemCount: localStorage.length
  };
};