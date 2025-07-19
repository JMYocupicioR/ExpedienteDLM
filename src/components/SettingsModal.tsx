import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Save, User, FileText, Settings as SettingsIcon, Shield, 
  Eye, EyeOff, Upload, Download, Bell, Globe, Moon, Sun,
  Smartphone, Clock, Key, LogOut, AlertCircle, CheckCircle,
  Camera, Trash2, Edit3, Lock, Unlock, Monitor,
  Move, Image, ZoomIn, ZoomOut, Grid, Layers, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Calendar, Minus as Separator, Square, QrCode,
  FileSignature, Table, MapPin, Phone, Mail, Copy, RotateCcw, Plus, Edit as EditIcon, Palette, Layout, Type,
  Stethoscope, Loader2, Maximize2
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { supabase } from '../lib/supabase';
import PhysicalExamTemplates from './PhysicalExamTemplates';
import PhysicalExamTemplateEditor from './PhysicalExamTemplateEditor';
import VisualPrescriptionRenderer from './VisualPrescriptionRenderer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onUpdate: (profile: any) => void;
}

type TabType = 'profile' | 'preferences' | 'security' | 'recetas' | 'examTemplates';

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
  show: boolean;
}

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

interface TemplateElement {
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

interface PrescriptionStyleSettings {
  headerStyle: string;
  fontSize: string;
  spacing: string;
  includeQR: boolean;
  includeWatermark: boolean;
  primaryColor: string;
  secondaryColor: string;
  showLogo: boolean;
  logoPosition: 'left' | 'right' | 'center';
  paperSize: string;
  margins: string;
  fontFamily: string;
  
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  
  doctorFullName: string;
  doctorLicense: string;
  doctorSpecialty: string;
  doctorContact: string;
  
  titlePrescription: string;
  titlePatientInfo: string;
  titleDiagnosis: string;
  titleMedications: string;
  titleNotes: string;
  titleSignature: string;
  titleValidity: string;
  logoUrl?: string;
  
  // Nueva propiedad para la plantilla visual
  visualTemplate?: {
    elements: TemplateElement[];
    canvasSettings: {
      backgroundColor: string;
      backgroundImage: string | null;
      canvasSize: { width: number; height: number };
    };
  };
}

export default function SettingsModal({ isOpen, onClose, userProfile, onUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>({ type: 'info', message: '', show: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Profile Settings State
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    specialty: '',
    license_number: '',
    phone: '',
    schedule: {}
  });

  // Prescription Settings State
  const [prescriptionSettings, setPrescriptionSettings] = useState({
    letterhead: '',
    signature: '',
    default_medications: [],
    prescription_style: {
      header_color: '#1f2937',
      font_family: 'Arial',
      logo_url: '',
      footer_text: ''
    }
  });

  // System Preferences State
  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      sms: false,
      appointment_reminders: true,
      system_updates: true
    }
  });

  // Security State
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_enabled: false,
    login_history: [],
    active_sessions: []
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Estados para el editor visual
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 794, height: 1123 }); // Tamaño A4 en píxeles
  const [zoom, setZoom] = useState(0.8);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  // Elementos de la plantilla de receta
  const [templateElements, setTemplateElements] = useState<TemplateElement[]>([
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
      content: 'Paciente: [NOMBRE DEL PACIENTE]\nFecha: [FECHA]',
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

  // Physical exam template management state
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<any>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [examTemplateRefreshKey, setExamTemplateRefreshKey] = useState(0);

  useEffect(() => {
    if (isOpen && userProfile) {
      loadUserData();
    }
  }, [isOpen, userProfile]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load profile data
      setProfileData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        specialty: userProfile.specialty || '',
        license_number: userProfile.license_number || '',
        phone: userProfile.phone || '',
        schedule: userProfile.schedule || {}
      });

      // Load prescription settings
      setPrescriptionSettings({
        letterhead: '',
        signature: '',
        default_medications: [],
        prescription_style: userProfile.prescription_style || {
          header_color: '#1f2937',
          font_family: 'Arial',
          logo_url: '',
          footer_text: ''
        }
      });

      // Load security data (mock data for demo)
      setSecurityData(prev => ({
        ...prev,
        two_factor_enabled: false,
        login_history: [
          { date: '2024-01-15 10:30', ip: '192.168.1.1', device: 'Chrome - Windows' },
          { date: '2024-01-14 15:45', ip: '192.168.1.1', device: 'Safari - iPhone' },
          { date: '2024-01-13 09:15', ip: '10.0.0.1', device: 'Firefox - macOS' }
        ],
        active_sessions: [
          { id: '1', device: 'Chrome - Windows', location: 'Ciudad de México', last_active: '2024-01-15 10:30' },
          { id: '2', device: 'Safari - iPhone', location: 'Ciudad de México', last_active: '2024-01-15 08:15' }
        ]
      }));

    } catch (error) {
      showNotification('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      
      if (!userProfile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      if (typeof onUpdate !== 'function') {
        throw new Error('Función de actualización no disponible');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          specialty: profileData.specialty,
          license_number: profileData.license_number,
          phone: profileData.phone,
          schedule: profileData.schedule
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      const updatedProfile = { ...userProfile, ...profileData };
      onUpdate(updatedProfile);
      showNotification('success', 'Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          prescription_style: prescriptionSettings.prescription_style
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      showNotification('success', 'Configuración de recetas actualizada');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (securityData.new_password !== securityData.confirm_password) {
        showNotification('error', 'Las contraseñas no coinciden');
        return;
      }

      if (securityData.new_password.length < 6) {
        showNotification('error', 'La contraseña debe tener al menos 6 caracteres');
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: securityData.new_password
      });

      if (error) throw error;

      setSecurityData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      showNotification('success', 'Contraseña actualizada correctamente');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setPrescriptionSettings(prev => ({
        ...prev,
        prescription_style: {
          ...prev.prescription_style,
          logo_url: publicUrl
        }
      }));

      showNotification('success', 'Logo subido correctamente');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionTerminate = async (sessionId: string) => {
    try {
      // In a real implementation, this would call an API to terminate the session
      setSecurityData(prev => ({
        ...prev,
        active_sessions: prev.active_sessions.filter(session => session.id !== sessionId)
      }));
      showNotification('success', 'Sesión terminada');
    } catch (error: any) {
      showNotification('error', error.message);
    }
  };

  // Cargar plantilla visual guardada
  useEffect(() => {
    if (userProfile?.prescription_style?.visualTemplate) {
      setTemplateElements(userProfile.prescription_style.visualTemplate.elements);
      setBackgroundColor(userProfile.prescription_style.visualTemplate.canvasSettings.backgroundColor);
      setBackgroundImage(userProfile.prescription_style.visualTemplate.canvasSettings.backgroundImage);
      setCanvasSize(userProfile.prescription_style.visualTemplate.canvasSettings.canvasSize);
    }
  }, [userProfile]);

  // Funciones del editor visual
  const getElementStyle = (element: TemplateElement): React.CSSProperties => ({
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
    
    const element = templateElements.find(el => el.id === elementId);
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
    
    setTemplateElements(prev => prev.map(el => 
      el.id === draggedElement 
        ? { ...el, position: { x: Math.max(0, x), y: Math.max(0, y) } }
        : el
    ));
  }, [draggedElement, dragOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

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

  const updateTemplateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    setTemplateElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const updateElementStyle = (elementId: string, styleUpdates: Partial<TextStyle>) => {
    setTemplateElements(prev => prev.map(el => 
      el.id === elementId 
        ? { ...el, style: { ...el.style, ...styleUpdates } }
        : el
    ));
  };

  const addTemplateElement = (type: TemplateElement['type'], iconType?: string) => {
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
        content = '____________________\nFirma';
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

    const newElement: TemplateElement = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      size: defaultSize,
      content,
      style: defaultStyle,
      zIndex: Math.max(...templateElements.map(el => el.zIndex)) + 1,
      isVisible: true,
      isLocked: false,
      iconType,
      borderColor: '#374151',
      backgroundColor: type === 'box' ? '#f9fafb' : 'transparent'
    };
    
    setTemplateElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const deleteTemplateElement = (elementId: string) => {
    setTemplateElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
  };

  const duplicateTemplateElement = (elementId: string) => {
    const element = templateElements.find(el => el.id === elementId);
    if (!element) return;
    
    const newElement: TemplateElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      position: { x: element.position.x + 20, y: element.position.y + 20 },
      zIndex: Math.max(...templateElements.map(el => el.zIndex)) + 1
    };
    
    setTemplateElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const renderTemplateElement = (element: TemplateElement) => {
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
          'location': MapPin
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

  // Guardar plantilla visual
  const handleSaveVisualTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userProfile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      if (typeof onUpdate !== 'function') {
        throw new Error('Función de actualización no disponible');
      }

      const updatedPrescriptionStyle = {
        ...prescriptionSettings.prescription_style,
        visualTemplate: {
          elements: templateElements,
          canvasSettings: {
            backgroundColor,
            backgroundImage,
            canvasSize
          }
        }
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          prescription_style: updatedPrescriptionStyle
        })
        .eq('id', userProfile.id);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(`Error al guardar la plantilla visual: ${updateError.message}`);
      }

      const updatedProfile = {
        ...userProfile,
        prescription_style: updatedPrescriptionStyle
      };

      // Actualizar también el estado local
      setPrescriptionSettings(prev => ({
        ...prev,
        prescription_style: updatedPrescriptionStyle
      }));

      onUpdate(updatedProfile);
      showNotification('success', 'Plantilla visual guardada correctamente');

    } catch (err: any) {
      console.error('Error saving visual template:', err);
      setError(err.message);
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'preferences', label: 'Preferencias', icon: SettingsIcon },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'recetas', label: 'Recetas', icon: FileText },
    { id: 'examTemplates', label: 'Plantillas de Exploración', icon: Stethoscope }
  ];

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 ${
      isFullscreen ? 'p-0' : 'p-4'
    }`}>
      <div className={`bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 ${
        isFullscreen 
          ? 'w-full h-full max-w-none max-h-none m-0' 
          : 'max-w-4xl w-full max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Configuración</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-400 hover:text-white transition-colors"
              title={isFullscreen ? "Ventana normal" : "Pantalla completa"}
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`px-6 py-3 border-b border-gray-700 ${
            notification.type === 'success' ? 'bg-green-900/50 border-green-700' :
            notification.type === 'error' ? 'bg-red-900/50 border-red-700' :
            'bg-blue-900/50 border-blue-700'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              )}
              <span className={`text-sm ${
                notification.type === 'success' ? 'text-green-300' :
                notification.type === 'error' ? 'text-red-300' :
                'text-blue-300'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}

        <div className={`flex ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[calc(90vh-120px)]'}`}>
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700">
            <nav className="p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Profile Settings Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Información del Perfil</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Especialidad
                        </label>
                        <select
                          value={profileData.specialty}
                          onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar especialidad</option>
                          <option value="medicina_general">Medicina General</option>
                          <option value="cardiologia">Cardiología</option>
                          <option value="neurologia">Neurología</option>
                          <option value="pediatria">Pediatría</option>
                          <option value="ginecologia">Ginecología</option>
                          <option value="traumatologia">Traumatología</option>
                          <option value="dermatologia">Dermatología</option>
                          <option value="psiquiatria">Psiquiatría</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Número de Cédula
                        </label>
                        <input
                          type="text"
                          value={profileData.license_number}
                          onChange={(e) => setProfileData(prev => ({ ...prev, license_number: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleProfileSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* System Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Preferencias del Sistema</h3>
                    
                    <div className="space-y-6">
                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Globe className="h-4 w-4 inline mr-2" />
                          Idioma
                        </label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="es">Español</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      {/* Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Clock className="h-4 w-4 inline mr-2" />
                          Zona Horaria
                        </label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                          <option value="America/New_York">Nueva York (GMT-5)</option>
                          <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                          <option value="Europe/Madrid">Madrid (GMT+1)</option>
                        </select>
                      </div>

                      {/* Theme */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Monitor className="h-4 w-4 inline mr-2" />
                          Tema
                        </label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                              preferences.theme === 'dark'
                                ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <Moon className="h-4 w-4 mr-2" />
                            Oscuro
                          </button>
                          <button
                            onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                              preferences.theme === 'light'
                                ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <Sun className="h-4 w-4 mr-2" />
                            Claro
                          </button>
                        </div>
                      </div>

                      {/* Notifications */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-4">
                          <Bell className="h-4 w-4 inline mr-2" />
                          Notificaciones
                        </label>
                        <div className="space-y-3">
                          {Object.entries(preferences.notifications).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-gray-300 capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <button
                                onClick={() => setPreferences(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, [key]: !value }
                                }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  value ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    value ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => showNotification('success', 'Preferencias guardadas')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Preferencias
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Configuración de Seguridad</h3>
                    
                    <div className="space-y-6">
                      {/* Change Password */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Cambiar Contraseña</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Contraseña Actual
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={securityData.current_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, current_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Nueva Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={securityData.new_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, new_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Confirmar Nueva Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={securityData.confirm_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={handlePasswordChange}
                            disabled={loading || !securityData.current_password || !securityData.new_password || !securityData.confirm_password}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Cambiar Contraseña
                          </button>
                        </div>
                      </div>

                      {/* Two Factor Authentication */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-md font-medium text-white">Autenticación de Dos Factores</h4>
                            <p className="text-sm text-gray-400">Agrega una capa extra de seguridad a tu cuenta</p>
                          </div>
                          <button
                            onClick={() => setSecurityData(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              securityData.two_factor_enabled ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                securityData.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        {securityData.two_factor_enabled && (
                          <div className="flex items-center space-x-2 text-sm text-green-300">
                            <CheckCircle className="h-4 w-4" />
                            <span>Autenticación de dos factores activada</span>
                          </div>
                        )}
                      </div>

                      {/* Active Sessions */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Sesiones Activas</h4>
                        <div className="space-y-3">
                          {securityData.active_sessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <Smartphone className="h-4 w-4 text-gray-400" />
                                  <span className="text-white text-sm">{session.device}</span>
                                </div>
                                <p className="text-xs text-gray-400">{session.location} • {session.last_active}</p>
                              </div>
                              <button
                                onClick={() => handleSessionTerminate(session.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Terminar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Login History */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Historial de Accesos</h4>
                        <div className="space-y-2">
                          {securityData.login_history.map((login, index) => (
                            <div key={index} className="flex items-center justify-between p-2 text-sm">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-gray-300">{login.device}</span>
                              </div>
                              <div className="text-gray-400">
                                <span>{login.date}</span>
                                <span className="ml-2 text-xs">({login.ip})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recetas Tab */}
              {activeTab === 'recetas' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Editor de Plantilla de Recetas</h3>
                    
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <div className="flex">
                        {/* Panel de herramientas */}
                        <div className="w-72 bg-gray-800 rounded-lg p-4 mr-4">
                          <h4 className="text-white font-medium mb-4">Herramientas de Diseño</h4>
                          
                          {/* Agregar Elementos */}
                          <div className="mb-6">
                            <h5 className="text-gray-300 text-sm mb-3">Agregar Elementos</h5>
                            
                            {/* Elementos de Texto */}
                            <div className="mb-4">
                              <h6 className="text-gray-400 text-xs mb-2">Texto</h6>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => addTemplateElement('text')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <Type className="h-3 w-3 mr-1" />
                                  Texto
                                </button>
                                <button
                                  onClick={() => addTemplateElement('box')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  Cuadro
                                </button>
                              </div>
                            </div>

                            {/* Elementos Médicos */}
                            <div className="mb-4">
                              <h6 className="text-gray-400 text-xs mb-2">Médicos</h6>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => addTemplateElement('signature')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <FileSignature className="h-3 w-3 mr-1" />
                                  Firma
                                </button>
                                <button
                                  onClick={() => addTemplateElement('table')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <Table className="h-3 w-3 mr-1" />
                                  Tabla
                                </button>
                              </div>
                            </div>

                            {/* Elementos Visuales */}
                            <div className="mb-4">
                              <h6 className="text-gray-400 text-xs mb-2">Visuales</h6>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => addTemplateElement('logo')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <Image className="h-3 w-3 mr-1" />
                                  Logo
                                </button>
                                <button
                                  onClick={() => addTemplateElement('qr')}
                                  className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                >
                                  <QrCode className="h-3 w-3 mr-1" />
                                  QR
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Propiedades del Elemento Seleccionado */}
                          {selectedElement && (
                            <div className="border-t border-gray-700 pt-4">
                              <h5 className="text-gray-300 text-sm mb-3">Propiedades</h5>
                              {(() => {
                                const element = templateElements.find(el => el.id === selectedElement);
                                if (!element) return null;

                                return (
                                  <div className="space-y-3">
                                    {/* Contenido */}
                                    {element.type !== 'separator' && element.type !== 'qr' && element.type !== 'date' && element.type !== 'time' && element.type !== 'icon' && (
                                      <div>
                                        <label className="block text-gray-400 text-xs mb-1">Contenido</label>
                                        <textarea
                                          value={element.content}
                                          onChange={(e) => updateTemplateElement(selectedElement, { content: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                          rows={2}
                                        />
                                      </div>
                                    )}

                                    {/* Tamaño de Fuente */}
                                    {element.type !== 'separator' && (
                                      <div>
                                        <label className="block text-gray-400 text-xs mb-1">Tamaño</label>
                                        <input
                                          type="number"
                                          value={element.style.fontSize || 14}
                                          onChange={(e) => updateElementStyle(selectedElement, {
                                            fontSize: Number(e.target.value)
                                          })}
                                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                                        />
                                      </div>
                                    )}

                                    {/* Color */}
                                    <div>
                                      <label className="block text-gray-400 text-xs mb-1">Color</label>
                                      <input
                                        type="color"
                                        value={element.style.color || '#000000'}
                                        onChange={(e) => updateElementStyle(selectedElement, {
                                          color: e.target.value
                                        })}
                                        className="w-full h-6 rounded border-gray-600"
                                      />
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => duplicateTemplateElement(selectedElement)}
                                        className="flex-1 flex items-center justify-center px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs"
                                      >
                                        <Copy className="h-2 w-2 mr-1" />
                                        Copiar
                                      </button>
                                      <button
                                        onClick={() => deleteTemplateElement(selectedElement)}
                                        className="flex-1 flex items-center justify-center px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-xs"
                                      >
                                        <Trash2 className="h-2 w-2 mr-1" />
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Canvas Area */}
                        <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg p-4">
                          <div className="relative">
                            {/* Controles de Zoom */}
                            <div className="absolute -top-10 right-0 flex items-center space-x-2 bg-white rounded-lg px-3 py-1 shadow-lg z-10">
                              <button
                                onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <ZoomOut className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-medium">{Math.round(zoom * 100)}%</span>
                              <button
                                onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <ZoomIn className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setShowGrid(!showGrid)}
                                className={`p-1 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                              >
                                <Grid className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Canvas */}
                            <div
                              ref={canvasRef}
                              className="relative shadow-xl border border-gray-300 overflow-hidden"
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
                              {templateElements
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
                                    {renderTemplateElement(element)}
                                    
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
                      
                      <div className="mt-6 flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          Plantilla para formato de recetas médicas. Los campos con [CORCHETES] serán reemplazados automáticamente.
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              console.log('Saving visual template...');
                              console.log('userProfile:', userProfile);
                              console.log('onUpdate type:', typeof onUpdate);
                              console.log('templateElements count:', templateElements.length);
                              handleSaveVisualTemplate();
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Guardar Plantilla
                          </button>
                          
                          {/* Debug info */}
                          <div className="text-xs text-gray-500">
                            Debug: {templateElements.length} elementos | onUpdate: {typeof onUpdate}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Templates Tab */}
              {activeTab === 'examTemplates' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-white">Plantillas de Exploración Física</h3>
                      <button
                        onClick={() => {
                          setSelectedTemplateToEdit(null);
                          setShowTemplateEditor(true);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Plantilla
                      </button>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <PhysicalExamTemplates
                        key={examTemplateRefreshKey}
                        onSelectTemplate={(template) => {
                          setSelectedTemplateToEdit(template);
                          setShowTemplateEditor(true);
                        }}
                        doctorId={userProfile?.id || ''}
                      />
                    </div>

                    {showTemplateEditor && (
                      <PhysicalExamTemplateEditor
                        template={selectedTemplateToEdit}
                        doctorId={userProfile?.id || ''}
                        onSave={(template) => {
                          setShowTemplateEditor(false);
                          setSelectedTemplateToEdit(null);
                          setExamTemplateRefreshKey(k => k + 1);
                        }}
                        onClose={() => {
                          setShowTemplateEditor(false);
                          setSelectedTemplateToEdit(null);
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}