import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Move, Type, Palette, Image, Save, Eye, Printer, Download, 
  Trash2, Copy, RotateCcw, ZoomIn, ZoomOut, Grid, Layers,
  FileText, Plus, Minus, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Upload, X, Settings, Layout,
  Calendar, Clock, Minus as Separator, Square, QrCode,
  FileSignature, Table, MapPin, Phone, Mail, User, Undo2, Redo2,
  Stethoscope, Heart, Pill, Thermometer, FileCheck, AlertTriangle,
  Shield, Database, HelpCircle, Sparkles, Bookmark, Target
} from 'lucide-react';
import { validateAndSanitizeArray } from '../lib/validation';
import { useValidation } from '../hooks/useValidation';
import { 
  validateMedication, 
  checkDrugInteractions, 
  calculatePrescriptionExpiry,
  MEDICATION_CONSTRAINTS,
  SYSTEM_LIMITS,
  PRESCRIPTION_TEMPLATES,
  getTemplatesByCategory,
  getTemplateById,
  type PrescriptionTemplate
} from '../lib/medicalConfig';
import QRCodeLib from 'qrcode';
import throttle from 'lodash.throttle';

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
    warnings?: string;
    contraindications?: string;
  }>;
  notes: string;
  date: string;
  patientAge?: string;
  patientWeight?: string;
  patientAllergies?: string;
  followUpDate?: string;
  prescriptionId?: string;
}

interface HistoryState {
  elements: Element[];
  prescriptionData: PrescriptionData;
  timestamp: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'pediatric' | 'geriatric' | 'specialist';
  elements: Element[];
  thumbnail?: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
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
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [alignmentGuides, setAlignmentGuides] = useState<Array<{type: 'vertical' | 'horizontal', position: number}>>([]);
  const [copiedElements, setCopiedElements] = useState<Element[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurementStart, setMeasurementStart] = useState<{x: number, y: number} | null>(null);
  const [measurementEnd, setMeasurementEnd] = useState<{x: number, y: number} | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  // Estados de historial (Deshacer/Rehacer)
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  // Estados de plantillas y guardado
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>(PRESCRIPTION_TEMPLATES);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<'all' | 'general' | 'pediatric' | 'geriatric' | 'specialist' | 'emergency'>('all');
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Estados de validación médica
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [showValidation, setShowValidation] = useState(true);

  // Hooks de validación
  const { validateArrayField, validateJSONBField } = useValidation();

  // Estados para tipografía avanzada
  const [fontPresets] = useState([
    { name: 'Clásica', font: 'Times New Roman', size: 12 },
    { name: 'Moderna', font: 'Arial', size: 11 },
    { name: 'Elegante', font: 'Georgia', size: 12 },
    { name: 'Profesional', font: 'Helvetica', size: 11 },
    { name: 'Médica', font: 'Calibri', size: 11 }
  ]);
  
  // Estados para logos
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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
      id: 'info-clinica',
      type: 'text',
      position: { x: 50, y: 240 },
      size: { width: 694, height: 80 },
      content: '[NOMBRE DE LA CLÍNICA]\n[DIRECCIÓN]\nTel: [TELÉFONO] | Email: [EMAIL]',
      style: {
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 1.4
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
    },
    {
      id: 'diagnostico',
      type: 'text',
      position: { x: 50, y: 420 },
      size: { width: 694, height: 60 },
      content: 'Diagnóstico: [DIAGNÓSTICO]',
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
      id: 'medicamentos',
      type: 'text',
      position: { x: 50, y: 500 },
      size: { width: 694, height: 200 },
      content: 'MEDICAMENTOS:\n\n1. [MEDICAMENTO] - [DOSIS]\n   Frecuencia: [FRECUENCIA]\n   Duración: [DURACIÓN]\n   Instrucciones: [INSTRUCCIONES]\n\n2. [MEDICAMENTO] - [DOSIS]\n   Frecuencia: [FRECUENCIA]\n   Duración: [DURACIÓN]',
      style: {
        fontSize: 13,
        fontFamily: 'Arial',
        color: '#374151',
        textAlign: 'left',
        lineHeight: 1.6
      },
      zIndex: 1,
      isVisible: true,
      isLocked: false
    },
    {
      id: 'notas',
      type: 'text',
      position: { x: 50, y: 720 },
      size: { width: 694, height: 80 },
      content: 'Indicaciones adicionales:\n[NOTAS E INSTRUCCIONES ESPECIALES]',
      style: {
        fontSize: 12,
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
      id: 'firma',
      type: 'text',
      position: { x: 50, y: 860 },
      size: { width: 300, height: 100 },
      content: '____________________\nFirma del Médico',
      style: {
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 1.5
      },
      zIndex: 1,
      isVisible: true,
      isLocked: false
    },
    {
      id: 'logo',
      type: 'logo',
      position: { x: 600, y: 120 },
      size: { width: 120, height: 120 },
      content: 'LOGO',
      style: {
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#9ca3af',
        textAlign: 'center'
      },
      zIndex: 2,
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
    medications: initialData?.medications || [{ name: '', dosage: '', frequency: '', duration: '', instructions: '', warnings: '', contraindications: '' }],
    notes: initialData?.notes || '',
    date: new Date().toLocaleDateString(),
    patientAge: initialData?.patientAge || '',
    patientWeight: initialData?.patientWeight || '',
    patientAllergies: initialData?.patientAllergies || '',
    followUpDate: initialData?.followUpDate || '',
    prescriptionId: initialData?.prescriptionId || `RX-${Date.now()}`
  });

  // Estado de la interfaz

  const [showElementPanel, setShowElementPanel] = useState(true);

  // ================= FUNCIONES DE HISTORIAL (DESHACER/REHACER) =================
  const addToHistory = useCallback(() => {
    if (isUndoRedo) return;
    
    const newState: HistoryState = {
      elements: [...elements],
      prescriptionData: { ...prescriptionData },
      timestamp: Date.now()
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      return newHistory.slice(-50); // Mantener solo los últimos 50 estados
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [elements, prescriptionData, historyIndex, isUndoRedo]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      const prevState = history[historyIndex - 1];
      setElements(prevState.elements);
      setPrescriptionData(prevState.prescriptionData);
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => setIsUndoRedo(false), 100);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      const nextState = history[historyIndex + 1];
      setElements(nextState.elements);
      setPrescriptionData(nextState.prescriptionData);
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => setIsUndoRedo(false), 100);
    }
  };

  // ================= FUNCIONES DE VALIDACIÓN MÉDICA =================
  const validatePrescription = () => {
    const errors: ValidationError[] = [];
    
    // Validación de campos obligatorios
    if (!prescriptionData.patientName.trim()) {
      errors.push({ field: 'patientName', message: 'El nombre del paciente es obligatorio', severity: 'error' });
    }
    
    if (!prescriptionData.doctorName.trim()) {
      errors.push({ field: 'doctorName', message: 'El nombre del médico es obligatorio', severity: 'error' });
    }
    
    if (!prescriptionData.doctorLicense.trim()) {
      errors.push({ field: 'doctorLicense', message: 'La cédula profesional es obligatoria', severity: 'error' });
    }

    // Validación de medicamentos usando la configuración centralizada
    prescriptionData.medications.forEach((med, index) => {
      if (!med.name.trim()) {
        errors.push({ field: `medication-${index}`, message: `Medicamento ${index + 1}: Nombre requerido`, severity: 'error' });
      } else {
        const validation = validateMedication(med.name, med.dosage, med.frequency, med.duration);
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push({ field: `medication-${index}`, message: `Medicamento ${index + 1}: ${error}`, severity: 'warning' });
          });
        }
      }
    });

    // Validación de edad vs medicamentos
    if (prescriptionData.patientAge) {
      const age = parseInt(prescriptionData.patientAge);
      if (age < 18) {
        errors.push({ field: 'patientAge', message: 'Paciente menor de edad - verificar dosis pediátricas', severity: 'warning' });
      }
      if (age > 65) {
        errors.push({ field: 'patientAge', message: 'Paciente geriátrico - considerar ajuste de dosis', severity: 'info' });
      }
    }

    setValidationErrors(errors);
    return errors;
  };

  const checkDrugInteractionsAdvanced = () => {
    const interactions: DrugInteraction[] = [];
    const medications = prescriptionData.medications.map(m => m.name.toLowerCase());

    medications.forEach((med1, i) => {
      medications.slice(i + 1).forEach(med2 => {
        const interactionResult = checkDrugInteractions(med1);
        if (interactionResult && interactionResult.length > 0) {
          // Simulación básica de interacciones
          const interaction: DrugInteraction = {
            drug1: med1,
            drug2: med2,
            severity: 'moderate',
            description: 'Posible interacción medicamentosa - revisar'
          };
          interactions.push(interaction);
        }
      });
    });

    setDrugInteractions(interactions);
    return interactions;
  };

  // ================= FUNCIONES DE GUARDADO AUTOMÁTICO =================
  const saveToLocalStorage = () => {
    const data = {
      elements,
      prescriptionData,
      canvasSettings: {
        backgroundColor,
        backgroundImage,
        canvasSize,
        zoom,
        showGrid
      },
      timestamp: Date.now()
    };
    
    localStorage.setItem('prescription-draft', JSON.stringify(data));
    setLastSaved(new Date());
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('prescription-draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setElements(data.elements);
        setPrescriptionData(data.prescriptionData);
        if (data.canvasSettings) {
          setBackgroundColor(data.canvasSettings.backgroundColor);
          setBackgroundImage(data.canvasSettings.backgroundImage);
          setCanvasSize(data.canvasSettings.canvasSize);
          setZoom(data.canvasSettings.zoom);
          setShowGrid(data.canvasSettings.showGrid);
        }
        setLastSaved(new Date(data.timestamp));
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  };

  // ================= FUNCIONES DE TIPOGRAFÍA =================
  const applyFontPreset = (preset: typeof fontPresets[0]) => {
    if (selectedElement) {
      updateElementStyle(selectedElement, {
        fontFamily: preset.font,
        fontSize: preset.size
      });
    }
  };

  const updateGlobalFont = (fontFamily: string, fontSize: number) => {
    setElements(prev => prev.map(el => ({
      ...el,
      style: {
        ...el.style,
        fontFamily,
        fontSize: el.style.fontSize || fontSize
      }
    })));
  };

  // ================= FUNCIONES DE SNAP TO GRID Y ALINEACIÓN =================
  const snapToGridCoord = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const snapToGridSize = useCallback((value: number) => {
    if (!snapToGrid) return value;
    const snapped = Math.round(value / gridSize) * gridSize;
    return Math.max(gridSize, snapped); // Mínimo una unidad de grid
  }, [snapToGrid, gridSize]);

  const getAlignmentGuides = useCallback((draggedId: string, newX: number, newY: number) => {
    if (!showGuides) return [];
    
    const guides: Array<{type: 'vertical' | 'horizontal', position: number}> = [];
    const threshold = 5; // Distancia para mostrar guías
    
    elements.forEach(element => {
      if (element.id === draggedId || !element.isVisible) return;
      
      // Guías verticales (alineación horizontal)
      if (Math.abs(element.position.x - newX) < threshold) {
        guides.push({ type: 'vertical', position: element.position.x });
      }
      if (Math.abs((element.position.x + element.size.width) - newX) < threshold) {
        guides.push({ type: 'vertical', position: element.position.x + element.size.width });
      }
      
      // Guías horizontales (alineación vertical)  
      if (Math.abs(element.position.y - newY) < threshold) {
        guides.push({ type: 'horizontal', position: element.position.y });
      }
      if (Math.abs((element.position.y + element.size.height) - newY) < threshold) {
        guides.push({ type: 'horizontal', position: element.position.y + element.size.height });
      }
    });
    
    return guides;
  }, [elements, showGuides]);

  // ================= FUNCIONES DE PLANTILLAS =================
  const loadTemplate = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    setElements(template.elements);
    setBackgroundColor(template.canvasSettings.backgroundColor);
    setBackgroundImage(template.canvasSettings.backgroundImage || null);
    setCanvasSize(template.canvasSettings.canvasSize);
    
    // Limpiar selección
    setSelectedElement(null);
  };

  const getFilteredTemplates = () => {
    if (selectedTemplateCategory === 'all') {
      return templates;
    }
    return getTemplatesByCategory(selectedTemplateCategory);
  };

  // ================= FUNCIONES DE LOGO =================
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        
        // Actualizar elemento de logo existente
        const logoElement = elements.find(el => el.type === 'logo');
        if (logoElement) {
          updateElement(logoElement.id, { content: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogoImage = () => {
    setLogoFile(null);
    setLogoPreview(null);
    const logoElement = elements.find(el => el.type === 'logo');
    if (logoElement) {
      updateElement(logoElement.id, { content: 'LOGO' });
    }
  };

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
    handleMultiSelect(elementId, event.ctrlKey || event.metaKey);
  };

  const handleCanvasClick = () => {
    setSelectedElement(null);
    setSelectedElements([]);
    setAlignmentGuides([]);
  };

  const handleMouseDown = (elementId: string, event: React.MouseEvent) => {
    // Verificar si el elemento está bloqueado
    const element = elements.find(el => el.id === elementId);
    if (!element || element.isLocked) return;

    // No procesar si el click es en una asa de redimensionamiento
    const target = event.target as HTMLElement;
    if (target.dataset?.resizeHandle) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    
    // Solo permitir arrastre si el elemento está seleccionado o si vamos a seleccionarlo
    if (selectedElement !== elementId) {
      setSelectedElement(elementId);
    }
    
    setDraggedElement(elementId);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDragOffset({
      x: (event.clientX - rect.left) / zoom - element.position.x,
      y: (event.clientY - rect.top) / zoom - element.position.y
    });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isResizing && resizeHandle && selectedElement) {
      // Manejo de redimensionamiento inline
      const deltaX = event.clientX - resizeStartPos.x;
      const deltaY = event.clientY - resizeStartPos.y;
      
      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      
      switch (resizeHandle) {
        case 'se':
          newWidth = resizeStartSize.width + deltaX / zoom;
          newHeight = resizeStartSize.height + deltaY / zoom;
          break;
        case 'sw':
          newWidth = resizeStartSize.width - deltaX / zoom;
          newHeight = resizeStartSize.height + deltaY / zoom;
          break;
        case 'ne':
          newWidth = resizeStartSize.width + deltaX / zoom;
          newHeight = resizeStartSize.height - deltaY / zoom;
          break;
        case 'nw':
          newWidth = resizeStartSize.width - deltaX / zoom;
          newHeight = resizeStartSize.height - deltaY / zoom;
          break;
        case 'e':
          newWidth = resizeStartSize.width + deltaX / zoom;
          break;
        case 'w':
          newWidth = resizeStartSize.width - deltaX / zoom;
          break;
        case 's':
          newHeight = resizeStartSize.height + deltaY / zoom;
          break;
        case 'n':
          newHeight = resizeStartSize.height - deltaY / zoom;
          break;
      }
      
      newWidth = snapToGridSize(Math.max(20, newWidth));
      newHeight = snapToGridSize(Math.max(20, newHeight));
      
      setElements(prev => prev.map(el => 
        el.id === selectedElement 
          ? { ...el, size: { width: newWidth, height: newHeight } }
          : el
      ));
      return;
    }
    
    if (!draggedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let x = (event.clientX - rect.left) / zoom - dragOffset.x;
    let y = (event.clientY - rect.top) / zoom - dragOffset.y;
    
    // Aplicar snap to grid
    x = snapToGridCoord(Math.max(0, x));
    y = snapToGridCoord(Math.max(0, y));
    
    // Obtener guías de alineación
    const guides = getAlignmentGuides(draggedElement, x, y);
    setAlignmentGuides(guides);
    
    // Aplicar snap a las guías
    guides.forEach(guide => {
      if (guide.type === 'vertical' && Math.abs(x - guide.position) < 5) {
        x = guide.position;
      }
      if (guide.type === 'horizontal' && Math.abs(y - guide.position) < 5) {
        y = guide.position;
      }
    });
    
    setElements(prev => prev.map(el => 
      el.id === draggedElement 
        ? { ...el, position: { x, y } }
        : el
    ));
  }, [draggedElement, dragOffset, zoom, isResizing, resizeHandle, selectedElement, resizeStartPos, resizeStartSize, snapToGridCoord, snapToGridSize, getAlignmentGuides]);

  const handleMouseUp = useCallback(() => {
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
    setAlignmentGuides([]);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

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

  const deleteElement = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
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

  const duplicateElement = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    const newElement: Element = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      position: { x: element.position.x + 20, y: element.position.y + 20 },
      zIndex: Math.max(...elements.map(el => el.zIndex)) + 1
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  // ================= FUNCIONES DE REDIMENSIONAMIENTO AVANZADO =================
  const handleResizeStart = useCallback((elementId: string, handle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStartPos({ x: event.clientX, y: event.clientY });
    setResizeStartSize({ width: element.size.width, height: element.size.height });
  }, [elements]);

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!isResizing || !resizeHandle || !selectedElement) return;
    
    const deltaX = event.clientX - resizeStartPos.x;
    const deltaY = event.clientY - resizeStartPos.y;
    
    let newWidth = resizeStartSize.width;
    let newHeight = resizeStartSize.height;
    
    // Calcular nuevo tamaño basado en el handle
    switch (resizeHandle) {
      case 'se': // Esquina sureste
        newWidth = resizeStartSize.width + deltaX / zoom;
        newHeight = resizeStartSize.height + deltaY / zoom;
        break;
      case 'sw': // Esquina suroeste  
        newWidth = resizeStartSize.width - deltaX / zoom;
        newHeight = resizeStartSize.height + deltaY / zoom;
        break;
      case 'ne': // Esquina noreste
        newWidth = resizeStartSize.width + deltaX / zoom;
        newHeight = resizeStartSize.height - deltaY / zoom;
        break;
      case 'nw': // Esquina noroeste
        newWidth = resizeStartSize.width - deltaX / zoom;
        newHeight = resizeStartSize.height - deltaY / zoom;
        break;
      case 'e': // Lado este
        newWidth = resizeStartSize.width + deltaX / zoom;
        break;
      case 'w': // Lado oeste
        newWidth = resizeStartSize.width - deltaX / zoom;
        break;
      case 's': // Lado sur
        newHeight = resizeStartSize.height + deltaY / zoom;
        break;
      case 'n': // Lado norte
        newHeight = resizeStartSize.height - deltaY / zoom;
        break;
    }
    
    // Aplicar snap to grid
    newWidth = snapToGridSize(Math.max(20, newWidth));
    newHeight = snapToGridSize(Math.max(20, newHeight));
    
    // Actualizar elemento
    updateElement(selectedElement, {
      size: { width: newWidth, height: newHeight }
    });
  }, [isResizing, resizeHandle, selectedElement, resizeStartPos, resizeStartSize, zoom, snapToGridSize, updateElement]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // ================= FUNCIONES DE SELECCIÓN MÚLTIPLE =================
  const handleMultiSelect = useCallback((elementId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      setSelectedElements(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedElement(elementId);
      setSelectedElements([elementId]);
    }
  }, []);

  const alignSelectedElements = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedElements.length < 2) return;
    
    const elementsToAlign = elements.filter(el => selectedElements.includes(el.id));
    
    switch (alignment) {
      case 'left':
        const leftmost = Math.min(...elementsToAlign.map(el => el.position.x));
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, x: leftmost } });
        });
        break;
      case 'right':
        const rightmost = Math.max(...elementsToAlign.map(el => el.position.x + el.size.width));
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, x: rightmost - el.size.width } });
        });
        break;
      case 'center':
        const centerX = (Math.min(...elementsToAlign.map(el => el.position.x)) + 
                       Math.max(...elementsToAlign.map(el => el.position.x + el.size.width))) / 2;
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, x: centerX - el.size.width / 2 } });
        });
        break;
      case 'top':
        const topmost = Math.min(...elementsToAlign.map(el => el.position.y));
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, y: topmost } });
        });
        break;
      case 'middle':
        const centerY = (Math.min(...elementsToAlign.map(el => el.position.y)) + 
                        Math.max(...elementsToAlign.map(el => el.position.y + el.size.height))) / 2;
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, y: centerY - el.size.height / 2 } });
        });
        break;
      case 'bottom':
        const bottommost = Math.max(...elementsToAlign.map(el => el.position.y + el.size.height));
        elementsToAlign.forEach(el => {
          updateElement(el.id, { position: { ...el.position, y: bottommost - el.size.height } });
        });
        break;
    }
  }, [selectedElements, elements, updateElement]);

  // ================= SISTEMA DE COPIAR/PEGAR =================
  const copySelectedElements = useCallback(() => {
    const elementsToCopy = elements.filter(el => 
      selectedElements.includes(el.id) || el.id === selectedElement
    );
    setCopiedElements(elementsToCopy);
  }, [elements, selectedElements, selectedElement]);

  const pasteElements = useCallback(() => {
    if (copiedElements.length === 0) return;
    
    const newElements: Element[] = copiedElements.map(el => ({
      ...el,
      id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: { x: el.position.x + 20, y: el.position.y + 20 },
      zIndex: Math.max(...elements.map(e => e.zIndex)) + 1
    }));
    
    setElements(prev => [...prev, ...newElements]);
    setSelectedElements(newElements.map(el => el.id));
    setSelectedElement(newElements[0]?.id || null);
  }, [copiedElements, elements]);

  // ================= HERRAMIENTAS DE DISTRIBUCIÓN =================
  const distributeSelectedElements = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedElements.length < 3) return;
    
    const elementsToDistribute = elements.filter(el => selectedElements.includes(el.id))
      .sort((a, b) => direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y);
    
    if (elementsToDistribute.length < 3) return;
    
    const first = elementsToDistribute[0];
    const last = elementsToDistribute[elementsToDistribute.length - 1];
    
    const totalSpace = direction === 'horizontal' 
      ? (last.position.x + last.size.width) - first.position.x
      : (last.position.y + last.size.height) - first.position.y;
    
    const totalElementSize = elementsToDistribute.reduce((sum, el) => 
      sum + (direction === 'horizontal' ? el.size.width : el.size.height), 0
    );
    
    const spacing = (totalSpace - totalElementSize) / (elementsToDistribute.length - 1);
    
    let currentPosition = direction === 'horizontal' ? first.position.x : first.position.y;
    
    elementsToDistribute.forEach((el, index) => {
      if (index === 0) {
        currentPosition += direction === 'horizontal' ? el.size.width : el.size.height;
        return;
      }
      if (index === elementsToDistribute.length - 1) return;
      
      currentPosition += spacing;
      
      updateElement(el.id, {
        position: direction === 'horizontal' 
          ? { ...el.position, x: currentPosition }
          : { ...el.position, y: currentPosition }
      });
      
      currentPosition += direction === 'horizontal' ? el.size.width : el.size.height;
    });
  }, [selectedElements, elements, updateElement]);

  // ================= HERRAMIENTAS DE MEDICIÓN =================
  const startMeasurement = useCallback((x: number, y: number) => {
    setMeasurementStart({ x, y });
    setMeasurementEnd(null);
    setShowMeasurements(true);
  }, []);

  const updateMeasurement = useCallback((x: number, y: number) => {
    if (measurementStart) {
      setMeasurementEnd({ x, y });
    }
  }, [measurementStart]);

  const getDistance = useCallback(() => {
    if (!measurementStart || !measurementEnd) return 0;
    const dx = measurementEnd.x - measurementStart.x;
    const dy = measurementEnd.y - measurementStart.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [measurementStart, measurementEnd]);

  // ================= ZOOM CON RUEDA DEL MOUSE =================
  const handleWheel = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
    }
  }, []);

  // Generar QR Code
  const generateQRCode = async () => {
    try {
      const qrData = {
        prescriptionId: prescriptionData.prescriptionId,
        patientName: prescriptionData.patientName,
        doctorName: prescriptionData.doctorName,
        date: prescriptionData.date
      };
      const qrCodeDataURL = await QRCodeLib.toDataURL(JSON.stringify(qrData));
      setQrCodeUrl(qrCodeDataURL);
      
      // Actualizar elemento QR si existe
      const qrElement = elements.find(el => el.type === 'qr');
      if (qrElement) {
        updateElement(qrElement.id, { content: qrCodeDataURL });
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      setValidationErrors(prev => [...prev, {
        field: 'qr',
        message: 'Error al generar código QR. Verifique los datos.',
        severity: 'error'
      }]);
    }
  };

  const throttledMouseMove = useCallback(
    throttle((event: MouseEvent) => {
      handleMouseMove(event);
    }, 16), // Aproximadamente 60fps
    [handleMouseMove]
  );

  // ================= EFECTOS =================
  // Efecto para eventos del mouse
  useEffect(() => {
    if (draggedElement || isResizing) {
      document.addEventListener('mousemove', throttledMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', throttledMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedElement, isResizing, throttledMouseMove, handleMouseUp]);

  // Efecto para agregar al historial
  useEffect(() => {
    if (!isUndoRedo && (elements.length > 0 || Object.keys(prescriptionData).length > 0)) {
      const timeoutId = setTimeout(() => {
        addToHistory();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [elements, prescriptionData, addToHistory, isUndoRedo]);

  // Efecto para guardado automático
  useEffect(() => {
    if (autoSave && !isUndoRedo) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage();
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [elements, prescriptionData, autoSave, isUndoRedo]);

  // Efecto para shortcuts de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevenir atajos cuando se está editando texto
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const isCtrl = ctrlKey || metaKey;

      if (isCtrl) {
        switch (key) {
          case 'z':
            event.preventDefault();
            if (shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'c':
            if (selectedElement || selectedElements.length > 0) {
              event.preventDefault();
              copySelectedElements();
            }
            break;
          case 'v':
            if (altKey && selectedElements.length >= 3) {
              event.preventDefault();
              distributeSelectedElements('vertical');
            } else {
              event.preventDefault();
              pasteElements();
            }
            break;
          case 'd':
            event.preventDefault();
            if (selectedElement) {
              duplicateElement(selectedElement);
            }
            break;
          case 'a':
            event.preventDefault();
            setSelectedElements(elements.filter(el => el.isVisible).map(el => el.id));
            break;
          case 'g':
            event.preventDefault();
            setShowGrid(!showGrid);
            break;
          case 'r':
            if (altKey) {
              event.preventDefault();
              setShowRulers(!showRulers);
            }
            break;
          case 'l':
            if (altKey) {
              event.preventDefault();
              setShowElementPanel(!showElementPanel);
            }
            break;
          case 'h':
            if (altKey && selectedElements.length >= 3) {
              event.preventDefault();
              distributeSelectedElements('horizontal');
            }
            break;
          case 'm':
            if (altKey) {
              event.preventDefault();
              setShowMeasurements(!showMeasurements);
            }
            break;
          case '=':
          case '+':
            event.preventDefault();
            setZoom(prev => Math.min(3, prev + 0.25));
            break;
          case '-':
            event.preventDefault();
            setZoom(prev => Math.max(0.25, prev - 0.25));
            break;
          case '0':
            event.preventDefault();
            setZoom(1);
            break;
        }
      }
      
      // Teclas sin Ctrl
      switch (key) {
        case 'Delete':
        case 'Backspace':
          if (selectedElement || selectedElements.length > 0) {
            event.preventDefault();
            if (selectedElements.length > 0) {
              selectedElements.forEach(id => deleteElement(id));
            } else if (selectedElement) {
              deleteElement(selectedElement);
            }
          }
          break;
        case 'Escape':
          setSelectedElement(null);
          setSelectedElements([]);
          setMeasurementStart(null);
          setMeasurementEnd(null);
          setShowMeasurements(false);
          break;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [selectedElement, selectedElements, undo, redo, copySelectedElements, pasteElements, showGrid, showRulers, showElementPanel, distributeSelectedElements, showMeasurements]);

  // Efecto para cargar datos al inicio
  useEffect(() => {
    loadFromLocalStorage();
    generateQRCode();
  }, []);

  // Efecto para validación automática
  useEffect(() => {
    if (showValidation) {
      const timeoutId = setTimeout(() => {
        validatePrescription();
        checkDrugInteractionsAdvanced();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [prescriptionData, showValidation]);

  // Funciones de exportación y acciones
  const handleSave = async () => {
    const medicationValidation = validateArrayField(
      prescriptionData.medications.map(m => m.name),
      'medications',
      true
    );

    if (!medicationValidation.isValid) {
      alert('Error en medicamentos: ' + medicationValidation.errors.join(', '));
      return;
    }

    const prescriptionDataToSave = {
      patient_id: patientId,
      medications: prescriptionData.medications.filter(m => m.name),
      diagnosis: prescriptionData.diagnosis,
      notes: prescriptionData.notes,
      created_at: new Date().toISOString(),
      expires_at: calculatePrescriptionExpiry(prescriptionData.medications).toISOString(),
      prescription_style: {
        template_elements: elements,
        canvas_settings: {
          backgroundColor,
          backgroundImage,
          canvasSize,
          zoom
        }
      }
    };

    await onSave(prescriptionDataToSave);
  };

  const handlePrint = () => {
    const printContent = canvasRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receta Médica</title>
          <style>
            body { margin: 0; padding: 20px; }
            .canvas { 
              width: 794px; 
              height: 1123px; 
              position: relative;
              background: ${backgroundColor};
              ${backgroundImage ? `background-image: url(${backgroundImage}); background-size: cover;` : ''}
            }
            @media print {
              body { margin: 0; }
              .canvas { page-break-inside: avoid; }
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

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

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
        if (element.content.startsWith('data:image/')) {
          return (
            <img 
              src={element.content} 
              alt="Logo" 
              className="w-full h-full object-contain"
              style={{ borderRadius: '4px' }}
            />
          );
        }
        return element.content;
      
      case 'qr':
        if (qrCodeUrl) {
          return <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />;
        }
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-300 rounded">
            <QrCode className="h-full w-full text-gray-600" />
          </div>
        );
      
      case 'separator':
        return null;
      
      case 'date':
        return new Date().toLocaleDateString();
      
      case 'time':
        return new Date().toLocaleTimeString();
      
      case 'table':
        const rows = element.content.split('\n');
        return (
          <table className="w-full text-xs border-collapse">
            {rows.map((row, index) => {
              const cols = row.split('|').map(col => col.trim());
              return (
                <tr key={index} className={index === 0 ? 'font-bold' : ''}>
                  {cols.map((col, colIndex) => (
                    <td key={colIndex} className="border border-gray-400 px-1 py-0.5">
                      {col}
                    </td>
                  ))}
                </tr>
              );
            })}
          </table>
        );
      
      case 'icon':
        const IconComponent = {
          'user': User,
          'phone': Phone,
          'mail': Mail,
          'calendar': Calendar,
          'clock': Clock,
          'location': MapPin,
          'stethoscope': Stethoscope,
          'heart': Heart,
          'pill': Pill,
          'thermometer': Thermometer
        }[element.iconType || 'user'] || User;
        
        return (
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent className="h-8 w-8" />
          </div>
        );
      
      default:
        return element.content;
    }
  };

  // ================= FUNCIONES DE LÍMITES Y VALIDACIÓN DE POSICIÓN =================
  const constrainToCanvas = (x: number, y: number, width: number, height: number) => {
    const newX = Math.max(0, Math.min(x, canvasSize.width - width));
    const newY = Math.max(0, Math.min(y, canvasSize.height - height));
    return { x: newX, y: newY };
  };

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Barra lateral izquierda - Herramientas */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Editor Visual Avanzado</h2>
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
        
        {/* Barra de herramientas mejorada */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded ${historyIndex <= 0 ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded ${historyIndex >= history.length - 1 ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-xs text-gray-400">
                Guardado: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`p-1 rounded text-xs ${autoSave ? 'text-green-400' : 'text-gray-400'}`}
              title="Guardado automático"
            >
              <Database className="h-3 w-3" />
            </button>
            <button
              onClick={() => setShowElementPanel(!showElementPanel)}
              className="p-1 rounded text-xs text-gray-400 hover:text-white"
              title="Panel de Capas"
            >
              <Layers className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Panel de validación */}
        {showValidation && (validationErrors.length > 0 || drugInteractions.length > 0) && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1 text-yellow-400" />
                Validación Médica
              </h4>
              <button
                onClick={() => setShowValidation(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            {validationErrors.map((error, index) => (
              <div key={index} className={`text-xs mb-1 ${
                error.severity === 'error' ? 'text-red-400' : 
                error.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
              }`}>
                • {error.message}
              </div>
            ))}
            
            {drugInteractions.map((interaction, index) => (
              <div key={index} className={`text-xs mb-1 ${
                interaction.severity === 'major' ? 'text-red-400' : 
                interaction.severity === 'moderate' ? 'text-yellow-400' : 'text-blue-400'
              }`}>
                ⚠️ {interaction.drug1} + {interaction.drug2}: {interaction.description}
              </div>
            ))}
          </div>
        )}

        {/* Panel de Diseño */}
        <div className="mb-4">
          <h2 className="text-white font-medium text-lg mb-3 flex items-center">
            <Type className="h-5 w-5 mr-2" />
            Panel de Diseño
          </h2>
        </div>

        <div className="space-y-4">
            {/* Plantillas Predefinidas */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-300 font-medium flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Plantillas
                </h3>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-gray-400 hover:text-white"
                >
                  {showTemplates ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              </div>
              
              {showTemplates && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-2">Categoría</label>
                    <select
                      value={selectedTemplateCategory}
                      onChange={(e) => setSelectedTemplateCategory(e.target.value as any)}
                      className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    >
                      <option value="all">Todas</option>
                      <option value="general">General</option>
                      <option value="pediatric">Pediátrica</option>
                      <option value="geriatric">Geriátrica</option>
                      <option value="specialist">Especialista</option>
                      <option value="emergency">Urgencias</option>
                    </select>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {getFilteredTemplates().map((template) => (
                      <div
                        key={template.id}
                        className="p-2 bg-gray-600 rounded hover:bg-gray-500 cursor-pointer"
                        onClick={() => loadTemplate(template.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white text-sm font-medium">{template.name}</h4>
                            <p className="text-gray-400 text-xs">{template.description}</p>
                          </div>
                          <div className="flex items-center">
                            {template.category === 'pediatric' && <Heart className="h-4 w-4 text-pink-400" />}
                            {template.category === 'geriatric' && <User className="h-4 w-4 text-orange-400" />}
                            {template.category === 'specialist' && <Stethoscope className="h-4 w-4 text-blue-400" />}
                            {template.category === 'emergency' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                            {template.category === 'general' && <FileText className="h-4 w-4 text-gray-400" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-600">
                    💡 Haz clic en una plantilla para cargarla en el canvas
                  </div>
                </div>
              )}
            </div>

            {/* Control de Tipografía Global */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                <Type className="h-4 w-4 mr-2" />
                Tipografía Global
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Presets de Fuente</label>
                  <div className="grid grid-cols-1 gap-1">
                    {fontPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => updateGlobalFont(preset.font, preset.size)}
                        className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-xs text-left"
                      >
                        <span className="font-medium">{preset.name}</span>
                        <br />
                        <span className="text-gray-400">{preset.font} - {preset.size}px</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Control de Logo */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                <Image className="h-4 w-4 mr-2" />
                Logo de la Receta
              </h3>
              
              <div className="space-y-3">
                {logoPreview ? (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-full h-20 object-contain bg-gray-600 rounded border"
                    />
                    <button
                      onClick={removeLogoImage}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 rounded text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-gray-600 border-2 border-dashed border-gray-500 rounded">
                    <span className="text-gray-400 text-sm">Sin logo</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Subir Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-600 file:text-gray-300"
                  />
                </div>
                
                <button
                  onClick={() => addElement('logo')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                >
                  Agregar Logo al Canvas
                </button>
              </div>
            </div>

            {/* Agregar Elementos */}
            <div>
              <h3 className="text-gray-300 font-medium mb-3">Agregar Elementos</h3>
              
              {/* Elementos de Texto */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">Texto</h4>
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              </div>

              {/* Elementos Médicos */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">Médicos</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addElement('signature')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <FileSignature className="h-4 w-4 mr-1" />
                    Firma
                  </button>
                  <button
                    onClick={() => addElement('table')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <Table className="h-4 w-4 mr-1" />
                    Tabla
                  </button>
                </div>
              </div>

              {/* Elementos Visuales */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">Visuales</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addElement('logo')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <Image className="h-4 w-4 mr-1" />
                    Logo
                  </button>
                  <button
                    onClick={() => addElement('qr')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR
                  </button>
                  <button
                    onClick={() => addElement('separator')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <Separator className="h-4 w-4 mr-1" />
                    Línea
                  </button>
                </div>
              </div>

              {/* Elementos de Fecha/Hora */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">Fecha y Hora</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addElement('date')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Fecha
                  </button>
                  <button
                    onClick={() => addElement('time')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Hora
                  </button>
                </div>
              </div>

              {/* Iconos Médicos */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">Iconos Médicos</h4>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => addElement('icon', 'user')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <User className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => addElement('icon', 'stethoscope')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <Stethoscope className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => addElement('icon', 'heart')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <Heart className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => addElement('icon', 'pill')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <Pill className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => addElement('icon', 'thermometer')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <Thermometer className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => addElement('icon', 'phone')}
                    className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                  >
                    <Phone className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Configuración de Fondo */}
            <div>
              <h3 className="text-gray-300 font-medium mb-2">Fondo</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded border-gray-600"
                  />
                  <span className="text-gray-300 text-sm">Color de fondo</span>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Imagen de fondo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-600 file:text-gray-300"
                  />
                  {backgroundImage && (
                    <button
                      onClick={() => setBackgroundImage(null)}
                      className="mt-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Eliminar imagen
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Propiedades del Elemento */}
            {selectedElementData && (
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Propiedades del Elemento
                </h3>
                <div className="space-y-3">
                  {/* Información del elemento */}
                  <div className="p-2 bg-gray-600 rounded">
                    <span className="text-xs text-gray-400">Elemento seleccionado:</span>
                    <br />
                    <span className="text-sm text-white font-medium">{selectedElementData.id}</span>
                  </div>

                  {/* Presets de tipografía rápidos */}
                  {selectedElementData.type !== 'separator' && selectedElementData.type !== 'qr' && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Estilo Rápido</label>
                      <div className="grid grid-cols-2 gap-1">
                        {fontPresets.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => applyFontPreset(preset)}
                            className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-xs"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Posición */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">X</label>
                      <input
                        type="number"
                        value={selectedElementData.position.x}
                        onChange={(e) => updateElement(selectedElement!, {
                          position: { ...selectedElementData.position, x: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Y</label>
                      <input
                        type="number"
                        value={selectedElementData.position.y}
                        onChange={(e) => updateElement(selectedElement!, {
                          position: { ...selectedElementData.position, y: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Tamaño */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Ancho</label>
                      <input
                        type="number"
                        value={selectedElementData.size.width}
                        onChange={(e) => updateElement(selectedElement!, {
                          size: { ...selectedElementData.size, width: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Alto</label>
                      <input
                        type="number"
                        value={selectedElementData.size.height}
                        onChange={(e) => updateElement(selectedElement!, {
                          size: { ...selectedElementData.size, height: Number(e.target.value) }
                        })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>

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
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  )}

                  {/* Familia de Fuente */}
                  {selectedElementData.type !== 'separator' && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Fuente</label>
                      <select
                        value={selectedElementData.style.fontFamily || 'Arial'}
                        onChange={(e) => updateElementStyle(selectedElement!, {
                          fontFamily: e.target.value
                        })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>
                  )}

                  {/* Color */}
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Color</label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        value={selectedElementData.style.color || '#000000'}
                        onChange={(e) => updateElementStyle(selectedElement!, {
                          color: e.target.value
                        })}
                        className="w-8 h-8 rounded border-gray-600"
                      />
                      <input
                        type="text"
                        value={selectedElementData.style.color || '#000000'}
                        onChange={(e) => updateElementStyle(selectedElement!, {
                          color: e.target.value
                        })}
                        className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Alineación de Texto */}
                  {selectedElementData.type !== 'separator' && selectedElementData.type !== 'qr' && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Alineación</label>
                      <div className="flex space-x-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateElementStyle(selectedElement!, { textAlign: align })}
                            className={`p-2 rounded ${
                              selectedElementData.style.textAlign === align
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="h-4 w-4" />}
                            {align === 'center' && <AlignCenter className="h-4 w-4" />}
                            {align === 'right' && <AlignRight className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estilo de Texto */}
                  {selectedElementData.type !== 'separator' && selectedElementData.type !== 'qr' && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Estilo</label>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => updateElementStyle(selectedElement!, {
                            fontWeight: selectedElementData.style.fontWeight === 'bold' ? 'normal' : 'bold'
                          })}
                          className={`p-2 rounded ${
                            selectedElementData.style.fontWeight === 'bold'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Bold className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateElementStyle(selectedElement!, {
                            fontStyle: selectedElementData.style.fontStyle === 'italic' ? 'normal' : 'italic'
                          })}
                          className={`p-2 rounded ${
                            selectedElementData.style.fontStyle === 'italic'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Italic className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateElementStyle(selectedElement!, {
                            textDecoration: selectedElementData.style.textDecoration === 'underline' ? 'none' : 'underline'
                          })}
                          className={`p-2 rounded ${
                            selectedElementData.style.textDecoration === 'underline'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Underline className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Contenido */}
                  {selectedElementData.type !== 'separator' && selectedElementData.type !== 'qr' && selectedElementData.type !== 'date' && selectedElementData.type !== 'time' && selectedElementData.type !== 'icon' && (
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Contenido</label>
                      <textarea
                        value={selectedElementData.content}
                        onChange={(e) => updateElement(selectedElement!, { content: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => duplicateElement(selectedElement!)}
                      className="flex-1 flex items-center justify-center px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicar
                    </button>
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

            {/* Herramientas de Alineación */}
            {selectedElements.length > 1 && (
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                  <AlignLeft className="h-4 w-4 mr-2" />
                  Alineación ({selectedElements.length} elementos)
                </h3>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    onClick={() => alignSelectedElements('left')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear a la izquierda"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alignSelectedElements('center')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear al centro"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alignSelectedElements('right')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear a la derecha"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alignSelectedElements('top')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear arriba"
                  >
                    <AlignLeft className="h-4 w-4 transform rotate-90" />
                  </button>
                  <button
                    onClick={() => alignSelectedElements('middle')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear al medio"
                  >
                    <AlignCenter className="h-4 w-4 transform rotate-90" />
                  </button>
                  <button
                    onClick={() => alignSelectedElements('bottom')}
                    className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                    title="Alinear abajo"
                  >
                    <AlignRight className="h-4 w-4 transform rotate-90" />
                  </button>
                </div>

                {/* Herramientas de Distribución */}
                {selectedElements.length >= 3 && (
                  <div className="border-t border-gray-600 pt-3">
                    <h4 className="text-gray-400 text-xs mb-2">Distribución Equitativa</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => distributeSelectedElements('horizontal')}
                        className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                        title="Distribuir horizontalmente (Ctrl+Alt+H)"
                      >
                        <Move className="h-4 w-4 mr-1" />
                        Horizontal
                      </button>
                      <button
                        onClick={() => distributeSelectedElements('vertical')}
                        className="flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 text-sm"
                        title="Distribuir verticalmente (Ctrl+Alt+V)"
                      >
                        <Move className="h-4 w-4 transform rotate-90 mr-1" />
                        Vertical
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Herramientas de Copiar/Pegar */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                <Copy className="h-4 w-4 mr-2" />
                Copiar/Pegar
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copySelectedElements}
                  disabled={!selectedElement && selectedElements.length === 0}
                  className={`flex items-center justify-center p-2 rounded text-sm ${
                    selectedElement || selectedElements.length > 0
                      ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Copiar elementos (Ctrl+C)"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </button>
                <button
                  onClick={pasteElements}
                  disabled={copiedElements.length === 0}
                  className={`flex items-center justify-center p-2 rounded text-sm ${
                    copiedElements.length > 0
                      ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Pegar elementos (Ctrl+V)"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Pegar
                </button>
              </div>
              
              {copiedElements.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  📋 {copiedElements.length} elemento(s) copiado(s)
                </div>
              )}
            </div>

            {/* Configuración del Canvas */}
            <div>
              <h3 className="text-gray-300 font-medium mb-2">Canvas Avanzado</h3>
              
              {/* Grilla */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Mostrar grilla</span>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showGrid ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showGrid ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Snap to Grid */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Snap to grid</span>
                <button
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    snapToGrid ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      snapToGrid ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Tamaño de grilla */}
              <div className="mb-2">
                <label className="block text-gray-400 text-xs mb-1">Tamaño de grilla</label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                >
                  <option value={10}>10px</option>
                  <option value={20}>20px</option>
                  <option value={25}>25px</option>
                  <option value={50}>50px</option>
                </select>
              </div>

              {/* Guías de alineación */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Guías inteligentes</span>
                <button
                  onClick={() => setShowGuides(!showGuides)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showGuides ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showGuides ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Reglas */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Mostrar reglas</span>
                <button
                  onClick={() => setShowRulers(!showRulers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showRulers ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showRulers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Herramientas de Medición */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Herramientas de medición</span>
                <button
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showMeasurements ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showMeasurements ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {showMeasurements && measurementStart && measurementEnd && (
                <div className="mt-2 p-2 bg-gray-600 rounded text-xs">
                  <div className="text-gray-300">📏 Distancia: {Math.round(getDistance())}px</div>
                  <div className="text-gray-400">
                    ΔX: {Math.round(measurementEnd.x - measurementStart.x)}px | 
                    ΔY: {Math.round(measurementEnd.y - measurementStart.y)}px
                  </div>
                </div>
              )}
            </div>

            {/* Atajos de Teclado */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Atajos de Teclado
              </h3>
              
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Deshacer/Rehacer</span>
                  <span>Ctrl+Z / Ctrl+Y</span>
                </div>
                <div className="flex justify-between">
                  <span>Copiar/Pegar</span>
                  <span>Ctrl+C / Ctrl+V</span>
                </div>
                <div className="flex justify-between">
                  <span>Seleccionar todo</span>
                  <span>Ctrl+A</span>
                </div>
                <div className="flex justify-between">
                  <span>Duplicar</span>
                  <span>Ctrl+D</span>
                </div>
                <div className="flex justify-between">
                  <span>Eliminar</span>
                  <span>Del / Backspace</span>
                </div>
                <div className="flex justify-between">
                  <span>Zoom</span>
                  <span>Ctrl + Mouse Wheel</span>
                </div>
                <div className="flex justify-between">
                  <span>Grilla</span>
                  <span>Ctrl+G</span>
                </div>
                <div className="flex justify-between">
                  <span>Distribuir H/V</span>
                  <span>Ctrl+Alt+H/V</span>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-gray-300 font-medium mb-3 flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Acciones Rápidas
              </h3>
              
              <div className="space-y-2">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Receta
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </button>
                <button
                  onClick={generateQRCode}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Actualizar QR
                </button>
              </div>
            </div>
          </div>
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
                  backgroundSize: `${gridSize}px ${gridSize}px`
                }}
              />
            )}

            {/* Guías de alineación */}
            {alignmentGuides.map((guide, index) => (
              <div
                key={index}
                className="absolute pointer-events-none"
                style={{
                  backgroundColor: '#ff0080',
                  opacity: 0.7,
                  zIndex: 1000,
                  ...(guide.type === 'vertical' 
                    ? { 
                        left: guide.position, 
                        top: 0, 
                        width: '1px', 
                        height: '100%' 
                      }
                    : { 
                        left: 0, 
                        top: guide.position, 
                        width: '100%', 
                        height: '1px' 
                      }
                  )
                }}
              />
            ))}

            {/* Reglas */}
            {showRulers && (
              <>
                {/* Regla horizontal */}
                <div className="absolute -top-5 left-0 right-0 h-5 bg-gray-200 border-b border-gray-300 text-xs">
                  {Array.from({ length: Math.ceil(canvasSize.width / 50) }, (_, i) => (
                    <div
                      key={i}
                      className="absolute text-gray-600"
                      style={{ left: i * 50, top: 2 }}
                    >
                      {i * 50}
                    </div>
                  ))}
                </div>
                
                {/* Regla vertical */}
                <div className="absolute -left-5 top-0 bottom-0 w-5 bg-gray-200 border-r border-gray-300 text-xs">
                  {Array.from({ length: Math.ceil(canvasSize.height / 50) }, (_, i) => (
                    <div
                      key={i}
                      className="absolute text-gray-600 transform -rotate-90 origin-left"
                      style={{ left: 2, top: i * 50 + 10 }}
                    >
                      {i * 50}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Elementos */}
            {elements
              .filter(el => el.isVisible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(element => (
                <div
                  key={element.id}
                  onClick={(e) => handleElementClick(element.id, e)}
                  onMouseDown={(e) => handleMouseDown(element.id, e)}
                  className={`select-none ${element.isLocked ? 'pointer-events-none' : ''}`}
                  style={{
                    ...getElementStyle(element),
                    cursor: element.isLocked ? 'default' : 'move'
                  }}
                >
                  {renderElement(element)}
                  
                  {/* Asas de selección avanzadas */}
                  {selectedElement === element.id && (
                    <>
                      {/* Borde de selección */}
                      <div className="absolute -inset-1 border-2 border-blue-500 pointer-events-none" />
                      
                      {/* Asas de esquina para redimensionar */}
                      <div 
                        className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-sm cursor-nw-resize hover:bg-blue-600 z-10"
                        data-resize-handle="nw"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'nw', e);
                        }}
                      />
                      <div 
                        className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-sm cursor-ne-resize hover:bg-blue-600 z-10"
                        data-resize-handle="ne"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'ne', e);
                        }}
                      />
                      <div 
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-sm cursor-sw-resize hover:bg-blue-600 z-10"
                        data-resize-handle="sw"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'sw', e);
                        }}
                      />
                      <div 
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize hover:bg-blue-600 z-10"
                        data-resize-handle="se"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'se', e);
                        }}
                      />
                      
                      {/* Asas de lado para redimensionar */}
                      <div 
                        className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 rounded-sm cursor-n-resize hover:bg-blue-600 z-10"
                        data-resize-handle="n"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'n', e);
                        }}
                      />
                      <div 
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 rounded-sm cursor-s-resize hover:bg-blue-600 z-10"
                        data-resize-handle="s"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 's', e);
                        }}
                      />
                      <div 
                        className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 rounded-sm cursor-w-resize hover:bg-blue-600 z-10"
                        data-resize-handle="w"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'w', e);
                        }}
                      />
                      <div 
                        className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 rounded-sm cursor-e-resize hover:bg-blue-600 z-10"
                        data-resize-handle="e"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(element.id, 'e', e);
                        }}
                      />
                      
                      {/* Información del elemento */}
                      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {element.size.width} × {element.size.height}
                      </div>
                    </>
                  )}
                  
                  {/* Indicador de selección múltiple */}
                  {selectedElements.includes(element.id) && selectedElement !== element.id && (
                    <div className="absolute -inset-1 border-2 border-orange-400 pointer-events-none opacity-70" />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Barra lateral derecha - Capas Avanzadas */}
      {showElementPanel && (
        <div className="w-72 bg-gray-800 border-l border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              Capas ({elements.length})
            </h3>
            <button
              onClick={() => setShowElementPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Herramientas de Capas */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {selectedElements.length > 0 ? `${selectedElements.length} seleccionados` : 'Ninguno seleccionado'}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  if (selectedElement) {
                    const element = elements.find(el => el.id === selectedElement);
                    if (element) {
                      updateElement(selectedElement, { 
                        zIndex: Math.max(...elements.map(el => el.zIndex)) + 1 
                      });
                    }
                  }
                }}
                disabled={!selectedElement}
                className={`p-1 rounded text-xs ${
                  selectedElement ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' : 'bg-gray-700 text-gray-500'
                }`}
                title="Traer al frente"
              >
                ↑
              </button>
              <button
                onClick={() => {
                  if (selectedElement) {
                    const element = elements.find(el => el.id === selectedElement);
                    if (element) {
                      updateElement(selectedElement, { 
                        zIndex: Math.min(...elements.map(el => el.zIndex)) - 1 
                      });
                    }
                  }
                }}
                disabled={!selectedElement}
                className={`p-1 rounded text-xs ${
                  selectedElement ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' : 'bg-gray-700 text-gray-500'
                }`}
                title="Enviar atrás"
              >
                ↓
              </button>
            </div>
          </div>
          
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {elements
              .sort((a, b) => b.zIndex - a.zIndex)
              .map(element => (
                <div
                  key={element.id}
                  onClick={() => handleMultiSelect(element.id, false)}
                  className={`group flex items-center justify-between p-3 rounded cursor-pointer transition-all ${
                    selectedElement === element.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : selectedElements.includes(element.id)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="mr-2 flex-shrink-0">
                      {element.type === 'text' && <Type className="h-4 w-4" />}
                      {element.type === 'logo' && <Image className="h-4 w-4" />}
                      {element.type === 'signature' && <FileSignature className="h-4 w-4" />}
                      {element.type === 'qr' && <QrCode className="h-4 w-4" />}
                      {element.type === 'separator' && <Separator className="h-4 w-4" />}
                      {element.type === 'box' && <Square className="h-4 w-4" />}
                      {element.type === 'date' && <Calendar className="h-4 w-4" />}
                      {element.type === 'time' && <Clock className="h-4 w-4" />}
                      {element.type === 'table' && <Table className="h-4 w-4" />}
                      {element.type === 'icon' && <User className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                      </div>
                      <div className="text-xs opacity-75 truncate">
                        {element.size.width}×{element.size.height} | Z:{element.zIndex}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(element.id, { isLocked: !element.isLocked });
                      }}
                      className={`p-1 rounded transition-colors ${
                        element.isLocked
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      title={element.isLocked ? 'Desbloquear' : 'Bloquear'}
                    >
                      {element.isLocked ? <Shield className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(element.id, { isVisible: !element.isVisible });
                      }}
                      className={`p-1 rounded transition-colors ${
                        element.isVisible
                          ? 'text-gray-300 hover:text-white'
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                      title={element.isVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateElement(element.id);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Duplicar elemento"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="p-1 rounded text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar elemento"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {elements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay elementos en el canvas</p>
              <p className="text-xs">Agrega elementos desde el panel de diseño</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisualPrescriptionEditor; 