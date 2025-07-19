import React from 'react';
import {
  User, Phone, Mail, Calendar, Clock, MapPin, QrCode, Image,
  Stethoscope, Heart, Pill, Thermometer, FileSignature, Table, Square
} from 'lucide-react';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface TemplateElement {
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

export const renderTemplateElement = (element: TemplateElement, qrCodeUrl?: string): React.ReactNode => {
  const getElementStyle = (): React.CSSProperties => ({
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
    border: element.type === 'separator' ? `2px solid ${element.borderColor || '#374151'}` :
           element.type === 'box' ? `2px solid ${element.borderColor || '#374151'}` : 'none',
    backgroundColor: element.backgroundColor || 'transparent',
    padding: element.type === 'box' ? '8px' : '4px',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden'
  });

  const renderContent = () => {
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
        // Si el contenido es una URL de imagen (data:image), mostrar la imagen
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
        if (qrCodeUrl || element.content.startsWith('data:image/')) {
          return (
            <img
              src={qrCodeUrl || element.content}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          );
        }
        return (
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

      case 'signature':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="border-b-2 border-gray-400 mb-1" style={{ width: '80%', margin: '0 auto' }}></div>
              <span className="text-xs text-gray-600">Firma del Médico</span>
            </div>
          </div>
        );

      default:
        return element.content;
    }
  };

  if (!element.isVisible) return null;

  return (
    <div key={element.id} style={getElementStyle()}>
      {renderContent()}
    </div>
  );
};

interface VisualPrescriptionRendererProps {
  elements: TemplateElement[];
  canvasSettings?: {
    backgroundColor?: string;
    backgroundImage?: string;
    canvasSize?: { width: number; height: number };
  };
  qrCodeUrl?: string;
  prescriptionData?: any;
}

const VisualPrescriptionRenderer: React.FC<VisualPrescriptionRendererProps> = ({
  elements,
  canvasSettings,
  qrCodeUrl,
  prescriptionData
}) => {
  const { backgroundColor = '#ffffff', backgroundImage, canvasSize = { width: 794, height: 1123 } } = canvasSettings || {};

  // Reemplazar placeholders en el contenido con datos reales
  const processedElements = elements.map(element => {
    let content = element.content;

    if (prescriptionData) {
      // Reemplazar placeholders comunes
      content = content
        .replace(/\[NOMBRE DEL PACIENTE\]/g, prescriptionData.patientName || '')
        .replace(/\[NOMBRE DEL MÉDICO\]/g, prescriptionData.doctorName || '')
        .replace(/\[ESPECIALIDAD\]/g, prescriptionData.doctorSpecialty || '')
        .replace(/\[NÚMERO\]/g, prescriptionData.doctorLicense || '')
        .replace(/\[NOMBRE DE LA CLÍNICA\]/g, prescriptionData.clinicName || '')
        .replace(/\[DIRECCIÓN\]/g, prescriptionData.clinicAddress || '')
        .replace(/\[TELÉFONO\]/g, prescriptionData.clinicPhone || '')
        .replace(/\[EMAIL\]/g, prescriptionData.clinicEmail || '')
        .replace(/\[FECHA\]/g, prescriptionData.date || new Date().toLocaleDateString())
        .replace(/\[DIAGNÓSTICO\]/g, prescriptionData.diagnosis || '')
        .replace(/\[NOTAS E INSTRUCCIONES ESPECIALES\]/g, prescriptionData.notes || '');

      // Reemplazar información de medicamentos
      if (prescriptionData.medications && prescriptionData.medications.length > 0) {
        let medicationText = 'MEDICAMENTOS:\n\n';
        prescriptionData.medications.forEach((med: any, index: number) => {
          if (med.name) {
            medicationText += `${index + 1}. ${med.name}`;
            if (med.dosage) medicationText += ` - ${med.dosage}`;
            medicationText += '\n';
            if (med.frequency) medicationText += `   Frecuencia: ${med.frequency}\n`;
            if (med.duration) medicationText += `   Duración: ${med.duration}\n`;
            if (med.instructions) medicationText += `   Instrucciones: ${med.instructions}\n`;
            medicationText += '\n';
          }
        });

        if (element.id === 'medicamentos') {
          content = medicationText;
        }
      }
    }

    return { ...element, content };
  });

  return (
    <div
      className="relative shadow-lg border border-gray-300"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {processedElements
        .filter(el => el.isVisible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(element => renderTemplateElement(element, qrCodeUrl))}
    </div>
  );
};

export default VisualPrescriptionRenderer; 