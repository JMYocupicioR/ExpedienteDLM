import '@testing-library/jest-dom';

// Optional: silence noisy console errors in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router')) return;
  originalError(...args);
};
