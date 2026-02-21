import { LayoutElement, CanvasSettings } from '@/hooks/usePrescriptionLayouts';
import VisualPrescriptionRenderer from '@/components/VisualPrescriptionRenderer';
import { renderToString } from 'react-dom/server';
import React from 'react';

interface PrescriptionData {
  patientName?: string;
  doctorName?: string;
  doctorLicense?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
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

export interface PrintLayout {
  template_elements: LayoutElement[];
  canvas_settings: CanvasSettings;
}

export interface PrintOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  quality?: 'draft' | 'normal' | 'high';
  colorMode?: 'color' | 'grayscale' | 'blackwhite';
  scaleFactor?: number;
  includeQRCode?: boolean;
  includeDigitalSignature?: boolean;
  watermarkText?: string;
  /** Pre-generated QR data URLs by element id for qr elements */
  qrDataUrls?: Record<string, string>;
}

export class PrescriptionPrintService {
  private static defaultOptions: PrintOptions = {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    quality: 'high',
    colorMode: 'color',
    scaleFactor: 1.0,
    includeQRCode: true,
    includeDigitalSignature: true
  };

  static generatePrintHTML(
    layout: PrintLayout,
    prescriptionData: PrescriptionData,
    options: Partial<PrintOptions> = {}
  ): string {
    const opts = { ...this.defaultOptions, ...options };

    const prescriptionContent = this.renderPrescriptionContent(
      layout,
      prescriptionData,
      opts.qrDataUrls
    );

    const css = this.generatePrintCSS(layout.canvas_settings, opts);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receta Médica - ${prescriptionData.patientName}</title>
        <style>
          ${css}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${prescriptionContent}
          ${opts.watermarkText ? this.generateWatermark(opts.watermarkText) : ''}
        </div>
        <script>
          (function() {
            function waitForImages(cb) {
              var imgs = document.querySelectorAll('.print-container img');
              if (!imgs.length) { cb(); return; }
              var left = imgs.length;
              imgs.forEach(function(img) {
                if (img.complete) { left--; if (left===0) cb(); }
                else img.onload = img.onerror = function() { left--; if (left===0) cb(); };
              });
            }
            window.onload = function() {
              waitForImages(function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 100);
              });
            };
          })();
        </script>
      </body>
      </html>
    `;
  }

  private static renderPrescriptionContent(
    layout: PrintLayout,
    prescriptionData: PrescriptionData,
    qrDataUrls?: Record<string, string>
  ): string {
    const elements = layout.template_elements
      .filter(el => el.isVisible)
      .sort((a, b) => a.zIndex - b.zIndex);

    return elements.map(element => {
      const content = this.replaceTemplateVariables(element.content, prescriptionData);
      return this.renderElement(element, content, qrDataUrls);
    }).join('');
  }

  private static renderElement(
    element: LayoutElement,
    content: string,
    qrDataUrls?: Record<string, string>
  ): string {
    const baseStyle = `
      position: absolute;
      left: ${element.position.x}px;
      top: ${element.position.y}px;
      width: ${element.size.width}px;
      height: ${element.size.height}px;
      z-index: ${element.zIndex};
      ${this.convertStyleToCSS(element.style)}
      overflow: hidden;
      word-wrap: break-word;
      page-break-inside: avoid;
    `;

    switch (element.type) {
      case 'text':
        return `<div style="${baseStyle} white-space: pre-wrap;">${this.escapeHtml(content)}</div>`;

      case 'box':
        return `<div style="${baseStyle} border: 1px solid ${element.borderColor || '#333'}; background: ${element.backgroundColor || 'transparent'};"></div>`;

      case 'separator':
        return `<div style="${baseStyle} height: 1px; background: ${element.borderColor || '#333'}; border: none;"></div>`;

      case 'logo':
        if (content.startsWith('http')) {
          return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center;"><img src="${this.escapeHtml(content)}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
        }
        return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center; background:#eee; font-size:12px; color:#666;">Logo</div>`;

      case 'qr': {
        const qrSize = Math.min(element.size.width, element.size.height);
        const dataUrl = qrDataUrls?.[element.id];
        if (dataUrl) {
          return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center;"><img src="${dataUrl}" alt="QR" style="width:${qrSize}px;height:${qrSize}px" /></div>`;
        }
        return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center;">
          <div style="width: ${qrSize}px; height: ${qrSize}px; background: #f0f0f0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 12px;">QR</div>
        </div>`;
      }

      case 'date':
        const currentDate = new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return `<div style="${baseStyle}">${currentDate}</div>`;

      case 'time':
        const currentTime = new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `<div style="${baseStyle}">${currentTime}</div>`;

      case 'signature':
        return `<div style="${baseStyle} border-top: 1px solid #666; display: flex; align-items: end; justify-content: center;">
          <span style="font-size: 12px; color: #666;">${content || 'Firma del Médico'}</span>
        </div>`;

      case 'table':
        const rows = content.split(/\n/).map(row => {
          const cells = row.split('|').map(cell =>
            `<td style="border: 1px solid #ccc; padding: 4px; font-size: inherit;">${this.escapeHtml(cell.trim())}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<div style="${baseStyle}">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>${rows}</tbody>
          </table>
        </div>`;

      default:
        return `<div style="${baseStyle}">${this.escapeHtml(content)}</div>`;
    }
  }

  private static convertStyleToCSS(style: any): string {
    if (!style) return '';

    const cssRules: string[] = [];

    if (style.fontSize) cssRules.push(`font-size: ${style.fontSize}px`);
    if (style.fontFamily) cssRules.push(`font-family: "${style.fontFamily}"`);
    if (style.color) cssRules.push(`color: ${style.color}`);
    if (style.fontWeight) cssRules.push(`font-weight: ${style.fontWeight}`);
    if (style.fontStyle) cssRules.push(`font-style: ${style.fontStyle}`);
    if (style.textDecoration) cssRules.push(`text-decoration: ${style.textDecoration}`);
    if (style.textAlign) cssRules.push(`text-align: ${style.textAlign}`);
    if (style.lineHeight) cssRules.push(`line-height: ${style.lineHeight}`);

    return cssRules.join('; ') + ';';
  }

  private static generatePrintCSS(canvasSettings: CanvasSettings, options: PrintOptions): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-family: Arial, sans-serif;
        background: white !important;
        color: black !important;
        margin: 0;
        padding: 0;
      }

      .print-container {
        position: relative;
        width: ${canvasSettings.canvasSize.width}px;
        height: ${canvasSettings.canvasSize.height}px;
        background: ${canvasSettings.backgroundColor};
        margin: 0 auto;
        overflow: hidden;
        transform: scale(${options.scaleFactor});
        transform-origin: top left;
      }

      @page {
        size: ${options.pageSize} ${options.orientation};
        margin: ${options.margins?.top} ${options.margins?.right} ${options.margins?.bottom} ${options.margins?.left};
      }

      @media print {
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }

        .print-container {
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        * {
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }

        ${options.colorMode === 'grayscale' ? `
          * {
            filter: grayscale(100%) !important;
          }
        ` : ''}

        ${options.colorMode === 'blackwhite' ? `
          * {
            filter: grayscale(100%) contrast(200%) brightness(80%) !important;
          }
        ` : ''}
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 48px;
        color: rgba(0, 0, 0, 0.1);
        font-weight: bold;
        z-index: 1000;
        pointer-events: none;
        user-select: none;
      }
    `;
  }

  private static generateWatermark(text: string): string {
    return `<div class="watermark">${this.escapeHtml(text)}</div>`;
  }

  private static replaceTemplateVariables(content: string, data: PrescriptionData): string {
    if (!content) return '';

    const medsFormatted = this.formatMedications(data.medications);
    const variables: Record<string, string> = {
      '{{patientName}}': data.patientName || 'Nombre del Paciente',
      '{{doctorName}}': data.doctorName || 'Dr. Nombre',
      '{{doctorLicense}}': data.doctorLicense || '00000000',
      '{{doctorSpecialty}}': data.doctorSpecialty || '',
      '{{clinicName}}': data.clinicName || 'Clínica Médica',
      '{{clinicAddress}}': data.clinicAddress || '',
      '{{clinicPhone}}': data.clinicPhone || '',
      '{{clinicEmail}}': data.clinicEmail || '',
      '{{diagnosis}}': data.diagnosis || 'Diagnóstico',
      '{{medications}}': medsFormatted,
      '{{notes}}': data.notes || '',
      '{{date}}': data.date || new Date().toLocaleDateString('es-ES'),
      '{{patientAge}}': data.patientAge || '',
      '{{patientWeight}}': data.patientWeight || '',
      '{{followUpDate}}': data.followUpDate || '',
      '{{prescriptionId}}': data.prescriptionId || '',
      '[NOMBRE DEL PACIENTE]': data.patientName || '',
      '[NOMBRE DEL MÉDICO]': data.doctorName || '',
      '[ESPECIALIDAD]': data.doctorSpecialty || '',
      '[NÚMERO]': data.doctorLicense || '',
      '[NOMBRE DE LA CLÍNICA]': data.clinicName || '',
      '[DIRECCIÓN]': data.clinicAddress || '',
      '[TELÉFONO]': data.clinicPhone || '',
      '[EMAIL]': data.clinicEmail || '',
      '[DIAGNÓSTICO]': data.diagnosis || '',
      '[NOTAS E INSTRUCCIONES ESPECIALES]': data.notes || '',
      '[FECHA]': data.date || new Date().toLocaleDateString('es-ES'),
      '[NOTAS]': data.notes || '',
    };

    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const escapedKey = key.replace(/[{}[\]\\^$.*+?()|]/g, '\\$&');
      result = result.replace(new RegExp(escapedKey, 'g'), value);
    }
    result = result.replace(/\[MEDICAMENTO\][^[]*/g, medsFormatted);

    return result;
  }

  private static formatMedications(medications?: Array<any>): string {
    if (!medications || medications.length === 0) return '';

    return medications.map((med, index) => {
      const lines = [
        `${index + 1}. ${med.name} ${med.dosage}`,
        `   ${med.frequency} por ${med.duration}`,
        med.instructions ? `   Indicaciones: ${med.instructions}` : ''
      ].filter(Boolean);

      return lines.join('\n');
    }).join('\n\n');
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static async printPrescription(
    layout: PrintLayout,
    prescriptionData: PrescriptionData,
    options: Partial<PrintOptions> = {}
  ): Promise<void> {
    let qrDataUrls = options.qrDataUrls;
    const qrElements = layout.template_elements?.filter((el) => el.type === 'qr' && el.isVisible) || [];
    if (qrElements.length > 0 && !qrDataUrls) {
      try {
        const QRCode = (await import('qrcode')).default;
        qrDataUrls = {};
        for (const el of qrElements) {
          const value = this.replaceTemplateVariables(el.content, prescriptionData) || prescriptionData.prescriptionId || 'https://deepluxmed.com';
          qrDataUrls[el.id] = await QRCode.toDataURL(value, { width: Math.min(el.size?.width || 128, 256), margin: 1 });
        }
      } catch {
        qrDataUrls = {};
      }
    }
    const html = this.generatePrintHTML(layout, prescriptionData, { ...options, qrDataUrls });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  }

  static generatePrintPreview(
    layout: PrintLayout,
    prescriptionData: PrescriptionData,
    options: Partial<PrintOptions> = {}
  ): string {
    return this.generatePrintHTML(layout, prescriptionData, options);
  }
}

export default PrescriptionPrintService;