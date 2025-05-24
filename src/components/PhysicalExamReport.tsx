import React, { useRef } from 'react';
import { FileText, Download, Printer, Calendar, Clock, User, Activity } from 'lucide-react';

interface PhysicalExamReportProps {
  examData: {
    examDate: string;
    examTime: string;
    vitalSigns: {
      systolic_pressure: string;
      diastolic_pressure: string;
      heart_rate: string;
      respiratory_rate: string;
      temperature: string;
      oxygen_saturation: string;
      weight: string;
      height: string;
      bmi: string;
    };
    sections: Record<string, {
      title: string;
      isNormal: boolean | null;
      selectedFindings: string[];
      observations: string;
    }>;
    generalObservations: string;
  };
  patientData: {
    full_name: string;
    birth_date: string;
    gender: string;
    email?: string;
  };
  doctorData: {
    full_name: string;
    specialty?: string;
  };
  onGeneratePDF: () => void;
}

export default function PhysicalExamReport({ 
  examData, 
  patientData, 
  doctorData, 
  onGeneratePDF 
}: PhysicalExamReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getVitalSignsStatus = () => {
    const vitals = examData.vitalSigns;
    const systolic = parseInt(vitals.systolic_pressure);
    const diastolic = parseInt(vitals.diastolic_pressure);
    const heartRate = parseInt(vitals.heart_rate);
    const temperature = parseFloat(vitals.temperature);
    
    let alerts = [];
    
    // Blood pressure alerts
    if (systolic > 140 || diastolic > 90) {
      alerts.push({ type: 'warning', message: 'Presión arterial elevada' });
    } else if (systolic < 90 || diastolic < 60) {
      alerts.push({ type: 'warning', message: 'Presión arterial baja' });
    }
    
    // Heart rate alerts
    if (heartRate > 100) {
      alerts.push({ type: 'warning', message: 'Taquicardia' });
    } else if (heartRate < 60) {
      alerts.push({ type: 'info', message: 'Bradicardia' });
    }
    
    // Temperature alerts
    if (temperature > 37.5) {
      alerts.push({ type: 'warning', message: 'Fiebre' });
    } else if (temperature < 36) {
      alerts.push({ type: 'warning', message: 'Hipotermia' });
    }
    
    return alerts;
  };

  const vitalSignsAlerts = getVitalSignsStatus();

  return (
    <div className="bg-white">
      {/* Report Header */}
      <div className="border-b border-gray-200 p-6 flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reporte de Exploración Física</h2>
          <p className="text-sm text-gray-500 mt-1">
            Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={onGeneratePDF}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="p-8 max-w-4xl mx-auto print:p-4 print:max-w-none">
        {/* Header Information */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">REPORTE DE EXPLORACIÓN FÍSICA</h1>
          <div className="text-sm text-gray-600">
            <p>Sistema de Expedientes Médicos Digitales</p>
            <p>Fecha del reporte: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-6">
          <div className="bg-blue-50 p-4 rounded-lg print:bg-gray-100">
            <div className="flex items-center mb-3">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Información del Paciente</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Nombre:</span>
                <span>{patientData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Edad:</span>
                <span>{calculateAge(patientData.birth_date)} años</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Género:</span>
                <span className="capitalize">{patientData.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Fecha de Nacimiento:</span>
                <span>{formatDate(patientData.birth_date)}</span>
              </div>
              {patientData.email && (
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{patientData.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg print:bg-gray-100">
            <div className="flex items-center mb-3">
              <Activity className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Información del Examen</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Doctor:</span>
                <span>{doctorData.full_name}</span>
              </div>
              {doctorData.specialty && (
                <div className="flex justify-between">
                  <span className="font-medium">Especialidad:</span>
                  <span>{doctorData.specialty}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Fecha del Examen:</span>
                <span>{formatDate(examData.examDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Hora del Examen:</span>
                <span>{examData.examTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Signs */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-red-600" />
            Signos Vitales
          </h3>
          
          {/* Vital Signs Alerts */}
          {vitalSignsAlerts.length > 0 && (
            <div className="mb-4 p-3 border-l-4 border-yellow-400 bg-yellow-50 print:bg-gray-100">
              <h4 className="font-medium text-yellow-800 mb-2">Alertas Clínicas:</h4>
              <ul className="text-sm text-yellow-700">
                {vitalSignsAlerts.map((alert, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {examData.vitalSigns.systolic_pressure}/{examData.vitalSigns.diastolic_pressure}
              </div>
              <div className="text-sm text-gray-600">Presión Arterial (mmHg)</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{examData.vitalSigns.heart_rate}</div>
              <div className="text-sm text-gray-600">Frecuencia Cardíaca (lpm)</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{examData.vitalSigns.temperature}</div>
              <div className="text-sm text-gray-600">Temperatura (°C)</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{examData.vitalSigns.respiratory_rate}</div>
              <div className="text-sm text-gray-600">Frecuencia Respiratoria (rpm)</div>
            </div>
            {examData.vitalSigns.oxygen_saturation && (
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{examData.vitalSigns.oxygen_saturation}</div>
                <div className="text-sm text-gray-600">Saturación O₂ (%)</div>
              </div>
            )}
            {examData.vitalSigns.weight && (
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{examData.vitalSigns.weight}</div>
                <div className="text-sm text-gray-600">Peso (kg)</div>
              </div>
            )}
            {examData.vitalSigns.height && (
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-teal-600">{examData.vitalSigns.height}</div>
                <div className="text-sm text-gray-600">Altura (cm)</div>
              </div>
            )}
            {examData.vitalSigns.bmi && (
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{examData.vitalSigns.bmi}</div>
                <div className="text-sm text-gray-600">IMC</div>
              </div>
            )}
          </div>
        </div>

        {/* Physical Examination Sections */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Exploración Física por Sistemas</h3>
          
          <div className="space-y-6">
            {Object.entries(examData.sections).map(([sectionId, section]) => (
              <div key={sectionId} className="border rounded-lg p-4 print:border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-900">{section.title}</h4>
                  <div className="flex items-center">
                    {section.isNormal !== null && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        section.isNormal 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {section.isNormal ? 'Normal' : 'Anormal'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selected Findings */}
                {section.selectedFindings && section.selectedFindings.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Hallazgos Seleccionados:</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {section.selectedFindings.map((finding, index) => (
                        <li key={index}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Observations */}
                {section.observations && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Observaciones Detalladas:</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">{section.observations}</p>
                  </div>
                )}

                {/* Empty state */}
                {!section.selectedFindings?.length && !section.observations && (
                  <p className="text-sm text-gray-400 italic">No se registraron hallazgos específicos para este sistema.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General Observations */}
        {examData.generalObservations && (
          <div className="mb-8 print:mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Observaciones Generales</h3>
            <div className="bg-gray-50 p-4 rounded-lg print:bg-gray-100">
              <p className="text-gray-700 leading-relaxed">{examData.generalObservations}</p>
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8 print:mt-6 print:pt-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <p>Reporte generado automáticamente por el Sistema de Expedientes Médicos Digitales</p>
              <p>Este documento contiene información médica confidencial</p>
            </div>
            <div className="text-right">
              <p>Página 1 de 1</p>
              <p>{new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>
    </div>
  );
} 