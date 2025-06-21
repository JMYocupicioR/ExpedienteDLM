import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Move, Type, Palette, Image, Save, Eye, Printer, Download, 
  Trash2, Copy, RotateCcw, ZoomIn, ZoomOut, Grid, Layers,
  FileText, Plus, Minus, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Upload, X, Settings, Layout,
  Calendar, Clock, Minus as Separator, Square, QrCode,
  FileSignature, Table, MapPin, Phone, Mail, User
} from 'lucide-react';
import { validateAndSanitizeArray } from '../lib/validation';
import { useValidation } from '../hooks/useValidation';
import QRCodeLib from 'qrcode';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

interface Element {
  id: string;
  type: 'text' | 'logo' | 'background' | 'signature' | 'qr' | 'separator' | 'box' | 'date' | 'time' | 'table' | 'icon';
  position: Position;
  size: Size;
  content: string;
  style: Partial<TextStyle>;
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  iconType?: string;
  borderColor?: string;
  backgroundColor?: string;
}

interface PrescriptionData {
  patientName: string;
  doctorName: string;
  doctorLicense: string;
  clinicName: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  notes: string;
  date: string;
}

interface VisualPrescriptionEditorProps {
  patientId: string;
  patientName: string;
  onSave: (prescription: any) => void;
  onClose?: () => void;
  initialData?: Partial<PrescriptionData>;
}

const VisualPrescriptionEditor: React.FC<VisualPrescriptionEditorProps> = ({
  patientId,
  patientName,
  onSave,
  onClose,
  initialData
}) => {
  // Estados del canvas y editor
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1123 }); // Tamaño A4 en píxeles
  const [zoom, setZoom] = useState(0.8);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  // Hooks de validación
  const { validateArrayField, validateJSONBField, hasErrors, getAllErrors } = useValidation();

  // Elementos de la receta con plantilla inicial
  const [elements, setElements] = useState<Element[]>([
    {
      id: 'titulo',
      type: 'text',
      position: { x: 50, y: 50 },
      size: { width: 694, height: 60 },
      content: 'RECETA MÉDICA',
      style: {
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#1f2937',
        fontWeight: 'bold',
        textAlign: 'center'
      },
      zIndex: 1,
      isVisible: true,
      isLocked: false
    },
    {
      id: 'info-doctor',
      type: 'text',
      position: { x: 50, y: 120 },
      size: { width: 400, height: 100 },
      content: 'Dr. [NOMBRE DEL MÉDICO]\n[ESPECIALIDAD]\nCédula Profesional: [NÚMERO]',
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#374151',
        textAlign: 'left',
        lineHeight: 1.5
      },
      zIndex: 1,
      isVisible: true,
      isLocked: false
    },
    {
      id: 'info-paciente',
      type: 'text',
      position: { x: 50, y: 340 },
      size: { width: 694, height: 60 },
      content: `Paciente: ${patientName || '[NOMBRE DEL PACIENTE]'}\nFecha: ${new Date().toLocaleDateString()}`,
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#374151',
        textAlign: 'left',
        lineHeight: 1.5
      },
      zIndex: 1,
      isVisible: true,
      isLocked: false
    }
  ]);

  // Datos de la receta
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({
    patientName: patientName || '',
    doctorName: initialData?.doctorName || '',
    doctorLicense: initialData?.doctorLicense || '',
    clinicName: initialData?.clinicName || '',
    diagnosis: initialData?.diagnosis || '',
    medications: initialData?.medications || [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: initialData?.notes || '',
    date: new Date().toLocaleDateString()
  });

  // Estado de la interfaz
  const [activeTab, setActiveTab] = useState<'design' | 'content' | 'preview'>('design');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Actualizar contenido del paciente cuando cambie
  useEffect(() => {
    updateElement('info-paciente', {
      content: `Paciente: ${patientName || '[NOMBRE DEL PACIENTE]'}\nFecha: ${new Date().toLocaleDateString()}`
    });
    setPrescriptionData(prev => ({ ...prev, patientName: patientName || '' }));
  }, [patientName]);

  // Generar código QR
  useEffect(() => {
    const generateQR = async () => {
      const qrData = {
        id: Date.now().toString(),
        patient: prescriptionData.patientName,
        date: new Date().toISOString(),
        medications: prescriptionData.medications.filter(m => m.name),
        doctor: prescriptionData.doctorName
      };

      try {
        const url = await QRCodeLib.toDataURL(JSON.stringify(qrData), {
          width: 150,
          margin: 1
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    if (prescriptionData.medications.some(m => m.name)) {
      generateQR();
    }
  }, [prescriptionData]);

  // Funciones de utilidad
  const getElementStyle = (element: Element): React.CSSProperties => ({
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    fontSize: element.style.fontSize,
    fontFamily: element.style.fontFamily,
    color: element.style.color,
    fontWeight: element.style.fontWeight,
    fontStyle: element.style.fontStyle,
    textDecoration: element.style.textDecoration,
    textAlign: element.style.textAlign,
    lineHeight: element.style.lineHeight,
    zIndex: element.zIndex,
    cursor: selectedElement === element.id ? 'move' : 'pointer',
    border: selectedElement === element.id ? '2px dashed #3b82f6' : 
           element.type === 'separator' ? `2px solid ${element.borderColor || '#374151'}` :
           element.type === 'box' ? `2px solid ${element.borderColor || '#374151'}` : 'none',
    backgroundColor: element.backgroundColor || 'transparent',
    padding: element.type === 'box' ? '8px' : '4px',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden'
  });

  // Manejadores de eventos
  const handleElementClick = (elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedElement(elementId);
  };

  const handleCanvasClick = () => {
    setSelectedElement(null);
  };

  const handleMouseDown = (elementId: string, event: React.MouseEvent) => {
    if (selectedElement !== elementId) return;
    
    event.preventDefault();
    setDraggedElement(elementId);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setDragOffset({
      x: (event.clientX - rect.left) / zoom - element.position.x,
      y: (event.clientY - rect.top) / zoom - element.position.y
    });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!draggedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom - dragOffset.x;
    const y = (event.clientY - rect.top) / zoom - dragOffset.y;
    
    setElements(prev => prev.map(el => 
      el.id === draggedElement 
        ? { ...el, position: { x: Math.max(0, x), y: Math.max(0, y) } }
        : el
    ));
  }, [draggedElement, dragOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Efecto para eventos del mouse
  useEffect(() => {
    if (draggedElement) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedElement, handleMouseMove, handleMouseUp]);

  // Funciones de manipulación de elementos
  const updateElement = (elementId: string, updates: Partial<Element>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const updateElementStyle = (elementId: string, styleUpdates: Partial<TextStyle>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId 
        ? { ...el, style: { ...el.style, ...styleUpdates } }
        : el
    ));
  };

  const addElement = (type: Element['type'], iconType?: string) => {
    let content = '';
    let defaultSize = { width: 200, height: 50 };
    let defaultStyle: Partial<TextStyle> = {
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#374151',
      textAlign: 'left'
    };

    switch (type) {
      case 'text':
        content = 'Nuevo texto';
        break;
      case 'logo':
        content = 'LOGO';
        defaultSize = { width: 120, height: 120 };
        defaultStyle.textAlign = 'center';
        break;
      case 'signature':
        content = '____________________\nFirma del Médico';
        defaultStyle.textAlign = 'center';
        break;
      case 'qr':
        content = 'QR';
        defaultSize = { width: 100, height: 100 };
        defaultStyle.textAlign = 'center';
        break;
      case 'separator':
        content = '';
        defaultSize = { width: 300, height: 2 };
        break;
      case 'box':
        content = 'Cuadro de texto';
        defaultSize = { width: 250, height: 100 };
        break;
      case 'date':
        content = new Date().toLocaleDateString();
        defaultSize = { width: 150, height: 30 };
        break;
      case 'time':
        content = new Date().toLocaleTimeString();
        defaultSize = { width: 150, height: 30 };
        break;
      case 'table':
        content = 'Medicamento | Dosis | Frecuencia\nEjemplo | 500mg | 3 veces/día';
        defaultSize = { width: 400, height: 100 };
        break;
      case 'icon':
        content = iconType || 'Ícono';
        defaultSize = { width: 60, height: 60 };
        defaultStyle.textAlign = 'center';
        break;
    }

    const newElement: Element = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      size: defaultSize,
      content,
      style: defaultStyle,
      zIndex: Math.max(...elements.map(el => el.zIndex)) + 1,
      isVisible: true,
      isLocked: false,
      iconType,
      borderColor: '#374151',
      backgroundColor: type === 'box' ? '#f9fafb' : 'transparent'
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const deleteElement = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
  };

  // Validar y guardar
  const handleSave = async () => {
    // Validar medicamentos
    const medicationValidation = validateArrayField(
      prescriptionData.medications.map(m => m.name),
      'medications',
      true
    );

    if (!medicationValidation.isValid) {
      alert('Error en medicamentos: ' + medicationValidation.errors.join(', '));
      return;
    }

    // Preparar datos de la receta
    const prescriptionDataToSave = {
      patient_id: patientId,
      medications: prescriptionData.medications.filter(m => m.name),
      diagnosis: prescriptionData.diagnosis,
      notes: prescriptionData.notes,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      prescription_style: {
        template_elements: elements,
        canvas_settings: {
          backgroundColor,
          backgroundImage,
          canvasSize
        }
      }
    };

    await onSave(prescriptionDataToSave);
  };

  // Función de impresión
  const handlePrint = () => {
    const printContent = canvasRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receta Médica - ${prescriptionData.patientName}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .canvas { 
              width: 794px; 
              height: 1123px; 
              position: relative;
              background: ${backgroundColor};
              ${backgroundImage ? `background-image: url(${backgroundImage}); background-size: cover;` : ''}
            }
            @media print {
              body { margin: 0; }
              .canvas { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="canvas">${printContent}</div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const renderElement = (element: Element) => {
    switch (element.type) {
      case 'logo':
        if (element.content === 'LOGO') {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg">
              <div className="text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <span className="text-gray-400 text-sm">Logo</span>
              </div>
            </div>
          );
        }
        return element.content;
      
      case 'qr':
        return qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-300 rounded">
            <QrCode className="h-full w-full text-gray-600" />
          </div>
        );
      
      case 'separator':
        return null; // El borde se maneja en getElementStyle
      
      case 'date':
        return new Date().toLocaleDateString();
      
      case 'time':
        return new Date().toLocaleTimeString();
      
      default:
        return element.content;
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Barra lateral izquierda - Herramientas */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Editor Visual</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              title="Cerrar editor"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Pestañas */}
        <div className="flex mb-4 bg-gray-700 rounded-lg p-1">
          {(['design', 'content', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab === 'design' ? 'Diseño' : tab === 'content' ? 'Contenido' : 'Vista Previa'}
            </button>
          ))}
        </div>

        {/* Pestaña de Diseño */}
        {activeTab === 'design' && (
          <div className="space-y-4">
            {/* Agregar Elementos */}
            <div>
              <h3 className="text-gray-300 font-medium mb-3">Agregar Elementos</h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => addElement('text')}
                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                >
                  <Type className="h-4 w-4 mr-1" />
                  Texto
                </button>
                <button
                  onClick={() => addElement('box')}
                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Cuadro
                </button>
                <button
                  onClick={() => addElement('signature')}
                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                >
                  <FileSignature className="h-4 w-4 mr-1" />
                  Firma
                </button>
                <button
                  onClick={() => addElement('qr')}
                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  QR
                </button>
              </div>

              {/* Propiedades del Elemento */}
              {selectedElementData && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Propiedades</h3>
                  <div className="space-y-3">
                    {/* Contenido */}
                    {selectedElementData.type !== 'separator' && selectedElementData.type !== 'qr' && (
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Contenido</label>
                        <textarea
                          value={selectedElementData.content}
                          onChange={(e) => updateElement(selectedElement!, { content: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Tamaño de Fuente */}
                    {selectedElementData.type !== 'separator' && (
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Tamaño de fuente</label>
                        <input
                          type="number"
                          value={selectedElementData.style.fontSize || 14}
                          onChange={(e) => updateElementStyle(selectedElement!, {
                            fontSize: Number(e.target.value)
                          })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                    )}

                    {/* Color */}
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Color</label>
                      <input
                        type="color"
                        value={selectedElementData.style.color || '#000000'}
                        onChange={(e) => updateElementStyle(selectedElement!, {
                          color: e.target.value
                        })}
                        className="w-full h-8 rounded border-gray-600"
                      />
                    </div>

                    {/* Acciones */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => deleteElement(selectedElement!)}
                        className="flex-1 flex items-center justify-center px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña de Contenido */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Diagnóstico</label>
              <textarea
                value={prescriptionData.diagnosis}
                onChange={(e) => setPrescriptionData(prev => ({ ...prev, diagnosis: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                rows={2}
                placeholder="Diagnóstico del paciente"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Medicamentos</label>
              {prescriptionData.medications.map((med, index) => (
                <div key={index} className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => {
                        const newMeds = [...prescriptionData.medications];
                        newMeds[index].name = e.target.value;
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Medicamento"
                    />
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => {
                        const newMeds = [...prescriptionData.medications];
                        newMeds[index].dosage = e.target.value;
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Dosis"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setPrescriptionData(prev => ({
                  ...prev,
                  medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
                }))}
                className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-400 rounded text-sm"
              >
                + Agregar medicamento
              </button>
            </div>
          </div>
        )}

        {/* Pestaña de Vista Previa */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">Vista previa de la receta</p>
              <div className="space-y-2">
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Receta
                </button>
                <button 
                  onClick={handleSave}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Receta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Área Principal del Canvas */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
        <div className="relative">
          {/* Controles de Zoom */}
          <div className="absolute -top-12 right-0 flex items-center space-x-2 bg-white rounded-lg px-3 py-1 shadow-lg z-10">
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative shadow-2xl border border-gray-300 overflow-hidden"
            style={{
              width: canvasSize.width * zoom,
              height: canvasSize.height * zoom,
              backgroundColor,
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left'
            }}
            onClick={handleCanvasClick}
          >
            {/* Grilla */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            )}

            {/* Elementos */}
            {elements
              .filter(el => el.isVisible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(element => (
                <div
                  key={element.id}
                  style={getElementStyle(element)}
                  onClick={(e) => handleElementClick(element.id, e)}
                  onMouseDown={(e) => handleMouseDown(element.id, e)}
                  className="select-none"
                >
                  {renderElement(element)}
                  
                  {/* Asas de selección */}
                  {selectedElement === element.id && (
                    <>
                      <div className="absolute -inset-1 border-2 border-blue-500 pointer-events-none" />
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualPrescriptionEditor; 