import React from 'react';

const ResourceDisplay = ({ resources, theme = 'light' }) => {
  if (!resources || resources.length === 0) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div>
      <h4 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
        📚 Learning Resources
      </h4>
      <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>
        {resources.map((resource, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-xs mt-1">
              {resource.type === 'video' ? '🎥' : 
               resource.type === 'article' ? '📄' : 
               resource.type === 'documentation' ? '📖' : 
               resource.type === 'project' ? '🛠️' : '🔗'}
            </span>
            <div className="flex-1">
              {resource.url && resource.url !== 'resource url' && resource.url !== 'https://actual-working-url.com' ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline break-words ${
                    isDark 
                      ? 'text-blue-400 hover:text-blue-300' 
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                  title={resource.url}
                >
                  {resource.title || resource.url}
                </a>
              ) : (
                <span className={`italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {resource.title || 'Resource link not available'}
                </span>
              )}
              {resource.type && (
                <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                  isDark 
                    ? 'bg-white/10 text-gray-300 border border-white/20' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {resource.type}
                </span>
              )}
              {resource.description && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {resource.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourceDisplay;