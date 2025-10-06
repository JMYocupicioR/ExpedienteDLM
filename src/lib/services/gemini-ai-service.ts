import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar Gemini AI
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY no está configurada');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface AIAnalysisResult {
  alerts?: Array<{
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    action?: string;
    confidence?: number;
    category?: 'safety' | 'diagnosis' | 'treatment' | 'efficiency';
  }>;
  recommendations?: string[];
  summary?: string;
}

/**
 * Servicio de IA médica usando Google Gemini
 */
export class GeminiAIService {
  private model;

  constructor(modelName: string = 'gemini-1.5-flash') {
    if (!genAI) {
      throw new Error('Gemini AI no está inicializado. Verifica VITE_GEMINI_API_KEY');
    }
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Analiza contexto médico y genera alertas clínicas
   */
  async analyzeMedicalContext(context: {
    patientAge?: number;
    patientGender?: string;
    currentCondition?: string;
    vitalSigns?: Record<string, any>;
    diagnoses?: string[];
    medications?: string[];
    allergies?: string[];
  }): Promise<AIAnalysisResult> {
    try {
      const contextString = this.formatContext(context);

      const prompt = `Eres un asistente médico experto. Analiza el siguiente contexto clínico y genera alertas críticas:

CONTEXTO MÉDICO:
${contextString}

INSTRUCCIONES:
1. Identifica signos de alarma o "red flags"
2. Detecta inconsistencias entre síntomas, signos vitales y diagnóstico
3. Sugiere estudios complementarios necesarios
4. Evalúa consideraciones de seguridad del paciente
5. Propón mejoras en eficiencia clínica

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones adicionales):
{
  "alerts": [
    {
      "type": "critical|warning|info|success",
      "title": "título corto y claro",
      "message": "descripción detallada del hallazgo",
      "action": "acción recomendada específica",
      "confidence": 85,
      "category": "safety|diagnosis|treatment|efficiency"
    }
  ],
  "summary": "resumen ejecutivo en 2-3 líneas"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extraer JSON del texto (puede venir con markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }

      return { alerts: [], summary: text };
    } catch (error) {
      console.error('Error en análisis Gemini:', error);
      throw error;
    }
  }

  /**
   * Genera sugerencias de diagnóstico diferencial
   */
  async generateDifferentialDiagnosis(
    symptoms: string[],
    vitalSigns?: Record<string, any>
  ): Promise<string[]> {
    try {
      const prompt = `Como médico experto, genera un diagnóstico diferencial para:

SÍNTOMAS:
${symptoms.join('\n- ')}

SIGNOS VITALES:
${vitalSigns ? JSON.stringify(vitalSigns, null, 2) : 'No disponibles'}

Responde con un array JSON de diagnósticos diferenciales ordenados por probabilidad:
["Diagnóstico 1", "Diagnóstico 2", "Diagnóstico 3", ...]`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Error generando diagnóstico diferencial:', error);
      return [];
    }
  }

  /**
   * Analiza interacciones medicamentosas
   */
  async analyzeDrugInteractions(medications: string[]): Promise<{
    interactions: Array<{
      drugs: string[];
      severity: 'high' | 'moderate' | 'low';
      description: string;
      recommendation: string;
    }>;
  }> {
    try {
      const prompt = `Analiza posibles interacciones medicamentosas entre:

MEDICAMENTOS:
${medications.join('\n- ')}

Responde ÚNICAMENTE con JSON:
{
  "interactions": [
    {
      "drugs": ["medicamento1", "medicamento2"],
      "severity": "high|moderate|low",
      "description": "descripción de la interacción",
      "recommendation": "acción recomendada"
    }
  ]
}`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { interactions: [] };
    } catch (error) {
      console.error('Error analizando interacciones:', error);
      return { interactions: [] };
    }
  }

  /**
   * Interpreta resultados de laboratorio
   */
  async interpretLabResults(results: Array<{
    parameter: string;
    value: number;
    unit: string;
    referenceMin?: number;
    referenceMax?: number;
  }>): Promise<{
    interpretation: string;
    abnormalFindings: string[];
    recommendations: string[];
  }> {
    try {
      const resultsText = results.map(r =>
        `${r.parameter}: ${r.value} ${r.unit} (Ref: ${r.referenceMin}-${r.referenceMax})`
      ).join('\n');

      const prompt = `Interpreta los siguientes resultados de laboratorio:

${resultsText}

Responde con JSON:
{
  "interpretation": "interpretación general en lenguaje médico",
  "abnormalFindings": ["hallazgo anormal 1", "hallazgo anormal 2"],
  "recommendations": ["recomendación 1", "recomendación 2"]
}`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { interpretation: text, abnormalFindings: [], recommendations: [] };
    } catch (error) {
      console.error('Error interpretando laboratorios:', error);
      return { interpretation: '', abnormalFindings: [], recommendations: [] };
    }
  }

  /**
   * Formatea el contexto médico para el prompt
   */
  private formatContext(context: any): string {
    const lines: string[] = [];

    if (context.patientAge) lines.push(`Edad: ${context.patientAge} años`);
    if (context.patientGender) lines.push(`Sexo: ${context.patientGender}`);
    if (context.currentCondition) lines.push(`Padecimiento actual: ${context.currentCondition}`);

    if (context.vitalSigns && Object.keys(context.vitalSigns).length > 0) {
      lines.push(`\nSignos vitales:`);
      Object.entries(context.vitalSigns).forEach(([key, value]) => {
        if (value) lines.push(`- ${key}: ${value}`);
      });
    }

    if (context.diagnoses && context.diagnoses.length > 0) {
      lines.push(`\nDiagnósticos: ${context.diagnoses.join(', ')}`);
    }

    if (context.medications && context.medications.length > 0) {
      lines.push(`\nMedicamentos: ${context.medications.join(', ')}`);
    }

    if (context.allergies && context.allergies.length > 0) {
      lines.push(`\nAlergias: ${context.allergies.join(', ')}`);
    }

    return lines.join('\n');
  }
}

// Exportar instancia por defecto
export const geminiAI = apiKey ? new GeminiAIService() : null;
