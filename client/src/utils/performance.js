export const measureFPS = () => {
  let lastFrame = performance.now();
  let count = 0;
  return () => {
    const now = performance.now();
    count++;
    if (now - lastFrame >= 1000) {
      count = 0;
      lastFrame = now;
    }
  };
};
