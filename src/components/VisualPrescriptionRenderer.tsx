import React from 'react';
import QRCodeLib from 'qrcode';
import {
  Stethoscope, Heart, Pill, Thermometer, FileCheck, AlertTriangle,
  Shield, Database, HelpCircle, Sparkles, Bookmark, Target,
  Calendar, Clock, User, Phone, Mail, MapPin
} from 'lucide-react';

export type TemplateElement = {
  id: string;
  type: 'text' | 'logo' | 'background' | 'signature' | 'qr' | 'separator' | 'box' | 'date' | 'time' | 'table' | 'icon';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style?: Record<string, any>;
  zIndex: number;
  isVisible: boolean;
  isLocked?: boolean;
  iconType?: string;
  borderColor?: string;
  backgroundColor?: string;
};

interface PrescriptionData {
  patientName?: string;
  doctorName?: string;
  doctorLicense?: string;
  clinicName?: string;
  diagnosis?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  notes?: string;
  date?: string;
  patientAge?: string;
  patientWeight?: string;
  followUpDate?: string;
  prescriptionId?: string;
}

const getIconComponent = (iconType?: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'stethoscope': Stethoscope,
    'heart': Heart,
    'pill': Pill,
    'thermometer': Thermometer,
    'file-check': FileCheck,
    'alert-triangle': AlertTriangle,
    'shield': Shield,
    'database': Database,
    'help-circle': HelpCircle,
    'sparkles': Sparkles,
    'bookmark': Bookmark,
    'target': Target,
    'calendar': Calendar,
    'clock': Clock,
    'user': User,
    'phone': Phone,
    'mail': Mail,
    'map-pin': MapPin
  };

  return iconMap[iconType || 'stethoscope'] || Stethoscope;
};

const formatMedications = (medications?: Array<any>) => {
  if (!medications || medications.length === 0) return '';

  return medications.map((med, index) => {
    const lines = [
      `${index + 1}. ${med.name} ${med.dosage}`,
      `   ${med.frequency} por ${med.duration}`,
      med.instructions ? `   Indicaciones: ${med.instructions}` : ''
    ].filter(Boolean);

    return lines.join('\n');
  }).join('\n\n');
};

const replaceTemplateVariables = (content: string, data: PrescriptionData): string => {
  if (!content) return '';

  const variables: Record<string, string> = {
    '{{patientName}}': data.patientName || 'Nombre del Paciente',
    '{{doctorName}}': data.doctorName || 'Dr. Nombre',
    '{{doctorLicense}}': data.doctorLicense || '00000000',
    '{{clinicName}}': data.clinicName || 'Clínica Médica',
    '{{diagnosis}}': data.diagnosis || 'Diagnóstico',
    '{{medications}}': formatMedications(data.medications),
    '{{notes}}': data.notes || '',
    '{{date}}': data.date || new Date().toLocaleDateString('es-ES'),
    '{{patientAge}}': data.patientAge || '',
    '{{patientWeight}}': data.patientWeight || '',
    '{{followUpDate}}': data.followUpDate || '',
    '{{prescriptionId}}': data.prescriptionId || ''
  };

  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, 'g'), value);
  });

  return result;
};

export function renderTemplateElement(element: TemplateElement, prescriptionData?: PrescriptionData, isPrintMode: boolean = false) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    zIndex: element.zIndex,
    overflow: 'hidden',
    wordWrap: 'break-word',
    whiteSpace: element.type === 'text' ? 'pre-wrap' : 'normal',
    ...(element.style || {})
  };

  // Add print-specific styles
  if (isPrintMode) {
    baseStyle.pageBreakInside = 'avoid';
    baseStyle.WebkitPrintColorAdjust = 'exact';
    baseStyle.printColorAdjust = 'exact';
  }

  const content = replaceTemplateVariables(element.content, prescriptionData || {});

  switch (element.type) {
    case 'text':
      return (
        <div key={element.id} style={baseStyle} className={isPrintMode ? 'print-element' : ''}>
          {content}
        </div>
      );

    case 'box':
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            border: `1px solid ${element.borderColor || '#333'}`,
            background: element.backgroundColor || 'transparent',
            borderRadius: element.style?.borderRadius || '0px'
          }}
          className={isPrintMode ? 'print-element' : ''}
        />
      );

    case 'separator':
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            height: element.style?.height || 1,
            background: element.borderColor || '#333',
            border: 'none'
          }}
          className={isPrintMode ? 'print-element' : ''}
        />
      );

    case 'icon':
      const IconComponent = getIconComponent(element.iconType);
      return (
        <div key={element.id} style={baseStyle} className={`flex items-center justify-center ${isPrintMode ? 'print-element' : ''}`}>
          <IconComponent
            size={Math.min(element.size.width, element.size.height) * 0.8}
            color={element.style?.color || '#333'}
          />
        </div>
      );

    case 'qr':
      return (
        <div key={element.id} style={baseStyle} className={`flex items-center justify-center ${isPrintMode ? 'print-element' : ''}`}>
          <QRCodeDisplay
            value={content || 'https://deepluxmed.com'}
            size={Math.min(element.size.width, element.size.height)}
          />
        </div>
      );

    case 'date':
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return (
        <div key={element.id} style={baseStyle} className={isPrintMode ? 'print-element' : ''}>
          {currentDate}
        </div>
      );

    case 'time':
      const currentTime = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return (
        <div key={element.id} style={baseStyle} className={isPrintMode ? 'print-element' : ''}>
          {currentTime}
        </div>
      );

    case 'table':
      return (
        <div key={element.id} style={baseStyle} className={isPrintMode ? 'print-element' : ''}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {content.split('\n').map((row, i) => (
                <tr key={i}>
                  {row.split('|').map((cell, j) => (
                    <td key={j} style={{ border: '1px solid #ccc', padding: '4px', fontSize: 'inherit' }}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'signature':
      return (
        <div key={element.id} style={baseStyle} className={`border-t border-gray-400 flex items-end justify-center ${isPrintMode ? 'print-element' : ''}`}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {content || 'Firma del Médico'}
          </span>
        </div>
      );

    case 'logo':
      return (
        <div key={element.id} style={baseStyle} className={`flex items-center justify-center ${isPrintMode ? 'print-element' : ''}`}>
          {content.startsWith('http') ? (
            <img
              src={content}
              alt="Logo"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div className="bg-gray-200 rounded flex items-center justify-center text-gray-600 text-xs">
              Logo
            </div>
          )}
        </div>
      );

    default:
      return (
        <div key={element.id} style={baseStyle} className={isPrintMode ? 'print-element' : ''}>
          {content}
        </div>
      );
  }
}

// QR Code component
function QRCodeDisplay({ value, size }: { value: string; size: number }) {
  const [qrDataURL, setQrDataURL] = React.useState<string>('');

  React.useEffect(() => {
    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    })
    .then(url => setQrDataURL(url))
    .catch(console.error);
  }, [value, size]);

  return qrDataURL ? (
    <img src={qrDataURL} alt="QR Code" style={{ width: size, height: size }} />
  ) : (
    <div style={{ width: size, height: size, background: '#f0f0f0' }} />
  );
}

export default function VisualPrescriptionRenderer({
  layout,
  prescriptionData,
  isPrintMode = false,
  className = ''
}: {
  layout: {
    template_elements?: TemplateElement[];
    canvas_settings?: {
      backgroundColor?: string;
      canvasSize?: { width: number; height: number };
    }
  } | null;
  prescriptionData?: PrescriptionData;
  isPrintMode?: boolean;
  className?: string;
}) {
  const elements = layout?.template_elements?.filter(e => e.isVisible) || [];
  const bg = layout?.canvas_settings?.backgroundColor || '#ffffff';
  const canvasSize = layout?.canvas_settings?.canvasSize || { width: 794, height: 1123 };

  const containerStyle: React.CSSProperties = {
    background: bg,
    width: isPrintMode ? canvasSize.width : '100%',
    height: isPrintMode ? canvasSize.height : 'auto',
    minHeight: isPrintMode ? canvasSize.height : 400,
    position: 'relative',
    overflow: isPrintMode ? 'hidden' : 'visible'
  };

  // Add print-specific styles
  if (isPrintMode) {
    containerStyle.pageBreakInside = 'avoid';
    containerStyle.WebkitPrintColorAdjust = 'exact';
    containerStyle.printColorAdjust = 'exact';
  }

  return (
    <div
      className={`prescription-canvas ${className} ${isPrintMode ? 'print-mode' : ''}`}
      style={containerStyle}
      id={isPrintMode ? 'prescription-print-container' : undefined}
    >
      {elements
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(el => renderTemplateElement(el, prescriptionData, isPrintMode))
      }
    </div>
  );
}


