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

  // ✅ NUEVO: Enhanced PDF generation
  const handleGeneratePDF = async () => {
    try {
      const content = generateReportContent();
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Exploración Física - ${patientData.full_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #333;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
              margin-bottom: 20px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px;
            }
            .info-box { 
              border: 1px solid #ddd; 
              padding: 10px; 
              border-radius: 5px;
            }
            .vitals-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 10px; 
              margin-bottom: 20px;
            }
            .vital-card { 
              text-align: center; 
              border: 1px solid #ddd; 
              padding: 10px; 
              border-radius: 5px;
            }
            .section { 
              margin-bottom: 15px; 
              border: 1px solid #ddd; 
              padding: 10px; 
              border-radius: 5px;
            }
            .alert { 
              background: #fff3cd; 
              border: 1px solid #ffeaa7; 
              padding: 10px; 
              margin-bottom: 15px; 
              border-radius: 5px;
            }
            .footer { 
              border-top: 1px solid #333; 
              padding-top: 10px; 
              margin-top: 20px; 
              font-size: 12px; 
              color: #666;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_exploracion_fisica_${patientData.full_name.replace(/\s+/g, '_')}_${examData.examDate}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onGeneratePDF();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const generateReportContent = () => {
    const vitalSignsAlerts = getVitalSignsStatus();
    
    return `
      <div class="header">
        <h1>REPORTE DE EXPLORACIÓN FÍSICA</h1>
        <p>Sistema de Expedientes Médicos Digitales</p>
        <p>Fecha del reporte: ${formatDate(new Date().toISOString())}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Información del Paciente</h3>
          <p><strong>Nombre:</strong> ${patientData.full_name}</p>
          <p><strong>Edad:</strong> ${calculateAge(patientData.birth_date)} años</p>
          <p><strong>Género:</strong> ${patientData.gender}</p>
          <p><strong>Fecha de Nacimiento:</strong> ${formatDate(patientData.birth_date)}</p>
          ${patientData.email ? `<p><strong>Email:</strong> ${patientData.email}</p>` : ''}
        </div>

        <div class="info-box">
          <h3>Información del Examen</h3>
          <p><strong>Doctor:</strong> ${doctorData.full_name}</p>
          ${doctorData.specialty ? `<p><strong>Especialidad:</strong> ${doctorData.specialty}</p>` : ''}
          <p><strong>Fecha del Examen:</strong> ${formatDate(examData.examDate)}</p>
          <p><strong>Hora del Examen:</strong> ${examData.examTime}</p>
        </div>
      </div>

      <h3>Signos Vitales</h3>
      
      ${vitalSignsAlerts.length > 0 ? `
        <div class="alert">
          <h4>Alertas Clínicas:</h4>
          <ul>
            ${vitalSignsAlerts.map(alert => `<li>${alert.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="vitals-grid">
        <div class="vital-card">
          <div style="font-size: 18px; font-weight: bold; color: #007bff;">
            ${examData.vitalSigns.systolic_pressure}/${examData.vitalSigns.diastolic_pressure}
          </div>
          <div style="font-size: 12px;">Presión Arterial (mmHg)</div>
        </div>
        <div class="vital-card">
          <div style="font-size: 18px; font-weight: bold; color: #dc3545;">${examData.vitalSigns.heart_rate}</div>
          <div style="font-size: 12px;">Frecuencia Cardíaca (lpm)</div>
        </div>
        <div class="vital-card">
          <div style="font-size: 18px; font-weight: bold; color: #ffc107;">${examData.vitalSigns.temperature}</div>
          <div style="font-size: 12px;">Temperatura (°C)</div>
        </div>
        <div class="vital-card">
          <div style="font-size: 18px; font-weight: bold; color: #28a745;">${examData.vitalSigns.respiratory_rate}</div>
          <div style="font-size: 12px;">Frecuencia Respiratoria (rpm)</div>
        </div>
        ${examData.vitalSigns.oxygen_saturation ? `
          <div class="vital-card">
            <div style="font-size: 18px; font-weight: bold; color: #6f42c1;">${examData.vitalSigns.oxygen_saturation}</div>
            <div style="font-size: 12px;">Saturación O₂ (%)</div>
          </div>
        ` : ''}
        ${examData.vitalSigns.weight ? `
          <div class="vital-card">
            <div style="font-size: 18px; font-weight: bold; color: #17a2b8;">${examData.vitalSigns.weight}</div>
            <div style="font-size: 12px;">Peso (kg)</div>
          </div>
        ` : ''}
        ${examData.vitalSigns.height ? `
          <div class="vital-card">
            <div style="font-size: 18px; font-weight: bold; color: #20c997;">${examData.vitalSigns.height}</div>
            <div style="font-size: 12px;">Altura (cm)</div>
          </div>
        ` : ''}
        ${examData.vitalSigns.bmi ? `
          <div class="vital-card">
            <div style="font-size: 18px; font-weight: bold; color: #e83e8c;">${examData.vitalSigns.bmi}</div>
            <div style="font-size: 12px;">IMC</div>
          </div>
        ` : ''}
      </div>

      <h3>Exploración Física por Sistemas</h3>
      
      ${Object.entries(examData.sections).map(([sectionId, section]) => `
        <div class="section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4>${section.title}</h4>
            ${section.isNormal !== null ? `
              <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; ${
                section.isNormal 
                  ? 'background: #d4edda; color: #155724;' 
                  : 'background: #f8d7da; color: #721c24;'
              }">
                ${section.isNormal ? 'Normal' : 'Anormal'}
              </span>
            ` : ''}
          </div>

          ${section.selectedFindings && section.selectedFindings.length > 0 ? `
            <div style="margin-bottom: 10px;">
              <h5 style="font-size: 14px; margin-bottom: 5px;">Hallazgos Seleccionados:</h5>
              <ul style="margin: 0; padding-left: 20px;">
                ${section.selectedFindings.map(finding => `<li style="font-size: 12px;">${finding}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${section.observations ? `
            <div>
              <h5 style="font-size: 14px; margin-bottom: 5px;">Observaciones Detalladas:</h5>
              <p style="font-size: 12px; line-height: 1.4;">${section.observations}</p>
            </div>
          ` : ''}

          ${!section.selectedFindings?.length && !section.observations ? `
            <p style="font-size: 12px; color: #666; font-style: italic;">No se registraron hallazgos específicos para este sistema.</p>
          ` : ''}
        </div>
      `).join('')}

      ${examData.generalObservations ? `
        <h3>Observaciones Generales</h3>
        <div class="section">
          <p style="line-height: 1.4;">${examData.generalObservations}</p>
        </div>
      ` : ''}

      <div class="footer">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <p>Reporte generado automáticamente por el Sistema de Expedientes Médicos Digitales</p>
            <p>Este documento contiene información médica confidencial</p>
          </div>
          <div style="text-align: right;">
            <p>Página 1 de 1</p>
            <p>${new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </div>
    `;
  };

  const vitalSignsAlerts = getVitalSignsStatus();

  return (
    <div className="bg-gray-800 text-white">
      {/* Report Header */}
      <div className="border-b border-gray-700 p-6 flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white">Reporte de Exploración Física</h2>
          <p className="text-sm text-gray-400 mt-1">
            Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handleGeneratePDF}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
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
          <h1 className="text-3xl font-bold text-white mb-2">REPORTE DE EXPLORACIÓN FÍSICA</h1>
          <div className="text-sm text-gray-400">
            <p>Sistema de Expedientes Médicos Digitales</p>
            <p>Fecha del reporte: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-6">
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <User className="h-5 w-5 text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Información del Paciente</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Nombre:</span>
                <span className="text-white">{patientData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Edad:</span>
                <span className="text-white">{calculateAge(patientData.birth_date)} años</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Género:</span>
                <span className="text-white capitalize">{patientData.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Fecha de Nacimiento:</span>
                <span className="text-white">{formatDate(patientData.birth_date)}</span>
              </div>
              {patientData.email && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-300">Email:</span>
                  <span className="text-white">{patientData.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <Activity className="h-5 w-5 text-green-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Información del Examen</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Doctor:</span>
                <span className="text-white">{doctorData.full_name}</span>
              </div>
              {doctorData.specialty && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-300">Especialidad:</span>
                  <span className="text-white">{doctorData.specialty}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Fecha del Examen:</span>
                <span className="text-white">{formatDate(examData.examDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Hora del Examen:</span>
                <span className="text-white">{examData.examTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Signs */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-red-400" />
            Signos Vitales
          </h3>
          
          {/* Vital Signs Alerts */}
          {vitalSignsAlerts.length > 0 && (
            <div className="mb-4 p-3 border-l-4 border-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded">
              <h4 className="font-medium text-yellow-300 mb-2">Alertas Clínicas:</h4>
              <ul className="text-sm text-yellow-200">
                {vitalSignsAlerts.map((alert, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
              <div className="text-2xl font-bold text-blue-400">
                {examData.vitalSigns.systolic_pressure}/{examData.vitalSigns.diastolic_pressure}
              </div>
              <div className="text-sm text-gray-300">Presión Arterial (mmHg)</div>
            </div>
            <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
              <div className="text-2xl font-bold text-red-400">{examData.vitalSigns.heart_rate}</div>
              <div className="text-sm text-gray-300">Frecuencia Cardíaca (lpm)</div>
            </div>
            <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
              <div className="text-2xl font-bold text-yellow-400">{examData.vitalSigns.temperature}</div>
              <div className="text-sm text-gray-300">Temperatura (°C)</div>
            </div>
            <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
              <div className="text-2xl font-bold text-green-400">{examData.vitalSigns.respiratory_rate}</div>
              <div className="text-sm text-gray-300">Frecuencia Respiratoria (rpm)</div>
            </div>
            {examData.vitalSigns.oxygen_saturation && (
              <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
                <div className="text-2xl font-bold text-purple-400">{examData.vitalSigns.oxygen_saturation}</div>
                <div className="text-sm text-gray-300">Saturación O₂ (%)</div>
              </div>
            )}
            {examData.vitalSigns.weight && (
              <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
                <div className="text-2xl font-bold text-indigo-400">{examData.vitalSigns.weight}</div>
                <div className="text-sm text-gray-300">Peso (kg)</div>
              </div>
            )}
            {examData.vitalSigns.height && (
              <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
                <div className="text-2xl font-bold text-teal-400">{examData.vitalSigns.height}</div>
                <div className="text-sm text-gray-300">Altura (cm)</div>
              </div>
            )}
            {examData.vitalSigns.bmi && (
              <div className="text-center p-3 border border-gray-600 rounded-lg bg-gray-700">
                <div className="text-2xl font-bold text-pink-400">{examData.vitalSigns.bmi}</div>
                <div className="text-sm text-gray-300">IMC</div>
              </div>
            )}
          </div>
        </div>

        {/* Physical Examination Sections */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Exploración Física por Sistemas</h3>
          
          <div className="space-y-6">
            {Object.entries(examData.sections).map(([sectionId, section]) => (
              <div key={sectionId} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-white">{section.title}</h4>
                  <div className="flex items-center">
                    {section.isNormal !== null && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        section.isNormal 
                          ? 'bg-green-900/50 text-green-300 border border-green-700' 
                          : 'bg-red-900/50 text-red-300 border border-red-700'
                      }`}>
                        {section.isNormal ? 'Normal' : 'Anormal'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selected Findings */}
                {section.selectedFindings && section.selectedFindings.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Hallazgos Seleccionados:</h5>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                      {section.selectedFindings.map((finding, index) => (
                        <li key={index}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Observations */}
                {section.observations && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Observaciones Detalladas:</h5>
                    <p className="text-sm text-gray-400 leading-relaxed">{section.observations}</p>
                  </div>
                )}

                {/* Empty state */}
                {!section.selectedFindings?.length && !section.observations && (
                  <p className="text-sm text-gray-500 italic">No se registraron hallazgos específicos para este sistema.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General Observations */}
        {examData.generalObservations && (
          <div className="mb-8 print:mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Observaciones Generales</h3>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <p className="text-gray-300 leading-relaxed">{examData.generalObservations}</p>
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="border-t border-gray-700 pt-6 mt-8 print:mt-6 print:pt-4">
          <div className="flex justify-between items-center text-sm text-gray-400">
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