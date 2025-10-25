import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar, Clock, Stethoscope, FileText, Heart,
  Activity, Thermometer, Weight, Ruler, Brain,
  ChevronDown, ChevronUp, Sparkles, FileEdit
} from 'lucide-react';
import type { Database, InterrogatorioStructuredData, PhysicalExaminationData } from '@/lib/database.types';
import ScaleAssessments from '@/components/ScaleAssessments';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationDetailsProps {
  consultation: Consultation;
}

export default function ConsultationDetails({ consultation }: ConsultationDetailsProps) {
  const vitalSigns = consultation.vital_signs as any || {};
  const physicalExam = (consultation.physical_examination as PhysicalExaminationData) || {};
  const interrogatorioStructured = (consultation as any).interrogatorio_structured as InterrogatorioStructuredData | undefined;

  // Estados para secciones expandibles
  const [interrogatorioExpanded, setInterrogatorioExpanded] = useState(true);
  const [exploracionExpanded, setExploracionExpanded] = useState(true);

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

    // Obtener el título de la sección
    const sectionTitle = sectionData.title || sectionKey.replace(/_/g, ' ');

    return (
      <div key={sectionKey} className="bg-gray-700 rounded-lg p-4">
        <h5 className="font-medium text-white mb-3">
          {sectionTitle}
        </h5>
        
        {/* Renderizar campos dinámicos */}
        <div className="space-y-3">
          {Object.entries(sectionData).map(([fieldKey, fieldValue]) => {
            // Saltar campos de metadatos
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

        {/* Observaciones específicas de la sección */}
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
    // Convertir snake_case a texto legible
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

      {/* Interrogatorio / Padecimiento Actual */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-white flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Interrogatorio / Padecimiento Actual
            {interrogatorioStructured?.capture_method === 'template' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Plantilla
              </span>
            )}
            {interrogatorioStructured?.capture_method === 'free_text' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                <FileEdit className="h-3 w-3 mr-1" />
                Estilo Libre
              </span>
            )}
          </h4>
          <button
            onClick={() => setInterrogatorioExpanded(!interrogatorioExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {interrogatorioExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        {interrogatorioExpanded && (
          <>
            {/* Si hay datos estructurados de plantilla */}
            {interrogatorioStructured?.template_name && interrogatorioStructured?.responses && (
              <div className="space-y-4 mb-4">
                <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-3 mb-3">
                  <p className="text-cyan-300 text-sm">
                    <strong>Plantilla utilizada:</strong> {interrogatorioStructured.template_name}
                  </p>
                  {interrogatorioStructured.completed_at && (
                    <p className="text-cyan-400 text-xs mt-1">
                      Completada: {format(new Date(interrogatorioStructured.completed_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  )}
                </div>

                {/* Renderizar respuestas estructuradas */}
                {Object.entries(interrogatorioStructured.responses).map(([sectionId, sectionResponses]) => {
                  if (!sectionResponses || Object.keys(sectionResponses).length === 0) return null;

                  return (
                    <div key={sectionId} className="bg-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-white mb-3 text-sm uppercase tracking-wide">
                        {sectionId.replace(/_/g, ' ')}
                      </h5>
                      <div className="space-y-2">
                        {Object.entries(sectionResponses).map(([fieldId, response]) => {
                          if (!response && response !== 0 && response !== false) return null;

                          const responseText = Array.isArray(response)
                            ? response.join(', ')
                            : typeof response === 'boolean'
                            ? response ? 'Sí' : 'No'
                            : String(response);

                          return (
                            <div key={fieldId} className="border-l-2 border-cyan-400 pl-3">
                              <div className="text-sm font-medium text-gray-300">
                                {fieldId.replace(/_/g, ' ')}:
                              </div>
                              <div className="text-sm text-white mt-0.5">
                                {responseText}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mostrar texto siempre (ya sea generado o escrito libre) */}
            {consultation.current_condition && (
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-300 whitespace-pre-wrap text-sm">
                  {consultation.current_condition}
                </p>
              </div>
            )}

            {!consultation.current_condition && !interrogatorioStructured?.responses && (
              <p className="text-gray-500 text-sm italic">No se registró interrogatorio</p>
            )}
          </>
        )}
      </div>

      {/* Signos Vitales */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3 flex items-center">
          <Stethoscope className="h-4 w-4 mr-2" />
          Signos Vitales
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Manejo especial para presión arterial - combinar sistólica y diastólica */}
          {(vitalSigns.systolic_pressure && vitalSigns.diastolic_pressure) ? (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center text-gray-400 mb-1">
                <Heart className="h-4 w-4 mr-1" />
                <span className="text-xs uppercase tracking-wide">Presión Arterial</span>
              </div>
              <p className="text-sm font-medium text-white">
                {vitalSigns.systolic_pressure}/{vitalSigns.diastolic_pressure} mmHg
              </p>
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
            // Saltar campos ya manejados o vacíos
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
              </div>
            );
          })}
        </div>
        
        {/* Mostrar si no hay signos vitales registrados */}
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
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-white flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Exploración Física
              {physicalExam.capture_method === 'template' && physicalExam.template_name && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-600 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {physicalExam.template_name}
                </span>
              )}
              {physicalExam.capture_method === 'free_text' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  <FileEdit className="h-3 w-3 mr-1" />
                  Estilo Libre
                </span>
              )}
            </h4>
            <button
              onClick={() => setExploracionExpanded(!exploracionExpanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {exploracionExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {exploracionExpanded && (
            <>
              {/* Si es texto libre, mostrar directamente */}
              {physicalExam.capture_method === 'free_text' && physicalExam.free_text && (
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">
                    {physicalExam.free_text}
                  </p>
                </div>
              )}

              {/* Si es plantilla, mostrar estructura */}
              {physicalExam.capture_method === 'template' && (
                <>
                  {/* Información general del examen */}
                  <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-400">
                    {physicalExam.exam_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Realizada el {format(new Date(physicalExam.exam_date), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {physicalExam.exam_time && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        a las {physicalExam.exam_time}
                      </div>
                    )}
                  </div>

                  {/* Signos vitales del examen físico */}
                  {physicalExam.vital_signs && Object.keys(physicalExam.vital_signs).length > 0 && (
                    <div className="mb-4 bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <h5 className="font-medium text-blue-300 mb-2">Signos Vitales del Examen</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(physicalExam.vital_signs).map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <div key={key} className="text-xs">
                              <span className="text-gray-400">{formatVitalSignLabel(key)}:</span>
                              <span className="text-white ml-1">{formatVitalSignValue(key, value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Secciones del examen */}
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

                  {/* Observaciones generales */}
                  {(physicalExam.general_observations || physicalExam.generalObservations) && (
                    <div className="mt-4 bg-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-white mb-2">Observaciones Generales</h5>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {physicalExam.general_observations || physicalExam.generalObservations}
                      </p>
                    </div>
                  )}

                  {/* Información de la plantilla utilizada */}
                  {physicalExam.template_id && (
                    <div className="mt-3 text-xs text-gray-500">
                      ID de plantilla: {physicalExam.template_id}
                    </div>
                  )}
                </>
              )}

              {/* Compatibilidad con formato antiguo (sin capture_method) */}
              {!physicalExam.capture_method && physicalExam.sections && (
                <div className="space-y-3">
                  {Object.entries(physicalExam.sections).map(([key, section]) =>
                    renderPhysicalExamSection(key, section)
                  )}
                </div>
              )}
            </>
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
