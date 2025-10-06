import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, Clock, Stethoscope, FileText, Heart,
  Activity, Thermometer, Weight, Ruler, Brain, ArrowUp, ArrowDown, Minus, AlertTriangle
} from 'lucide-react';
import type { Database } from '@/lib/database.types';
import ScaleAssessments from '@/components/ScaleAssessments';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationDetailsEnhancedProps {
  consultation: Consultation;
  previousConsultation?: Consultation;
}

export default function ConsultationDetailsEnhanced({
  consultation,
  previousConsultation
}: ConsultationDetailsEnhancedProps) {
  const vitalSigns = consultation.vital_signs as any || {};
  const prevVitalSigns = previousConsultation?.vital_signs as any || {};
  const physicalExam = consultation.physical_examination as any || {};

  const daysSinceLastConsult = previousConsultation
    ? differenceInDays(new Date(consultation.created_at), new Date(previousConsultation.created_at))
    : null;

  const formatVitalSignLabel = (key: string): string => {
    const labels: Record<string, string> = {
      temperature: 'Temperatura',
      heart_rate: 'Frecuencia Cardíaca',
      blood_pressure: 'Presión Arterial',
      respiratory_rate: 'Frecuencia Respiratoria',
      oxygen_saturation: 'Saturación O₂',
      weight: 'Peso',
      height: 'Altura',
      systolic_pressure: 'Presión Sistólica',
      diastolic_pressure: 'Presión Diastólica',
      bmi: 'IMC'
    };
    return labels[key] || key.replace(/_/g, ' ');
  };

  const formatVitalSignValue = (key: string, value: any): string => {
    const units: Record<string, string> = {
      temperature: '°C',
      heart_rate: 'lpm',
      respiratory_rate: 'rpm',
      oxygen_saturation: '%',
      weight: 'kg',
      height: 'cm',
      systolic_pressure: 'mmHg',
      diastolic_pressure: 'mmHg'
    };

    if (value === null || value === undefined || value === '') return 'No registrado';
    return `${value}${units[key] ? ` ${units[key]}` : ''}`;
  };

  const getVitalSignIcon = (key: string) => {
    const icons: Record<string, React.ReactElement> = {
      temperature: <Thermometer className="h-4 w-4" />,
      heart_rate: <Heart className="h-4 w-4" />,
      respiratory_rate: <Activity className="h-4 w-4" />,
      weight: <Weight className="h-4 w-4" />,
      height: <Ruler className="h-4 w-4" />
    };
    return icons[key] || <Activity className="h-4 w-4" />;
  };

  const compareVitalSign = (key: string, current: any, previous: any) => {
    if (!previous || !current) return null;

    const currentVal = Number(current);
    const previousVal = Number(previous);

    if (isNaN(currentVal) || isNaN(previousVal)) return null;

    const diff = currentVal - previousVal;
    const percentChange = ((diff / previousVal) * 100).toFixed(1);

    if (Math.abs(diff) < 0.1) {
      return (
        <div className="flex items-center text-gray-400 text-xs">
          <Minus className="h-3 w-3 mr-1" />
          Sin cambios
        </div>
      );
    }

    const isIncrease = diff > 0;
    const isWarning =
      (key === 'temperature' && (currentVal > 37.5 || currentVal < 36)) ||
      (key === 'systolic_pressure' && (currentVal > 140 || currentVal < 90)) ||
      (key === 'diastolic_pressure' && (currentVal > 90 || currentVal < 60)) ||
      (key === 'heart_rate' && (currentVal > 100 || currentVal < 60));

    return (
      <div className={`flex items-center text-xs mt-1 ${isWarning ? 'text-yellow-400' : isIncrease ? 'text-green-400' : 'text-blue-400'}`}>
        {isIncrease ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
        {isIncrease ? '+' : ''}{diff.toFixed(1)} ({percentChange}%)
        {isWarning && <AlertTriangle className="h-3 w-3 ml-1" />}
      </div>
    );
  };

  const renderPhysicalExamSection = (sectionKey: string, sectionData: any) => {
    if (!sectionData || typeof sectionData !== 'object') return null;

    const sectionTitle = sectionData.title || sectionKey.replace(/_/g, ' ');

    return (
      <div key={sectionKey} className="bg-gray-700 rounded-lg p-4">
        <h5 className="font-medium text-white mb-3">
          {sectionTitle}
        </h5>

        <div className="space-y-3">
          {Object.entries(sectionData).map(([fieldKey, fieldValue]) => {
            if (['title', 'description', 'order'].includes(fieldKey)) return null;
            if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) return null;

            return (
              <div key={fieldKey} className="border-l-2 border-blue-400 pl-3">
                <div className="text-sm font-medium text-gray-300 mb-1">
                  {formatFieldLabel(fieldKey)}
                </div>
                <div className="text-sm text-white">
                  {formatFieldValue(fieldValue)}
                </div>
              </div>
            );
          })}
        </div>

        {sectionData.observations && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-sm font-medium text-gray-300 mb-1">Observaciones:</div>
            <p className="text-sm text-gray-400">{sectionData.observations}</p>
          </div>
        )}
      </div>
    );
  };

  const formatFieldLabel = (fieldKey: string): string => {
    return fieldKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Header Info con comparación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(consultation.created_at), "d 'de' MMMM, yyyy", { locale: es })}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {format(new Date(consultation.created_at), "HH:mm", { locale: es })}
          </div>
          {daysSinceLastConsult !== null && (
            <div className="flex items-center bg-blue-900/40 px-2 py-1 rounded">
              <Activity className="h-3 w-3 mr-1 text-blue-300" />
              <span className="text-blue-300">
                {daysSinceLastConsult} días desde última consulta
              </span>
            </div>
          )}
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Completada
        </span>
      </div>

      {/* Padecimiento Actual */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Padecimiento Actual
        </h4>
        <p className="text-gray-300 whitespace-pre-wrap">{consultation.current_condition}</p>
      </div>

      {/* Signos Vitales con comparación */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3 flex items-center">
          <Stethoscope className="h-4 w-4 mr-2" />
          Signos Vitales
          {previousConsultation && (
            <span className="ml-2 text-xs text-gray-400">(comparado con consulta anterior)</span>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Presión arterial */}
          {(vitalSigns.systolic_pressure && vitalSigns.diastolic_pressure) ? (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center text-gray-400 mb-1">
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-xs uppercase tracking-wide">Presión Arterial</span>
              </div>
              <p className="text-sm font-medium text-white">
                {vitalSigns.systolic_pressure}/{vitalSigns.diastolic_pressure} mmHg
              </p>
              {previousConsultation && (
                <>
                  {compareVitalSign('systolic_pressure', vitalSigns.systolic_pressure, prevVitalSigns.systolic_pressure)}
                  {compareVitalSign('diastolic_pressure', vitalSigns.diastolic_pressure, prevVitalSigns.diastolic_pressure)}
                </>
              )}
            </div>
          ) : vitalSigns.blood_pressure && (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center text-gray-400 mb-1">
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-xs uppercase tracking-wide">Presión Arterial</span>
              </div>
              <p className="text-sm font-medium text-white">{vitalSigns.blood_pressure}</p>
            </div>
          )}

          {/* Otros signos vitales */}
          {Object.entries(vitalSigns).map(([key, value]) => {
            if (['blood_pressure', 'systolic_pressure', 'diastolic_pressure'].includes(key) || !value) return null;

            return (
              <div key={key} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center text-gray-400 mb-1">
                  {getVitalSignIcon(key)}
                  <span className="text-xs uppercase tracking-wide ml-1">
                    {formatVitalSignLabel(key)}
                  </span>
                </div>
                <p className="text-sm font-medium text-white">
                  {formatVitalSignValue(key, value)}
                </p>
                {previousConsultation && compareVitalSign(key, value, prevVitalSigns[key])}
              </div>
            );
          })}
        </div>

        {(!vitalSigns || Object.keys(vitalSigns).length === 0) && (
          <div className="text-center py-6 text-gray-400">
            <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se registraron signos vitales</p>
          </div>
        )}
      </div>

      {/* Exploración Física */}
      {physicalExam && Object.keys(physicalExam).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            Exploración Física
            {physicalExam.template_name && (
              <span className="ml-2 text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded">
                {physicalExam.template_name}
              </span>
            )}
          </h4>

          {physicalExam.sections && Object.keys(physicalExam.sections).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(physicalExam.sections).map(([key, section]) =>
                renderPhysicalExamSection(key, section)
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se registraron datos de exploración específicos</p>
            </div>
          )}

          {(physicalExam.general_observations || physicalExam.generalObservations) && (
            <div className="mt-4 bg-gray-700 rounded-lg p-4">
              <h5 className="font-medium text-white mb-2">Observaciones Generales</h5>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {physicalExam.general_observations || physicalExam.generalObservations}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Diagnóstico y Tratamiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-white mb-2">Diagnóstico</h4>
          <p className="text-gray-300 whitespace-pre-wrap">{consultation.diagnosis}</p>
        </div>

        {consultation.prognosis && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Pronóstico</h4>
            <p className="text-gray-300 whitespace-pre-wrap">{consultation.prognosis}</p>
          </div>
        )}
      </div>

      {/* Tratamiento */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2">Tratamiento</h4>
        <p className="text-gray-300 whitespace-pre-wrap">{consultation.treatment}</p>
      </div>

      {/* Escalas médicas asociadas */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3 flex items-center">
          <Activity className="h-4 w-4 mr-2" /> Escalas Médicas
        </h4>
        <ScaleAssessments consultationId={consultation.id} />
      </div>
    </div>
  );
}
