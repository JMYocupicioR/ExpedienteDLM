import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye, AlertCircle, Info, Zap } from 'lucide-react';
import { LayoutElement, CanvasSettings } from '@/hooks/usePrescriptionLayouts';
import VisualPrescriptionRenderer from './VisualPrescriptionRenderer';

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  element?: LayoutElement;
  message: string;
  code: string;
  suggestion?: string;
}

interface PrescriptionLayoutValidatorProps {
  elements: LayoutElement[];
  canvasSettings: CanvasSettings;
  prescriptionData?: any;
  onValidationChange?: (isValid: boolean, results: ValidationResult[]) => void;
  showPreview?: boolean;
  className?: string;
}

export default function PrescriptionLayoutValidator({
  elements,
  canvasSettings,
  prescriptionData,
  onValidationChange,
  showPreview = false,
  className = ''
}: PrescriptionLayoutValidatorProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    validateLayout();
  }, [elements, canvasSettings]);

  const validateLayout = () => {
    const results: ValidationResult[] = [];

    // Check canvas size
    if (!canvasSettings.canvasSize) {
      results.push({
        type: 'error',
        message: 'El tamaño del canvas no está definido',
        code: 'CANVAS_SIZE_MISSING',
        suggestion: 'Define el tamaño del canvas en la configuración'
      });
    } else {
      const { width, height } = canvasSettings.canvasSize;
      if (width < 100 || height < 100) {
        results.push({
          type: 'warning',
          message: 'El canvas es muy pequeño para una receta médica',
          code: 'CANVAS_TOO_SMALL',
          suggestion: 'Usa un tamaño mínimo de 794x1123 píxeles (A4)'
        });
      }
    }

    // Validate each element
    elements.forEach(element => {
      if (!element.isVisible) return;

      // Check if element is within canvas bounds
      if (canvasSettings.canvasSize) {
        const { width: canvasWidth, height: canvasHeight } = canvasSettings.canvasSize;
        const elementRight = element.position.x + element.size.width;
        const elementBottom = element.position.y + element.size.height;

        if (element.position.x < 0 || element.position.y < 0) {
          results.push({
            type: 'error',
            element,
            message: `Elemento "${element.id}" está fuera del área del canvas (posición negativa)`,
            code: 'ELEMENT_OUT_OF_BOUNDS_NEGATIVE',
            suggestion: 'Mueve el elemento dentro del área del canvas'
          });
        }

        if (elementRight > canvasWidth || elementBottom > canvasHeight) {
          results.push({
            type: 'warning',
            element,
            message: `Elemento "${element.id}" se extiende más allá del área imprimible`,
            code: 'ELEMENT_OUT_OF_BOUNDS',
            suggestion: 'Redimensiona o reposiciona el elemento para que quepa en el canvas'
          });
        }
      }

      // Check element dimensions
      if (element.size.width <= 0 || element.size.height <= 0) {
        results.push({
          type: 'error',
          element,
          message: `Elemento "${element.id}" tiene dimensiones inválidas`,
          code: 'INVALID_DIMENSIONS',
          suggestion: 'Los elementos deben tener ancho y alto mayor a 0'
        });
      }

      // Check text elements for readability
      if (element.type === 'text') {
        const fontSize = element.style?.fontSize || 12;
        if (fontSize < 8) {
          results.push({
            type: 'warning',
            element,
            message: `Texto "${element.id}" puede ser difícil de leer (${fontSize}px)`,
            code: 'TEXT_TOO_SMALL',
            suggestion: 'Usa un tamaño de fuente de al menos 10px para recetas médicas'
          });
        }

        if (fontSize > 72) {
          results.push({
            type: 'warning',
            element,
            message: `Texto "${element.id}" es excesivamente grande (${fontSize}px)`,
            code: 'TEXT_TOO_LARGE',
            suggestion: 'Considera usar un tamaño de fuente más pequeño'
          });
        }

        // Check contrast
        if (element.style?.color && canvasSettings.backgroundColor) {
          const textColor = element.style.color;
          const bgColor = canvasSettings.backgroundColor;
          if (textColor === bgColor) {
            results.push({
              type: 'error',
              element,
              message: `Texto "${element.id}" no es visible (mismo color que el fondo)`,
              code: 'POOR_CONTRAST',
              suggestion: 'Usa un color de texto que contraste con el fondo'
            });
          }
        }

        // Check for empty content
        if (!element.content.trim()) {
          results.push({
            type: 'info',
            element,
            message: `Elemento de texto "${element.id}" está vacío`,
            code: 'EMPTY_TEXT',
            suggestion: 'Agrega contenido al elemento o considera eliminarlo'
          });
        }
      }

      // Check QR code elements
      if (element.type === 'qr') {
        const minSize = Math.min(element.size.width, element.size.height);
        if (minSize < 50) {
          results.push({
            type: 'warning',
            element,
            message: `Código QR "${element.id}" es muy pequeño (${minSize}px)`,
            code: 'QR_TOO_SMALL',
            suggestion: 'Los códigos QR deben ser de al menos 50x50 píxeles para ser legibles'
          });
        }
      }
    });

    // Check for overlapping elements
    const visibleElements = elements.filter(el => el.isVisible);
    for (let i = 0; i < visibleElements.length; i++) {
      for (let j = i + 1; j < visibleElements.length; j++) {
        const el1 = visibleElements[i];
        const el2 = visibleElements[j];

        if (elementsOverlap(el1, el2)) {
          results.push({
            type: 'warning',
            element: el1,
            message: `Elementos "${el1.id}" y "${el2.id}" se superponen`,
            code: 'ELEMENTS_OVERLAP',
            suggestion: 'Reposiciona los elementos para evitar superposición, o ajusta el z-index si la superposición es intencional'
          });
        }
      }
    }

    // Check for required medical information
    const hasPatientInfo = elements.some(el =>
      el.content.includes('{{patientName}}') ||
      el.content.includes('[NOMBRE DEL PACIENTE]')
    );
    const hasDoctorInfo = elements.some(el =>
      el.content.includes('{{doctorName}}') ||
      el.content.includes('[NOMBRE DEL MÉDICO]')
    );
    const hasMedications = elements.some(el =>
      el.content.includes('{{medications}}') ||
      el.content.includes('[MEDICAMENTO]')
    );
    const hasDate = elements.some(el =>
      el.content.includes('{{date}}') ||
      el.content.includes('[FECHA]') ||
      el.type === 'date'
    );

    if (!hasPatientInfo) {
      results.push({
        type: 'error',
        message: 'La receta debe incluir información del paciente',
        code: 'MISSING_PATIENT_INFO',
        suggestion: 'Agrega un elemento con {{patientName}} para mostrar el nombre del paciente'
      });
    }

    if (!hasDoctorInfo) {
      results.push({
        type: 'error',
        message: 'La receta debe incluir información del médico',
        code: 'MISSING_DOCTOR_INFO',
        suggestion: 'Agrega un elemento con {{doctorName}} para mostrar el nombre del médico'
      });
    }

    if (!hasMedications) {
      results.push({
        type: 'error',
        message: 'La receta debe incluir espacio para medicamentos',
        code: 'MISSING_MEDICATIONS',
        suggestion: 'Agrega un elemento con {{medications}} para mostrar la lista de medicamentos'
      });
    }

    if (!hasDate) {
      results.push({
        type: 'warning',
        message: 'Se recomienda incluir la fecha en la receta',
        code: 'MISSING_DATE',
        suggestion: 'Agrega un elemento con {{date}} o un elemento de tipo "date"'
      });
    }

    // Determine overall validity
    const hasErrors = results.some(r => r.type === 'error');
    const valid = !hasErrors;

    setValidationResults(results);
    setIsValid(valid);

    if (onValidationChange) {
      onValidationChange(valid, results);
    }
  };

  const elementsOverlap = (el1: LayoutElement, el2: LayoutElement): boolean => {
    const rect1 = {
      left: el1.position.x,
      right: el1.position.x + el1.size.width,
      top: el1.position.y,
      bottom: el1.position.y + el1.size.height
    };

    const rect2 = {
      left: el2.position.x,
      right: el2.position.x + el2.size.width,
      top: el2.position.y,
      bottom: el2.position.y + el2.size.height
    };

    return !(rect1.right <= rect2.left ||
             rect2.right <= rect1.left ||
             rect1.bottom <= rect2.top ||
             rect2.bottom <= rect1.top);
  };

  const getIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
  };

  const getColor = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-500/50 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-900/20';
      case 'info':
        return 'border-blue-500/50 bg-blue-900/20';
      default:
        return 'border-green-500/50 bg-green-900/20';
    }
  };

  const errorCount = validationResults.filter(r => r.type === 'error').length;
  const warningCount = validationResults.filter(r => r.type === 'warning').length;
  const infoCount = validationResults.filter(r => r.type === 'info').length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Validation Summary */}
      <div className={`border rounded-lg p-4 ${isValid ? 'border-green-500/50 bg-green-900/20' : 'border-red-500/50 bg-red-900/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
            <span className="font-medium text-white">
              {isValid ? 'Layout válido' : 'Layout requiere atención'}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            {errorCount > 0 && (
              <span className="text-red-400">{errorCount} errores</span>
            )}
            {warningCount > 0 && (
              <span className="text-yellow-400">{warningCount} advertencias</span>
            )}
            {infoCount > 0 && (
              <span className="text-blue-400">{infoCount} sugerencias</span>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>{showDetails ? 'Ocultar' : 'Ver'} detalles</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Details */}
      {showDetails && validationResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Detalles de validación:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {validationResults.map((result, index) => (
              <div key={index} className={`border rounded p-3 ${getColor(result.type)}`}>
                <div className="flex items-start space-x-2">
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{result.message}</p>
                    {result.suggestion && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Zap className="h-3 w-3 inline mr-1" />
                        {result.suggestion}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Código: {result.code}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Preview */}
      {showPreview && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Vista previa de impresión:</h4>
          <div className="print-preview border border-gray-600 rounded-lg p-4 bg-white">
            <VisualPrescriptionRenderer
              layout={{
                template_elements: elements,
                canvas_settings: canvasSettings
              }}
              prescriptionData={prescriptionData}
              isPrintMode={true}
              className="scale-50 origin-top-left"
            />
          </div>
        </div>
      )}
    </div>
  );
}