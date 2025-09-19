import { useRef, useCallback } from 'react';

interface UseRequestThrottleOptions {
  delay?: number; // milliseconds
  maxRequests?: number; // max requests per window
  windowMs?: number; // time window in milliseconds
}

export function useRequestThrottle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: UseRequestThrottleOptions = {}
): T {
  const {
    delay = 300,
    maxRequests = 5,
    windowMs = 1000
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestTimesRef = useRef<number[]>([]);
  const lastCallRef = useRef<number>(0);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    // Clean old request times outside the window
    requestTimesRef.current = requestTimesRef.current.filter(
      time => now - time < windowMs
    );

    // Check if we've exceeded max requests in the window
    if (requestTimesRef.current.length >= maxRequests) {
      console.warn(`Request throttled: too many requests (${maxRequests} in ${windowMs}ms)`);
      return Promise.resolve() as ReturnType<T>;
    }

    // Check minimum delay between requests
    const timeSinceLastCall = now - lastCallRef.current;
    if (timeSinceLastCall < delay) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      return new Promise((resolve) => {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          requestTimesRef.current.push(lastCallRef.current);
          resolve(fn(...args));
        }, delay - timeSinceLastCall);
      }) as ReturnType<T>;
    }

    // Execute immediately if enough time has passed
    lastCallRef.current = now;
    requestTimesRef.current.push(now);
    return fn(...args) as ReturnType<T>;
  }, [fn, delay, maxRequests, windowMs]);

  return throttledFn as T;
}

export default useRequestThrottle;
