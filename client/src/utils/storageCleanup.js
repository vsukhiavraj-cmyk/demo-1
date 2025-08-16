/**
 * Storage cleanup utilities to help manage browser storage
 */

export const clearTaskFiles = () => {
  const taskFileKeys = [];
  
  // Find all task file keys in localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('task_') && key.includes('_')) {
      taskFileKeys.push(key);
      localStorage.removeItem(key);
    }
  }
  
  return taskFileKeys.length;
};

export const getStorageUsage = () => {
  let totalSize = 0;
  let taskFileSize = 0;
  let taskFileCount = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (key && value) {
      const itemSize = key.length + value.length;
      totalSize += itemSize;
      
      if (key.startsWith('task_') && key.includes('_')) {
        taskFileSize += itemSize;
        taskFileCount++;
      }
    }
  }
  
  return {
    total: {
      size: totalSize,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      itemCount: localStorage.length
    },
    taskFiles: {
      size: taskFileSize,
      sizeMB: (taskFileSize / (1024 * 1024)).toFixed(2),
      count: taskFileCount
    }
  };
};

export const showStorageAlert = () => {
  const usage = getStorageUsage();
  
  if (usage.taskFiles.count > 0) {
    const message = `
Storage Usage:
- Total localStorage: ${usage.total.sizeMB} MB (${usage.total.itemCount} items)
- Task files: ${usage.taskFiles.sizeMB} MB (${usage.taskFiles.count} files)

If you're experiencing storage quota errors, you can:
1. Clear old task files
2. The app will automatically migrate files to IndexedDB for better storage
    `;
    
    if (confirm(message + '\n\nWould you like to clear old task files now?')) {
      const cleared = clearTaskFiles();
      alert(`Cleared ${cleared} task files from localStorage`);
    }
  } else {
    alert(`Storage Usage: ${usage.total.sizeMB} MB (${usage.total.itemCount} items)\nNo task files found in localStorage.`);
  }
};

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  window.storageCleanup = {
    clearTaskFiles,
    getStorageUsage,
    showStorageAlert
  };
}