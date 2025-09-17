import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Brain, Clock, TrendingUp, MessageSquare, Zap, Activity, Target } from 'lucide-react';
import OpenAI from 'openai';

interface SymptomAnalysis {
  primarySymptoms: string[];
  timelineParsed: {
    onset: string;
    duration: string;
    evolution: string;
    chronology: 'acute' | 'subacute' | 'chronic';
  };
  severity: {
    pain?: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    functional_impact: 'none' | 'mild' | 'moderate' | 'severe';
  };
  associatedSymptoms: string[];
  redFlags: RedFlag[];
  suggestedQuestions: Question[];
  possibleDiagnoses: Diagnosis[];
  systemsInvolved: MedicalSystem[];
  recommendedScales: RecommendedScale[];
}

interface RedFlag {
  symptom: string;
  severity: 'warning' | 'danger' | 'critical';
  action: string;
  rationale: string;
}

interface Question {
  category: 'symptoms' | 'timeline' | 'context' | 'risk_factors';
  question: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

interface Diagnosis {
  name: string;
  icd10?: string;
  probability: number;
  supportingFindings: string[];
  differentialPoints: string[];
}

interface MedicalSystem {
  system: string;
  involvement: 'primary' | 'secondary' | 'possible';
  findings: string[];
}

interface RecommendedScale {
  name: string;
  rationale: string;
  priority: 'essential' | 'recommended' | 'optional';
}

interface SmartSymptomAnalyzerProps {
  currentCondition: string;
  onAnalysisUpdate: (analysis: SymptomAnalysis | null) => void;
  onSuggestedQuestionsUpdate: (questions: Question[]) => void;
  isVisible: boolean;
}

// Base de conocimiento médico simplificada
const MEDICAL_KNOWLEDGE = {
  redFlagSymptoms: [
    { pattern: /dolor.*pecho|chest.*pain|dolor.*torácico/i, severity: 'critical' as const, action: 'ECG inmediato y evaluación cardiológica', rationale: 'Posible síndrome coronario agudo' },
    { pattern: /dificultad.*respirar|disnea.*súbita|shortness.*breath/i, severity: 'critical' as const, action: 'Evaluación respiratoria urgente', rationale: 'Posible embolia pulmonar o edema agudo' },
    { pattern: /pérdida.*conciencia|sincope|desmayo/i, severity: 'danger' as const, action: 'Evaluación neurológica y cardiovascular', rationale: 'Múltiples etiologías graves posibles' },
    { pattern: /cefalea.*súbita|peor.*dolor.*cabeza.*vida/i, severity: 'critical' as const, action: 'TC cerebral urgente', rationale: 'Posible hemorragia subaracnoidea' },
    { pattern: /fiebre.*alta|temperatura.*40|fever.*104/i, severity: 'danger' as const, action: 'Evaluación infecciosa urgente', rationale: 'Riesgo de sepsis o meningitis' },
    { pattern: /sangrado.*abundante|hemorragia/i, severity: 'critical' as const, action: 'Control hemorrágico inmediato', rationale: 'Riesgo de shock hipovolémico' },
    { pattern: /dolor.*abdominal.*intenso/i, severity: 'danger' as const, action: 'Evaluación quirúrgica', rationale: 'Posible abdomen agudo' },
    { pattern: /alteración.*mental|confusión.*súbita/i, severity: 'danger' as const, action: 'Evaluación neurológica y metabólica', rationale: 'Múltiples causas neurológicas/metabólicas' }
  ],

  symptomPatterns: {
    cardiovascular: [/dolor.*pecho/, /palpitaciones/, /edema/, /disnea.*esfuerzo/],
    respiratory: [/tos/, /disnea/, /dolor.*torácico.*respirar/, /sibilancias/],
    neurological: [/cefalea/, /mareo/, /vértigo/, /alteración.*sensibilidad/, /debilidad/],
    gastrointestinal: [/dolor.*abdominal/, /náuseas/, /vómito/, /diarrea/, /estreñimiento/],
    musculoskeletal: [/dolor.*articular/, /dolor.*muscular/, /rigidez/, /limitación.*movimiento/],
    genitourinary: [/dolor.*orinar/, /frecuencia.*urinaria/, /hematuria/],
    dermatological: [/rash/, /prurito/, /lesiones.*piel/, /cambios.*piel/],
    endocrine: [/poliuria/, /polidipsia/, /pérdida.*peso/, /fatiga.*extrema/]
  },

  timelineKeywords: {
    acute: [/súbito/, /repentino/, /minutos/, /horas/, /ayer/, /today/, /sudden/],
    subacute: [/días/, /semana/, /week/, /gradual/, /progressive/],
    chronic: [/meses/, /años/, /months/, /years/, /crónico/, /persistente/]
  },

  severityIndicators: {
    mild: [/leve/, /tolerable/, /mild/, /ocasional/],
    moderate: [/moderado/, /molesto/, /moderate/, /interfiere.*actividades/],
    severe: [/severo/, /intenso/, /severe/, /incapacitante/, /insoportable/],
    critical: [/extremo/, /peor.*vida/, /worst.*life/, /desmayo/, /pérdida.*conciencia/]
  }
};

export default function SmartSymptomAnalyzer({
  currentCondition,
  onAnalysisUpdate,
  onSuggestedQuestionsUpdate,
  isVisible
}: SmartSymptomAnalyzerProps) {
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState('');

  // Análisis básico usando patrones
  const performBasicAnalysis = (text: string): Partial<SymptomAnalysis> => {
    const lowerText = text.toLowerCase();

    // Detectar banderas rojas
    const redFlags: RedFlag[] = [];
    MEDICAL_KNOWLEDGE.redFlagSymptoms.forEach(flag => {
      if (flag.pattern.test(text)) {
        redFlags.push({
          symptom: flag.pattern.source,
          severity: flag.severity,
          action: flag.action,
          rationale: flag.rationale
        });
      }
    });

    // Determinar cronología
    let chronology: 'acute' | 'subacute' | 'chronic' = 'subacute';
    if (MEDICAL_KNOWLEDGE.timelineKeywords.acute.some(pattern => pattern.test(text))) {
      chronology = 'acute';
    } else if (MEDICAL_KNOWLEDGE.timelineKeywords.chronic.some(pattern => pattern.test(text))) {
      chronology = 'chronic';
    }

    // Detectar sistemas involucrados
    const systemsInvolved: MedicalSystem[] = [];
    Object.entries(MEDICAL_KNOWLEDGE.symptomPatterns).forEach(([system, patterns]) => {
      const findings = patterns.filter(pattern => pattern.test(text));
      if (findings.length > 0) {
        systemsInvolved.push({
          system,
          involvement: findings.length > 1 ? 'primary' : 'possible',
          findings: findings.map(f => f.source)
        });
      }
    });

    // Determinar urgencia
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (redFlags.some(f => f.severity === 'critical')) urgency = 'critical';
    else if (redFlags.some(f => f.severity === 'danger')) urgency = 'high';
    else if (redFlags.length > 0) urgency = 'medium';

    return {
      redFlags,
      timelineParsed: {
        onset: '',
        duration: '',
        evolution: '',
        chronology
      },
      severity: {
        urgency,
        functional_impact: 'moderate'
      },
      systemsInvolved,
      recommendedScales: []
    };
  };

  // Análisis avanzado con IA
  const performAIAnalysis = async (text: string): Promise<Partial<SymptomAnalysis>> => {
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

      const systemPrompt = `Eres un médico experto en análisis de síntomas. Analiza el texto del padecimiento actual y extrae información estructurada.

RESPONDE SOLO CON UN JSON VÁLIDO con esta estructura:
{
  "primarySymptoms": ["síntoma1", "síntoma2"],
  "timelineParsed": {
    "onset": "cuándo comenzó",
    "duration": "duración",
    "evolution": "cómo ha evolucionado"
  },
  "severity": {
    "pain": 5,
    "urgency": "medium",
    "functional_impact": "moderate"
  },
  "associatedSymptoms": ["síntoma_asociado1"],
  "suggestedQuestions": [
    {
      "category": "symptoms",
      "question": "¿Ha experimentado...?",
      "priority": "high",
      "rationale": "Para descartar..."
    }
  ],
  "possibleDiagnoses": [
    {
      "name": "Diagnóstico probable",
      "icd10": "Z00.0",
      "probability": 0.7,
      "supportingFindings": ["hallazgo1"],
      "differentialPoints": ["punto_diferencial"]
    }
  ],
  "recommendedScales": [
    {
      "name": "Escala EVA",
      "rationale": "Para medir dolor",
      "priority": "essential"
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza este padecimiento actual: "${text}"` }
        ],
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = completion.choices[0]?.message?.content;
      if (result) {
        return JSON.parse(result);
      }
    } catch (error) {
      console.warn('Error en análisis con IA:', error);
    }

    return {};
  };

  // Función principal de análisis
  const analyzeSymptoms = async (text: string) => {
    if (!text.trim() || text === lastAnalyzedText) return;

    setIsAnalyzing(true);
    setLastAnalyzedText(text);

    try {
      // Análisis básico inmediato
      const basicAnalysis = performBasicAnalysis(text);

      // Análisis avanzado con IA (opcional)
      const aiAnalysis = await performAIAnalysis(text);

      // Combinar resultados
      const combinedAnalysis: SymptomAnalysis = {
        primarySymptoms: aiAnalysis.primarySymptoms || [],
        timelineParsed: {
          ...basicAnalysis.timelineParsed!,
          ...aiAnalysis.timelineParsed
        },
        severity: {
          ...basicAnalysis.severity!,
          ...aiAnalysis.severity
        },
        associatedSymptoms: aiAnalysis.associatedSymptoms || [],
        redFlags: basicAnalysis.redFlags || [],
        suggestedQuestions: aiAnalysis.suggestedQuestions || [],
        possibleDiagnoses: aiAnalysis.possibleDiagnoses || [],
        systemsInvolved: basicAnalysis.systemsInvolved || [],
        recommendedScales: aiAnalysis.recommendedScales || []
      };

      setAnalysis(combinedAnalysis);
      onAnalysisUpdate(combinedAnalysis);
      onSuggestedQuestionsUpdate(combinedAnalysis.suggestedQuestions);

    } catch (error) {
      console.error('Error en análisis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Efecto para analizar cuando cambia el texto
  useEffect(() => {
    if (currentCondition && currentCondition.length > 20) {
      const timeoutId = setTimeout(() => {
        analyzeSymptoms(currentCondition);
      }, 2000); // Debounce de 2 segundos

      return () => clearTimeout(timeoutId);
    }
  }, [currentCondition]);

  if (!isVisible || !analysis) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-400" />
          <h4 className="text-lg font-medium text-white">Análisis Inteligente</h4>
          {isAnalyzing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm text-blue-300">Analizando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-400">IA Médica</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Banderas Rojas */}
        {analysis.redFlags.length > 0 && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h5 className="text-sm font-medium text-red-300">Banderas Rojas</h5>
            </div>
            <div className="space-y-2">
              {analysis.redFlags.map((flag, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-red-200">{flag.action}</span>
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      flag.severity === 'critical' ? 'bg-red-800 text-red-100' :
                      flag.severity === 'danger' ? 'bg-orange-800 text-orange-100' :
                      'bg-yellow-800 text-yellow-100'
                    }`}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-red-300 mt-1">{flag.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cronología */}
        <div className="bg-cyan-900/30 border border-cyan-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <h5 className="text-sm font-medium text-cyan-300">Cronología</h5>
          </div>
          <div className="space-y-1 text-xs text-cyan-200">
            <div>Tipo: <span className="font-medium">{analysis.timelineParsed.chronology}</span></div>
            {analysis.timelineParsed.onset && (
              <div>Inicio: <span className="font-medium">{analysis.timelineParsed.onset}</span></div>
            )}
            {analysis.timelineParsed.evolution && (
              <div>Evolución: <span className="font-medium">{analysis.timelineParsed.evolution}</span></div>
            )}
          </div>
        </div>

        {/* Severidad */}
        <div className="bg-orange-900/30 border border-orange-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-orange-400" />
            <h5 className="text-sm font-medium text-orange-300">Severidad</h5>
          </div>
          <div className="space-y-1 text-xs text-orange-200">
            <div>Urgencia: <span className={`font-medium ${
              analysis.severity.urgency === 'critical' ? 'text-red-300' :
              analysis.severity.urgency === 'high' ? 'text-orange-300' :
              analysis.severity.urgency === 'medium' ? 'text-yellow-300' :
              'text-green-300'
            }`}>{analysis.severity.urgency}</span></div>
            {analysis.severity.pain && (
              <div>Dolor: <span className="font-medium">{analysis.severity.pain}/10</span></div>
            )}
            <div>Impacto: <span className="font-medium">{analysis.severity.functional_impact}</span></div>
          </div>
        </div>

        {/* Sistemas Involucrados */}
        {analysis.systemsInvolved.length > 0 && (
          <div className="bg-green-900/30 border border-green-600 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-green-400" />
              <h5 className="text-sm font-medium text-green-300">Sistemas</h5>
            </div>
            <div className="space-y-1 text-xs text-green-200">
              {analysis.systemsInvolved.map((system, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="capitalize">{system.system}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    system.involvement === 'primary' ? 'bg-green-800 text-green-100' :
                    system.involvement === 'secondary' ? 'bg-blue-800 text-blue-100' :
                    'bg-gray-800 text-gray-100'
                  }`}>
                    {system.involvement}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preguntas Sugeridas */}
        {analysis.suggestedQuestions.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              <h5 className="text-sm font-medium text-purple-300">Preguntas Sugeridas</h5>
            </div>
            <div className="space-y-2">
              {analysis.suggestedQuestions.slice(0, 3).map((question, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      question.priority === 'high' ? 'bg-red-800 text-red-100' :
                      question.priority === 'medium' ? 'bg-yellow-800 text-yellow-100' :
                      'bg-gray-800 text-gray-100'
                    }`}>
                      {question.priority}
                    </span>
                  </div>
                  <p className="text-purple-200 font-medium">{question.question}</p>
                  <p className="text-purple-300 mt-1">{question.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnósticos Posibles */}
        {analysis.possibleDiagnoses.length > 0 && (
          <div className="bg-indigo-900/30 border border-indigo-600 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-indigo-400" />
              <h5 className="text-sm font-medium text-indigo-300">Diagnósticos Posibles</h5>
            </div>
            <div className="space-y-2">
              {analysis.possibleDiagnoses.slice(0, 3).map((dx, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-200 font-medium">{dx.name}</span>
                    <span className="text-indigo-300">{Math.round(dx.probability * 100)}%</span>
                  </div>
                  {dx.icd10 && (
                    <div className="text-indigo-400 text-xs">CIE-10: {dx.icd10}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Escalas Recomendadas */}
      {analysis.recommendedScales.length > 0 && (
        <div className="mt-4 bg-teal-900/30 border border-teal-600 rounded-lg p-3">
          <h5 className="text-sm font-medium text-teal-300 mb-2">Escalas Recomendadas</h5>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendedScales.map((scale, index) => (
              <div key={index} className={`px-2 py-1 rounded text-xs ${
                scale.priority === 'essential' ? 'bg-teal-800 text-teal-100' :
                scale.priority === 'recommended' ? 'bg-blue-800 text-blue-100' :
                'bg-gray-800 text-gray-100'
              }`}>
                {scale.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}