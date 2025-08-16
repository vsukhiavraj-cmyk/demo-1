// Utility to validate and enhance resource data

export const validateResources = (resources) => {
  if (!Array.isArray(resources)) {
    return [];
  }

  const validTypes = ["video", "article", "documentation", "project", "github", "tutorial", "course", "book"];

  return resources
    .filter(resource => resource && typeof resource === 'object')
    .map(resource => {
      // Clean up the resource object
      const cleanResource = {
        type: validTypes.includes(resource.type) ? resource.type : 'article',
        title: resource.title || 'Learning Resource',
        url: resource.url || null,
        description: resource.description || null
      };

      // Validate URL
      if (cleanResource.url) {
        // Check if it's a placeholder URL
        const placeholderUrls = [
          'resource url',
          'https://actual-working-url.com',
          'http://example.com',
          'https://example.com'
        ];
        
        if (placeholderUrls.includes(cleanResource.url)) {
          cleanResource.url = null;
        } else {
          // Basic URL validation
          try {
            new URL(cleanResource.url);
          } catch (e) {
            cleanResource.url = null;
          }
        }
      }

      return cleanResource;
    })
    .filter(resource => resource.title); // Keep resources that at least have a title
};

export const enhanceResourcesWithDefaults = (resources, taskTopics = []) => {
  const validResources = validateResources(resources);
  
  // If no valid resources, add some default ones based on topics
  if (validResources.length === 0 && taskTopics.length > 0) {
    const defaultResources = [];
    
    // Add MDN docs for web technologies
    const webTopics = ['HTML', 'CSS', 'JavaScript', 'DOM', 'API'];
    if (taskTopics.some(topic => webTopics.some(webTopic => 
      topic.toLowerCase().includes(webTopic.toLowerCase())))) {
      defaultResources.push({
        type: 'documentation',
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org/',
        description: 'Comprehensive web development documentation'
      });
    }
    
    // Add React docs for React topics
    if (taskTopics.some(topic => topic.toLowerCase().includes('react'))) {
      defaultResources.push({
        type: 'documentation',
        title: 'React Documentation',
        url: 'https://reactjs.org/docs/getting-started.html',
        description: 'Official React documentation'
      });
    }
    
    // Add Node.js docs for Node topics
    if (taskTopics.some(topic => topic.toLowerCase().includes('node'))) {
      defaultResources.push({
        type: 'documentation',
        title: 'Node.js Documentation',
        url: 'https://nodejs.org/en/docs/',
        description: 'Official Node.js documentation'
      });
    }
    
    return defaultResources;
  }
  
  return validResources;
};