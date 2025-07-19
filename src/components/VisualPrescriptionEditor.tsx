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
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
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
  const { validateArrayField, validateJSONBField, hasErrors, getAllErrors } = useValidation();

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
  const [activeTab, setActiveTab] = useState<'design' | 'content' | 'preview'>('design');
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
    }
  };

  // ================= EFECTOS =================
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
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
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
            saveToLocalStorage();
            break;
          case 'd':
            event.preventDefault();
            if (selectedElement) {
              duplicateElement(selectedElement);
            }
            break;
        }
      }
      
      if (event.key === 'Delete' && selectedElement) {
        event.preventDefault();
        deleteElement(selectedElement);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, undo, redo]);

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
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300"
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

            {/* Configuración del Canvas */}
            <div>
              <h3 className="text-gray-300 font-medium mb-2">Canvas</h3>
              <div className="flex items-center justify-between">
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
                  <div className="grid grid-cols-1 gap-2">
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
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => {
                        const newMeds = [...prescriptionData.medications];
                        newMeds[index].frequency = e.target.value;
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Frecuencia"
                    />
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => {
                        const newMeds = [...prescriptionData.medications];
                        newMeds[index].duration = e.target.value;
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Duración"
                    />
                    <textarea
                      value={med.instructions}
                      onChange={(e) => {
                        const newMeds = [...prescriptionData.medications];
                        newMeds[index].instructions = e.target.value;
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      placeholder="Instrucciones"
                      rows={2}
                    />
                  </div>
                  {prescriptionData.medications.length > 1 && (
                    <button
                      onClick={() => {
                        const newMeds = prescriptionData.medications.filter((_, i) => i !== index);
                        setPrescriptionData(prev => ({ ...prev, medications: newMeds }));
                      }}
                      className="mt-2 text-red-400 hover:text-red-300 text-sm"
                    >
                      Eliminar medicamento
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPrescriptionData(prev => ({
                  ...prev,
                  medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '', warnings: '', contraindications: '' }]
                }))}
                className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-400 rounded text-sm"
              >
                + Agregar medicamento
              </button>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Notas adicionales</label>
              <textarea
                value={prescriptionData.notes}
                onChange={(e) => setPrescriptionData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                rows={3}
                placeholder="Instrucciones especiales, recomendaciones..."
              />
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
                <button 
                  onClick={generateQRCode}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Actualizar QR
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

      {/* Barra lateral derecha - Capas */}
      {showElementPanel && (
        <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Elementos (Capas)</h3>
            <button
              onClick={() => setShowElementPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {elements
              .sort((a, b) => b.zIndex - a.zIndex)
              .map(element => (
                <div
                  key={element.id}
                  onClick={() => setSelectedElement(element.id)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedElement === element.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    {element.type === 'text' && <Type className="h-4 w-4 mr-2" />}
                    {element.type === 'logo' && <Image className="h-4 w-4 mr-2" />}
                    {element.type === 'signature' && <FileSignature className="h-4 w-4 mr-2" />}
                    {element.type === 'qr' && <QrCode className="h-4 w-4 mr-2" />}
                    {element.type === 'separator' && <Separator className="h-4 w-4 mr-2" />}
                    {element.type === 'box' && <Square className="h-4 w-4 mr-2" />}
                    {element.type === 'date' && <Calendar className="h-4 w-4 mr-2" />}
                    {element.type === 'time' && <Clock className="h-4 w-4 mr-2" />}
                    {element.type === 'table' && <Table className="h-4 w-4 mr-2" />}
                    {element.type === 'icon' && <User className="h-4 w-4 mr-2" />}
                    <span className="text-sm truncate">
                      {element.id.charAt(0).toUpperCase() + element.id.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateElement(element.id, { isVisible: !element.isVisible });
                      }}
                      className={`p-1 rounded ${
                        element.isVisible
                          ? 'text-gray-300 hover:text-white'
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualPrescriptionEditor; 