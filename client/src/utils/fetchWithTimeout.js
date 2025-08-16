/**
 * Utility function to add timeout support to fetch requests
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 60000)
 * @returns {Promise} - Fetch promise with timeout
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 60000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeout / 1000} seconds. Please try again or contact support if the issue persists.`
      );
    }
    
    throw error;
  }
};

/**
 * Calculate dynamic timeout based on goal complexity
 * @param {object} goalData - Goal data containing timeline and other complexity factors
 * @returns {number} - Timeout in milliseconds
 */
export const calculateAITimeout = (goalData = {}) => {
  const baseTimeout = 30000; // 30 seconds base
  const timelineMultiplier = 15000; // 15 seconds per month
  const complexityBonus = 10000; // 10 seconds for complex paths
  
  // Extract timeline (duration in months)
  const timeline = goalData.timeline || goalData.timeframe || 3;
  
  // Check if it's a complex learning path
  const isComplexPath = goalData.field?.toLowerCase().includes('ai') || 
                       goalData.field?.toLowerCase().includes('ml') ||
                       goalData.learningPath === 'ai-ml' ||
                       goalData.learningPath === 'cloud-computing';
  
  // Calculate timeout: base + (timeline * multiplier) + complexity bonus
  let timeout = baseTimeout + (timeline * timelineMultiplier);
  
  if (isComplexPath) {
    timeout += complexityBonus;
  }
  
  // Cap at 3 minutes for very long goals, minimum 45 seconds
  timeout = Math.min(Math.max(timeout, 45000), 180000);
    field: goalData.field || goalData.learningPath
  });
  
  return timeout;
};

/**
 * Utility function specifically for AI operations with dynamic timeout
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {object} goalData - Goal data for timeout calculation
 * @returns {Promise} - Fetch promise with calculated timeout
 */
export const fetchAIOperation = (url, options = {}, goalData = {}) => {
  const timeout = calculateAITimeout(goalData);
  return fetchWithTimeout(url, options, timeout);
};

/**
 * Legacy function for backward compatibility
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise} - Fetch promise with standard AI timeout
 */
export const fetchAIOperationStandard = (url, options = {}) => {
  return fetchWithTimeout(url, options, 60000); // 60 second timeout for AI operations
};