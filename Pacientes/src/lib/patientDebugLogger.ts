type PatientLogLevel = 'info' | 'warn' | 'error';

export type PatientDebugLog = {
  id: string;
  ts: string;
  level: PatientLogLevel;
  event: string;
  details?: Record<string, unknown>;
};

const STORAGE_KEY = 'patient_portal_debug_logs';
const MAX_LOGS = 200;

const isBrowser = typeof window !== 'undefined';

function shouldPrintLogs() {
  if (!isBrowser) return false;
  if (import.meta.env.DEV) return true;
  return window.localStorage.getItem('patient_debug_enabled') === '1';
}

function readLogs(): PatientDebugLog[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PatientDebugLog[];
  } catch {
    return [];
  }
}

function writeLogs(logs: PatientDebugLog[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
}

export function setPatientDebugEnabled(enabled: boolean) {
  if (!isBrowser) return;
  window.localStorage.setItem('patient_debug_enabled', enabled ? '1' : '0');
}

export function isPatientDebugEnabled() {
  if (!isBrowser) return false;
  return window.localStorage.getItem('patient_debug_enabled') === '1' || import.meta.env.DEV;
}

export function getPatientDebugLogs() {
  return readLogs();
}

export function clearPatientDebugLogs() {
  writeLogs([]);
}

export function patientLog(level: PatientLogLevel, event: string, details?: Record<string, unknown>) {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const entry: PatientDebugLog = {
    id,
    ts: new Date().toISOString(),
    level,
    event,
    details,
  };

  const next = [...readLogs(), entry];
  writeLogs(next);

  if (shouldPrintLogs()) {
    const payload = details ? { event, ...details } : { event };
    const line = `[PatientPortal] ${event}${details ? ` | ${JSON.stringify(details)}` : ''}`;
    if (level === 'error') {
      console.error(line, payload);
    } else if (level === 'warn') {
      console.warn(line, payload);
    } else {
      console.info(line, payload);
    }
  }
}

