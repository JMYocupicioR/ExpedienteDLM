import { useState, useCallback } from 'react';
import { validateAndSanitizeArray, validateURL, validateJSONBSchema } from '../lib/validation';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationState {
  [key: string]: ValidationResult;
}

export function useValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateArrayField = useCallback((
    value: string | string[],
    fieldName: string,
    required: boolean = false
  ): ValidationResult => {
    if (!value && required) {
      return {
        isValid: false,
        errors: [`${fieldName} es requerido`],
        warnings: []
      };
    }

    if (!value) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const result = validateAndSanitizeArray(value, fieldName);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.errors.length > 0 ? ['Algunos elementos fueron modificados automáticamente'] : []
    };
  }, []);

  const validateUrlField = useCallback((
    url: string,
    required: boolean = false
  ): ValidationResult => {
    if (!url && required) {
      return {
        isValid: false,
        errors: ['URL es requerida'],
        warnings: []
      };
    }

    if (!url) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const result = validateURL(url);
    return {
      isValid: result.isValid,
      errors: result.error ? [result.error] : [],
      warnings: []
    };
  }, []);

  const validateJSONBField = useCallback((
    data: any,
    schemaName: string,
    required: boolean = false
  ): ValidationResult => {
    if (!data && required) {
      return {
        isValid: false,
        errors: [`${schemaName} es requerido`],
        warnings: []
      };
    }

    if (!data) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const result = validateJSONBSchema(data, schemaName);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: []
    };
  }, []);

  const validateField = useCallback((
    fieldName: string,
    value: any,
    type: 'array' | 'url' | 'jsonb',
    options: {
      required?: boolean;
      schemaName?: string;
    } = {}
  ) => {
    setIsValidating(true);
    
    let result: ValidationResult;
    
    switch (type) {
      case 'array':
        result = validateArrayField(value, fieldName, options.required);
        break;
      case 'url':
        result = validateUrlField(value, options.required);
        break;
      case 'jsonb':
        if (!options.schemaName) {
          result = {
            isValid: false,
            errors: ['Schema name is required for JSONB validation'],
            warnings: []
          };
        } else {
          result = validateJSONBField(value, options.schemaName, options.required);
        }
        break;
      default:
        result = {
          isValid: false,
          errors: [`Unknown validation type: ${type}`],
          warnings: []
        };
    }

    setValidationState(prev => ({
      ...prev,
      [fieldName]: result
    }));

    setIsValidating(false);
    return result;
  }, [validateArrayField, validateUrlField, validateJSONBField]);

  const clearValidation = useCallback((fieldName?: string) => {
    if (fieldName) {
      setValidationState(prev => {
        const newState = { ...prev };
        delete newState[fieldName];
        return newState;
      });
    } else {
      setValidationState({});
    }
  }, []);

  const getFieldValidation = useCallback((fieldName: string): ValidationResult | null => {
    return validationState[fieldName] || null;
  }, [validationState]);

  const hasErrors = useCallback((fieldNames?: string[]): boolean => {
    if (fieldNames) {
      return fieldNames.some(fieldName => 
        validationState[fieldName] && !validationState[fieldName].isValid
      );
    }
    return Object.values(validationState).some((result: ValidationResult) => !result.isValid);
  }, [validationState]);

  const getAllErrors = useCallback((): string[] => {
    return Object.values(validationState)
      .flatMap((result: ValidationResult) => result.errors);
  }, [validationState]);

  const getAllWarnings = useCallback((): string[] => {
    return Object.values(validationState)
      .flatMap((result: ValidationResult) => result.warnings);
  }, [validationState]);

  return {
    validationState,
    isValidating,
    validateField,
    validateArrayField,
    validateUrlField,
    validateJSONBField,
    clearValidation,
    getFieldValidation,
    hasErrors,
    getAllErrors,
    getAllWarnings
  };
} 