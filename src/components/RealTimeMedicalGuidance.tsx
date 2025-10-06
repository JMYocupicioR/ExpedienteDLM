import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info, Lightbulb, Stethoscope, Clock, Target, Zap } from 'lucide-react';
import { geminiAI } from '@/lib/services/gemini-ai-service';

interface GuidanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'suggestion';
  title: string;
  message: string;
  action?: string;
  confidence: number;
  timestamp: Date;
  source: 'ai' | 'rules' | 'guidelines';
  category: 'safety' | 'diagnosis' | 'treatment' | 'efficiency';
}

interface MedicalContext {
  patientAge?: number;
  patientGender?: string;
  currentCondition?: string;
  vitalSigns?: any;
  diagnosis?: string;
  treatment?: string;
  allergies?: string[];
  medications?: any[];
  physicalExam?: any;
}

interface RealTimeMedicalGuidanceProps {
  medicalContext: MedicalContext;
  onGuidanceAction?: (action: string, data: any) => void;
  isVisible?: boolean;
  enableAI?: boolean;
  className?: string;
}

export default function RealTimeMedicalGuidance({
  medicalContext,
  onGuidanceAction,
  isVisible = true,
  enableAI = true,
  className = ''
}: RealTimeMedicalGuidanceProps) {
  const [alerts, setAlerts] = useState<GuidanceAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze medical context for guidance
  useEffect(() => {
    if (medicalContext) {
      analyzeContext();
    }
  }, [medicalContext]);

  const analyzeContext = async () => {
    setIsAnalyzing(true);
    const newAlerts: GuidanceAlert[] = [];

    // Rule-based checks
    newAlerts.push(...performRuleBasedChecks());

    // AI-based analysis with Gemini
    if (geminiAI && enableAI) {
      const aiAlerts = await performAIAnalysis();
      newAlerts.push(...aiAlerts);
    }

    // Remove duplicate alerts and sort by priority
    const uniqueAlerts = removeDuplicateAlerts(newAlerts);
    const sortedAlerts = uniqueAlerts.sort((a, b) => {
      const priorityOrder = { critical: 0, warning: 1, info: 2, suggestion: 3 };
      return priorityOrder[a.type] - priorityOrder[b.type];
    });

    setAlerts(sortedAlerts.slice(0, 10)); // Limit to 10 alerts
    setIsAnalyzing(false);
  };

  const performRuleBasedChecks = (): GuidanceAlert[] => {
    const alerts: GuidanceAlert[] = [];

    // Critical vital signs checks
    if (medicalContext.vitalSigns) {
      const vitals = medicalContext.vitalSigns;

      // Blood pressure checks
      if (vitals.blood_pressure) {
        const [systolic, diastolic] = vitals.blood_pressure.split('/').map(Number);
        if (systolic > 180 || diastolic > 120) {
          alerts.push({
            id: 'bp_critical',
            type: 'critical',
            title: 'Crisis Hipertensiva',
            message: `PA ${vitals.blood_pressure} requiere evaluación urgente`,
            action: 'Evaluar crisis hipertensiva, considerar medicación IV',
            confidence: 95,
            timestamp: new Date(),
            source: 'rules',
            category: 'safety'
          });
        } else if (systolic > 140 || diastolic > 90) {
          alerts.push({
            id: 'bp_elevated',
            type: 'warning',
            title: 'Hipertensión',
            message: `PA ${vitals.blood_pressure} elevada`,
            action: 'Verificar medición, considerar antihipertensivos',
            confidence: 90,
            timestamp: new Date(),
            source: 'rules',
            category: 'diagnosis'
          });
        }
      }

      // Temperature checks
      if (vitals.temperature) {
        const temp = parseFloat(vitals.temperature);
        if (temp > 39.5) {
          alerts.push({
            id: 'fever_high',
            type: 'warning',
            title: 'Fiebre Alta',
            message: `Temperatura ${temp}°C requiere atención`,
            action: 'Antipiréticos, búsqueda de foco infeccioso',
            confidence: 90,
            timestamp: new Date(),
            source: 'rules',
            category: 'safety'
          });
        }
      }

      // Heart rate checks
      if (vitals.heart_rate) {
        const hr = parseInt(vitals.heart_rate);
        if (hr > 120) {
          alerts.push({
            id: 'tachycardia',
            type: 'warning',
            title: 'Taquicardia',
            message: `FC ${hr} lpm elevada`,
            action: 'Evaluar causas de taquicardia, ECG',
            confidence: 85,
            timestamp: new Date(),
            source: 'rules',
            category: 'safety'
          });
        } else if (hr < 50) {
          alerts.push({
            id: 'bradycardia',
            type: 'warning',
            title: 'Bradicardia',
            message: `FC ${hr} lpm baja`,
            action: 'Evaluar medicamentos, ECG, marcapasos',
            confidence: 85,
            timestamp: new Date(),
            source: 'rules',
            category: 'safety'
          });
        }
      }
    }

    // Drug interaction checks
    if (medicalContext.medications && medicalContext.medications.length > 1) {
      const interactions = checkDrugInteractions();
      alerts.push(...interactions);
    }

    // Age-related checks
    if (medicalContext.patientAge) {
      const age = medicalContext.patientAge;
      if (age > 65 && medicalContext.medications) {
        alerts.push({
          id: 'geriatric_caution',
          type: 'info',
          title: 'Paciente Geriátrico',
          message: 'Ajustar dosis según función renal/hepática',
          action: 'Revisar criterios Beers, ajuste de dosis',
          confidence: 80,
          timestamp: new Date(),
          source: 'rules',
          category: 'safety'
        });
      }
    }

    // Documentation completeness
    if (!medicalContext.diagnosis && medicalContext.currentCondition) {
      alerts.push({
        id: 'missing_diagnosis',
        type: 'suggestion',
        title: 'Diagnóstico Pendiente',
        message: 'Considerar establecer diagnóstico específico',
        action: 'Completar evaluación diagnóstica',
        confidence: 75,
        timestamp: new Date(),
        source: 'rules',
        category: 'efficiency'
      });
    }

    return alerts;
  };

  const performAIAnalysis = async (): Promise<GuidanceAlert[]> => {
    if (!geminiAI) return [];

    try {
      // Usar Gemini AI para análisis médico
      const aiResult = await geminiAI.analyzeMedicalContext({
        patientAge: medicalContext.patientAge,
        patientGender: medicalContext.patientGender,
        currentCondition: medicalContext.currentCondition,
        vitalSigns: medicalContext.vitalSigns,
        diagnoses: medicalContext.diagnosis ? [medicalContext.diagnosis] : [],
        medications: medicalContext.medications?.map(m => typeof m === 'string' ? m : m.name || '') || [],
        allergies: medicalContext.allergies || []
      });

      if (aiResult.alerts && aiResult.alerts.length > 0) {
        return aiResult.alerts.map((alert, index) => ({
          id: `ai_${index}`,
          type: alert.type as 'critical' | 'warning' | 'info' | 'success',
          title: alert.title,
          message: alert.message,
          action: alert.action,
          confidence: alert.confidence || 80,
          timestamp: new Date(),
          source: 'ai' as const,
          category: alert.category || 'diagnosis'
        }));
      }
    } catch (error) {
      console.error('Gemini AI analysis error:', error);
    }

    return [];
  };

  const checkDrugInteractions = (): GuidanceAlert[] => {
    const alerts: GuidanceAlert[] = [];
    const medications = medicalContext.medications || [];

    // Simple interaction checking (expand this with real database)
    const interactions = [
      { drugs: ['warfarina', 'aspirina'], risk: 'Riesgo hemorrágico aumentado' },
      { drugs: ['warfarina', 'amoxicilina'], risk: 'Potencia efecto anticoagulante' },
      { drugs: ['digoxina', 'furosemida'], risk: 'Riesgo de toxicidad digitálica' }
    ];

    const medicationNames = medications.map(m =>
      (m.name || m).toLowerCase()
    );

    interactions.forEach((interaction, index) => {
      const hasAll = interaction.drugs.every(drug =>
        medicationNames.some(medName =>
          medName.includes(drug.toLowerCase())
        )
      );

      if (hasAll) {
        alerts.push({
          id: `interaction_${index}`,
          type: 'warning',
          title: 'Interacción Medicamentosa',
          message: `${interaction.drugs.join(' + ')}: ${interaction.risk}`,
          action: 'Revisar dosis, monitoreo adicional',
          confidence: 85,
          timestamp: new Date(),
          source: 'rules',
          category: 'safety'
        });
      }
    });

    return alerts;
  };

  const removeDuplicateAlerts = (alerts: GuidanceAlert[]): GuidanceAlert[] => {
    const seen = new Set();
    return alerts.filter(alert => {
      const key = `${alert.title}_${alert.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const executeAction = (alert: GuidanceAlert) => {
    if (onGuidanceAction && alert.action) {
      onGuidanceAction(alert.action, alert);
    }
    dismissAlert(alert.id);
  };

  const getAlertIcon = (type: GuidanceAlert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-green-400" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAlertColor = (type: GuidanceAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-500 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'info':
        return 'border-blue-500 bg-blue-900/20';
      case 'suggestion':
        return 'border-green-500 bg-green-900/20';
      default:
        return 'border-gray-500 bg-gray-900/20';
    }
  };

  if (!isVisible || alerts.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center">
          <Stethoscope className="h-4 w-4 mr-2" />
          Guías Médicas en Tiempo Real
          {isAnalyzing && <Loader2 className="h-3 w-3 ml-2 animate-spin" />}
        </h3>
        <div className="text-xs text-gray-400">
          {alerts.length} alertas activas
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-white">
                      {alert.title}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {alert.confidence}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {alert.source}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">
                    {alert.message}
                  </p>
                  {alert.action && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => executeAction(alert)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                      >
                        <Target className="h-3 w-3 inline mr-1" />
                        Aplicar
                      </button>
                      <span className="text-xs text-gray-400">
                        {alert.action}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-gray-400 hover:text-white ml-2"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}