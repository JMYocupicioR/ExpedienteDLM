import React, { useState, useEffect } from 'react';
import { TestTube, Stethoscope, Pill, Calendar, Brain, ChevronRight, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

interface MedicalRecommendations {
  suggestedTests: SuggestedTest[];
  differentialDx: DifferentialDiagnosis[];
  treatmentOptions: TreatmentOption[];
  followUpPlan: FollowUpAction[];
  drugInteractions: DrugInteraction[];
  clinicalGuidelines: ClinicalGuideline[];
  riskFactors: RiskFactor[];
  prognosis: PrognosisAssessment;
}

interface SuggestedTest {
  test: string;
  type: 'laboratory' | 'imaging' | 'other';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  rationale: string;
  cost: 'low' | 'medium' | 'high';
  availability: 'immediate' | 'same_day' | 'scheduled';
  expectedResults: string;
  icd10Code?: string;
}

interface DifferentialDiagnosis {
  diagnosis: string;
  icd10: string;
  probability: number;
  supportingEvidence: string[];
  againstEvidence: string[];
  requiredTests: string[];
  treatmentUrgency: 'immediate' | 'urgent' | 'routine';
}

interface TreatmentOption {
  category: 'pharmacological' | 'non_pharmacological' | 'surgical' | 'lifestyle';
  option: string;
  evidence: 'strong' | 'moderate' | 'weak' | 'expert_opinion';
  contraindications: string[];
  sideEffects: string[];
  costEffectiveness: number;
  timeToEffect: string;
  monitoring: string[];
}

interface FollowUpAction {
  action: string;
  timeframe: string;
  priority: 'critical' | 'important' | 'routine';
  responsible: 'primary_care' | 'specialist' | 'patient' | 'nurse';
  metrics: string[];
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  effect: string;
  recommendation: string;
  alternativeDrugs: string[];
}

interface ClinicalGuideline {
  source: string;
  guideline: string;
  recommendation: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  lastUpdated: string;
}

interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  modifiable: boolean;
  interventions: string[];
}

interface PrognosisAssessment {
  shortTerm: {
    likelihood: number;
    timeframe: string;
    factors: string[];
  };
  longTerm: {
    likelihood: number;
    timeframe: string;
    factors: string[];
  };
  qualityOfLife: {
    impact: 'minimal' | 'mild' | 'moderate' | 'severe';
    interventions: string[];
  };
}

interface MedicalRecommendationsEngineProps {
  currentCondition: string;
  diagnosis: string;
  vitalSigns: any;
  patientAge?: number;
  patientGender?: string;
  allergies?: string[];
  currentMedications?: string[];
  patientId: string;
  doctorId: string;
  onRecommendationsUpdate: (recommendations: MedicalRecommendations | null) => void;
  isVisible: boolean;
}

// Base de datos de conocimiento médico
const MEDICAL_KNOWLEDGE_DB = {
  commonTests: {
    cardiovascular: [
      { test: 'ECG', rationale: 'Evaluar ritmo y conducción cardíaca', cost: 'low', availability: 'immediate' },
      { test: 'Ecocardiograma', rationale: 'Función ventricular y valvular', cost: 'medium', availability: 'same_day' },
      { test: 'Troponinas', rationale: 'Daño miocárdico', cost: 'medium', availability: 'immediate' },
      { test: 'BNP/NT-proBNP', rationale: 'Insuficiencia cardíaca', cost: 'medium', availability: 'same_day' }
    ],
    respiratory: [
      { test: 'Radiografía de tórax', rationale: 'Evaluar estructuras pulmonares', cost: 'low', availability: 'immediate' },
      { test: 'Gasometría arterial', rationale: 'Estado ácido-base y oxigenación', cost: 'medium', availability: 'immediate' },
      { test: 'Espirometría', rationale: 'Función pulmonar', cost: 'medium', availability: 'scheduled' },
      { test: 'TC de tórax', rationale: 'Evaluación detallada pulmonar', cost: 'high', availability: 'scheduled' }
    ],
    neurological: [
      { test: 'TC cerebral', rationale: 'Evaluar lesiones estructurales', cost: 'high', availability: 'immediate' },
      { test: 'RM cerebral', rationale: 'Evaluación detallada del SNC', cost: 'high', availability: 'scheduled' },
      { test: 'Electroencefalograma', rationale: 'Actividad eléctrica cerebral', cost: 'medium', availability: 'scheduled' },
      { test: 'Punción lumbar', rationale: 'Análisis de LCR', cost: 'medium', availability: 'same_day' }
    ],
    gastrointestinal: [
      { test: 'Ultrasonido abdominal', rationale: 'Evaluar órganos abdominales', cost: 'medium', availability: 'same_day' },
      { test: 'TC abdominal', rationale: 'Evaluación detallada abdominal', cost: 'high', availability: 'scheduled' },
      { test: 'Endoscopia', rationale: 'Evaluación directa del tracto GI', cost: 'high', availability: 'scheduled' },
      { test: 'Pruebas hepáticas', rationale: 'Función hepática', cost: 'low', availability: 'same_day' }
    ]
  },

  drugInteractions: [
    {
      drug1: 'Warfarina',
      drug2: 'Aspirina',
      severity: 'major' as const,
      effect: 'Aumenta riesgo de sangrado',
      recommendation: 'Monitoreo estrecho de INR',
      alternativeDrugs: ['Clopidogrel']
    },
    {
      drug1: 'IECA',
      drug2: 'Espironolactona',
      severity: 'moderate' as const,
      effect: 'Riesgo de hiperkalemia',
      recommendation: 'Monitoreo de potasio sérico',
      alternativeDrugs: ['Hidroclorotiazida']
    }
  ],

  clinicalGuidelines: [
    {
      source: 'AHA/ACC',
      condition: 'hipertensión',
      recommendation: 'Objetivo <130/80 mmHg en adultos',
      evidenceLevel: 'A' as const,
      lastUpdated: '2023'
    },
    {
      source: 'ESC/EAS',
      condition: 'dislipidemia',
      recommendation: 'LDL <100 mg/dL en prevención secundaria',
      evidenceLevel: 'A' as const,
      lastUpdated: '2023'
    }
  ]
};

export default function MedicalRecommendationsEngine({
  currentCondition,
  diagnosis,
  vitalSigns,
  patientAge,
  patientGender,
  allergies = [],
  currentMedications = [],
  patientId,
  doctorId,
  onRecommendationsUpdate,
  isVisible
}: MedicalRecommendationsEngineProps) {
  const [recommendations, setRecommendations] = useState<MedicalRecommendations | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'diagnoses' | 'treatments' | 'followup'>('tests');
  const [loadingStage, setLoadingStage] = useState<string>('');

  // Generar recomendaciones básicas usando reglas
  const generateBasicRecommendations = async (condition: string, dx: string): Promise<Partial<MedicalRecommendations>> => {
    const combinedText = `${condition} ${dx}`.toLowerCase();

    // Sugerir estudios basados en síntomas/diagnóstico
    const suggestedTests: SuggestedTest[] = [];

    // Cardiovascular
    if (/dolor.*pecho|chest.*pain|cardiovascular|cardio/i.test(combinedText)) {
      MEDICAL_KNOWLEDGE_DB.commonTests.cardiovascular.forEach(test => {
        suggestedTests.push({
          ...test,
          type: 'other' as const,
          priority: /dolor.*pecho|chest.*pain/i.test(combinedText) ? 'urgent' as const : 'medium' as const,
          expectedResults: `Evaluar ${test.rationale.toLowerCase()}`
        });
      });
    }

    // Respiratorio
    if (/tos|disnea|respiratory|pulmon/i.test(combinedText)) {
      MEDICAL_KNOWLEDGE_DB.commonTests.respiratory.forEach(test => {
        suggestedTests.push({
          ...test,
          type: test.test.includes('TC') ? 'imaging' as const : 'other' as const,
          priority: /disnea.*severa|respiratory.*distress/i.test(combinedText) ? 'urgent' as const : 'medium' as const,
          expectedResults: `Evaluar ${test.rationale.toLowerCase()}`
        });
      });
    }

    // Neurológico
    if (/cefalea|neurolog|convulsion|alteracion.*conciencia/i.test(combinedText)) {
      MEDICAL_KNOWLEDGE_DB.commonTests.neurological.forEach(test => {
        suggestedTests.push({
          ...test,
          type: test.test.includes('TC') || test.test.includes('RM') ? 'imaging' as const : 'other' as const,
          priority: /alteracion.*conciencia|convulsion/i.test(combinedText) ? 'urgent' as const : 'medium' as const,
          expectedResults: `Evaluar ${test.rationale.toLowerCase()}`
        });
      });
    }

    // Verificar interacciones de medicamentos
    const drugInteractions: DrugInteraction[] = [];
    currentMedications.forEach(med1 => {
      currentMedications.forEach(med2 => {
        if (med1 !== med2) {
          const interaction = MEDICAL_KNOWLEDGE_DB.drugInteractions.find(
            inter => (inter.drug1.toLowerCase().includes(med1.toLowerCase()) && inter.drug2.toLowerCase().includes(med2.toLowerCase())) ||
                     (inter.drug2.toLowerCase().includes(med1.toLowerCase()) && inter.drug1.toLowerCase().includes(med2.toLowerCase()))
          );
          if (interaction && !drugInteractions.find(di => di.drug1 === interaction.drug1 && di.drug2 === interaction.drug2)) {
            drugInteractions.push(interaction);
          }
        }
      });
    });

    return {
      suggestedTests: suggestedTests.slice(0, 6), // Limitar a 6 estudios
      drugInteractions,
      differentialDx: [],
      treatmentOptions: [],
      followUpPlan: []
    };
  };

  // Generar recomendaciones con IA
  const generateAIRecommendations = async (condition: string, dx: string): Promise<Partial<MedicalRecommendations>> => {
    setLoadingStage('Analizando con IA médica...');

    try {
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('API key no configurada');
      }

      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const contextData = {
        condition,
        diagnosis: dx,
        age: patientAge,
        gender: patientGender,
        allergies,
        medications: currentMedications,
        vitalSigns
      };

      const systemPrompt = `Eres un médico especialista en medicina interna con amplia experiencia clínica. Genera recomendaciones médicas estructuradas basadas en la información del paciente.

RESPONDE SOLO CON UN JSON VÁLIDO con esta estructura:
{
  "differentialDx": [
    {
      "diagnosis": "Nombre del diagnóstico",
      "icd10": "Código CIE-10",
      "probability": 0.8,
      "supportingEvidence": ["evidencia1", "evidencia2"],
      "againstEvidence": ["contra-evidencia1"],
      "requiredTests": ["estudio1", "estudio2"],
      "treatmentUrgency": "urgent"
    }
  ],
  "treatmentOptions": [
    {
      "category": "pharmacological",
      "option": "Descripción del tratamiento",
      "evidence": "strong",
      "contraindications": ["contraindicación1"],
      "sideEffects": ["efecto1", "efecto2"],
      "costEffectiveness": 0.8,
      "timeToEffect": "2-4 semanas",
      "monitoring": ["parámetro1", "parámetro2"]
    }
  ],
  "followUpPlan": [
    {
      "action": "Acción a realizar",
      "timeframe": "En 1 semana",
      "priority": "important",
      "responsible": "primary_care",
      "metrics": ["métrica1", "métrica2"]
    }
  ],
  "prognosis": {
    "shortTerm": {
      "likelihood": 0.9,
      "timeframe": "2-4 semanas",
      "factors": ["factor1", "factor2"]
    },
    "longTerm": {
      "likelihood": 0.8,
      "timeframe": "6-12 meses",
      "factors": ["factor1", "factor2"]
    },
    "qualityOfLife": {
      "impact": "mild",
      "interventions": ["intervención1", "intervención2"]
    }
  }
}`;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Genera recomendaciones para: ${JSON.stringify(contextData)}` }
        ],
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = completion.choices[0]?.message?.content;
      if (result) {
        return JSON.parse(result);
      }
    } catch (error) {
      console.warn('Error en recomendaciones IA:', error);
    }

    return {};
  };

  // Buscar guías clínicas relevantes
  const findClinicalGuidelines = async (condition: string, dx: string): Promise<ClinicalGuideline[]> => {
    setLoadingStage('Buscando guías clínicas...');

    const combinedText = `${condition} ${dx}`.toLowerCase();
    const relevantGuidelines: ClinicalGuideline[] = [];

    MEDICAL_KNOWLEDGE_DB.clinicalGuidelines.forEach(guideline => {
      if (combinedText.includes(guideline.condition)) {
        relevantGuidelines.push({
          source: guideline.source,
          guideline: guideline.condition,
          recommendation: guideline.recommendation,
          evidenceLevel: guideline.evidenceLevel,
          lastUpdated: guideline.lastUpdated
        });
      }
    });

    // Buscar en base de datos de plantillas médicas
    try {
      const { data: templates } = await supabase
        .from('medical_templates')
        .select('name, description, content, specialty')
        .eq('type', 'guideline')
        .eq('is_active', true)
        .or(`name.ilike.%${dx}%,description.ilike.%${dx}%`)
        .limit(5);

      if (templates) {
        templates.forEach(template => {
          relevantGuidelines.push({
            source: template.specialty || 'Internal',
            guideline: template.name,
            recommendation: template.description || '',
            evidenceLevel: 'B',
            lastUpdated: '2024'
          });
        });
      }
    } catch (error) {
      console.warn('Error buscando guías:', error);
    }

    return relevantGuidelines;
  };

  // Función principal para generar recomendaciones
  const generateRecommendations = async () => {
    if (!currentCondition.trim() && !diagnosis.trim()) return;

    setIsGenerating(true);
    setLoadingStage('Inicializando análisis...');

    try {
      // Generar recomendaciones básicas
      setLoadingStage('Generando recomendaciones básicas...');
      const basicRecs = await generateBasicRecommendations(currentCondition, diagnosis);

      // Generar recomendaciones con IA
      const aiRecs = await generateAIRecommendations(currentCondition, diagnosis);

      // Buscar guías clínicas
      const guidelines = await findClinicalGuidelines(currentCondition, diagnosis);

      // Combinar resultados
      setLoadingStage('Consolidando recomendaciones...');
      const combinedRecommendations: MedicalRecommendations = {
        suggestedTests: basicRecs.suggestedTests || [],
        differentialDx: aiRecs.differentialDx || [],
        treatmentOptions: aiRecs.treatmentOptions || [],
        followUpPlan: aiRecs.followUpPlan || [],
        drugInteractions: basicRecs.drugInteractions || [],
        clinicalGuidelines: guidelines,
        riskFactors: [],
        prognosis: aiRecs.prognosis || {
          shortTerm: { likelihood: 0.8, timeframe: '2-4 semanas', factors: [] },
          longTerm: { likelihood: 0.7, timeframe: '6-12 meses', factors: [] },
          qualityOfLife: { impact: 'mild', interventions: [] }
        }
      };

      setRecommendations(combinedRecommendations);
      onRecommendationsUpdate(combinedRecommendations);

    } catch (error) {
      console.error('Error generando recomendaciones:', error);
    } finally {
      setIsGenerating(false);
      setLoadingStage('');
    }
  };

  // Efecto para generar recomendaciones cuando cambian los datos
  useEffect(() => {
    if ((currentCondition.length > 20 || diagnosis.length > 10) && isVisible) {
      const timeoutId = setTimeout(() => {
        generateRecommendations();
      }, 3000); // Debounce de 3 segundos

      return () => clearTimeout(timeoutId);
    }
  }, [currentCondition, diagnosis, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-green-400" />
          <h4 className="text-lg font-medium text-white">Recomendaciones Médicas</h4>
          {isGenerating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
              <span className="text-sm text-green-300">{loadingStage}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-400">IA + Guías Clínicas</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'tests', label: 'Estudios', icon: TestTube, count: recommendations?.suggestedTests.length || 0 },
          { id: 'diagnoses', label: 'Diagnósticos', icon: Stethoscope, count: recommendations?.differentialDx.length || 0 },
          { id: 'treatments', label: 'Tratamientos', icon: Pill, count: recommendations?.treatmentOptions.length || 0 },
          { id: 'followup', label: 'Seguimiento', icon: Calendar, count: recommendations?.followUpPlan.length || 0 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium
                ${activeTab === tab.id
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {!recommendations && !isGenerating && (
          <div className="text-center py-8 text-gray-400">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingresa información del padecimiento actual y diagnóstico para generar recomendaciones</p>
          </div>
        )}

        {/* Estudios Sugeridos */}
        {activeTab === 'tests' && recommendations?.suggestedTests && (
          <div className="space-y-3">
            {recommendations.suggestedTests.map((test, index) => (
              <div key={index} className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <TestTube className="h-4 w-4 text-blue-400" />
                      <span className="font-medium text-blue-200">{test.test}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        test.priority === 'urgent' ? 'bg-red-800 text-red-100' :
                        test.priority === 'high' ? 'bg-orange-800 text-orange-100' :
                        test.priority === 'medium' ? 'bg-yellow-800 text-yellow-100' :
                        'bg-gray-800 text-gray-100'
                      }`}>
                        {test.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        test.cost === 'high' ? 'bg-red-700 text-red-100' :
                        test.cost === 'medium' ? 'bg-yellow-700 text-yellow-100' :
                        'bg-green-700 text-green-100'
                      }`}>
                        {test.cost}
                      </span>
                    </div>
                    <p className="text-sm text-blue-300 mb-1">{test.rationale}</p>
                    <div className="flex items-center space-x-4 text-xs text-blue-400">
                      <span>Disponibilidad: {test.availability}</span>
                      <span>Tipo: {test.type}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Diagnósticos Diferenciales */}
        {activeTab === 'diagnoses' && recommendations?.differentialDx && (
          <div className="space-y-3">
            {recommendations.differentialDx.map((dx, index) => (
              <div key={index} className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="h-4 w-4 text-purple-400" />
                    <span className="font-medium text-purple-200">{dx.diagnosis}</span>
                    <span className="text-xs bg-purple-800 text-purple-100 px-2 py-0.5 rounded">
                      {Math.round(dx.probability * 100)}%
                    </span>
                    {dx.icd10 && (
                      <span className="text-xs bg-gray-800 text-gray-100 px-2 py-0.5 rounded">
                        {dx.icd10}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <h6 className="text-green-300 font-medium mb-1">A favor:</h6>
                    <ul className="text-green-200 text-xs space-y-1">
                      {dx.supportingEvidence.map((evidence, i) => (
                        <li key={i} className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {dx.againstEvidence.length > 0 && (
                    <div>
                      <h6 className="text-red-300 font-medium mb-1">En contra:</h6>
                      <ul className="text-red-200 text-xs space-y-1">
                        {dx.againstEvidence.map((evidence, i) => (
                          <li key={i} className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3 text-red-400" />
                            <span>{evidence}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {dx.requiredTests.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-600/30">
                    <span className="text-xs text-purple-300">Estudios requeridos: </span>
                    <span className="text-xs text-purple-200">{dx.requiredTests.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Opciones de Tratamiento */}
        {activeTab === 'treatments' && recommendations?.treatmentOptions && (
          <div className="space-y-3">
            {recommendations.treatmentOptions.map((treatment, index) => (
              <div key={index} className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Pill className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-green-200">{treatment.option}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      treatment.evidence === 'strong' ? 'bg-green-800 text-green-100' :
                      treatment.evidence === 'moderate' ? 'bg-yellow-800 text-yellow-100' :
                      treatment.evidence === 'weak' ? 'bg-orange-800 text-orange-100' :
                      'bg-gray-800 text-gray-100'
                    }`}>
                      {treatment.evidence}
                    </span>
                  </div>
                  <span className="text-xs text-green-300">
                    {Math.round(treatment.costEffectiveness * 100)}% efectivo
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-300 text-xs">Tiempo al efecto: </span>
                    <span className="text-green-200 text-xs">{treatment.timeToEffect}</span>
                  </div>
                  <div>
                    <span className="text-green-300 text-xs">Categoría: </span>
                    <span className="text-green-200 text-xs">{treatment.category}</span>
                  </div>
                </div>

                {treatment.contraindications.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-300 text-xs font-medium">Contraindicaciones: </span>
                    <span className="text-red-200 text-xs">{treatment.contraindications.join(', ')}</span>
                  </div>
                )}

                {treatment.monitoring.length > 0 && (
                  <div className="mt-1">
                    <span className="text-yellow-300 text-xs font-medium">Monitoreo: </span>
                    <span className="text-yellow-200 text-xs">{treatment.monitoring.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Plan de Seguimiento */}
        {activeTab === 'followup' && recommendations?.followUpPlan && (
          <div className="space-y-3">
            {recommendations.followUpPlan.map((action, index) => (
              <div key={index} className="bg-cyan-900/30 border border-cyan-600/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium text-cyan-200">{action.action}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        action.priority === 'critical' ? 'bg-red-800 text-red-100' :
                        action.priority === 'important' ? 'bg-orange-800 text-orange-100' :
                        'bg-gray-800 text-gray-100'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-cyan-300">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{action.timeframe}</span>
                      </div>
                      <span>Responsable: {action.responsible}</span>
                    </div>
                    {action.metrics.length > 0 && (
                      <div className="mt-2 text-xs text-cyan-200">
                        <span className="font-medium">Métricas: </span>
                        {action.metrics.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interacciones de Medicamentos */}
        {recommendations?.drugInteractions && recommendations.drugInteractions.length > 0 && (
          <div className="mt-4 bg-red-900/30 border border-red-600/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <h5 className="font-medium text-red-300">Interacciones de Medicamentos</h5>
            </div>
            <div className="space-y-2">
              {recommendations.drugInteractions.map((interaction, index) => (
                <div key={index} className="bg-red-800/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-red-200">
                      {interaction.drug1} + {interaction.drug2}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      interaction.severity === 'major' ? 'bg-red-700 text-red-100' :
                      interaction.severity === 'moderate' ? 'bg-orange-700 text-orange-100' :
                      'bg-yellow-700 text-yellow-100'
                    }`}>
                      {interaction.severity}
                    </span>
                  </div>
                  <p className="text-xs text-red-300 mb-1">{interaction.effect}</p>
                  <p className="text-xs text-red-200">{interaction.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pronóstico */}
        {recommendations?.prognosis && (
          <div className="mt-4 bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h5 className="font-medium text-indigo-300">Pronóstico</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h6 className="text-sm font-medium text-indigo-200 mb-1">Corto Plazo</h6>
                <p className="text-xs text-indigo-300">
                  {Math.round(recommendations.prognosis.shortTerm.likelihood * 100)}% en {recommendations.prognosis.shortTerm.timeframe}
                </p>
              </div>
              <div>
                <h6 className="text-sm font-medium text-indigo-200 mb-1">Largo Plazo</h6>
                <p className="text-xs text-indigo-300">
                  {Math.round(recommendations.prognosis.longTerm.likelihood * 100)}% en {recommendations.prognosis.longTerm.timeframe}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-indigo-300">Impacto en calidad de vida: </span>
              <span className={`text-xs font-medium ${
                recommendations.prognosis.qualityOfLife.impact === 'minimal' ? 'text-green-300' :
                recommendations.prognosis.qualityOfLife.impact === 'mild' ? 'text-yellow-300' :
                recommendations.prognosis.qualityOfLife.impact === 'moderate' ? 'text-orange-300' :
                'text-red-300'
              }`}>
                {recommendations.prognosis.qualityOfLife.impact}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}