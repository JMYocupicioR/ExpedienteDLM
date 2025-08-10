// Validation utilities for medical data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedArray?: string[];
}

// Validate and sanitize array inputs
export function validateAndSanitizeArray(
  value: string | string[], 
  fieldName: string
): ValidationResult {
  if (!value) {
    return {
      isValid: true,
      errors: [],
      sanitizedArray: []
    };
  }

  let arrayValue: string[];
  
  // Convert string to array if needed
  if (typeof value === 'string') {
    // Handle comma-separated values or JSON arrays
    try {
      arrayValue = JSON.parse(value);
    } catch {
      arrayValue = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
  } else {
    arrayValue = value;
  }

  const errors: string[] = [];
  const sanitized: string[] = [];

  arrayValue.forEach((item, index) => {
    if (typeof item !== 'string') {
      errors.push(`${fieldName}[${index}]: Must be a string`);
      return;
    }

    const trimmed = item.trim();
    if (trimmed.length === 0) {
      errors.push(`${fieldName}[${index}]: Cannot be empty`);
      return;
    }

    if (trimmed.length > 500) {
      errors.push(`${fieldName}[${index}]: Too long (max 500 characters)`);
      return;
    }

    sanitized.push(trimmed);
  });

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedArray: sanitized
  };
}

// Validate JSONB schema
export function validateJSONBSchema(data: any, schemaName: string): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push(`${schemaName}: Must be a valid object`);
    return { isValid: false, errors };
  }

  // Basic validation - can be extended for specific schemas
  try {
    JSON.stringify(data);
  } catch {
    errors.push(`${schemaName}: Contains invalid JSON data`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate URL format
export function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// Sanitize text input
export function sanitizeText(text: string, maxLength: number = 1000): string {
  return text
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

// Validate required fields
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}
