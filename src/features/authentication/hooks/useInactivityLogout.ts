/**
 * HIPAA Compliance: Auto-logoff after inactivity
 * 
 * Monitors user activity (mouse, keyboard, touch, scroll) and automatically
 * signs out the user after 15 minutes of inactivity, with a 2-minute warning.
 * 
 * Required by HIPAA Security Rule § 164.312(a)(2)(iii) - Automatic Logoff
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000;      // Show warning 2 min before logout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const THROTTLE_MS = 30_000; // Only update activity timestamp every 30s to avoid overhead

export interface InactivityState {
  /** Whether the warning modal should be displayed */
  showWarning: boolean;
  /** Seconds remaining before automatic logout */
  secondsRemaining: number;
  /** Call this to reset the timer (user clicked "Stay Logged In") */
  resetTimer: () => void;
  /** Call this to immediately log out */
  logoutNow: () => void;
}

export function useInactivityLogout(isAuthenticated: boolean): InactivityState {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttleRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    logoutTimerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const performLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // Force reload on sign-out failure to clear session
      window.location.href = '/auth?reason=inactivity';
    }
  }, [clearAllTimers]);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    // Set warning timer (fires 2 min before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(WARNING_BEFORE_MS / 1000);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set actual logout timer (fires after full 15 min)
    logoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearAllTimers, performLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    startTimers();
  }, [startTimers]);

  const logoutNow = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity updates to avoid performance overhead
      if (now - throttleRef.current < THROTTLE_MS) return;
      throttleRef.current = now;
      lastActivityRef.current = now;

      // Only reset timers if warning is NOT already showing
      // (if warning is showing, user must explicitly click "Stay")
      if (!showWarning) {
        startTimers();
      }
    };

    // Start initial timer
    startTimers();

    // Attach activity listeners
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearAllTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [isAuthenticated, showWarning, startTimers, clearAllTimers]);

  return { showWarning, secondsRemaining, resetTimer, logoutNow };
}
