import React, { useRef, useEffect } from 'react';
import { X, Printer, Download, Share2, Calendar, Clock, User, Stethoscope, Pill, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConsultationDetails from './ConsultationDetails';
import type { Database } from '../lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface AccessibleConsultationModalProps {
  consultation: Consultation;
  patientName: string;
  onClose: () => void;
}

export default function AccessibleConsultationModal({ 
  consultation, 
  patientName, 
  onClose 
}: AccessibleConsultationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Manejo de accesibilidad del modal
  useEffect(() => {
    // Enfocar el botón de cerrar cuando se abre el modal
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Trap focus dentro del modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generar PDF de la consulta
    const content = generateConsultationReport();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta_${patientName.replace(/\s+/g, '_')}_${format(new Date(consultation.created_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Consulta Médica - ${patientName}`,
      text: `Detalles de consulta médica del ${format(new Date(consultation.created_at), 'dd/MM/yyyy')}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const generateConsultationReport = () => {
    const date = format(new Date(consultation.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const time = format(new Date(consultation.created_at), 'HH:mm', { locale: es });

    return `
CONSULTA MÉDICA
===============

Paciente: ${patientName}
Fecha: ${date}
Hora: ${time}

PADECIMIENTO ACTUAL:
${consultation.current_condition}

DIAGNÓSTICO:
${consultation.diagnosis}

${consultation.prognosis ? `PRONÓSTICO:\n${consultation.prognosis}\n\n` : ''}

TRATAMIENTO:
${consultation.treatment}

${consultation.vital_signs ? `\nSIGNOS VITALES:\n${JSON.stringify(consultation.vital_signs, null, 2)}\n` : ''}

${consultation.physical_examination ? `\nEXPLORACIÓN FÍSICA:\n${JSON.stringify(consultation.physical_examination, null, 2)}\n` : ''}

---
Generado automáticamente por Sistema de Expedientes Médicos
${new Date().toLocaleString('es-ES')}
    `.trim();
  };

  const getConsultationSummary = () => {
    const vitalSigns = consultation.vital_signs as any;
    const physicalExam = consultation.physical_examination as any;
    
    const hasCriticalVitals = vitalSigns && (
      (vitalSigns.temperature && (parseFloat(vitalSigns.temperature) > 38 || parseFloat(vitalSigns.temperature) < 36)) ||
      (vitalSigns.heart_rate && (parseInt(vitalSigns.heart_rate) > 100 || parseInt(vitalSigns.heart_rate) < 60))
    );

    return {
      hasVitalSigns: !!vitalSigns,
      hasPhysicalExam: !!physicalExam,
      hasCriticalVitals,
      duration: '45 min', // Esto se calcularía en una implementación real
      complexity: physicalExam?.sections ? Object.keys(physicalExam.sections).length : 0
    };
  };

  const summary = getConsultationSummary();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-labelledby="consultation-modal-title"
      aria-describedby="consultation-modal-description"
      aria-modal="true"
    >
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700"
      >
        {/* Header accesible */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="consultation-modal-title" className="text-xl font-semibold text-white">
                Consulta Médica - {patientName}
              </h2>
              <div id="consultation-modal-description" className="text-sm text-gray-400 mt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span>{format(new Date(consultation.created_at), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span>{format(new Date(consultation.created_at), 'HH:mm')}</span>
                  </div>
                  {summary.hasVitalSigns && (
                    <div className="flex items-center">
                      <Stethoscope className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span>Signos vitales registrados</span>
                      {summary.hasCriticalVitals && (
                        <span className="ml-1 text-red-400" aria-label="Valores críticos detectados">⚠️</span>
                      )}
                    </div>
                  )}
                  {summary.hasPhysicalExam && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span>Exploración física ({summary.complexity} sistemas)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Imprimir consulta"
                aria-label="Imprimir detalles de la consulta médica"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Descargar consulta"
                aria-label="Descargar consulta como archivo"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Compartir consulta"
                aria-label="Compartir enlace de la consulta"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Cerrar modal"
                aria-label="Cerrar detalles de la consulta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Resumen rápido para lectores de pantalla */}
          <div className="sr-only">
            <h3>Resumen de la consulta:</h3>
            <ul>
              <li>Paciente: {patientName}</li>
              <li>Fecha: {format(new Date(consultation.created_at), "dd 'de' MMMM, yyyy", { locale: es })}</li>
              <li>Diagnóstico principal: {consultation.diagnosis}</li>
              {summary.hasCriticalVitals && <li>⚠️ Alerta: Se detectaron signos vitales fuera del rango normal</li>}
              {consultation.prognosis && <li>Pronóstico: {consultation.prognosis}</li>}
            </ul>
          </div>
        </div>

        {/* Content con navegación accesible */}
        <div 
          className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]"
          role="main"
          aria-label="Detalles de la consulta médica"
        >
          {/* Indicadores de estado para accesibilidad */}
          <div className="sr-only" aria-live="polite">
            {summary.hasCriticalVitals && (
              <div role="alert">
                Atención: Esta consulta contiene signos vitales que requieren atención médica.
              </div>
            )}
          </div>

          <ConsultationDetails consultation={consultation} />
        </div>

        {/* Footer con información adicional */}
        <div className="bg-gray-900 px-6 py-3 border-t border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Consulta ID: {consultation.id.slice(0, 8)}</span>
              {consultation.updated_at && (
                <span>Última modificación: {format(new Date(consultation.updated_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                <FileText className="h-3 w-3 mr-1" />
                Consulta completada
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Anuncio para lectores de pantalla cuando se abre el modal */}
      <div className="sr-only" aria-live="assertive">
        Modal de consulta médica abierto. Use Tab para navegar entre elementos, Escape para cerrar.
      </div>
    </div>
  );
}