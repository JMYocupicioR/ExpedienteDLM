import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationTimelineProps {
  consultations: Consultation[];
  onConsultationClick?: (consultation: Consultation) => void;
}

export default function ConsultationTimeline({ consultations, onConsultationClick }: ConsultationTimelineProps) {
  if (consultations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
        <Calendar className="mx-auto h-12 w-12 text-gray-500 mb-3" />
        <p className="text-gray-400">No hay consultas registradas</p>
      </div>
    );
  }

  const getTimelineIcon = (index: number) => {
    if (index === 0) return <TrendingUp className="h-5 w-5 text-green-400" />;
    if (index === consultations.length - 1) return <Calendar className="h-5 w-5 text-blue-400" />;
    return <Activity className="h-5 w-5 text-purple-400" />;
  };

  const getCardColor = (index: number) => {
    if (index === 0) return 'border-green-500 bg-green-900/20';
    if (index === consultations.length - 1) return 'border-blue-500 bg-blue-900/20';
    return 'border-gray-600 bg-gray-750';
  };

  return (
    <div className="space-y-4">
      {consultations.map((consultation, index) => {
        const consultDate = new Date(consultation.created_at);
        const vitalSigns = (consultation.vital_signs as any) || {};

        return (
          <div key={consultation.id} className="relative">
            {/* Línea vertical de conexión */}
            {index !== consultations.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 opacity-30" />
            )}

            <div
              className={`relative flex gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${getCardColor(index)}`}
              onClick={() => onConsultationClick?.(consultation)}
            >
              {/* Icono de timeline */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                  {getTimelineIcon(index)}
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {consultation.diagnosis || 'Sin diagnóstico'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(consultDate, "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(consultDate, "HH:mm", { locale: es })}
                      </div>
                    </div>
                  </div>

                  {index === 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                      Más reciente
                    </span>
                  )}
                </div>

                {/* Padecimiento actual (preview) */}
                {consultation.current_condition && (
                  <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                    {consultation.current_condition}
                  </p>
                )}

                {/* Signos vitales resumidos */}
                <div className="flex flex-wrap gap-2">
                  {vitalSigns.temperature && (
                    <span className="px-2 py-1 bg-red-900/40 text-red-200 text-xs rounded">
                      🌡️ {vitalSigns.temperature}°C
                    </span>
                  )}
                  {(vitalSigns.systolic_pressure && vitalSigns.diastolic_pressure) && (
                    <span className="px-2 py-1 bg-blue-900/40 text-blue-200 text-xs rounded">
                      💓 {vitalSigns.systolic_pressure}/{vitalSigns.diastolic_pressure} mmHg
                    </span>
                  )}
                  {vitalSigns.heart_rate && (
                    <span className="px-2 py-1 bg-pink-900/40 text-pink-200 text-xs rounded">
                      ❤️ {vitalSigns.heart_rate} lpm
                    </span>
                  )}
                  {vitalSigns.weight && (
                    <span className="px-2 py-1 bg-purple-900/40 text-purple-200 text-xs rounded">
                      ⚖️ {vitalSigns.weight} kg
                    </span>
                  )}
                </div>

                {/* Tratamiento (preview) */}
                {consultation.treatment && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Tratamiento:</p>
                    <p className="text-sm text-gray-300 line-clamp-1">{consultation.treatment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
