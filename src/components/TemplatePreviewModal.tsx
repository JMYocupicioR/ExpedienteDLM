import React, { useState, useEffect } from 'react';
import { 
  X, Eye, Printer, Download, Copy, Settings, 
  ZoomIn, ZoomOut, RotateCcw, Monitor, Smartphone,
  Palette, Layout, FileText
} from 'lucide-react';
import { HorizontalTemplate } from './HorizontalPrescriptionTemplates';
import VisualPrescriptionRenderer from './VisualPrescriptionRenderer';

interface TemplatePreviewModalProps {
  template: HorizontalTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
  onCustomize?: () => void;
  onDuplicate?: () => void;
}

export default function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
  onCustomize,
  onDuplicate
}: TemplatePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'print' | 'mobile'>('desktop');

  // Sample prescription data for preview
  const sampleData = {
    patientName: 'María García López',
    doctorName: 'Dr. Carlos Mendoza',
    doctorLicense: '12345678',
    clinicName: 'Clínica San Rafael',
    clinicPhone: '(555) 123-4567',
    clinicEmail: 'contacto@clinicasanrafael.com',
    diagnosis: 'Hipertensión arterial esencial',
    medications: [
      {
        name: 'Losartán',
        dosage: '50mg',
        frequency: 'Una vez al día',
        duration: '30 días',
        instructions: 'Tomar en ayunas, preferiblemente en la mañana'
      },
      {
        name: 'Amlodipino',
        dosage: '5mg',
        frequency: 'Una vez al día',
        duration: '30 días',
        instructions: 'Tomar con alimentos'
      }
    ],
    notes: 'Control de presión arterial en 15 días. Evitar alimentos con exceso de sal.',
    date: new Date().toLocaleDateString('es-ES'),
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    patientAge: '45 años',
    patientWeight: '70 kg',
    prescriptionId: 'RX-2024-001234'
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setZoom(1);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vista Previa - ${template.name}</title>
          <style>
            @media print {
              @page { 
                size: ${template.pageSize} ${template.orientation}; 
                margin: ${template.printSettings.pageMargins.top} ${template.printSettings.pageMargins.right} ${template.printSettings.pageMargins.bottom} ${template.printSettings.pageMargins.left}; 
              }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: Arial, sans-serif; 
              background: white; 
              margin: 0; 
              padding: 20px; 
            }
            .prescription-canvas { 
              position: relative; 
              margin: 0 auto; 
              background: ${template.canvasSettings.backgroundColor};
              width: ${template.canvasSettings.canvasSize.width}px;
              height: ${template.canvasSettings.canvasSize.height}px;
            }
          </style>
        </head>
        <body>
          <div id="prescription-container"></div>
          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layout className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'desktop', icon: Monitor, label: 'Escritorio' },
                { key: 'print', icon: Printer, label: 'Impresión' },
                { key: 'mobile', icon: Smartphone, label: 'Móvil' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setPreviewMode(key as any)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    previewMode === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Zoom:</span>
              <button
                onClick={handleZoomOut}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Grid Toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              Mostrar cuadrícula
            </label>
          </div>

          {/* Template Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Layout className="h-4 w-4" />
              {template.pageSize} • {template.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {template.templateElements.length} elementos
            </span>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div className="flex justify-center">
            <div 
              className={`bg-white shadow-lg relative ${showGrid ? 'bg-grid' : ''}`}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: template.canvasSettings.canvasSize.width,
                height: template.canvasSettings.canvasSize.height,
                minHeight: template.canvasSettings.canvasSize.height
              }}
            >
              <VisualPrescriptionRenderer
                layout={{
                  template_elements: template.templateElements,
                  canvas_settings: template.canvasSettings
                }}
                prescriptionData={sampleData}
                isPrintMode={previewMode === 'print'}
                className={previewMode === 'mobile' ? 'mobile-preview' : ''}
              />

              {/* Grid overlay */}
              {showGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Vista previa con datos de ejemplo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Preview
            </button>

            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </button>
            )}

            {onCustomize && (
              <button
                onClick={onCustomize}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Personalizar
              </button>
            )}

            {onSelect && (
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Layout className="h-4 w-4 mr-2" />
                Usar Plantilla
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid {
          background-image: 
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .mobile-preview {
          transform: scale(0.8);
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        @media print {
          .prescription-canvas {
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

// Hook para gestionar el estado del modal de preview
export function useTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<HorizontalTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = (template: HorizontalTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setTimeout(() => setSelectedTemplate(null), 300); // Delay for animation
  };

  return {
    selectedTemplate,
    isPreviewOpen,
    openPreview,
    closePreview
  };
}
