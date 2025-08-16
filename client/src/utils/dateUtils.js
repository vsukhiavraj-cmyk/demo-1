// Date utility functions to handle local time properly

/**
 * Get the current date in local timezone (YYYY-MM-DD format)
 */
export const getCurrentLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Convert a Date object to local date string (YYYY-MM-DD)
 */
export const toLocalDateString = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return getCurrentLocalDate();
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Convert a date string or Date object to local date string
 */
export const normalizeToLocalDate = (dateInput) => {
    if (!dateInput) return getCurrentLocalDate();

    if (typeof dateInput === 'string') {
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        }
        // Otherwise, parse it as a date
        const date = new Date(dateInput);
        return toLocalDateString(date);
    }

    if (dateInput instanceof Date) {
        return toLocalDateString(dateInput);
    }

    return getCurrentLocalDate();
};

/**
 * Check if a date is today in local timezone
 */
export const isToday = (date) => {
    const today = getCurrentLocalDate();
    const dateStr = normalizeToLocalDate(date);
    return dateStr === today;
};

/**
 * Check if a date is in the future (after today)
 */
export const isFutureDate = (date) => {
    const today = getCurrentLocalDate();
    const dateStr = normalizeToLocalDate(date);
    return dateStr > today;
};

/**
 * Check if a date is in the past (before today)
 */
export const isPastDate = (date) => {
    const today = getCurrentLocalDate();
    const dateStr = normalizeToLocalDate(date);
    return dateStr < today;
};

/**
 * Get the start of day for a given date in local timezone
 */
export const getLocalStartOfDay = (date) => {
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
};

/**
 * Get the end of day for a given date in local timezone
 */
export const getLocalEndOfDay = (date) => {
    const localDate = new Date(date);
    localDate.setHours(23, 59, 59, 999);
    return localDate;
};

/**
 * Filter tasks by local date (comparing createdAt with local date)
 */
export const filterTasksByLocalDate = (tasks, targetDate) => {
    const targetDateStr = normalizeToLocalDate(targetDate);

    return tasks.filter(task => {
        if (!task.createdAt) return false;

        // Convert task creation date to local date string
        const taskDate = new Date(task.createdAt);
        if (isNaN(taskDate.getTime())) return false;

        const taskDateStr = toLocalDateString(taskDate);
        return taskDateStr === targetDateStr;
    });
};

/**
 * Get a date object for a specific local date (YYYY-MM-DD)
 */
export const getDateFromLocalString = (dateString) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return new Date();
    }

    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-based in Date constructor
};

/**
 * Format date for display (e.g., "Jul 25, 2025")
 */
export const formatDateForDisplay = (date) => {
    const dateObj = date instanceof Date ? date : getDateFromLocalString(date);

    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Get the maximum allowed date (today) for date pickers
 */
export const getMaxAllowedDate = () => {
    return new Date(); // Today in local timezone
};

/**
 * Validate if a date should be selectable (not in the future)
 */
export const isSelectableDate = (date) => {
    return !isFutureDate(date);
};



// Additional functions that the IDE is expecting

/**
 * Convert UTC date to local date string (YYYY-MM-DD)
 * Alias for normalizeToLocalDate for IDE compatibility
 */
export const utcToLocalDateString = (dateInput) => {
    return normalizeToLocalDate(dateInput);
};

/**
 * Check if two dates are the same local day
 */
export const isSameLocalDay = (date1, date2) => {
    const dateStr1 = normalizeToLocalDate(date1);
    const dateStr2 = normalizeToLocalDate(date2);
    return dateStr1 === dateStr2;
};

/**
 * Format date for local display
 * Alias for formatDateForDisplay for IDE compatibility
 */
export const formatLocalDate = (date) => {
    return formatDateForDisplay(date);
};

/**
 * Convert UTC time to local time string
 */
export const utcToLocalTimeString = (dateInput) => {
    if (!dateInput) return '';

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Convert UTC datetime to local datetime string
 */
export const utcToLocalDateTimeString = (dateInput) => {
    if (!dateInput) return '';

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Get current local time string
 */
export const getCurrentLocalTimeString = () => {
    return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};