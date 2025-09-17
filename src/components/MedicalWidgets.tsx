import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Heart, Scale, Clock, AlertTriangle, Activity, Brain, Target, TrendingUp, BarChart3 } from 'lucide-react';

interface MedicalWidgetsProps {
  vitalSigns?: {
    weight?: string;
    height?: string;
    age?: number;
    systolic?: string;
    diastolic?: string;
    heart_rate?: string;
    temperature?: string;
  };
  currentCondition: string;
  diagnosis: string;
  onWidgetResult: (widget: string, result: any) => void;
  isVisible: boolean;
}

interface CalculatorResult {
  value: number;
  interpretation: string;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  references: string;
}

interface RiskScore {
  name: string;
  value: number;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
}

// Calculadoras médicas
const MEDICAL_CALCULATORS = {
  bmi: {
    name: 'Índice de Masa Corporal',
    icon: Scale,
    calculate: (weight: number, height: number): CalculatorResult => {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);

      let interpretation = '';
      let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let recommendations: string[] = [];

      if (bmi < 18.5) {
        interpretation = 'Bajo peso';
        risk = 'moderate';
        recommendations = ['Evaluación nutricional', 'Descartar causas de bajo peso', 'Plan de ganancia de peso'];
      } else if (bmi >= 18.5 && bmi < 25) {
        interpretation = 'Normal';
        risk = 'low';
        recommendations = ['Mantener peso actual', 'Continuar hábitos saludables'];
      } else if (bmi >= 25 && bmi < 30) {
        interpretation = 'Sobrepeso';
        risk = 'moderate';
        recommendations = ['Plan de reducción de peso', 'Ejercicio regular', 'Evaluación dietética'];
      } else if (bmi >= 30 && bmi < 35) {
        interpretation = 'Obesidad Grado I';
        risk = 'high';
        recommendations = ['Pérdida de peso supervisada', 'Evaluación de comorbilidades', 'Ejercicio supervisado'];
      } else if (bmi >= 35 && bmi < 40) {
        interpretation = 'Obesidad Grado II';
        risk = 'high';
        recommendations = ['Manejo multidisciplinario', 'Considerar cirugía bariátrica', 'Evaluación cardiometabólica'];
      } else {
        interpretation = 'Obesidad Grado III (Mórbida)';
        risk = 'critical';
        recommendations = ['Evaluación para cirugía bariátrica', 'Manejo especializado', 'Evaluación de complicaciones'];
      }

      return {
        value: Math.round(bmi * 10) / 10,
        interpretation,
        risk,
        recommendations,
        references: 'OMS, 2023'
      };
    }
  },

  cardiovascularRisk: {
    name: 'Riesgo Cardiovascular (Framingham)',
    icon: Heart,
    calculate: (age: number, systolic: number, cholesterol: number = 200, gender: 'M' | 'F' = 'M', smoker: boolean = false): CalculatorResult => {
      // Framingham simplificado
      let points = 0;

      // Puntos por edad
      if (gender === 'M') {
        if (age >= 20 && age <= 34) points += -9;
        else if (age >= 35 && age <= 39) points += -4;
        else if (age >= 40 && age <= 44) points += 0;
        else if (age >= 45 && age <= 49) points += 3;
        else if (age >= 50 && age <= 54) points += 6;
        else if (age >= 55 && age <= 59) points += 8;
        else if (age >= 60 && age <= 64) points += 10;
        else if (age >= 65 && age <= 69) points += 11;
        else if (age >= 70 && age <= 74) points += 12;
        else if (age >= 75) points += 13;
      } else {
        if (age >= 20 && age <= 34) points += -7;
        else if (age >= 35 && age <= 39) points += -3;
        else if (age >= 40 && age <= 44) points += 0;
        else if (age >= 45 && age <= 49) points += 3;
        else if (age >= 50 && age <= 54) points += 6;
        else if (age >= 55 && age <= 59) points += 8;
        else if (age >= 60 && age <= 64) points += 10;
        else if (age >= 65 && age <= 69) points += 12;
        else if (age >= 70 && age <= 74) points += 14;
        else if (age >= 75) points += 16;
      }

      // Puntos por presión sistólica
      if (systolic < 120) points += 0;
      else if (systolic >= 120 && systolic <= 129) points += 0;
      else if (systolic >= 130 && systolic <= 139) points += 1;
      else if (systolic >= 140 && systolic <= 159) points += 1;
      else if (systolic >= 160) points += 2;

      // Puntos por colesterol (estimado)
      if (cholesterol < 160) points += 0;
      else if (cholesterol >= 160 && cholesterol <= 199) points += 4;
      else if (cholesterol >= 200 && cholesterol <= 239) points += 7;
      else if (cholesterol >= 240 && cholesterol <= 279) points += 9;
      else if (cholesterol >= 280) points += 11;

      // Puntos por tabaquismo
      if (smoker) points += (gender === 'M' ? 8 : 7);

      // Calcular riesgo
      let riskPercent = 0;
      if (points < 0) riskPercent = 1;
      else if (points <= 4) riskPercent = 1;
      else if (points <= 6) riskPercent = 2;
      else if (points <= 7) riskPercent = 3;
      else if (points <= 8) riskPercent = 4;
      else if (points <= 9) riskPercent = 5;
      else if (points <= 10) riskPercent = 6;
      else if (points <= 11) riskPercent = 8;
      else if (points <= 12) riskPercent = 10;
      else if (points <= 13) riskPercent = 12;
      else if (points <= 14) riskPercent = 16;
      else if (points <= 15) riskPercent = 20;
      else if (points <= 16) riskPercent = 25;
      else riskPercent = 30;

      let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = '';
      let recommendations: string[] = [];

      if (riskPercent < 10) {
        risk = 'low';
        interpretation = 'Riesgo bajo';
        recommendations = ['Mantener estilo de vida saludable', 'Control anual'];
      } else if (riskPercent < 20) {
        risk = 'moderate';
        interpretation = 'Riesgo moderado';
        recommendations = ['Modificaciones de estilo de vida', 'Control cada 6 meses', 'Considerar estatinas'];
      } else if (riskPercent < 30) {
        risk = 'high';
        interpretation = 'Riesgo alto';
        recommendations = ['Tratamiento farmacológico', 'Control trimestral', 'Manejo agresivo de factores'];
      } else {
        risk = 'critical';
        interpretation = 'Riesgo muy alto';
        recommendations = ['Tratamiento inmediato', 'Manejo especializado', 'Control mensual'];
      }

      return {
        value: riskPercent,
        interpretation: `${interpretation} (${riskPercent}% a 10 años)`,
        risk,
        recommendations,
        references: 'Framingham Heart Study, 2023'
      };
    }
  },

  qsofa: {
    name: 'qSOFA Score',
    icon: AlertTriangle,
    calculate: (systolic: number, respiratoryRate: number, alteredMental: boolean): CalculatorResult => {
      let score = 0;

      if (systolic <= 100) score += 1;
      if (respiratoryRate >= 22) score += 1;
      if (alteredMental) score += 1;

      let interpretation = '';
      let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let recommendations: string[] = [];

      if (score === 0) {
        interpretation = 'Bajo riesgo de sepsis';
        risk = 'low';
        recommendations = ['Continuar monitoreo rutinario'];
      } else if (score === 1) {
        interpretation = 'Riesgo bajo-moderado';
        risk = 'moderate';
        recommendations = ['Monitoreo más frecuente', 'Considerar evaluación adicional'];
      } else if (score === 2) {
        interpretation = 'Alto riesgo de sepsis';
        risk = 'high';
        recommendations = ['Evaluación urgente', 'Considerar antibióticos', 'Lactato sérico'];
      } else {
        interpretation = 'Muy alto riesgo de sepsis';
        risk = 'critical';
        recommendations = ['Manejo inmediato de sepsis', 'UCI', 'Antibióticos empíricos'];
      }

      return {
        value: score,
        interpretation: `${interpretation} (${score}/3 puntos)`,
        risk,
        recommendations,
        references: 'SCCM/ESICM, 2016'
      };
    }
  },

  wellsScore: {
    name: 'Wells Score (TEP)',
    icon: Activity,
    calculate: (clinicalSigns: boolean, altDx: boolean, heartRate: number, immobilization: boolean, previousPE: boolean, hemoptysis: boolean, cancer: boolean): CalculatorResult => {
      let score = 0;

      if (clinicalSigns) score += 3; // Signos clínicos de TVP
      if (!altDx) score += 3; // TEP más probable que diagnóstico alternativo
      if (heartRate > 100) score += 1.5;
      if (immobilization) score += 1.5; // Inmovilización >3 días o cirugía <4 semanas
      if (previousPE) score += 1.5; // Antecedente de TEP/TVP
      if (hemoptysis) score += 1;
      if (cancer) score += 1; // Cáncer activo

      let interpretation = '';
      let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let recommendations: string[] = [];

      if (score <= 4) {
        interpretation = 'Baja probabilidad de TEP';
        risk = 'low';
        recommendations = ['D-dímero', 'Si negativo, descartar TEP'];
      } else if (score <= 6) {
        interpretation = 'Probabilidad moderada de TEP';
        risk = 'moderate';
        recommendations = ['Angiotac pulmonar', 'Anticoagulación si positivo'];
      } else {
        interpretation = 'Alta probabilidad de TEP';
        risk = 'high';
        recommendations = ['Angiotac urgente', 'Considerar anticoagulación empírica'];
      }

      return {
        value: score,
        interpretation: `${interpretation} (${score} puntos)`,
        risk,
        recommendations,
        references: 'Wells et al., 2000'
      };
    }
  },

  glasgowComa: {
    name: 'Escala de Glasgow',
    icon: Brain,
    calculate: (eyeOpening: number, verbalResponse: number, motorResponse: number): CalculatorResult => {
      const score = eyeOpening + verbalResponse + motorResponse;

      let interpretation = '';
      let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let recommendations: string[] = [];

      if (score >= 13) {
        interpretation = 'Lesión cerebral leve';
        risk = 'low';
        recommendations = ['Observación', 'Re-evaluación periódica'];
      } else if (score >= 9) {
        interpretation = 'Lesión cerebral moderada';
        risk = 'moderate';
        recommendations = ['Monitoreo neurológico', 'TC cerebral', 'Evaluación neuroquirúrgica'];
      } else if (score >= 3) {
        interpretation = 'Lesión cerebral severa';
        risk = 'high';
        recommendations = ['UCI neurológica', 'Monitoreo PIC', 'Intubación si necesario'];
      } else {
        interpretation = 'Coma profundo';
        risk = 'critical';
        recommendations = ['Manejo inmediato UCI', 'Intubación', 'Evaluación neuroquirúrgica urgente'];
      }

      return {
        value: score,
        interpretation: `${interpretation} (${score}/15 puntos)`,
        risk,
        recommendations,
        references: 'Teasdale & Jennett, 1974'
      };
    }
  }
};

// Timeline visual del padecimiento
const SymptomTimeline: React.FC<{ currentCondition: string }> = ({ currentCondition }) => {
  const [timelineData, setTimelineData] = useState<Array<{
    time: string;
    event: string;
    severity: number;
    type: 'symptom' | 'medication' | 'improvement' | 'worsening';
  }>>([]);

  useEffect(() => {
    // Extraer timeline del texto usando IA o patrones
    const extractTimeline = (text: string) => {
      const timePatterns = [
        { pattern: /hace\s+(\d+)\s+(día|días|semana|semanas|mes|meses)/gi, type: 'relative' },
        { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/gi, type: 'absolute' },
        { pattern: /(ayer|hoy|esta\s+mañana|esta\s+tarde|anoche)/gi, type: 'recent' }
      ];

      const events = [];
      const sentences = text.split(/[.!?]+/);

      sentences.forEach(sentence => {
        timePatterns.forEach(({ pattern, type }) => {
          const matches = sentence.match(pattern);
          if (matches) {
            events.push({
              time: matches[0],
              event: sentence.trim(),
              severity: Math.floor(Math.random() * 10) + 1, // Placeholder
              type: 'symptom' as const
            });
          }
        });
      });

      return events.slice(0, 5); // Limitar a 5 eventos
    };

    if (currentCondition) {
      setTimelineData(extractTimeline(currentCondition));
    }
  }, [currentCondition]);

  if (timelineData.length === 0) return null;

  return (
    <div className="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Clock className="h-4 w-4 text-indigo-400" />
        <h5 className="font-medium text-indigo-300">Timeline del Padecimiento</h5>
      </div>
      <div className="space-y-3">
        {timelineData.map((event, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${
                event.severity > 7 ? 'bg-red-500' :
                event.severity > 5 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-200">{event.time}</span>
                <span className="text-xs text-indigo-400">Severidad: {event.severity}/10</span>
              </div>
              <p className="text-sm text-indigo-300 mt-1">{event.event}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mapa de síntomas interactivo
const SymptomMap: React.FC<{ currentCondition: string; onSymptomClick: (symptom: string) => void }> = ({
  currentCondition,
  onSymptomClick
}) => {
  const [detectedSymptoms, setDetectedSymptoms] = useState<Array<{
    symptom: string;
    location: string;
    intensity: number;
    character: string;
  }>>([]);

  useEffect(() => {
    // Detectar síntomas y su localización
    const symptomPatterns = [
      { pattern: /dolor.*cabeza|cefalea/gi, location: 'head', symptom: 'cefalea' },
      { pattern: /dolor.*pecho|chest.*pain/gi, location: 'chest', symptom: 'dolor torácico' },
      { pattern: /dolor.*abdomen|abdominal.*pain/gi, location: 'abdomen', symptom: 'dolor abdominal' },
      { pattern: /dolor.*espalda|back.*pain/gi, location: 'back', symptom: 'dolor de espalda' },
      { pattern: /dolor.*rodilla|knee.*pain/gi, location: 'knee', symptom: 'dolor de rodilla' },
      { pattern: /tos|cough/gi, location: 'chest', symptom: 'tos' },
      { pattern: /náuseas|nausea/gi, location: 'abdomen', symptom: 'náuseas' },
      { pattern: /mareo|vértigo|dizziness/gi, location: 'head', symptom: 'mareo' }
    ];

    const symptoms = [];
    symptomPatterns.forEach(({ pattern, location, symptom }) => {
      if (pattern.test(currentCondition)) {
        symptoms.push({
          symptom,
          location,
          intensity: Math.floor(Math.random() * 10) + 1,
          character: 'inespecífico'
        });
      }
    });

    setDetectedSymptoms(symptoms);
  }, [currentCondition]);

  if (detectedSymptoms.length === 0) return null;

  return (
    <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Target className="h-4 w-4 text-green-400" />
        <h5 className="font-medium text-green-300">Mapa de Síntomas</h5>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {detectedSymptoms.map((symptom, index) => (
          <button
            key={index}
            onClick={() => onSymptomClick(symptom.symptom)}
            className={`p-2 rounded-lg border transition-colors ${
              symptom.intensity > 7 ? 'bg-red-800/50 border-red-600' :
              symptom.intensity > 5 ? 'bg-yellow-800/50 border-yellow-600' :
              'bg-green-800/50 border-green-600'
            } hover:opacity-80`}
          >
            <div className="text-sm font-medium text-white">{symptom.symptom}</div>
            <div className="text-xs text-gray-300">Intensidad: {symptom.intensity}/10</div>
            <div className="text-xs text-gray-400 capitalize">{symptom.location}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function MedicalWidgets({
  vitalSigns = {},
  currentCondition,
  diagnosis,
  onWidgetResult,
  isVisible
}: MedicalWidgetsProps) {
  const [activeCalculator, setActiveCalculator] = useState<string | null>(null);
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, any>>({});
  const [calculationResults, setCalculationResults] = useState<Record<string, CalculatorResult>>({});
  const [showSymptomMap, setShowSymptomMap] = useState(false);

  // Determinar qué calculadoras son relevantes
  const relevantCalculators = useMemo(() => {
    const relevant = [];
    const combinedText = `${currentCondition} ${diagnosis}`.toLowerCase();

    // BMI siempre relevante si hay peso y altura
    if (vitalSigns.weight && vitalSigns.height) {
      relevant.push('bmi');
    }

    // Riesgo cardiovascular si hay datos cardiovasculares
    if (vitalSigns.age && vitalSigns.systolic) {
      relevant.push('cardiovascularRisk');
    }

    // qSOFA si hay signos de sepsis
    if (/sepsis|infección|fiebre|shock/i.test(combinedText) || vitalSigns.temperature) {
      relevant.push('qsofa');
    }

    // Wells si hay sospecha de TEP
    if (/embolia|tep|disnea|dolor.*torácico/i.test(combinedText)) {
      relevant.push('wellsScore');
    }

    // Glasgow si hay alteración neurológica
    if (/alteración.*conciencia|coma|neurológico|trauma.*craneal/i.test(combinedText)) {
      relevant.push('glasgowComa');
    }

    return relevant;
  }, [currentCondition, diagnosis, vitalSigns]);

  const runCalculator = (calculatorId: string) => {
    const calculator = MEDICAL_CALCULATORS[calculatorId as keyof typeof MEDICAL_CALCULATORS];
    if (!calculator) return;

    let result: CalculatorResult | null = null;

    try {
      switch (calculatorId) {
        case 'bmi':
          if (vitalSigns.weight && vitalSigns.height) {
            result = calculator.calculate(
              parseFloat(vitalSigns.weight),
              parseFloat(vitalSigns.height)
            );
          }
          break;

        case 'cardiovascularRisk':
          if (vitalSigns.age && vitalSigns.systolic) {
            result = calculator.calculate(
              vitalSigns.age,
              parseFloat(vitalSigns.systolic),
              calculatorInputs.cholesterol || 200,
              calculatorInputs.gender || 'M',
              calculatorInputs.smoker || false
            );
          }
          break;

        case 'qsofa':
          if (vitalSigns.systolic && calculatorInputs.respiratoryRate) {
            result = calculator.calculate(
              parseFloat(vitalSigns.systolic),
              calculatorInputs.respiratoryRate,
              calculatorInputs.alteredMental || false
            );
          }
          break;

        case 'wellsScore':
          result = calculator.calculate(
            calculatorInputs.clinicalSigns || false,
            calculatorInputs.altDx || false,
            parseFloat(vitalSigns.heart_rate || '70'),
            calculatorInputs.immobilization || false,
            calculatorInputs.previousPE || false,
            calculatorInputs.hemoptysis || false,
            calculatorInputs.cancer || false
          );
          break;

        case 'glasgowComa':
          result = calculator.calculate(
            calculatorInputs.eyeOpening || 4,
            calculatorInputs.verbalResponse || 5,
            calculatorInputs.motorResponse || 6
          );
          break;
      }

      if (result) {
        setCalculationResults(prev => ({ ...prev, [calculatorId]: result }));
        onWidgetResult(calculatorId, result);
      }
    } catch (error) {
      console.error('Error en calculadora:', error);
    }
  };

  const handleSymptomClick = (symptom: string) => {
    // Callback para cuando se hace clic en un síntoma del mapa
    onWidgetResult('symptom_selected', { symptom, timestamp: new Date().toISOString() });
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {/* Calculadoras Relevantes */}
      {relevantCalculators.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-5 w-5 text-cyan-400" />
            <h4 className="text-lg font-medium text-white">Calculadoras Médicas</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relevantCalculators.map(calcId => {
              const calc = MEDICAL_CALCULATORS[calcId as keyof typeof MEDICAL_CALCULATORS];
              const Icon = calc.icon;
              const result = calculationResults[calcId];

              return (
                <div key={calcId} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium text-cyan-200">{calc.name}</span>
                    </div>
                    <button
                      onClick={() => setActiveCalculator(activeCalculator === calcId ? null : calcId)}
                      className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                    >
                      {activeCalculator === calcId ? 'Cerrar' : 'Calcular'}
                    </button>
                  </div>

                  {/* Inputs para calculadora */}
                  {activeCalculator === calcId && (
                    <div className="mb-3 space-y-2">
                      {calcId === 'cardiovascularRisk' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Colesterol"
                              value={calculatorInputs.cholesterol || ''}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, cholesterol: parseInt(e.target.value) }))}
                              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                            />
                            <select
                              value={calculatorInputs.gender || 'M'}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, gender: e.target.value }))}
                              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                            >
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                            </select>
                          </div>
                          <label className="flex items-center space-x-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={calculatorInputs.smoker || false}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, smoker: e.target.checked }))}
                            />
                            <span>Fumador</span>
                          </label>
                        </>
                      )}

                      {calcId === 'qsofa' && (
                        <>
                          <input
                            type="number"
                            placeholder="Frecuencia respiratoria"
                            value={calculatorInputs.respiratoryRate || ''}
                            onChange={(e) => setCalculatorInputs(prev => ({ ...prev, respiratoryRate: parseInt(e.target.value) }))}
                            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                          />
                          <label className="flex items-center space-x-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={calculatorInputs.alteredMental || false}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, alteredMental: e.target.checked }))}
                            />
                            <span>Alteración mental</span>
                          </label>
                        </>
                      )}

                      {calcId === 'glasgowComa' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-gray-400">Apertura ocular</label>
                            <select
                              value={calculatorInputs.eyeOpening || 4}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, eyeOpening: parseInt(e.target.value) }))}
                              className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                            >
                              <option value={4}>Espontánea (4)</option>
                              <option value={3}>Al comando (3)</option>
                              <option value={2}>Al dolor (2)</option>
                              <option value={1}>No abre (1)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Respuesta verbal</label>
                            <select
                              value={calculatorInputs.verbalResponse || 5}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, verbalResponse: parseInt(e.target.value) }))}
                              className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                            >
                              <option value={5}>Orientado (5)</option>
                              <option value={4}>Confuso (4)</option>
                              <option value={3}>Inapropiada (3)</option>
                              <option value={2}>Incomprensible (2)</option>
                              <option value={1}>No responde (1)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Respuesta motora</label>
                            <select
                              value={calculatorInputs.motorResponse || 6}
                              onChange={(e) => setCalculatorInputs(prev => ({ ...prev, motorResponse: parseInt(e.target.value) }))}
                              className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                            >
                              <option value={6}>Obedece (6)</option>
                              <option value={5}>Localiza (5)</option>
                              <option value={4}>Retira (4)</option>
                              <option value={3}>Flexión anormal (3)</option>
                              <option value={2}>Extensión (2)</option>
                              <option value={1}>No responde (1)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => runCalculator(calcId)}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-1 rounded text-sm font-medium"
                      >
                        Calcular
                      </button>
                    </div>
                  )}

                  {/* Resultado */}
                  {result && (
                    <div className={`p-2 rounded text-sm ${
                      result.risk === 'critical' ? 'bg-red-900/50 border border-red-600' :
                      result.risk === 'high' ? 'bg-orange-900/50 border border-orange-600' :
                      result.risk === 'moderate' ? 'bg-yellow-900/50 border border-yellow-600' :
                      'bg-green-900/50 border border-green-600'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{result.value}</span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          result.risk === 'critical' ? 'bg-red-800 text-red-100' :
                          result.risk === 'high' ? 'bg-orange-800 text-orange-100' :
                          result.risk === 'moderate' ? 'bg-yellow-800 text-yellow-100' :
                          'bg-green-800 text-green-100'
                        }`}>
                          {result.risk}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{result.interpretation}</p>
                      <div className="space-y-1">
                        {result.recommendations.slice(0, 2).map((rec, i) => (
                          <div key={i} className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">{rec}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Ref: {result.references}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline del Padecimiento */}
      {currentCondition && <SymptomTimeline currentCondition={currentCondition} />}

      {/* Mapa de Síntomas */}
      {currentCondition && (
        <div className="space-y-2">
          <button
            onClick={() => setShowSymptomMap(!showSymptomMap)}
            className="flex items-center space-x-2 text-sm text-green-400 hover:text-green-300"
          >
            <Target className="h-4 w-4" />
            <span>{showSymptomMap ? 'Ocultar' : 'Mostrar'} Mapa de Síntomas</span>
          </button>
          {showSymptomMap && (
            <SymptomMap currentCondition={currentCondition} onSymptomClick={handleSymptomClick} />
          )}
        </div>
      )}
    </div>
  );
}