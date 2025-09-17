import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Brain, Activity, Target, AlertCircle } from 'lucide-react';

interface ValidationRule {
  id: string;
  category: 'critical' | 'warning' | 'info';
  field: string;
  rule: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  autoCorrect?: boolean;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  criticalErrors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100
  completeness: number; // 0-100
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  correction?: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
  impact: 'quality' | 'safety' | 'completeness';
}

interface ValidationSuggestion {
  field: string;
  suggestion: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

interface ConsultationData {
  current_condition: string;
  vital_signs?: any;
  physical_examination?: any;
  diagnosis: string;
  prognosis?: string;
  treatment: string;
  medications?: any[];
  patient_age?: number;
  patient_allergies?: string[];
  patient_conditions?: string[];
}

interface MedicalSafetyValidatorProps {
  consultationData: ConsultationData;
  onValidationUpdate: (result: ValidationResult) => void;
  realTimeValidation?: boolean;
  isVisible: boolean;
}

// Reglas de validación médica
const VALIDATION_RULES: ValidationRule[] = [
  // Reglas críticas
  {
    id: 'missing_diagnosis',
    category: 'critical',
    field: 'diagnosis',
    rule: 'required',
    message: 'El diagnóstico es obligatorio para completar la consulta',
    severity: 'high'
  },
  {
    id: 'missing_current_condition',
    category: 'critical',
    field: 'current_condition',
    rule: 'required',
    message: 'El padecimiento actual es obligatorio',
    severity: 'high'
  },
  {
    id: 'missing_treatment',
    category: 'critical',
    field: 'treatment',
    rule: 'required',
    message: 'El plan de tratamiento es obligatorio',
    severity: 'high'
  },

  // Reglas de consistencia
  {
    id: 'inconsistent_diagnosis_treatment',
    category: 'warning',
    field: 'diagnosis_treatment',
    rule: 'consistency',
    message: 'El tratamiento no parece consistente con el diagnóstico',
    severity: 'medium',
    suggestion: 'Revisar la correspondencia entre diagnóstico y tratamiento'
  },
  {
    id: 'inconsistent_symptoms_diagnosis',
    category: 'warning',
    field: 'symptoms_diagnosis',
    rule: 'consistency',
    message: 'Los síntomas no parecen consistentes con el diagnóstico',
    severity: 'medium',
    suggestion: 'Verificar que el diagnóstico sea apropiado para los síntomas'
  },

  // Reglas de seguridad farmacológica
  {
    id: 'medication_overdose',
    category: 'critical',
    field: 'medications',
    rule: 'dosage_safety',
    message: 'Dosis de medicamento excede el máximo recomendado',
    severity: 'high'
  },
  {
    id: 'medication_interaction',
    category: 'critical',
    field: 'medications',
    rule: 'drug_interaction',
    message: 'Interacción medicamentosa peligrosa detectada',
    severity: 'high'
  },
  {
    id: 'allergy_contraindication',
    category: 'critical',
    field: 'medications',
    rule: 'allergy_check',
    message: 'Medicamento contraindicado por alergia del paciente',
    severity: 'high'
  },

  // Reglas de completitud
  {
    id: 'missing_vital_signs',
    category: 'warning',
    field: 'vital_signs',
    rule: 'completeness',
    message: 'Signos vitales incompletos',
    severity: 'medium',
    suggestion: 'Completar signos vitales para una evaluación más completa'
  },
  {
    id: 'missing_physical_exam',
    category: 'warning',
    field: 'physical_examination',
    rule: 'completeness',
    message: 'Examen físico no realizado',
    severity: 'medium',
    suggestion: 'Realizar examen físico para confirmar hallazgos'
  },
  {
    id: 'missing_prognosis',
    category: 'info',
    field: 'prognosis',
    rule: 'completeness',
    message: 'Pronóstico no especificado',
    severity: 'low',
    suggestion: 'Agregar pronóstico para completar documentación'
  },

  // Reglas de calidad clínica
  {
    id: 'vague_diagnosis',
    category: 'warning',
    field: 'diagnosis',
    rule: 'specificity',
    message: 'Diagnóstico demasiado vago o inespecífico',
    severity: 'medium',
    suggestion: 'Especificar más el diagnóstico (lateralidad, severidad, etc.)'
  },
  {
    id: 'insufficient_symptoms',
    category: 'warning',
    field: 'current_condition',
    rule: 'detail_level',
    message: 'Descripción de síntomas insuficiente',
    severity: 'medium',
    suggestion: 'Agregar más detalles sobre cronología, características y severidad'
  },

  // Reglas específicas por edad
  {
    id: 'pediatric_medication',
    category: 'critical',
    field: 'medications',
    rule: 'age_appropriate',
    message: 'Medicamento no apropiado para la edad del paciente',
    severity: 'high'
  },
  {
    id: 'geriatric_consideration',
    category: 'warning',
    field: 'medications',
    rule: 'geriatric_safety',
    message: 'Considerar ajustes por edad en paciente geriátrico',
    severity: 'medium',
    suggestion: 'Revisar dosis y frecuencia para paciente mayor de 65 años'
  }
];

// Patrones de diagnósticos comunes y sus tratamientos esperados
const DIAGNOSIS_TREATMENT_PATTERNS = {
  'hipertensión': ['antihipertensivos', 'ieca', 'ara', 'diuréticos', 'bloqueadores'],
  'diabetes': ['metformina', 'insulina', 'hipoglucemiantes', 'dieta'],
  'infección': ['antibióticos', 'antimicrobiano', 'antivirales', 'antifúngicos'],
  'dolor': ['analgésicos', 'aines', 'paracetamol', 'opioides'],
  'inflamación': ['antiinflamatorios', 'esteroides', 'aines'],
  'asma': ['broncodilatadores', 'corticosteroides', 'beta2 agonistas'],
  'depresión': ['antidepresivos', 'inhibidores', 'terapia', 'psicológico'],
  'ansiedad': ['ansiolíticos', 'benzodiacepinas', 'terapia', 'relajación']
};

// Medicamentos de alto riesgo
const HIGH_RISK_MEDICATIONS = [
  'warfarina', 'heparina', 'insulina', 'digoxina', 'litio', 'metotrexato',
  'fenitoína', 'teofilina', 'aminoglucósidos', 'vancomicina'
];

export default function MedicalSafetyValidator({
  consultationData,
  onValidationUpdate,
  realTimeValidation = true,
  isVisible
}: MedicalSafetyValidatorProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    criticalErrors: [],
    warnings: [],
    suggestions: [],
    score: 0,
    completeness: 0
  });
  const [isValidating, setIsValidating] = useState(false);

  // Validación de campos requeridos
  const validateRequiredFields = (data: ConsultationData): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.current_condition?.trim()) {
      errors.push({
        field: 'current_condition',
        rule: 'required',
        message: 'El padecimiento actual es obligatorio',
        severity: 'critical'
      });
    }

    if (!data.diagnosis?.trim()) {
      errors.push({
        field: 'diagnosis',
        rule: 'required',
        message: 'El diagnóstico es obligatorio',
        severity: 'critical'
      });
    }

    if (!data.treatment?.trim()) {
      errors.push({
        field: 'treatment',
        rule: 'required',
        message: 'El plan de tratamiento es obligatorio',
        severity: 'critical'
      });
    }

    return errors;
  };

  // Validación de consistencia diagnóstico-tratamiento
  const validateDiagnosisTreatmentConsistency = (data: ConsultationData): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    if (!data.diagnosis || !data.treatment) return warnings;

    const diagnosisLower = data.diagnosis.toLowerCase();
    const treatmentLower = data.treatment.toLowerCase();

    // Buscar patrones esperados
    let foundPattern = false;
    Object.entries(DIAGNOSIS_TREATMENT_PATTERNS).forEach(([condition, expectedTreatments]) => {
      if (diagnosisLower.includes(condition)) {
        const hasExpectedTreatment = expectedTreatments.some(treatment =>
          treatmentLower.includes(treatment)
        );

        if (!hasExpectedTreatment) {
          warnings.push({
            field: 'diagnosis_treatment',
            message: `El tratamiento no incluye terapias típicas para ${condition}`,
            suggestion: `Considerar: ${expectedTreatments.slice(0, 3).join(', ')}`,
            impact: 'quality'
          });
        } else {
          foundPattern = true;
        }
      }
    });

    return warnings;
  };

  // Validación de seguridad farmacológica
  const validateMedicationSafety = (data: ConsultationData): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.medications || data.medications.length === 0) return errors;

    data.medications.forEach(medication => {
      const medName = medication.name?.toLowerCase() || '';

      // Verificar medicamentos de alto riesgo
      if (HIGH_RISK_MEDICATIONS.some(hrm => medName.includes(hrm))) {
        errors.push({
          field: 'medications',
          rule: 'high_risk',
          message: `${medication.name} es un medicamento de alto riesgo - requiere monitoreo especial`,
          severity: 'high',
          correction: 'Especificar plan de monitoreo y seguimiento'
        });
      }

      // Verificar alergias
      if (data.patient_allergies) {
        data.patient_allergies.forEach(allergy => {
          if (medName.includes(allergy.toLowerCase())) {
            errors.push({
              field: 'medications',
              rule: 'allergy_contraindication',
              message: `${medication.name} está contraindicado - paciente alérgico a ${allergy}`,
              severity: 'critical',
              correction: 'Suspender medicamento y buscar alternativa'
            });
          }
        });
      }

      // Verificar dosis apropiada por edad
      if (data.patient_age) {
        if (data.patient_age < 18 && ['aspirina', 'ácido acetilsalicílico'].some(med => medName.includes(med))) {
          errors.push({
            field: 'medications',
            rule: 'pediatric_contraindication',
            message: 'Aspirina contraindicada en menores de 18 años (riesgo de síndrome de Reye)',
            severity: 'critical',
            correction: 'Usar paracetamol o ibuprofeno como alternativa'
          });
        }

        if (data.patient_age > 65) {
          const geriatricRiskyMeds = ['benzodiacepinas', 'diazepam', 'lorazepam', 'alprazolam'];
          if (geriatricRiskyMeds.some(med => medName.includes(med))) {
            errors.push({
              field: 'medications',
              rule: 'geriatric_risk',
              message: `${medication.name} tiene riesgo aumentado en adultos mayores`,
              severity: 'medium',
              correction: 'Considerar dosis reducida y monitoreo estrecho'
            });
          }
        }
      }
    });

    return errors;
  };

  // Validación de completitud
  const validateCompleteness = (data: ConsultationData): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    // Signos vitales
    if (!data.vital_signs || Object.keys(data.vital_signs).length === 0) {
      warnings.push({
        field: 'vital_signs',
        message: 'Signos vitales no registrados',
        suggestion: 'Registrar al menos presión arterial, frecuencia cardíaca y temperatura',
        impact: 'completeness'
      });
    } else {
      const vitalSigns = data.vital_signs;
      const missingVitals = [];

      if (!vitalSigns.blood_pressure && !vitalSigns.systolic_pressure) missingVitals.push('presión arterial');
      if (!vitalSigns.heart_rate) missingVitals.push('frecuencia cardíaca');
      if (!vitalSigns.temperature) missingVitals.push('temperatura');

      if (missingVitals.length > 0) {
        warnings.push({
          field: 'vital_signs',
          message: `Signos vitales incompletos: faltan ${missingVitals.join(', ')}`,
          suggestion: 'Completar signos vitales para evaluación integral',
          impact: 'completeness'
        });
      }
    }

    // Examen físico
    if (!data.physical_examination) {
      warnings.push({
        field: 'physical_examination',
        message: 'Examen físico no documentado',
        suggestion: 'Realizar y documentar examen físico relevante',
        impact: 'completeness'
      });
    }

    // Pronóstico
    if (!data.prognosis?.trim()) {
      warnings.push({
        field: 'prognosis',
        message: 'Pronóstico no especificado',
        suggestion: 'Agregar pronóstico estimado para el paciente',
        impact: 'completeness'
      });
    }

    return warnings;
  };

  // Validación de calidad clínica
  const validateClinicalQuality = (data: ConsultationData): ValidationSuggestion[] => {
    const suggestions: ValidationSuggestion[] = [];

    // Evaluar especificidad del diagnóstico
    if (data.diagnosis) {
      const vagueDiagnosisTerms = ['dolor', 'malestar', 'síndrome', 'trastorno', 'alteración'];
      const diagnosisLower = data.diagnosis.toLowerCase();

      if (vagueDiagnosisTerms.some(term => diagnosisLower.includes(term)) && data.diagnosis.length < 20) {
        suggestions.push({
          field: 'diagnosis',
          suggestion: 'Especificar más el diagnóstico',
          rationale: 'Diagnósticos específicos mejoran el seguimiento y tratamiento',
          priority: 'medium'
        });
      }
    }

    // Evaluar detalle de síntomas
    if (data.current_condition && data.current_condition.length < 50) {
      suggestions.push({
        field: 'current_condition',
        suggestion: 'Ampliar descripción del padecimiento actual',
        rationale: 'Incluir cronología, características, factores agravantes/atenuantes',
        priority: 'high'
      });
    }

    // Evaluar plan de tratamiento
    if (data.treatment) {
      const treatmentLower = data.treatment.toLowerCase();

      if (!treatmentLower.includes('seguimiento') && !treatmentLower.includes('control')) {
        suggestions.push({
          field: 'treatment',
          suggestion: 'Especificar plan de seguimiento',
          rationale: 'El seguimiento es crucial para evaluar respuesta al tratamiento',
          priority: 'medium'
        });
      }

      if (data.medications && data.medications.length > 0) {
        const hasEducation = treatmentLower.includes('educación') || treatmentLower.includes('información');
        if (!hasEducation) {
          suggestions.push({
            field: 'treatment',
            suggestion: 'Incluir educación al paciente',
            rationale: 'La educación mejora la adherencia y resultados',
            priority: 'medium'
          });
        }
      }
    }

    return suggestions;
  };

  // Calcular puntuación de calidad
  const calculateQualityScore = (
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[],
    data: ConsultationData
  ): { score: number; completeness: number } => {
    let score = 100;
    let completeness = 0;

    // Penalizar errores críticos
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
      }
    });

    // Penalizar advertencias
    warnings.forEach(warning => {
      switch (warning.impact) {
        case 'safety':
          score -= 15;
          break;
        case 'quality':
          score -= 10;
          break;
        case 'completeness':
          score -= 5;
          break;
      }
    });

    // Calcular completitud
    const requiredFields = ['current_condition', 'diagnosis', 'treatment'];
    const optionalFields = ['vital_signs', 'physical_examination', 'prognosis'];

    let filledRequired = 0;
    let filledOptional = 0;

    requiredFields.forEach(field => {
      if (data[field as keyof ConsultationData]) filledRequired++;
    });

    optionalFields.forEach(field => {
      if (data[field as keyof ConsultationData]) filledOptional++;
    });

    completeness = (filledRequired / requiredFields.length) * 70 + (filledOptional / optionalFields.length) * 30;

    return {
      score: Math.max(0, score),
      completeness: Math.round(completeness)
    };
  };

  // Función principal de validación
  const performValidation = async (data: ConsultationData) => {
    setIsValidating(true);

    try {
      // Ejecutar todas las validaciones
      const requiredErrors = validateRequiredFields(data);
      const medicationErrors = validateMedicationSafety(data);
      const consistencyWarnings = validateDiagnosisTreatmentConsistency(data);
      const completenessWarnings = validateCompleteness(data);
      const qualitySuggestions = validateClinicalQuality(data);

      // Combinar errores
      const allErrors = [...requiredErrors, ...medicationErrors];
      const allWarnings = [...consistencyWarnings, ...completenessWarnings];

      // Calcular puntuaciones
      const { score, completeness } = calculateQualityScore(allErrors, allWarnings, qualitySuggestions, data);

      const result: ValidationResult = {
        isValid: allErrors.filter(e => e.severity === 'critical').length === 0,
        criticalErrors: allErrors,
        warnings: allWarnings,
        suggestions: qualitySuggestions,
        score,
        completeness
      };

      setValidationResult(result);
      onValidationUpdate(result);

    } catch (error) {
      console.error('Error en validación:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Efecto para validación en tiempo real
  useEffect(() => {
    if (realTimeValidation && consultationData) {
      const timeoutId = setTimeout(() => {
        performValidation(consultationData);
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timeoutId);
    }
  }, [consultationData, realTimeValidation]);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-purple-400" />
          <h4 className="text-lg font-medium text-white">Validación Médica</h4>
          {isValidating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
              <span className="text-sm text-purple-300">Validando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Score de calidad */}
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-gray-300">
              Calidad: <span className={`font-medium ${
                validationResult.score >= 80 ? 'text-green-400' :
                validationResult.score >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>{validationResult.score}/100</span>
            </span>
          </div>
          {/* Completitud */}
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">
              Completitud: <span className={`font-medium ${
                validationResult.completeness >= 80 ? 'text-green-400' :
                validationResult.completeness >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>{validationResult.completeness}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Resumen de validación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Errores críticos */}
        <div className={`p-3 rounded-lg border ${
          validationResult.criticalErrors.length === 0
            ? 'bg-green-900/30 border-green-600/50'
            : 'bg-red-900/30 border-red-600/50'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {validationResult.criticalErrors.length === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-white">
              Errores Críticos: {validationResult.criticalErrors.length}
            </span>
          </div>
          {validationResult.criticalErrors.length === 0 ? (
            <p className="text-xs text-green-300">No se detectaron errores críticos</p>
          ) : (
            <p className="text-xs text-red-300">Requieren corrección antes de guardar</p>
          )}
        </div>

        {/* Advertencias */}
        <div className={`p-3 rounded-lg border ${
          validationResult.warnings.length === 0
            ? 'bg-green-900/30 border-green-600/50'
            : 'bg-yellow-900/30 border-yellow-600/50'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">
              Advertencias: {validationResult.warnings.length}
            </span>
          </div>
          <p className="text-xs text-yellow-300">
            {validationResult.warnings.length === 0
              ? 'Sin advertencias'
              : 'Revisar para mejorar calidad'
            }
          </p>
        </div>

        {/* Sugerencias */}
        <div className="p-3 rounded-lg border bg-blue-900/30 border-blue-600/50">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              Sugerencias: {validationResult.suggestions.length}
            </span>
          </div>
          <p className="text-xs text-blue-300">
            {validationResult.suggestions.length === 0
              ? 'Sin sugerencias adicionales'
              : 'Optimizaciones disponibles'
            }
          </p>
        </div>
      </div>

      {/* Detalles de validación */}
      <div className="space-y-3">
        {/* Errores críticos */}
        {validationResult.criticalErrors.length > 0 && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-red-300 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Errores que deben corregirse
            </h5>
            <div className="space-y-2">
              {validationResult.criticalErrors.map((error, index) => (
                <div key={index} className="bg-red-800/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-200">{error.field}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      error.severity === 'critical' ? 'bg-red-700 text-red-100' :
                      error.severity === 'high' ? 'bg-orange-700 text-orange-100' :
                      'bg-yellow-700 text-yellow-100'
                    }`}>
                      {error.severity}
                    </span>
                  </div>
                  <p className="text-sm text-red-300">{error.message}</p>
                  {error.correction && (
                    <p className="text-xs text-red-200 mt-1">
                      <strong>Solución:</strong> {error.correction}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advertencias */}
        {validationResult.warnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-yellow-300 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Advertencias importantes
            </h5>
            <div className="space-y-2">
              {validationResult.warnings.map((warning, index) => (
                <div key={index} className="bg-yellow-800/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-yellow-200">{warning.field}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      warning.impact === 'safety' ? 'bg-red-700 text-red-100' :
                      warning.impact === 'quality' ? 'bg-orange-700 text-orange-100' :
                      'bg-gray-700 text-gray-100'
                    }`}>
                      {warning.impact}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-300">{warning.message}</p>
                  <p className="text-xs text-yellow-200 mt-1">
                    <strong>Sugerencia:</strong> {warning.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sugerencias de mejora */}
        {validationResult.suggestions.length > 0 && (
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-blue-300 mb-2 flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Sugerencias de mejora
            </h5>
            <div className="space-y-2">
              {validationResult.suggestions.slice(0, 5).map((suggestion, index) => (
                <div key={index} className="bg-blue-800/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-200">{suggestion.field}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      suggestion.priority === 'high' ? 'bg-red-700 text-red-100' :
                      suggestion.priority === 'medium' ? 'bg-yellow-700 text-yellow-100' :
                      'bg-gray-700 text-gray-100'
                    }`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="text-sm text-blue-300">{suggestion.suggestion}</p>
                  <p className="text-xs text-blue-200 mt-1">
                    <strong>Razón:</strong> {suggestion.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado de validación general */}
        {validationResult.isValid && validationResult.criticalErrors.length === 0 && (
          <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <h5 className="text-lg font-medium text-green-300">Consulta Válida</h5>
            <p className="text-sm text-green-200">
              La consulta cumple con los estándares mínimos de calidad y seguridad
            </p>
            <div className="flex justify-center items-center space-x-4 mt-2 text-xs text-green-300">
              <span>Calidad: {validationResult.score}/100</span>
              <span>•</span>
              <span>Completitud: {validationResult.completeness}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}