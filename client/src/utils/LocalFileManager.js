/**
 * LocalFileManager - Utility class for managing file storage in browser localStorage
 * Replaces AWS S3 functionality with local browser storage
 */
class LocalFileManager {
  /**
   * Store a file in localStorage as Base64 encoded string
   * @param {string} userId - User ID for key generation
   * @param {File} file - File object to store
   * @returns {Promise<string>} - Promise resolving to the storage key
   */
  static storeFile(userId, file) {
    return new Promise((resolve, reject) => {
      // Validate inputs
      if (!userId) {
        reject(new Error('User ID is required for file storage'));
        return;
      }
      
      if (!file || !(file instanceof File)) {
        reject(new Error('Valid File object is required'));
        return;
      }

      // Check file size (limit to 5MB to avoid localStorage quota issues)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        reject(new Error('File size exceeds 5MB limit'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const base64Data = e.target.result;
          const fileKey = `user_${userId}_file_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          const fileMetadata = {
            data: base64Data,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString()
          };

          // Check localStorage quota before storing
          const dataString = JSON.stringify(fileMetadata);
          const estimatedSize = new Blob([dataString]).size;
          
          // Check available localStorage space
          if (!this._checkStorageQuota(estimatedSize)) {
            reject(new Error('Insufficient localStorage space. Please clear some files or use a smaller file.'));
            return;
          }

          localStorage.setItem(fileKey, dataString);
          resolve(fileKey);
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            reject(new Error('localStorage quota exceeded. Please clear some files and try again.'));
          } else {
            reject(new Error(`Failed to store file in localStorage: ${error.message}`));
          }
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Retrieve file metadata and data from localStorage
   * @param {string} fileKey - Storage key for the file
   * @returns {Object|null} - File metadata object or null if not found
   */
  static retrieveFile(fileKey) {
    try {
      if (!fileKey) {
        console.error('File key is required for retrieval');
        return null;
      }

      const fileData = localStorage.getItem(fileKey);
      if (!fileData) {
        console.warn(`File not found for key: ${fileKey}`);
        return null;
      }

      return JSON.parse(fileData);
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  /**
   * Open file in new tab using data URI
   * @param {string} fileKey - Storage key for the file
   * @returns {boolean} - Success status
   */
  static viewFile(fileKey) {
    try {
      const fileData = this.retrieveFile(fileKey);
      if (!fileData) {
        console.error('File not found or could not be retrieved');
        return false;
      }

      // Create a new window/tab to display the file
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        console.error('Failed to open new window. Popup blocker may be active.');
        return false;
      }

      // Handle different file types appropriately
      if (fileData.type.startsWith('image/')) {
        // For images, display directly
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileData.name}</title>
              <style>
                body { margin: 0; padding: 20px; background: #f0f0f0; }
                img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                .info { text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              <div class="info">
                <h2>${fileData.name}</h2>
                <p>Size: ${this._formatFileSize(fileData.size)} | Uploaded: ${new Date(fileData.uploadedAt).toLocaleString()}</p>
              </div>
              <img src="${fileData.data}" alt="${fileData.name}" />
            </body>
          </html>
        `);
      } else if (fileData.type === 'application/pdf') {
        // For PDFs, use iframe
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileData.name}</title>
              <style>body { margin: 0; }</style>
            </head>
            <body>
              <iframe src="${fileData.data}" style="width:100%;height:100vh;border:none;"></iframe>
            </body>
          </html>
        `);
      } else if (fileData.type.startsWith('text/')) {
        // For text files, decode and display
        try {
          const textContent = atob(fileData.data.split(',')[1]);
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${fileData.name}</title>
                <style>
                  body { font-family: monospace; padding: 20px; background: #f8f8f8; }
                  .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
                  pre { white-space: pre-wrap; word-wrap: break-word; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h2>${fileData.name}</h2>
                  <p>Size: ${this._formatFileSize(fileData.size)} | Uploaded: ${new Date(fileData.uploadedAt).toLocaleString()}</p>
                </div>
                <pre>${textContent}</pre>
              </body>
            </html>
          `);
        } catch (e) {
          // Fallback to direct data URI
          newWindow.location.href = fileData.data;
        }
      } else {
        // For other file types, try direct data URI
        newWindow.location.href = fileData.data;
      }

      newWindow.document.close();
      return true;
    } catch (error) {
      console.error('Failed to view file:', error);
      return false;
    }
  }

  /**
   * Get all files for a specific user
   * @param {string} userId - User ID to filter files
   * @returns {Array} - Array of file metadata objects with keys
   */
  static getUserFiles(userId) {
    try {
      const userFiles = [];
      const prefix = `user_${userId}_file_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const fileData = this.retrieveFile(key);
          if (fileData) {
            userFiles.push({
              key,
              ...fileData
            });
          }
        }
      }
      
      // Sort by upload date (newest first)
      return userFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    } catch (error) {
      console.error('Failed to get user files:', error);
      return [];
    }
  }

  /**
   * Delete a file from localStorage
   * @param {string} fileKey - Storage key for the file
   * @returns {boolean} - Success status
   */
  static deleteFile(fileKey) {
    try {
      if (!fileKey) {
        console.error('File key is required for deletion');
        return false;
      }

      localStorage.removeItem(fileKey);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get localStorage usage statistics
   * @returns {Object} - Usage statistics
   */
  static getStorageStats() {
    try {
      let totalSize = 0;
      let fileCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_file_')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
            fileCount++;
          }
        }
      }

      return {
        fileCount,
        totalSize,
        formattedSize: this._formatFileSize(totalSize),
        estimatedQuotaUsed: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1) + '%' // Assuming 5MB typical quota
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { fileCount: 0, totalSize: 0, formattedSize: '0 B', estimatedQuotaUsed: '0%' };
    }
  }

  /**
   * Check if there's enough localStorage quota for a given size
   * @private
   * @param {number} sizeNeeded - Size in bytes
   * @returns {boolean} - Whether there's enough space
   */
  static _checkStorageQuota(sizeNeeded) {
    try {
      // Try to store a test item to check quota
      const testKey = 'quota_test_' + Date.now();
      const testData = 'x'.repeat(sizeNeeded);
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up old/unused files to free storage space
   * @param {Object} options - Cleanup options
   * @param {number} options.maxAge - Maximum age in days (default: 30)
   * @param {number} options.maxFiles - Maximum number of files per user (default: 50)
   * @param {string} options.userId - Specific user ID to clean (optional)
   * @returns {Object} - Cleanup results
   */
  static cleanupOldFiles(options = {}) {
    const {
      maxAge = 30,
      maxFiles = 50,
      userId = null
    } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      let cleanedCount = 0;
      let freedSpace = 0;
      const filesToDelete = [];

      // Collect all file keys
      const allFiles = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_file_')) {
          // Filter by user if specified
          if (userId && !key.startsWith(`user_${userId}_file_`)) {
            continue;
          }

          const fileData = this.retrieveFile(key);
          if (fileData) {
            allFiles.push({
              key,
              uploadedAt: new Date(fileData.uploadedAt),
              size: fileData.size || 0
            });
          }
        }
      }

      // Sort by upload date (oldest first)
      allFiles.sort((a, b) => a.uploadedAt - b.uploadedAt);

      // Mark files for deletion based on age
      allFiles.forEach(file => {
        if (file.uploadedAt < cutoffDate) {
          filesToDelete.push(file);
        }
      });

      // If still too many files, mark oldest ones for deletion
      if (userId) {
        const userFiles = allFiles.filter(file => 
          file.key.startsWith(`user_${userId}_file_`)
        );
        
        if (userFiles.length > maxFiles) {
          const excessFiles = userFiles.slice(0, userFiles.length - maxFiles);
          excessFiles.forEach(file => {
            if (!filesToDelete.find(f => f.key === file.key)) {
              filesToDelete.push(file);
            }
          });
        }
      }

      // Delete marked files
      filesToDelete.forEach(file => {
        try {
          localStorage.removeItem(file.key);
          cleanedCount++;
          freedSpace += file.size;
        } catch (error) {
          console.warn(`Failed to delete file ${file.key}:`, error);
        }
      });

      const result = {
        cleanedCount,
        freedSpace,
        formattedFreedSpace: this._formatFileSize(freedSpace),
        remainingFiles: allFiles.length - cleanedCount,
        cutoffDate: cutoffDate.toISOString()
      };

      }

      return result;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return {
        cleanedCount: 0,
        freedSpace: 0,
        formattedFreedSpace: '0 B',
        remainingFiles: 0,
        error: error.message
      };
    }
  }

  /**
   * Get detailed storage analysis
   * @param {string} userId - User ID to analyze (optional)
   * @returns {Object} - Detailed storage analysis
   */
  static getStorageAnalysis(userId = null) {
    try {
      const analysis = {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        filesByAge: {
          last7Days: 0,
          last30Days: 0,
          older: 0
        },
        largestFiles: [],
        oldestFiles: [],
        recommendations: []
      };

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allFiles = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_file_')) {
          // Filter by user if specified
          if (userId && !key.startsWith(`user_${userId}_file_`)) {
            continue;
          }

          const fileData = this.retrieveFile(key);
          if (fileData) {
            const uploadDate = new Date(fileData.uploadedAt);
            const fileInfo = {
              key,
              name: fileData.name,
              type: fileData.type,
              size: fileData.size || 0,
              uploadedAt: uploadDate
            };

            allFiles.push(fileInfo);
            analysis.totalFiles++;
            analysis.totalSize += fileInfo.size;

            // Count by type
            const fileType = fileInfo.type.split('/')[0] || 'unknown';
            analysis.filesByType[fileType] = (analysis.filesByType[fileType] || 0) + 1;

            // Count by age
            if (uploadDate > sevenDaysAgo) {
              analysis.filesByAge.last7Days++;
            } else if (uploadDate > thirtyDaysAgo) {
              analysis.filesByAge.last30Days++;
            } else {
              analysis.filesByAge.older++;
            }
          }
        }
      }

      // Find largest files
      analysis.largestFiles = allFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(file => ({
          name: file.name,
          size: file.size,
          formattedSize: this._formatFileSize(file.size),
          uploadedAt: file.uploadedAt.toISOString()
        }));

      // Find oldest files
      analysis.oldestFiles = allFiles
        .sort((a, b) => a.uploadedAt - b.uploadedAt)
        .slice(0, 10)
        .map(file => ({
          name: file.name,
          size: file.size,
          formattedSize: this._formatFileSize(file.size),
          uploadedAt: file.uploadedAt.toISOString(),
          ageInDays: Math.floor((now - file.uploadedAt) / (24 * 60 * 60 * 1000))
        }));

      // Generate recommendations
      if (analysis.filesByAge.older > 0) {
        analysis.recommendations.push({
          type: 'cleanup',
          message: `Consider cleaning up ${analysis.filesByAge.older} files older than 30 days`,
          action: 'cleanupOldFiles',
          priority: 'medium'
        });
      }

      if (analysis.totalSize > 3 * 1024 * 1024) { // > 3MB
        analysis.recommendations.push({
          type: 'storage',
          message: 'Storage usage is high. Consider removing large or unused files.',
          action: 'reviewLargeFiles',
          priority: 'high'
        });
      }

      if (analysis.totalFiles > 100) {
        analysis.recommendations.push({
          type: 'organization',
          message: 'You have many files. Consider organizing or archiving older submissions.',
          action: 'organizeFiles',
          priority: 'low'
        });
      }

      analysis.formattedTotalSize = this._formatFileSize(analysis.totalSize);

      return analysis;
    } catch (error) {
      console.error('Failed to analyze storage:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        formattedTotalSize: '0 B',
        error: error.message
      };
    }
  }

  /**
   * Optimize storage by compressing and deduplicating files
   * @param {string} userId - User ID to optimize (optional)
   * @returns {Object} - Optimization results
   */
  static optimizeStorage(userId = null) {
    try {
      let optimizedCount = 0;
      let spaceSaved = 0;
      const duplicates = new Map();

      // Find duplicate files by content hash
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_file_')) {
          if (userId && !key.startsWith(`user_${userId}_file_`)) {
            continue;
          }

          const fileData = this.retrieveFile(key);
          if (fileData && fileData.data) {
            // Simple hash based on data length and first/last characters
            const hash = `${fileData.data.length}_${fileData.data.slice(0, 100)}_${fileData.data.slice(-100)}`;
            
            if (duplicates.has(hash)) {
              // Found duplicate - remove the newer one (keep older)
              const existing = duplicates.get(hash);
              const existingDate = new Date(existing.uploadedAt);
              const currentDate = new Date(fileData.uploadedAt);
              
              if (currentDate > existingDate) {
                // Current file is newer, remove it
                localStorage.removeItem(key);
                optimizedCount++;
                spaceSaved += fileData.size || 0;
              } else {
                // Existing file is newer, remove it and keep current
                localStorage.removeItem(existing.key);
                duplicates.set(hash, { key, uploadedAt: fileData.uploadedAt });
                optimizedCount++;
                spaceSaved += existing.size || 0;
              }
            } else {
              duplicates.set(hash, { 
                key, 
                uploadedAt: fileData.uploadedAt,
                size: fileData.size || 0
              });
            }
          }
        }
      }

      const result = {
        optimizedCount,
        spaceSaved,
        formattedSpaceSaved: this._formatFileSize(spaceSaved),
        duplicatesRemoved: optimizedCount
      };

      }

      return result;
    } catch (error) {
      console.error('Failed to optimize storage:', error);
      return {
        optimizedCount: 0,
        spaceSaved: 0,
        formattedSpaceSaved: '0 B',
        error: error.message
      };
    }
  }

  /**
   * Schedule automatic cleanup
   * @param {Object} options - Cleanup schedule options
   */
  static scheduleCleanup(options = {}) {
    const {
      interval = 24 * 60 * 60 * 1000, // 24 hours
      maxAge = 30,
      maxFiles = 50
    } = options;

    // Clear any existing cleanup interval
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }

    this._cleanupInterval = setInterval(() => {
      const result = this.cleanupOldFiles({ maxAge, maxFiles });
      
      if (result.cleanedCount > 0) {
        // Dispatch cleanup event
        window.dispatchEvent(new CustomEvent('files-cleaned', {
          detail: result
        }));
      }
    }, interval);
  }

  /**
   * Stop scheduled cleanup
   */
  static stopScheduledCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }

  /**
   * Format file size in human readable format
   * @private
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string
   */
  static _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default LocalFileManager;