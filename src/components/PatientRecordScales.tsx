import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Plus, Calendar, ChevronDown, ChevronUp, Trash2, Filter, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import { usePhysicalExam } from '../features/medical-records/hooks/usePhysicalExam';
import MedicalScalesPanel from './MedicalScalesPanel';
import { formatAssessmentDate, type ScaleAssessmentViewModel } from '@/features/medical-records/utils/scaleAssessmentViewModel';
import { buildScaleTimelineSummary, filterAssessmentsByTimeRange, type ScaleGroupBy, type ScaleTimeRange, type ScaleTrendDirection } from '@/features/medical-records/utils/scaleTimeline';
import { ScaleAssessmentDetailModal } from './ScaleAssessmentDetailModal';
import { useNavigate } from 'react-router-dom';

interface PatientRecordScalesProps {
  patientId: string;
  doctorId: string;
}

export default function PatientRecordScales({ patientId, doctorId }: PatientRecordScalesProps) {
  const navigate = useNavigate();
  const { getScaleAssessmentsByPatient, deleteScaleAssessment } = usePhysicalExam({ patientId, doctorId });
  const [assessments, setAssessments] = useState<ScaleAssessmentViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailAssessment, setDetailAssessment] = useState<ScaleAssessmentViewModel | null>(null);
  const [timeRange, setTimeRange] = useState<ScaleTimeRange>('30d');
  const [selectedScale, setSelectedScale] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<ScaleGroupBy>('month');

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getScaleAssessmentsByPatient(patientId);
      setAssessments(data);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [getScaleAssessmentsByPatient, patientId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const handleAssessmentSaved = () => {
    setShowNewAssessment(false);
    loadAssessments();
  };

  const toggleExpand = (id: string) => {
    setExpandedAssessmentId(prev => prev === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteScaleAssessment(id);
      await loadAssessments();
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting assessment:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const scaleOptions = useMemo(() => {
    const map = new Map<string, string>();
    assessments.forEach((assessment) => {
      map.set(assessment.scaleId, assessment.scaleName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assessments]);

  const severityOptions = useMemo(() => {
    const set = new Set(
      assessments
        .map((assessment) => assessment.severity)
        .filter((severity): severity is string => Boolean(severity))
    );
    return Array.from(set);
  }, [assessments]);

  const filteredByDate = useMemo(
    () => filterAssessmentsByTimeRange(assessments, timeRange),
    [assessments, timeRange]
  );

  const filteredAssessments = useMemo(() => {
    return filteredByDate.filter((assessment) => {
      const scaleMatch = selectedScale === 'all' || assessment.scaleId === selectedScale;
      const severityMatch = selectedSeverity === 'all' || assessment.severity === selectedSeverity;
      return scaleMatch && severityMatch;
    });
  }, [filteredByDate, selectedScale, selectedSeverity]);

  const timelineSummary = useMemo(
    () => buildScaleTimelineSummary(filteredAssessments, { groupBy, stableThreshold: 0.5 }),
    [filteredAssessments, groupBy]
  );

  const formatAnswerValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return value === null || value === undefined || value === '' ? 'Sin respuesta' : String(value);
  };

  const getTrendChip = (trend: ScaleTrendDirection, delta: number | null) => {
    if (trend === 'insufficient') {
      return <span className="text-xs text-gray-500 dark:text-gray-400">Sin comparativo</span>;
    }

    if (trend === 'stable') {
      return (
        <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-300">
          <Minus className="h-3 w-3 mr-1" /> Estable {delta !== null ? `(${delta.toFixed(1)})` : ''}
        </span>
      );
    }

    const isUp = trend === 'up';
    return (
      <span className={`inline-flex items-center text-xs ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
        {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {isUp ? 'Sube' : 'Baja'} {delta !== null ? `(${delta > 0 ? '+' : ''}${delta.toFixed(1)})` : ''}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
          <Activity className="mr-2 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          Historial de Escalas Médicas
        </h2>
        <button
          onClick={() => setShowNewAssessment(!showNewAssessment)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
        >
          {showNewAssessment ? 'Cancelar' : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Evaluación
            </>
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Filter className="h-4 w-4" />
          Filtros y resumen dinámico
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value as ScaleTimeRange)}
            className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
          </select>
          <select
            value={selectedScale}
            onChange={(event) => setSelectedScale(event.target.value)}
            className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="all">Todas las escalas</option>
            {scaleOptions.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSeverity}
            onChange={(event) => setSelectedSeverity(event.target.value)}
            className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="all">Todas las severidades</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <select
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as ScaleGroupBy)}
            className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="day">Agrupar por día</option>
            <option value="week">Agrupar por semana</option>
            <option value="month">Agrupar por mes</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Evaluaciones</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{timelineSummary.totalAssessments}</div>
          </div>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Escalas distintas</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{timelineSummary.distinctScales}</div>
          </div>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Última evaluación</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {timelineSummary.latestAssessment ? timelineSummary.latestAssessment.scaleName : 'Sin registros'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {timelineSummary.latestAssessment ? `${formatAssessmentDate(timelineSummary.latestAssessment.createdAt)} • ${timelineSummary.latestAssessment.doctorName || 'No disponible'}` : '-'}
            </div>
          </div>
        </div>

        {timelineSummary.byScale.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {timelineSummary.byScale.map((item) => (
              <div key={item.scaleId} className="rounded border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{item.scaleName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.totalSessions} sesiones • Última: {formatAssessmentDate(item.latestAt)}
                    </div>
                  </div>
                  {getTrendChip(item.trend, item.delta)}
                </div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Score actual: <span className="font-semibold">{item.latestScore ?? '-'}</span>
                  {item.latestSeverity ? ` • ${item.latestSeverity}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {timelineSummary.byPeriod.length > 0 && (
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Actividad por período</div>
            <div className="flex flex-wrap gap-2">
              {timelineSummary.byPeriod.map((period) => (
                <span key={period.periodKey} className="text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1">
                  {period.periodLabel}: {period.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showNewAssessment && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in-down mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Nueva Evaluación</h3>
          <MedicalScalesPanel 
            patientId={patientId} 
            doctorId={doctorId} 
            onAssessmentSaved={handleAssessmentSaved}
          />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando historial...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Activity className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No hay evaluaciones para los filtros seleccionados.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Ajusta los filtros o registra una nueva evaluación.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssessments.map((assessment) => (
              <div key={assessment.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(assessment.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-cyan-100 dark:bg-gray-700 p-2 rounded-full">
                      <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/expediente/${patientId}/escalas/${assessment.id}`);
                        }}
                        className="text-gray-900 dark:text-white font-medium hover:text-cyan-600 dark:hover:text-cyan-400 text-left"
                        title="Abrir detalle de esta sesión"
                      >
                        {assessment.scaleName}
                      </button>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatAssessmentDate(assessment.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Aplicada por: {assessment.doctorName || 'No disponible'}
                        {assessment.scaleVersion ? ` • v${assessment.scaleVersion}` : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Puntuación</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {typeof assessment.score === 'number' ? assessment.score : '-'}
                      </div>
                    </div>
                    
                    {assessment.severity && (
                      <div className="text-right hidden sm:block">
                        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Interpretación</div>
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 mt-1">
                          {assessment.severity}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailAssessment(assessment);
                      }}
                      className="p-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded transition-colors"
                      title="Ver sesión completa"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(assessment.id);
                      }}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Eliminar evaluación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    {expandedAssessmentId === assessment.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>
                
                {expandedAssessmentId === assessment.id && (
                  <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Respuestas</h4>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                          {assessment.answerDetails.length > 0 ? (
                            <div className="space-y-2">
                              {assessment.answerDetails.map((entry) => (
                                <div key={entry.questionId} className="border-l-2 border-cyan-200 dark:border-cyan-700 pl-2">
                                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{entry.questionText}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{entry.valueLabel}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Sin detalles de respuestas</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Interpretación Clínica</h4>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                          {(assessment.clinicalSummary || assessment.recommendationList.length > 0 || assessment.interpretation) ? (
                            <div className="space-y-3">
                              {assessment.clinicalSummary && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {assessment.clinicalSummary}
                                  </p>
                                </div>
                              )}
                              
                              {assessment.recommendationList.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Recomendaciones:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {assessment.recommendationList.map((rec: string, idx: number) => (
                                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                <div>Registrado: {formatAssessmentDate(assessment.createdAt)}</div>
                                <div>Médico: {assessment.doctorName || 'No disponible'}</div>
                                {assessment.evaluatedAt && <div>Evaluado: {formatAssessmentDate(assessment.evaluatedAt)}</div>}
                                {assessment.scaleVersion && <div>Versión de escala: {assessment.scaleVersion}</div>}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Sin interpretación disponible</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Confirmation Dialog */}
                {confirmDeleteId === assessment.id && (
                  <div className="px-4 pb-4 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                    <div className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm text-red-800 dark:text-red-200 font-medium">
                          ¿Eliminar esta evaluación?
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(assessment.id);
                          }}
                          disabled={deletingId === assessment.id}
                          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {deletingId === assessment.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {detailAssessment && (
        <ScaleAssessmentDetailModal
          assessment={detailAssessment}
          onClose={() => setDetailAssessment(null)}
        />
      )}
    </div>
  );
}

