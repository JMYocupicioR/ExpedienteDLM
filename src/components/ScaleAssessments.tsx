import React, { useEffect, useState } from 'react';
import { Activity, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import {
  fetchScaleAssessmentsByConsultation,
  formatAssessmentDate,
  type ScaleAssessmentViewModel
} from '@/features/medical-records/utils/scaleAssessmentViewModel';

interface ScaleAssessmentsProps {
  consultationId: string;
}

export default function ScaleAssessments({ consultationId }: ScaleAssessmentsProps) {
  const [items, setItems] = useState<ScaleAssessmentViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchScaleAssessmentsByConsultation(consultationId);
        setItems(data || []);
      } catch (e) {
        // Error log removed for security;
      } finally {
        setLoading(false);
      }
    })();
  }, [consultationId]);

  if (loading) {
    return (
      <div className="text-gray-400">Cargando escalas...</div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay evaluaciones de escalas registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(row => (
        <div key={row.id} className="bg-gray-700 rounded p-3">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
          >
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-cyan-400 mr-2" />
              <div>
                <div className="text-white text-sm font-medium">{row.scaleName}</div>
                <div className="text-xs text-gray-400">{formatAssessmentDate(row.createdAt)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-300">
                {typeof row.score === 'number' && (
                  <span className="text-white font-semibold">{row.score}</span>
                )}
                {row.severity && (
                  <span className="ml-3 text-xs border border-gray-600 rounded px-2 py-0.5">{row.severity}</span>
                )}
              </div>
              {expandedId === row.id ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {expandedId === row.id && (
            <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
              <div className="text-xs text-gray-300">Médico aplicador: {row.doctorName || 'No disponible'}</div>
              <div className="text-xs text-gray-300">Fecha y hora: {formatAssessmentDate(row.createdAt)}</div>
              {row.scaleVersion && <div className="text-xs text-gray-300">Versión de escala: {row.scaleVersion}</div>}
              {row.interpretation?.clinical_significance && (
                <div className="text-xs text-gray-200">
                  Interpretación: {row.interpretation.clinical_significance}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


