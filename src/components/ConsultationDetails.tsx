import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, Clock, Stethoscope, FileText, Heart, 
  Activity, Thermometer, Weight, Ruler, Brain 
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationDetailsProps {
  consultation: Consultation;
}

export default function ConsultationDetails({ consultation }: ConsultationDetailsProps) {
  const vitalSigns = consultation.vital_signs as any || {};
  const physicalExam = consultation.physical_examination as any || {};

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

  const renderPhysicalExamSection = (sectionKey: string, sectionData: any) => {
    if (!sectionData || typeof sectionData !== 'object') return null;

    const sectionLabels: Record<string, string> = {
      head_neck: 'Cabeza y Cuello',
      chest_lungs: 'Tórax y Pulmones',
      cardiovascular: 'Sistema Cardiovascular',
      abdomen: 'Abdomen',
      extremities: 'Extremidades',
      musculoskeletal: 'Sistema Músculo-esquelético',
      skin: 'Piel y Anexos',
      neurological: 'Sistema Neurológico',
      genitourinary: 'Sistema Genitourinario'
    };

    return (
      <div key={sectionKey} className="bg-gray-700 rounded-lg p-4">
        <h5 className="font-medium text-white mb-2">
          {sectionLabels[sectionKey] || sectionKey}
        </h5>
        {sectionData.findings && (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">
            {sectionData.findings}
          </p>
        )}
        {sectionData.observations && (
          <p className="text-sm text-gray-400 mt-2">
            <span className="font-medium">Observaciones:</span> {sectionData.observations}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
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

      {/* Signos Vitales */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3 flex items-center">
          <Stethoscope className="h-4 w-4 mr-2" />
          Signos Vitales
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Manejo especial para presión arterial */}
          {vitalSigns.blood_pressure && (
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
            if (key === 'blood_pressure' || !value) return null;
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Exploración Física */}
      {physicalExam && Object.keys(physicalExam).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            Exploración Física
          </h4>
          
          {/* Información general del examen */}
          {physicalExam.examDate && (
            <div className="mb-4 text-sm text-gray-400">
              Realizada el {physicalExam.examDate} a las {physicalExam.examTime}
            </div>
          )}

          {/* Secciones del examen */}
          {physicalExam.sections && (
            <div className="space-y-3">
              {Object.entries(physicalExam.sections).map(([key, section]) => 
                renderPhysicalExamSection(key, section)
              )}
            </div>
          )}

          {/* Observaciones generales */}
          {physicalExam.generalObservations && (
            <div className="mt-4 bg-gray-700 rounded-lg p-4">
              <h5 className="font-medium text-white mb-2">Observaciones Generales</h5>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {physicalExam.generalObservations}
              </p>
            </div>
          )}

          {/* Si no hay secciones pero hay datos */}
          {!physicalExam.sections && Object.keys(physicalExam).length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(physicalExam, null, 2)}
              </pre>
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
    </div>
  );
} 