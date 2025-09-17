import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Brain, User, Stethoscope, Lightbulb, AlertTriangle, CheckCircle, Loader2, Mic, Square, X, History, Save } from 'lucide-react';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'question' | 'analysis' | 'recommendation' | 'warning' | 'general';
  metadata?: {
    confidence?: number;
    source?: string;
    relatedSymptoms?: string[];
    suggestedActions?: string[];
  };
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

interface DeepSeekMedicalAssistantProps {
  medicalContext: MedicalContext;
  patientId?: string;
  doctorId: string;
  consultationId?: string;
  onSuggestionApply?: (suggestion: any) => void;
  onDiagnosisUpdate?: (diagnosis: string) => void;
  onTreatmentUpdate?: (treatment: string) => void;
  isVisible?: boolean;
  className?: string;
}

export default function DeepSeekMedicalAssistant({
  medicalContext,
  patientId,
  doctorId,
  consultationId,
  onSuggestionApply,
  onDiagnosisUpdate,
  onTreatmentUpdate,
  isVisible = true,
  className = ''
}: DeepSeekMedicalAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize OpenAI client
  useEffect(() => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (apiKey) {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true
      });
      setOpenai(client);

      // Send welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '¡Hola! Soy tu Asistente Médico con IA DeepSeek R1. Estoy aquí para ayudarte con análisis clínicos, diagnósticos diferenciales, recomendaciones de tratamiento y consultas médicas. ¿En qué puedo asistirte hoy?',
        timestamp: new Date(),
        type: 'general',
        metadata: {
          confidence: 100,
          source: 'DeepSeek R1'
        }
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const generateMedicalPrompt = (userMessage: string): string => {
    const contextInfo = Object.entries(medicalContext)
      .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
      .map(([key, value]) => {
        if (key === 'allergies' && Array.isArray(value)) {
          return `${key}: ${value.join(', ')}`;
        }
        if (key === 'medications' && Array.isArray(value)) {
          return `medicamentos: ${value.map(m => m.name || m).join(', ')}`;
        }
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    return `Eres un asistente médico especializado con acceso a la base de conocimiento médico más actualizada.

CONTEXTO DEL PACIENTE:
${contextInfo || 'No hay contexto específico del paciente disponible'}

INSTRUCCIONES:
- Proporciona análisis médicos precisos y basados en evidencia
- Sugiere diagnósticos diferenciales cuando sea apropiado
- Recomienda estudios complementarios relevantes
- Indica tratamientos apropiados siguiendo guías clínicas
- Identifica signos de alarma o red flags
- Mantén un tono profesional pero accesible
- Si no tienes suficiente información, solicita más detalles específicos
- IMPORTANTE: Siempre recuerda que eres un asistente y que las decisiones finales las toma el médico

CONSULTA DEL MÉDICO:
${userMessage}

Responde de manera estructurada, clara y con recomendaciones específicas cuando sea apropiado.`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !openai) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      type: 'question'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const prompt = generateMedicalPrompt(content.trim());

      const response = await openai.chat.completions.create({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente médico experto con acceso a la literatura médica más actualizada. Proporciona análisis clínicos precisos, diagnósticos diferenciales y recomendaciones de tratamiento basadas en evidencia científica.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      const assistantContent = response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu consulta. Por favor, intenta nuevamente.';

      // Analyze response type and confidence
      const responseType = analyzeResponseType(assistantContent);
      const confidence = calculateConfidence(assistantContent);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        type: responseType,
        metadata: {
          confidence,
          source: 'DeepSeek R1',
          suggestedActions: extractSuggestedActions(assistantContent)
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-apply suggestions if enabled
      if (assistantContent.toLowerCase().includes('diagnóstico:') && onDiagnosisUpdate) {
        const diagnosisMatch = assistantContent.match(/diagnóstico[:\s]+(.*?)(?:\n|$)/i);
        if (diagnosisMatch) {
          onDiagnosisUpdate(diagnosisMatch[1].trim());
        }
      }

    } catch (error) {
      console.error('Error calling DeepSeek API:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, verifica tu conexión e intenta nuevamente.',
        timestamp: new Date(),
        type: 'warning',
        metadata: {
          confidence: 0,
          source: 'Error'
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeResponseType = (content: string): Message['type'] => {
    if (content.toLowerCase().includes('alerta') || content.toLowerCase().includes('urgente') || content.toLowerCase().includes('inmediato')) {
      return 'warning';
    }
    if (content.toLowerCase().includes('diagnóstico') || content.toLowerCase().includes('diferencial')) {
      return 'analysis';
    }
    if (content.toLowerCase().includes('recomendación') || content.toLowerCase().includes('tratamiento')) {
      return 'recommendation';
    }
    return 'general';
  };

  const calculateConfidence = (content: string): number => {
    // Simple confidence calculation based on response characteristics
    let confidence = 70;
    if (content.includes('evidencia') || content.includes('estudio')) confidence += 15;
    if (content.includes('guía clínica') || content.includes('protocolo')) confidence += 10;
    if (content.length > 200) confidence += 5;
    return Math.min(confidence, 100);
  };

  const extractSuggestedActions = (content: string): string[] => {
    const actions: string[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.')) {
        const cleaned = line.replace(/^[•\-\d\.\s]+/, '').trim();
        if (cleaned.length > 10) {
          actions.push(cleaned);
        }
      }
    });

    return actions.slice(0, 5); // Limit to 5 actions
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  // Save conversation to history
  const saveConversation = async () => {
    if (!patientId || !doctorId || messages.length === 0) return;

    try {
      const title = conversationTitle || generateConversationTitle();

      const { data, error } = await supabase
        .from('medical_conversation_history')
        .upsert({
          id: conversationId,
          consultation_id: consultationId,
          patient_id: patientId,
          doctor_id: doctorId,
          title,
          messages: JSON.stringify(messages),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      setConversationTitle(title);

      return data;
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  // Generate conversation title from first message or medical context
  const generateConversationTitle = (): string => {
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        return firstUserMessage.content.substring(0, 50) + '...';
      }
    }

    if (medicalContext.currentCondition) {
      return `Consulta: ${medicalContext.currentCondition.substring(0, 40)}...`;
    }

    if (medicalContext.diagnosis) {
      return `Diagnóstico: ${medicalContext.diagnosis.substring(0, 40)}...`;
    }

    return `Consulta ${new Date().toLocaleDateString('es-ES')}`;
  };

  // Auto-save conversation when messages change
  useEffect(() => {
    if (autoSave && messages.length > 1) {
      const timer = setTimeout(() => {
        saveConversation();
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [messages, autoSave]);

  // Load existing conversation if consultationId is provided
  useEffect(() => {
    if (consultationId && doctorId) {
      loadExistingConversation();
    }
  }, [consultationId, doctorId]);

  const loadExistingConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_conversation_history')
        .select('*')
        .eq('consultation_id', consultationId)
        .eq('doctor_id', doctorId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const loadedMessages = JSON.parse(data.messages || '[]').map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        setMessages(loadedMessages);
        setConversationId(data.id);
        setConversationTitle(data.title);
      }
    } catch (error) {
      console.error('Error loading existing conversation:', error);
    }
  };

  const getMessageIcon = (type?: Message['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'analysis':
        return <Brain className="h-4 w-4 text-blue-400" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4 text-yellow-400" />;
      default:
        return <Stethoscope className="h-4 w-4 text-green-400" />;
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (onSuggestionApply) {
      onSuggestionApply({ type: 'text', content: suggestion });
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-96 h-[500px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-400" />
            {!isMinimized && (
              <div>
                <h3 className="text-sm font-medium text-white">Asistente Médico IA</h3>
                <p className="text-xs text-gray-400">DeepSeek R1</p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!isMinimized && (
              <>
                <button
                  onClick={() => saveConversation()}
                  className="text-gray-400 hover:text-green-400 transition-colors"
                  title="Guardar conversación"
                  disabled={messages.length === 0}
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  title="Ver historial"
                >
                  <History className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isMinimized ? <MessageCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ height: '360px' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && getMessageIcon(message.type)}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                        {message.metadata?.confidence && (
                          <div className="mt-2 text-xs text-gray-400">
                            Confianza: {message.metadata.confidence}%
                          </div>
                        )}

                        {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-gray-300">Acciones sugeridas:</p>
                            {message.metadata.suggestedActions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => applySuggestion(action)}
                                className="block w-full text-left text-xs bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 transition-colors"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                      <span className="text-sm text-gray-300">Analizando...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-700">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(inputValue)}
                    placeholder="Pregunta al asistente médico..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2 rounded-md transition-colors ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                  title={isListening ? 'Detener grabación' : 'Hablar'}
                >
                  {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-md transition-colors"
                  title="Enviar mensaje"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}