import { subDays, startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import type { ScaleAssessmentViewModel } from './scaleAssessmentViewModel';

export type ScaleTimeRange = '7d' | '30d' | '90d' | 'all';
export type ScaleGroupBy = 'day' | 'week' | 'month';
export type ScaleTrendDirection = 'up' | 'down' | 'stable' | 'insufficient';

export interface ScaleTimelinePoint {
  date: string;
  score: number | null;
  severity: string | null;
  doctorName: string | null;
}

export interface ScaleSummaryByScale {
  scaleId: string;
  scaleName: string;
  totalSessions: number;
  latestScore: number | null;
  previousScore: number | null;
  delta: number | null;
  trend: ScaleTrendDirection;
  latestAt: string;
  latestDoctorName: string | null;
  latestSeverity: string | null;
}

export interface ScalePeriodSummary {
  periodKey: string;
  periodLabel: string;
  count: number;
}

export interface ScaleTimelineSummary {
  totalAssessments: number;
  distinctScales: number;
  latestAssessment: ScaleAssessmentViewModel | null;
  byScale: ScaleSummaryByScale[];
  byPeriod: ScalePeriodSummary[];
}

const getRangeStartDate = (range: ScaleTimeRange, now = new Date()): Date | null => {
  if (range === 'all') return null;
  if (range === '7d') return subDays(now, 7);
  if (range === '30d') return subDays(now, 30);
  return subDays(now, 90);
};

export const filterAssessmentsByTimeRange = (
  assessments: ScaleAssessmentViewModel[],
  range: ScaleTimeRange
): ScaleAssessmentViewModel[] => {
  const start = getRangeStartDate(range);
  if (!start) return assessments;

  return assessments.filter((assessment) => {
    const date = new Date(assessment.createdAt);
    return !Number.isNaN(date.getTime()) && date >= start;
  });
};

const getPeriodKey = (date: Date, groupBy: ScaleGroupBy): string => {
  if (groupBy === 'day') return format(startOfDay(date), 'yyyy-MM-dd');
  if (groupBy === 'week') return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return format(startOfMonth(date), 'yyyy-MM');
};

const getTrend = (
  latestScore: number | null,
  previousScore: number | null,
  stableThreshold: number
): { trend: ScaleTrendDirection; delta: number | null } => {
  if (latestScore === null || previousScore === null) {
    return { trend: 'insufficient', delta: null };
  }

  const delta = latestScore - previousScore;
  if (Math.abs(delta) <= stableThreshold) {
    return { trend: 'stable', delta };
  }

  return { trend: delta > 0 ? 'up' : 'down', delta };
};

export const buildScaleTimelineSummary = (
  assessments: ScaleAssessmentViewModel[],
  options?: {
    groupBy?: ScaleGroupBy;
    stableThreshold?: number;
  }
): ScaleTimelineSummary => {
  const stableThreshold = options?.stableThreshold ?? 0.5;
  const groupBy = options?.groupBy ?? 'month';
  const sorted = [...assessments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const byScaleMap = new Map<string, ScaleAssessmentViewModel[]>();
  const byPeriodMap = new Map<string, number>();

  sorted.forEach((assessment) => {
    const key = assessment.scaleId;
    const list = byScaleMap.get(key) || [];
    list.push(assessment);
    byScaleMap.set(key, list);

    const date = new Date(assessment.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const periodKey = getPeriodKey(date, groupBy);
      byPeriodMap.set(periodKey, (byPeriodMap.get(periodKey) || 0) + 1);
    }
  });

  const byScale: ScaleSummaryByScale[] = Array.from(byScaleMap.entries()).map(([scaleId, list]) => {
    const latest = list[0];
    const previousWithScore = list.slice(1).find((item) => item.score !== null) || null;
    const { trend, delta } = getTrend(latest.score, previousWithScore?.score ?? null, stableThreshold);

    return {
      scaleId,
      scaleName: latest.scaleName,
      totalSessions: list.length,
      latestScore: latest.score,
      previousScore: previousWithScore?.score ?? null,
      delta,
      trend,
      latestAt: latest.createdAt,
      latestDoctorName: latest.doctorName,
      latestSeverity: latest.severity
    };
  });

  byScale.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());

  const byPeriod = Array.from(byPeriodMap.entries())
    .map(([periodKey, count]) => ({
      periodKey,
      periodLabel: periodKey,
      count
    }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));

  return {
    totalAssessments: sorted.length,
    distinctScales: byScale.length,
    latestAssessment: sorted[0] || null,
    byScale,
    byPeriod
  };
};
