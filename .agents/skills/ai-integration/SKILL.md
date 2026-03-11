---
name: ai-integration
description: Integración de servicios AI (Gemini + OpenAI/DeepSeek) para asistencia médica en ExpedienteDLM
---

# AI Integration Skill

## Servicios AI del proyecto

### 1. Google Gemini — `src/lib/services/gemini-ai-service.ts`

**SDK**: `@google/generative-ai`
**Modelo**: `gemini-1.5-flash` (por defecto)
**Variable**: `VITE_GEMINI_API_KEY`

#### Clase: `GeminiAIService`

| Método | Entrada | Salida |
|---|---|---|
| `analyzeMedicalContext(context)` | Edad, género, condición, signos vitales, diagnósticos, medicamentos, alergias | Alertas clínicas con severity + confidence |
| `generateDifferentialDiagnosis(symptoms, vitalSigns)` | Array de síntomas | Array de diagnósticos diferenciales ordenados |
| `analyzeDrugInteractions(medications)` | Array de medicamentos | Interacciones con severity y recomendaciones |
| `interpretLabResults(results)` | Resultados de laboratorio con rangos | Interpretación + hallazgos anormales |

#### Instancia singleton
```typescript
import { geminiAI } from '@/lib/services/gemini-ai-service';
// geminiAI es null si no hay API key configurada
if (geminiAI) {
  const result = await geminiAI.analyzeMedicalContext({ ... });
}
```

### 2. OpenAI (DeepSeek R1) — `openai` SDK

**SDK**: `openai` (compatible con DeepSeek API)
**Componente**: `src/components/DeepSeekMedicalAssistant.tsx`

## Componentes AI

| Componente | Propósito |
|---|---|
| `DeepSeekMedicalAssistant` | Asistente médico conversacional |
| `SmartSymptomAnalyzer` | Análisis inteligente de síntomas |
| `RealTimeMedicalGuidance` | Guía médica en tiempo real durante consulta |
| `MedicalRecommendationsEngine` | Motor de recomendaciones |
| `MedicalSafetyValidator` | Validación de seguridad médica |
| `MedicalConversationHistory` | Historial de conversaciones con AI |
| `TemplateAssistant` | Asistente para templates médicos |
| `MedicalTranscription` | Transcripción por voz (Speech Recognition) |

## Patrones de prompts

### Estructura estándar
```typescript
const prompt = `Eres un asistente médico experto. [Instrucciones específicas]:

CONTEXTO MÉDICO:
${contextString}

INSTRUCCIONES:
1. [Tarea específica]
2. [Formato esperado]

Responde ÚNICAMENTE con un JSON válido (sin markdown):
{ "campo": "valor" }`;
```

### Parsing de respuesta JSON
```typescript
const result = await model.generateContent(prompt);
const text = result.response.text();

// Extraer JSON del texto (puede venir con markdown)
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[0]);
}
```

## Reglas de seguridad AI

1. **NUNCA** enviar datos PHI sin encriptar a APIs externas de AI
2. Usar `redactPHI(data)` antes de loguear respuestas que contengan datos de pacientes
3. Las API keys están en variables de entorno, nunca hardcodeadas
4. Respuestas AI son **sugerencias**, no diagnósticos definitivos — siempre incluir disclaimers
5. Si la API key no existe, el servicio retorna `null` — manejarlo gracefully

## Speech Recognition (Transcripción)

**SDK**: `react-speech-recognition`
**Tipos**: `@types/react-speech-recognition`
**Componente**: `MedicalTranscription.tsx`

Patrón de uso:
```typescript
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const { transcript, listening, resetTranscript } = useSpeechRecognition();
```

## Variables de entorno requeridas

```env
VITE_GEMINI_API_KEY=         # Google Gemini
VITE_OPENAI_API_KEY=         # OpenAI / DeepSeek
VITE_DEEPSEEK_API_KEY=       # DeepSeek R1 (alternativa)
```
