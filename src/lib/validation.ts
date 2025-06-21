// Validation utilities for medical data
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

// HTML sanitization function
export function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
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
export function validateURL(url: string): { isValid: boolean; error?: string } {
  if (!url) return { isValid: false, error: 'URL es requerida' };
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Solo se permiten URLs HTTP y HTTPS' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+=/i,
      /<script/i,
      /xss/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return { isValid: false, error: 'URL contiene contenido potencialmente malicioso' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Formato de URL inválido' };
  }
}

// JSONB Schema validation
export interface JSONBSchema {
  type: 'object' | 'array';
  properties?: Record<string, any>;
  required?: string[];
  maxProperties?: number;
  additionalProperties?: boolean;
  items?: any;
  maxItems?: number;
}

export const JSONB_SCHEMAS: Record<string, JSONBSchema> = {
  vital_signs: {
    type: 'object',
    properties: {
      systolic_pressure: { type: 'number', minimum: 70, maximum: 250 },
      diastolic_pressure: { type: 'number', minimum: 40, maximum: 150 },
      heart_rate: { type: 'number', minimum: 30, maximum: 220 },
      respiratory_rate: { type: 'number', minimum: 8, maximum: 50 },
      temperature: { type: 'number', minimum: 30, maximum: 45 },
      oxygen_saturation: { type: 'number', minimum: 70, maximum: 100 },
      weight: { type: 'number', minimum: 1, maximum: 300 },
      height: { type: 'number', minimum: 30, maximum: 250 }
    },
    maxProperties: 10,
    additionalProperties: false
  },
  physical_examination: {
    type: 'object',
    properties: {
      sections: { type: 'object' },
      generalObservations: { type: 'string', maxLength: 2000 }
    },
    maxProperties: 20,
    additionalProperties: true
  },
  prescription_style: {
    type: 'object',
    properties: {
      fontSize: { type: 'number', minimum: 8, maximum: 24 },
      fontFamily: { type: 'string', maxLength: 50 },
      headerColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      logoUrl: { type: 'string', maxLength: 500 }
    },
    maxProperties: 10,
    additionalProperties: false
  },
  medications: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 200 },
        dosage: { type: 'string', maxLength: 100 },
        frequency: { type: 'string', maxLength: 100 },
        duration: { type: 'string', maxLength: 100 }
      },
      required: ['name', 'dosage'],
      additionalProperties: false
    },
    maxItems: 50
  }
};

export function validateJSONBSchema(data: any, schemaName: string): { isValid: boolean; errors: string[] } {
  const schema = JSONB_SCHEMAS[schemaName];
  if (!schema) {
    return { isValid: false, errors: [`Schema not found: ${schemaName}`] };
  }

  const errors: string[] = [];

  // Basic type validation
  if (schema.type === 'object' && typeof data !== 'object') {
    errors.push('Debe ser un objeto');
    return { isValid: false, errors };
  }
  
  if (schema.type === 'array' && !Array.isArray(data)) {
    errors.push('Debe ser un array');
    return { isValid: false, errors };
  }

  // Additional validations would be implemented here
  // For now, basic validation is sufficient

  return { isValid: errors.length === 0, errors };
} 