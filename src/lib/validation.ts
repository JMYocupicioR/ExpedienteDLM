// Validation utilities for medical data
import { 
  VITAL_SIGNS_RANGES, 
  SYSTEM_LIMITS, 
  validateVitalSign, 
  validateMedication, 
  checkDrugInteractions 
} from './medicalConfig';

export interface ValidationConfig {
  maxItems: number;
  maxItemLength: number;
  allowedPattern?: RegExp;
  sanitizeHTML?: boolean;
}

// Configuration for different array fields
export const ARRAY_VALIDATION_CONFIG: Record<string, ValidationConfig> = {
  chronic_diseases: {
    maxItems: 20,
    maxItemLength: 100,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  current_treatments: {
    maxItems: 15,
    maxItemLength: 150,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  surgeries: {
    maxItems: 10,
    maxItemLength: 200,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  fractures: {
    maxItems: 10,
    maxItemLength: 100,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  previous_hospitalizations: {
    maxItems: 15,
    maxItemLength: 200,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  vaccination_history: {
    maxItems: 50,
    maxItemLength: 80,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  allergies: {
    maxItems: 20,
    maxItemLength: 100,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  },
  medications: {
    maxItems: 30,
    maxItemLength: 150,
    sanitizeHTML: true,
    allowedPattern: /^[a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]+$/
  }
};

// HTML sanitization
function sanitizeHTML(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Array validation and sanitization
export function validateAndSanitizeArray(
  value: string | string[], 
  fieldName: string
): { isValid: boolean; sanitizedArray: string[]; errors: string[] } {
  const config = ARRAY_VALIDATION_CONFIG[fieldName];
  if (!config) {
    return { isValid: false, sanitizedArray: [], errors: [`Configuration not found for field: ${fieldName}`] };
  }

  const errors: string[] = [];
  let rawArray: string[] = [];

  // Convert to array if string
  if (typeof value === 'string') {
    rawArray = value.split(',').map(s => s.trim()).filter(s => s);
  } else if (Array.isArray(value)) {
    rawArray = value.filter(s => s && s.trim());
  }

  // Validate array length
  if (rawArray.length > config.maxItems) {
    errors.push(`Máximo ${config.maxItems} elementos permitidos`);
    rawArray = rawArray.slice(0, config.maxItems);
  }

  // Validate and sanitize each item
  const sanitizedArray = rawArray.map(item => {
    let sanitizedItem = item.trim();
    
    // Length validation
    if (sanitizedItem.length > config.maxItemLength) {
      errors.push(`Elemento demasiado largo (máximo ${config.maxItemLength} caracteres): ${sanitizedItem.substring(0, 50)}...`);
      sanitizedItem = sanitizedItem.substring(0, config.maxItemLength);
    }

    // Pattern validation
    if (config.allowedPattern && !config.allowedPattern.test(sanitizedItem)) {
      errors.push(`Caracteres no permitidos en: ${sanitizedItem.substring(0, 30)}...`);
      // Remove invalid characters
      sanitizedItem = sanitizedItem.replace(/[^a-zA-Z0-9\s\u00C0-\u017F\-\(\)\.]/g, '');
    }

    // HTML sanitization
    if (config.sanitizeHTML) {
      sanitizedItem = sanitizeHTML(sanitizedItem);
    }

    return sanitizedItem;
  }).filter(item => item.length > 0); // Remove empty items after sanitization

  return {
    isValid: errors.length === 0,
    sanitizedArray,
    errors
  };
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// JSONB schema definition
interface JSONBSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  items?: any;
  required?: string[];
  maxProperties?: number;
  maxItems?: number;
  minItems?: number;
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

// ===== ESQUEMAS JSONB MEJORADOS CON CONFIGURACIÓN CENTRALIZADA =====
export const JSONB_SCHEMAS: Record<string, JSONBSchema> = {
  vital_signs: {
    type: 'object',
    properties: {
      systolic_pressure: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.systolic_pressure.min, 
        maximum: VITAL_SIGNS_RANGES.systolic_pressure.max 
      },
      diastolic_pressure: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.diastolic_pressure.min, 
        maximum: VITAL_SIGNS_RANGES.diastolic_pressure.max 
      },
      heart_rate: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.heart_rate.min, 
        maximum: VITAL_SIGNS_RANGES.heart_rate.max 
      },
      respiratory_rate: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.respiratory_rate.min, 
        maximum: VITAL_SIGNS_RANGES.respiratory_rate.max 
      },
      temperature: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.temperature.min, 
        maximum: VITAL_SIGNS_RANGES.temperature.max 
      },
      oxygen_saturation: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.oxygen_saturation.min, 
        maximum: VITAL_SIGNS_RANGES.oxygen_saturation.max 
      },
      weight: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.weight.min, 
        maximum: VITAL_SIGNS_RANGES.weight.max 
      },
      height: { 
        type: 'number', 
        minimum: VITAL_SIGNS_RANGES.height.min, 
        maximum: VITAL_SIGNS_RANGES.height.max 
      },
      bmi: { type: 'number', minimum: 10, maximum: 50 }
    },
    required: ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'],
    maxProperties: SYSTEM_LIMITS.MAX_VITAL_SIGNS_PROPERTIES,
    additionalProperties: false
  },
  
  physical_examination: {
    type: 'object',
    properties: {
      template_id: { type: 'string', maxLength: 50 },
      template_name: { type: 'string', maxLength: SYSTEM_LIMITS.MAX_TEMPLATE_NAME_LENGTH },
      exam_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      exam_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
      sections: { 
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            observations: { type: 'string', maxLength: 2000 },
            selectedFindings: { 
              type: 'array', 
              items: { type: 'string', maxLength: 200 },
              maxItems: 20
            }
          }
        }
      },
      generalObservations: { type: 'string', maxLength: SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH },
      vital_signs: { $ref: '#/definitions/vital_signs' }
    },
    required: ['exam_date', 'exam_time'],
    maxProperties: SYSTEM_LIMITS.MAX_PHYSICAL_EXAM_PROPERTIES,
    additionalProperties: false
  },
  
  prescription_style: {
    type: 'object',
    properties: {
      fontSize: { type: 'number', minimum: 8, maximum: 24 },
      fontFamily: { 
        type: 'string', 
        maxLength: 50,
        pattern: '^[a-zA-Z0-9\\s\\-,]+$'
      },
      headerColor: { 
        type: 'string', 
        pattern: '^#[0-9A-Fa-f]{6}$' 
      },
      logoUrl: { 
        type: 'string', 
        maxLength: 500,
        pattern: '^https?:\\/\\/.+'
      },
      clinicName: { type: 'string', maxLength: 100 },
      clinicAddress: { type: 'string', maxLength: 200 },
      doctorSignature: { type: 'string', maxLength: 1000 },
      includeQR: { type: 'boolean' },
      includeWatermark: { type: 'boolean' },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
    },
    maxProperties: SYSTEM_LIMITS.MAX_PRESCRIPTION_STYLE_PROPERTIES,
    additionalProperties: false
  },
  
  medications: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          maxLength: 200,
          minLength: 2,
          pattern: '^[a-zA-Z0-9\\s\\-\\.]+$'
        },
        dosage: { 
          type: 'string', 
          maxLength: 100,
          pattern: '^\\d+(\\.\\d+)?\\s?(mg|g|ml|mcg|UI|comprimidos?)$'
        },
        frequency: { 
          type: 'string', 
          maxLength: 100,
          pattern: '^(cada\\s\\d+(-\\d+)?\\shoras?|una\\svez\\sal\\sdía|dos\\sveces\\sal\\sdía|tres\\sveces\\sal\\sdía|antes\\sde\\slas\\scomidas|después\\sde\\slas\\scomidas)$'
        },
        duration: { 
          type: 'string', 
          maxLength: 100,
          pattern: '^\\d+\\s(días?|semanas?|meses?)$'
        },
        instructions: { type: 'string', maxLength: 500 }
      },
      required: ['name', 'dosage', 'frequency', 'duration'],
      additionalProperties: false
    },
    maxItems: SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION,
    minItems: 1
  },

  // ===== NUEVO: Esquema para plantillas de exploración física =====
  physical_exam_template: {
    type: 'object',
    properties: {
      version: { type: 'string', maxLength: 10 },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', maxLength: 50 },
            title: { type: 'string', maxLength: SYSTEM_LIMITS.MAX_FIELD_LABEL_LENGTH },
            description: { type: 'string', maxLength: 500 },
            order: { type: 'number', minimum: 0, maximum: 100 },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', maxLength: 50 },
                  text: { type: 'string', maxLength: 200 },
                  type: { 
                    type: 'string', 
                    enum: ['text', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date'] 
                  },
                  required: { type: 'boolean' },
                  placeholder: { type: 'string', maxLength: 100 },
                  options: { 
                    type: 'array', 
                    items: { type: 'string', maxLength: 100 },
                    maxItems: 20
                  },
                  validation: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                      pattern: { type: 'string', maxLength: 200 }
                    },
                    additionalProperties: false
                  }
                },
                required: ['id', 'text', 'type'],
                additionalProperties: false
              },
              maxItems: SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION
            }
          },
          required: ['id', 'title', 'order'],
          additionalProperties: false
        },
        maxItems: SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE
      }
    },
    required: ['version', 'sections'],
    additionalProperties: false
  }
};

// ===== VALIDACIÓN JSONB MEJORADA =====
export function validateJSONBSchema(data: any, schemaName: string): { isValid: boolean; errors: string[] } {
  const schema = JSONB_SCHEMAS[schemaName];
  if (!schema) {
    return { isValid: false, errors: [`Schema not found: ${schemaName}`] };
  }

  const errors: string[] = [];

  // Validación específica por tipo de esquema
  switch (schemaName) {
    case 'vital_signs':
      return validateVitalSignsSchema(data);
    case 'medications':
      return validateMedicationsSchema(data);
    case 'physical_examination':
      return validatePhysicalExamSchema(data);
    case 'prescription_style':
      return validatePrescriptionStyleSchema(data);
    case 'physical_exam_template':
      return validatePhysicalExamTemplateSchema(data);
    default:
      return validateGenericSchema(data, schema);
  }
}

// ===== VALIDACIONES ESPECÍFICAS =====

function validateVitalSignsSchema(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return { isValid: false, errors: ['Debe ser un objeto'] };
  }

  // Validar cada signo vital usando la configuración centralizada
  Object.entries(data).forEach(([field, value]) => {
    if (field === 'bmi') return; // BMI se calcula automáticamente
    
    if (VITAL_SIGNS_RANGES[field] && value !== null && value !== '') {
      const validation = validateVitalSign(field, value as string | number);
      if (!validation.isValid) {
        errors.push(`${field}: ${validation.message}`);
      }
    }
  });

  // Verificar campos requeridos
  const requiredFields = ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'];
  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      errors.push(`Campo requerido: ${field}`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

function validateMedicationsSchema(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(data)) {
    return { isValid: false, errors: ['Debe ser un array'] };
  }

  if (data.length === 0) {
    return { isValid: false, errors: ['Debe contener al menos un medicamento'] };
  }

  if (data.length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
    errors.push(`Máximo ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos permitidos`);
  }

  // Validar cada medicamento
  data.forEach((med, index) => {
    if (!med.name || !med.dosage || !med.frequency || !med.duration) {
      errors.push(`Medicamento ${index + 1}: Faltan campos requeridos`);
      return;
    }

    // Extraer dosificación numérica para validación
    const dosageMatch = med.dosage.match(/(\d+(?:\.\d+)?)/);
    const dosageNum = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
    
    // Extraer duración numérica
    const durationMatch = med.duration.match(/(\d+)/);
    const durationNum = durationMatch ? parseInt(durationMatch[1]) : 0;

    // Validar usando configuración médica
    const validation = validateMedication(med.name, dosageNum, med.frequency, durationNum);
    if (!validation.isValid) {
      errors.push(`Medicamento ${med.name}: ${validation.errors.join(', ')}`);
    }
  });

  // Verificar interacciones medicamentosas
  const medicationNames = data.map(med => med.name);
  const interactions = checkDrugInteractions(medicationNames);
  if (interactions.length > 0) {
    errors.push(`Interacciones detectadas: ${interactions.join('; ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

function validatePhysicalExamSchema(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return { isValid: false, errors: ['Debe ser un objeto'] };
  }

  // Validar campos requeridos
  if (!data.exam_date) {
    errors.push('Fecha del examen es requerida');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.exam_date)) {
    errors.push('Formato de fecha inválido (YYYY-MM-DD)');
  }

  if (!data.exam_time) {
    errors.push('Hora del examen es requerida');
  } else if (!/^\d{2}:\d{2}$/.test(data.exam_time)) {
    errors.push('Formato de hora inválido (HH:MM)');
  }

  // Validar observaciones generales
  if (data.generalObservations && data.generalObservations.length > SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH) {
    errors.push(`Observaciones generales demasiado largas (máximo ${SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH} caracteres)`);
  }

  // Validar signos vitales si están presentes
  if (data.vital_signs) {
    const vitalSignsValidation = validateVitalSignsSchema(data.vital_signs);
    if (!vitalSignsValidation.isValid) {
      errors.push(...vitalSignsValidation.errors.map(error => `Signos vitales: ${error}`));
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validatePrescriptionStyleSchema(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return { isValid: false, errors: ['Debe ser un objeto'] };
  }

  // Validar colores hexadecimales
  if (data.headerColor && !/^#[0-9A-Fa-f]{6}$/.test(data.headerColor)) {
    errors.push('Color de encabezado debe ser hexadecimal válido (#RRGGBB)');
  }

  if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
    errors.push('Color primario debe ser hexadecimal válido (#RRGGBB)');
  }

  // Validar URL de logo
  if (data.logoUrl && !isValidURL(data.logoUrl)) {
    errors.push('URL de logo inválida');
  }

  // Validar tamaño de fuente
  if (data.fontSize && (data.fontSize < 8 || data.fontSize > 24)) {
    errors.push('Tamaño de fuente debe estar entre 8 y 24');
  }

  return { isValid: errors.length === 0, errors };
}

function validatePhysicalExamTemplateSchema(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return { isValid: false, errors: ['Debe ser un objeto'] };
  }

  if (!data.version) {
    errors.push('Versión es requerida');
  }

  if (!Array.isArray(data.sections)) {
    errors.push('Secciones deben ser un array');
    return { isValid: false, errors };
  }

  if (data.sections.length === 0) {
    errors.push('Debe tener al menos una sección');
  }

  if (data.sections.length > SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE) {
    errors.push(`Máximo ${SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE} secciones permitidas`);
  }

  // Validar cada sección
  data.sections.forEach((section: any, sectionIndex: number) => {
    if (!section.id || !section.title || typeof section.order !== 'number') {
      errors.push(`Sección ${sectionIndex + 1}: Faltan campos requeridos (id, title, order)`);
    }

    if (section.title && section.title.length > SYSTEM_LIMITS.MAX_FIELD_LABEL_LENGTH) {
      errors.push(`Sección ${sectionIndex + 1}: Título demasiado largo`);
    }

    if (Array.isArray(section.questions)) {
      if (section.questions.length > SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION) {
        errors.push(`Sección ${sectionIndex + 1}: Máximo ${SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION} campos permitidos`);
      }

      section.questions.forEach((question: any, questionIndex: number) => {
        if (!question.id || !question.text || !question.type) {
          errors.push(`Sección ${sectionIndex + 1}, Campo ${questionIndex + 1}: Faltan campos requeridos`);
        }

        if (!['text', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date'].includes(question.type)) {
          errors.push(`Sección ${sectionIndex + 1}, Campo ${questionIndex + 1}: Tipo de campo inválido`);
        }
      });
    }
  });

  return { isValid: errors.length === 0, errors };
}

function validateGenericSchema(data: any, schema: JSONBSchema): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validación básica de tipo
  if (schema.type === 'object' && typeof data !== 'object') {
    errors.push('Debe ser un objeto');
    return { isValid: false, errors };
  }
  
  if (schema.type === 'array' && !Array.isArray(data)) {
    errors.push('Debe ser un array');
    return { isValid: false, errors };
  }

  return { isValid: errors.length === 0, errors };
} 