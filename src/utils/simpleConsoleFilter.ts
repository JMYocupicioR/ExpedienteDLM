/**
 * Simple Console Filter - Safe version without recursion
 */

// Simple counter to track repetitive messages
const messageCounters = new Map<string, number>();
let lastCleanup = Date.now();

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

function cleanupCounters() {
  const now = Date.now();
  if (now - lastCleanup > 10000) { // Clean every 10 seconds
    messageCounters.clear();
    lastCleanup = now;
  }
}

function shouldFilter(message: string): boolean {
  cleanupCounters();
  
  const count = messageCounters.get(message) || 0;
  messageCounters.set(message, count + 1);
  
  // Filter specific repetitive messages after 3 occurrences
  if (count > 3 && (
    message.includes('Recuperar terminó de cargarse') ||
    message.includes('NewPatientForm -') ||
    message.includes('ClinicStatusCard -') ||
    message.includes('🔍 Loading clinic for user')
  )) {
    return true;
  }
  
  return false;
}

// Safe console override - only in development
if (import.meta.env.DEV) {
  console.log = (...args) => {
    try {
      const message = String(args[0] || '');
      if (!shouldFilter(message)) {
        originalConsole.log(...args);
      }
    } catch {
      originalConsole.log(...args);
    }
  };

  console.warn = (...args) => {
    try {
      const message = String(args[0] || '');
      if (!shouldFilter(message)) {
        originalConsole.warn(...args);
      }
    } catch {
      originalConsole.warn(...args);
    }
  };
}

export { originalConsole };
