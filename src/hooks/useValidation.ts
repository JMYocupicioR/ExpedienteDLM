import { useState, useCallback } from 'react';
import { 
  validateAndSanitizeArray, 
  validateJSONBSchema, 
  isValidURL 
} from '../lib/validation';
import { 
  validateVitalSign, 
  validateMedication, 
  checkDrugInteractions,
  SYSTEM_LIMITS 
} from '../lib/medicalConfig';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

export interface ValidationState {
  [fieldName: string]: ValidationResult;
}

export function useValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({});
  const [isValidating, setIsValidating] = useState(false);

  // ===== FUNCIONES DE UTILIDAD PARA ERRORES =====
  const hasErrors = useCallback(() => {
    return Object.values(validationState).some((result: any) => result.errors?.length > 0);
  }, [validationState]);

  const getAllErrors = useCallback(() => {
    const allErrors: string[] = [];
    Object.values(validationState).forEach((result: any) => {
      if (result.errors) {
        allErrors.push(...result.errors);
      }
    });
    return allErrors;
  }, [validationState]);

  // ===== VALIDACIÓN DE ARRAYS MEJORADA =====
  const validateArrayField = useCallback((
    value: string | string[], 
    fieldName: string, 
    required: boolean = false
  ): ValidationResult => {
    if (!value && required) {
      return {
        isValid: false,
        errors: [`${fieldName} es requerido`],
        warnings: [],
        sanitizedData: []
      };
    }

    if (!value) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: []
      };
    }

    const result = validateAndSanitizeArray(value, fieldName);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: [],
      sanitizedData: result.sanitizedArray
    };
  }, []);

  // ===== VALIDACIÓN DE URLs MEJORADA =====
  const validateUrlField = useCallback((
    value: string, 
    required: boolean = false
  ): ValidationResult => {
    if (!value && required) {
      return {
        isValid: false,
        errors: ['URL es requerida'],
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

    const isValid = isValidURL(value);
    return {
      isValid,
      errors: isValid ? [] : ['URL inválida o formato no permitido'],
      warnings: []
    };
  }, []);

  // ===== VALIDACIÓN DE CAMPOS JSONB MEJORADA =====
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

  // ===== NUEVA: VALIDACIÓN DE SIGNOS VITALES =====
  const validateVitalSignsField = useCallback((
    vitalSigns: any,
    required: boolean = false
  ): ValidationResult => {
    if (!vitalSigns && required) {
      return {
        isValid: false,
        errors: ['Signos vitales son requeridos'],
        warnings: []
      };
    }

    if (!vitalSigns) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const criticalAlerts: string[] = [];

    // Normalización: si existe blood_pressure (ej. "120/80"), derivar systolic/diastolic cuando falten
    const normalized: any = { ...vitalSigns };
    if (normalized.blood_pressure && (!normalized.systolic_pressure || !normalized.diastolic_pressure)) {
      const match = String(normalized.blood_pressure).match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const [ , sys, dia ] = match;
        if (!normalized.systolic_pressure) normalized.systolic_pressure = sys;
        if (!normalized.diastolic_pressure) normalized.diastolic_pressure = dia;
      } else {
        warnings.push('Formato de presión arterial no reconocido. Use ej.: 120/80');
      }
    }

    // Validar cada signo vital (ignorar campos auxiliares no soportados)
    const allowedFields = new Set(['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature', 'oxygen_saturation', 'height', 'weight']);
    Object.entries(normalized).forEach(([field, value]) => {
      if (field === 'bmi' || !value) return;
      if (!allowedFields.has(field)) return; // ignorar blood_pressure y otros no reconocidos

      const validation = validateVitalSign(field, value as string | number);
      
      if (!validation.isValid) {
        errors.push(`${field}: ${validation.message}`);
      } else if (validation.level === 'critical') {
        criticalAlerts.push(`⚠️ CRÍTICO - ${field}: ${validation.message}`);
      } else if (validation.level === 'warning') {
        warnings.push(`${field}: ${validation.message}`);
      }
    });

    // Verificar campos requeridos
    const requiredFields = ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'];
    requiredFields.forEach(field => {
      if (!normalized[field]) {
        errors.push(`${field.replace('_', ' ')} es requerido`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [...warnings, ...criticalAlerts]
    };
  }, []);

  // ===== NUEVA: VALIDACIÓN DE MEDICAMENTOS =====
  const validateMedicationsField = useCallback((
    medications: any[],
    patientAllergies: string[] = [],
    required: boolean = false
  ): ValidationResult => {
    if (!medications && required) {
      return {
        isValid: false,
        errors: ['Al menos un medicamento es requerido'],
        warnings: []
      };
    }

    if (!medications || medications.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar límite máximo
    if (medications.length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
      errors.push(`Máximo ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos permitidos por receta`);
    }

    // Validar cada medicamento
    medications.forEach((med, index) => {
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
      const validation = validateMedication(med.name.toLowerCase(), dosageNum, med.frequency.toLowerCase(), durationNum);
      if (!validation.isValid) {
        errors.push(`${med.name}: ${validation.errors.join(', ')}`);
      }

      // Agregar advertencias
      validation.warnings.forEach(warning => {
        warnings.push(`${med.name}: ${warning}`);
      });

      // Verificar alergias del paciente
      if (patientAllergies.some(allergy => med.name.toLowerCase().includes(allergy.toLowerCase()))) {
        errors.push(`⚠️ ALERTA: Paciente alérgico a ${med.name}`);
      }
    });

    // Verificar interacciones medicamentosas
    const medicationNames = medications.map(med => med.name);
    const interactions = checkDrugInteractions(medicationNames);
    interactions.forEach(interaction => {
      warnings.push(`Interacción: ${interaction}`);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // ===== NUEVA: VALIDACIÓN DE PLANTILLAS DE EXPLORACIÓN FÍSICA =====
  const validatePhysicalExamTemplateField = useCallback((
    template: any,
    required: boolean = false
  ): ValidationResult => {
    if (!template && required) {
      return {
        isValid: false,
        errors: ['Plantilla es requerida'],
        warnings: []
      };
    }

    if (!template) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar estructura básica
    if (!template.name || template.name.length === 0) {
      errors.push('Nombre de plantilla es requerido');
    } else if (template.name.length > SYSTEM_LIMITS.MAX_TEMPLATE_NAME_LENGTH) {
      errors.push(`Nombre de plantilla demasiado largo (máximo ${SYSTEM_LIMITS.MAX_TEMPLATE_NAME_LENGTH} caracteres)`);
    }

    if (!template.definition || !template.definition.sections) {
      errors.push('Definición de plantilla inválida');
      return { isValid: false, errors, warnings };
    }

    // Validar número de secciones
    if (template.definition.sections.length === 0) {
      errors.push('La plantilla debe tener al menos una sección');
    } else if (template.definition.sections.length > SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE) {
      errors.push(`Máximo ${SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE} secciones permitidas`);
    }

    // Validar cada sección
    template.definition.sections.forEach((section: any, sectionIndex: number) => {
      if (!section.id || !section.title) {
        errors.push(`Sección ${sectionIndex + 1}: Faltan campos requeridos (id, title)`);
      }

      if (section.title && section.title.length > SYSTEM_LIMITS.MAX_FIELD_LABEL_LENGTH) {
        errors.push(`Sección ${sectionIndex + 1}: Título demasiado largo`);
      }

      if (section.questions) {
        if (section.questions.length > SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION) {
          errors.push(`Sección ${sectionIndex + 1}: Máximo ${SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION} campos permitidos`);
        }

        section.questions.forEach((question: any, questionIndex: number) => {
          if (!question.id || !question.label || !question.type) {
            errors.push(`Sección ${sectionIndex + 1}, Campo ${questionIndex + 1}: Faltan campos requeridos`);
          }

          if (!['text', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date'].includes(question.type)) {
            errors.push(`Sección ${sectionIndex + 1}, Campo ${questionIndex + 1}: Tipo de campo inválido`);
          }

          if (question.label && question.label.length > 200) {
            warnings.push(`Sección ${sectionIndex + 1}, Campo ${questionIndex + 1}: Etiqueta muy larga`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // ===== FUNCIÓN GENERAL DE VALIDACIÓN =====
  const validateField = useCallback((
    fieldName: string,
    value: any,
    type: 'array' | 'url' | 'jsonb' | 'vital_signs' | 'medications' | 'physical_exam_template',
    options: {
      required?: boolean;
      schemaName?: string;
      patientAllergies?: string[];
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
      case 'vital_signs':
        result = validateVitalSignsField(value, options.required);
        break;
      case 'medications':
        result = validateMedicationsField(value, options.patientAllergies, options.required);
        break;
      case 'physical_exam_template':
        result = validatePhysicalExamTemplateField(value, options.required);
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
  }, [validateArrayField, validateUrlField, validateJSONBField, validateVitalSignsField, validateMedicationsField, validatePhysicalExamTemplateField]);

  // ===== VALIDACIÓN COMPLETA DE FORMULARIOS =====
  const validateCompleteForm = useCallback((
    formData: any,
    formType: 'prescription' | 'physical_exam' | 'consultation',
    options: {
      patientAllergies?: string[];
      doctorSpecialty?: string;
    } = {}
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (formType) {
      case 'prescription':
        // Validar campos requeridos básicos
        if (!formData.patient_id) errors.push('Paciente es requerido');
        if (!formData.diagnosis) errors.push('Diagnóstico es requerido');

        // Validar medicamentos
        if (formData.medications) {
          const medValidation = validateMedicationsField(
            formData.medications, 
            options.patientAllergies
          );
          errors.push(...medValidation.errors);
          warnings.push(...medValidation.warnings);
        } else {
          errors.push('Al menos un medicamento es requerido');
        }
        break;

      case 'physical_exam':
        // Validar campos requeridos
        if (!formData.examDate) errors.push('Fecha del examen es requerida');
        if (!formData.examTime) errors.push('Hora del examen es requerida');

        // Validar signos vitales
        if (formData.vitalSigns) {
          const vsValidation = validateVitalSignsField(formData.vitalSigns, true);
          errors.push(...vsValidation.errors);
          warnings.push(...vsValidation.warnings);
        } else {
          errors.push('Signos vitales son requeridos');
        }

        // Validar observaciones generales
        if (formData.generalObservations && 
            formData.generalObservations.length > SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH) {
          errors.push(`Observaciones generales demasiado largas (máximo ${SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH} caracteres)`);
        }

        // Verificar que al menos una sección tenga datos
        const hasAnySection = Object.values(formData.sections || {}).some((section: any) => 
          section.observations || (section.selectedFindings && section.selectedFindings.length > 0)
        );
        
        if (!hasAnySection && !formData.generalObservations) {
          errors.push('Debe completar al menos una sección del examen físico o agregar observaciones generales');
        }
        break;

      case 'consultation':
        // Validar campos requeridos
        if (!formData.patient_id) errors.push('Paciente es requerido');
        if (!formData.current_condition) errors.push('Condición actual es requerida');
        if (!formData.diagnosis) errors.push('Diagnóstico es requerido');

        // Validar signos vitales si están presentes
        if (formData.vital_signs) {
          const vsValidation = validateVitalSignsField(formData.vital_signs);
          errors.push(...vsValidation.errors);
          warnings.push(...vsValidation.warnings);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [validateMedicationsField, validateVitalSignsField]);

  // ===== LIMPIAR ESTADO DE VALIDACIÓN =====
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

  // ===== OBTENER ERRORES POR CAMPO =====
  const getFieldErrors = useCallback((fieldName: string): string[] => {
    return validationState[fieldName]?.errors || [];
  }, [validationState]);

  // ===== OBTENER ADVERTENCIAS POR CAMPO =====
  const getFieldWarnings = useCallback((fieldName: string): string[] => {
    return validationState[fieldName]?.warnings || [];
  }, [validationState]);

  // ===== VERIFICAR SI CAMPO ES VÁLIDO =====
  const isFieldValid = useCallback((fieldName: string): boolean => {
    return validationState[fieldName]?.isValid !== false;
  }, [validationState]);

  return {
    // Estado
    validationState,
    isValidating,
    
    // Funciones de validación específicas
    validateArrayField,
    validateUrlField,
    validateJSONBField,
    validateVitalSignsField,
    validateMedicationsField,
    validatePhysicalExamTemplateField,
    
    // Función general de validación
    validateField,
    validateCompleteForm,
    
    // Utilidades
    clearValidation,
    getFieldErrors,
    getFieldWarnings,
    isFieldValid
  };
} 