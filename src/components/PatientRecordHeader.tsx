import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Edit, Save, FileDown, Printer, FileText as FileTextIcon
} from 'lucide-react';

interface PatientRecordHeaderProps {
  patient: {
    id: string;
    full_name: string;
    updated_at: string | null;
    created_at: string;
  };
  seccionActiva: string;
  modoEdicion: boolean;
  loading: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onNewConsultation: () => void;
  onPrintRecord: () => void;
  onExportPDF: () => void;
  onExportTXT: () => void;
}

export default function PatientRecordHeader({
  patient,
  seccionActiva,
  modoEdicion,
  loading,
  onToggleEdit,
  onSave,
  onNewConsultation,
  onPrintRecord,
  onExportPDF,
  onExportTXT
}: PatientRecordHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="p-4 border-b border-gray-700 flex justify-between items-center" style={{ background: 'var(--bg-secondary)' }}>
      <div>
        <h1 className="text-2xl font-bold text-white">
          Expediente Médico
        </h1>
        <p className="text-gray-400">
          Última actualización: {format(new Date(patient.updated_at || patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      <div className="flex gap-2">
        {/* Botón de Exportación */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            title="Exportar expediente completo"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </button>

          {showExportMenu && (
            <div className="export-menu absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    onPrintRecord();
                    setShowExportMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <Printer className="h-4 w-4 mr-3" />
                  Imprimir Expediente Completo
                </button>
                <button
                  onClick={() => {
                    onExportPDF();
                    setShowExportMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <FileDown className="h-4 w-4 mr-3" />
                  Exportar como PDF
                </button>
                <button
                  onClick={() => {
                    onExportTXT();
                    setShowExportMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <FileTextIcon className="h-4 w-4 mr-3" />
                  Exportar como TXT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción según sección */}
        {seccionActiva === 'consultas' ? (
          <button
            onClick={onNewConsultation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Consulta
          </button>
        ) : modoEdicion ? (
          <>
            <button
              onClick={onToggleEdit}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </>
        ) : (
          <button
            onClick={onToggleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </button>
        )}
      </div>
    </header>
  );
}
