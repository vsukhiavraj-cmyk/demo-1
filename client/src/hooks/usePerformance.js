export const usePerformance = () => {
  if (window.performance) {
    const memory = window.performance.memory || {};
    return memory;
  }
  return {};
};
