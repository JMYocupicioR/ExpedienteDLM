/**
 * Métricas de éxito para el dashboard del asistente médico.
 * Usadas para reportes y estrategia de despliegue por fases.
 */
export const ASSISTANT_METRICS = {
  /** Tiempo promedio de confirmación de citas (objetivo: < 24h) */
  APPOINTMENT_CONFIRMATION_TIME: 'appointment_confirmation_time_hours',

  /** Porcentaje de no_show semanal */
  WEEKLY_NO_SHOW_RATE: 'weekly_no_show_rate',

  /** Tiempo de espera en recepción (minutos) */
  RECEPTION_WAIT_TIME: 'reception_wait_time_minutes',

  /** Cobranza efectiva del día vs citas completadas */
  DAILY_COLLECTION_RATE: 'daily_collection_rate',

  /** Pendientes vencidos vs cerrados */
  PENDING_TASKS_CLOSURE_RATE: 'pending_tasks_closure_rate',
} as const;

/** Fases de implementación del dashboard asistente */
export const ASSISTANT_ROLLOUT_PHASES = {
  PHASE_1: 'quick_wins',
  PHASE_2: 'operacion_completa',
  PHASE_3: 'optimizacion',
} as const;
