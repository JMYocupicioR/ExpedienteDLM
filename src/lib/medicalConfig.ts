// Configuración médica centralizada para toda la aplicación
export interface VitalSignRange {
  min: number;
  max: number;
  unit: string;
  criticalMin?: number;
  criticalMax?: number;
  warningMin?: number;
  warningMax?: number;
}

export interface MedicationConstraints {
  maxDosage: number;
  minDosage: number;
  allowedFrequencies: string[];
  maxDurationDays: number;
  requiresSpecialist?: boolean;
  controlledSubstance?: boolean;
}

// ===== RANGOS DE SIGNOS VITALES UNIFICADOS =====
export const VITAL_SIGNS_RANGES: Record<string, VitalSignRange> = {
  systolic_pressure: { 
    min: 70, 
    max: 250, 
    unit: 'mmHg',
    criticalMin: 60,
    criticalMax: 180,
    warningMin: 90,
    warningMax: 140
  },
  diastolic_pressure: { 
    min: 40, 
    max: 150, 
    unit: 'mmHg',
    criticalMin: 30,
    criticalMax: 120,
    warningMin: 60,
    warningMax: 90
  },
  heart_rate: { 
    min: 30, 
    max: 220, 
    unit: 'lpm',
    criticalMin: 40,
    criticalMax: 150,
    warningMin: 60,
    warningMax: 100
  },
  respiratory_rate: { 
    min: 8, 
    max: 50, 
    unit: 'rpm',
    criticalMin: 10,
    criticalMax: 30,
    warningMin: 12,
    warningMax: 20
  },
  temperature: { 
    min: 30, 
    max: 45, 
    unit: '°C',
    criticalMin: 35,
    criticalMax: 40,
    warningMin: 36,
    warningMax: 37.5
  },
  oxygen_saturation: { 
    min: 70, 
    max: 100, 
    unit: '%',
    criticalMin: 85,
    criticalMax: 100,
    warningMin: 95,
    warningMax: 100
  },
  weight: { 
    min: 1, 
    max: 300, 
    unit: 'kg',
    criticalMin: 30,
    criticalMax: 200
  },
  height: { 
    min: 30, 
    max: 250, 
    unit: 'cm',
    criticalMin: 100,
    criticalMax: 220
  }
};

// ===== VALIDACIONES DE MEDICAMENTOS =====
export const MEDICATION_CONSTRAINTS: Record<string, MedicationConstraints> = {
  // Antibióticos
  'amoxicilina': {
    maxDosage: 1000,
    minDosage: 250,
    allowedFrequencies: ['cada 8 horas', 'cada 12 horas'],
    maxDurationDays: 14
  },
  'ciprofloxacino': {
    maxDosage: 750,
    minDosage: 250,
    allowedFrequencies: ['cada 12 horas'],
    maxDurationDays: 10,
    requiresSpecialist: false
  },
  
  // Analgésicos
  'ibuprofeno': {
    maxDosage: 800,
    minDosage: 200,
    allowedFrequencies: ['cada 4-6 horas', 'cada 6 horas', 'cada 8 horas'],
    maxDurationDays: 10
  },
  'paracetamol': {
    maxDosage: 1000,
    minDosage: 325,
    allowedFrequencies: ['cada 4-6 horas', 'cada 6 horas', 'cada 8 horas'],
    maxDurationDays: 7
  },
  
  // Cardiovasculares
  'losartan': {
    maxDosage: 100,
    minDosage: 25,
    allowedFrequencies: ['una vez al día', 'dos veces al día'],
    maxDurationDays: 365,
    requiresSpecialist: false
  },
  'atorvastatina': {
    maxDosage: 80,
    minDosage: 10,
    allowedFrequencies: ['una vez al día'],
    maxDurationDays: 365,
    requiresSpecialist: false
  },
  
  // Controlados
  'tramadol': {
    maxDosage: 100,
    minDosage: 50,
    allowedFrequencies: ['cada 6 horas', 'cada 8 horas'],
    maxDurationDays: 5,
    controlledSubstance: true,
    requiresSpecialist: true
  }
};

// ===== LÍMITES DE SISTEMA =====
export const SYSTEM_LIMITS = {
  // Recetas
  MAX_MEDICATIONS_PER_PRESCRIPTION: 20,
  MAX_PRESCRIPTION_TEMPLATES_PER_DOCTOR: 50,
  PRESCRIPTION_DEFAULT_VALIDITY_DAYS: 30,
  CONTROLLED_SUBSTANCE_VALIDITY_DAYS: 7,
  
  // Plantillas de exploración
  MAX_SECTIONS_PER_TEMPLATE: 15,
  MAX_FIELDS_PER_SECTION: 20,
  MAX_TEMPLATE_NAME_LENGTH: 100,
  MAX_FIELD_LABEL_LENGTH: 50,
  
  // Campos JSONB
  MAX_VITAL_SIGNS_PROPERTIES: 10,
  MAX_PHYSICAL_EXAM_PROPERTIES: 25,
  MAX_PRESCRIPTION_STYLE_PROPERTIES: 15,
  MAX_GENERAL_OBSERVATIONS_LENGTH: 3000
};

// ===== INTERACCIONES MEDICAMENTOSAS =====
export const DRUG_INTERACTIONS: Record<string, string[]> = {
  'warfarina': ['aspirina', 'ibuprofeno', 'amoxicilina', 'ciprofloxacino'],
  'metformina': ['contrastes yodados'],
  'losartan': ['potasio', 'espironolactona', 'amilorida'],
  'atorvastatina': ['gemfibrozilo', 'eritromicina', 'claritromicina'],
  'tramadol': ['inhibidores mao', 'antidepresivos tricíclicos'],
  'ciprofloxacino': ['warfarina', 'teofilina']
};

// ===== ESPECIALIDADES MÉDICAS AUTORIZADAS =====
export const MEDICAL_SPECIALTIES = {
  'cardiologia': {
    name: 'Cardiología',
    canPrescribe: ['losartan', 'atorvastatina', 'metoprolol'],
    requiresForControlled: false
  },
  'medicina_interna': {
    name: 'Medicina Interna',
    canPrescribe: ['*'], // Puede prescribir todo
    requiresForControlled: false
  },
  'medicina_general': {
    name: 'Medicina General',
    canPrescribe: ['amoxicilina', 'ibuprofeno', 'paracetamol'],
    requiresForControlled: true
  },
  'anestesiologia': {
    name: 'Anestesiología',
    canPrescribe: ['tramadol', 'morfina', 'fentanilo'],
    requiresForControlled: false
  }
};

// ===== FUNCIONES DE VALIDACIÓN =====

export function validateVitalSign(field: string, value: string | number): {
  isValid: boolean;
  level: 'normal' | 'warning' | 'critical';
  message?: string;
} {
  const range = VITAL_SIGNS_RANGES[field];
  if (!range) {
    return { isValid: false, level: 'critical', message: 'Campo no reconocido' };
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, level: 'critical', message: 'Valor inválido' };
  }

  // Verificar límites críticos
  if (range.criticalMin && numValue < range.criticalMin) {
    return { 
      isValid: false, 
      level: 'critical', 
      message: `Valor crítico bajo (< ${range.criticalMin} ${range.unit})` 
    };
  }
  
  if (range.criticalMax && numValue > range.criticalMax) {
    return { 
      isValid: false, 
      level: 'critical', 
      message: `Valor crítico alto (> ${range.criticalMax} ${range.unit})` 
    };
  }

  // Verificar límites de advertencia
  if (range.warningMin && numValue < range.warningMin) {
    return { 
      isValid: true, 
      level: 'warning', 
      message: `Valor bajo (< ${range.warningMin} ${range.unit})` 
    };
  }
  
  if (range.warningMax && numValue > range.warningMax) {
    return { 
      isValid: true, 
      level: 'warning', 
      message: `Valor alto (> ${range.warningMax} ${range.unit})` 
    };
  }

  // Verificar límites absolutos
  if (numValue < range.min || numValue > range.max) {
    return { 
      isValid: false, 
      level: 'critical', 
      message: `Fuera del rango válido (${range.min}-${range.max} ${range.unit})` 
    };
  }

  return { isValid: true, level: 'normal' };
}

export function validateMedication(name: string, dosage: number, frequency: string, duration: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const constraint = MEDICATION_CONSTRAINTS[name.toLowerCase()];
  if (!constraint) {
    warnings.push(`Medicamento no encontrado en base de datos de validación`);
    return { isValid: true, errors, warnings };
  }

  // Validar dosificación
  if (dosage < constraint.minDosage || dosage > constraint.maxDosage) {
    errors.push(`Dosis fuera del rango (${constraint.minDosage}-${constraint.maxDosage}mg)`);
  }

  // Validar frecuencia
  if (!constraint.allowedFrequencies.includes(frequency.toLowerCase())) {
    errors.push(`Frecuencia no permitida. Permitidas: ${constraint.allowedFrequencies.join(', ')}`);
  }

  // Validar duración
  if (duration > constraint.maxDurationDays) {
    errors.push(`Duración excede el máximo permitido (${constraint.maxDurationDays} días)`);
  }

  // Advertencias para sustancias controladas
  if (constraint.controlledSubstance) {
    warnings.push(`Sustancia controlada - Requiere justificación especial`);
  }

  if (constraint.requiresSpecialist) {
    warnings.push(`Requiere prescripción por especialista`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function checkDrugInteractions(medications: string[]): string[] {
  const interactions: string[] = [];
  
  for (let i = 0; i < medications.length; i++) {
    const med1 = medications[i].toLowerCase();
    const med1Interactions = DRUG_INTERACTIONS[med1];
    
    if (med1Interactions) {
      for (let j = i + 1; j < medications.length; j++) {
        const med2 = medications[j].toLowerCase();
        if (med1Interactions.includes(med2)) {
          interactions.push(`Posible interacción entre ${medications[i]} y ${medications[j]}`);
        }
      }
    }
  }
  
  return interactions;
}

export function calculatePrescriptionExpiry(medications: string[], startDate: Date = new Date()): Date {
  const hasControlledSubstance = medications.some(med => {
    const constraint = MEDICATION_CONSTRAINTS[med.toLowerCase()];
    return constraint?.controlledSubstance;
  });
  
  const days = hasControlledSubstance 
    ? SYSTEM_LIMITS.CONTROLLED_SUBSTANCE_VALIDITY_DAYS
    : SYSTEM_LIMITS.PRESCRIPTION_DEFAULT_VALIDITY_DAYS;
    
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return expiryDate;
} 