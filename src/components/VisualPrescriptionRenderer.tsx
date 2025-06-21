import React from 'react';
import { User, Phone, Mail, Calendar, Clock, MapPin, QrCode, Image } from 'lucide-react';

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
      return null;
    case 'date':
      return new Date().toLocaleDateString();
    case 'time':
      return new Date().toLocaleTimeString();
    case 'table': {
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
    }
    case 'icon': {
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
    }
    default:
      return element.content;
  }
}; 