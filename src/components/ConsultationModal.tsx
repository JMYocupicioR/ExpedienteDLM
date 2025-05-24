import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import ConsultationDetails from './ConsultationDetails';
import type { Database } from '../lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationModalProps {
  consultation: Consultation;
  patientName: string;
  onClose: () => void;
}

export default function ConsultationModal({ consultation, patientName, onClose }: ConsultationModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Aquí iría la lógica para generar y descargar un PDF
    console.log('Descargando consulta...');
  };

  const handleShare = () => {
    // Aquí iría la lógica para compartir
    console.log('Compartiendo consulta...');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Detalles de Consulta</h2>
            <p className="text-sm text-gray-400 mt-1">Paciente: {patientName}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Compartir"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <ConsultationDetails consultation={consultation} />
        </div>
      </div>
    </div>
  );
} 