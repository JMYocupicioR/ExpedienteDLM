import React, { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { X, Mic, Pause, Trash2, Copy, Check, Bot, Zap } from 'lucide-react';
import OpenAI from 'openai';

// --- Componente para renderizar Markdown simple ---
const SimpleMarkdownRenderer = ({ text }: { text: string }) => {
    const renderText = () => {
        let html = text
            // Reemplaza **negrita** con <strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Reemplaza saltos de línea con <br>
            .replace(/\n/g, '<br />');

        // Reemplaza listas con <ul> y <li>
        html = html.replace(/<br \/>(\s*[-*]|\d+\.) (.*?)(?=<br \/>|$)/g, (match, p1, p2) => {
            return `<li>${p2.trim()}</li>`;
        });
        html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
        // Corrige listas múltiples
        html = html.replace(/<\/ul><br \/><ul>/g, '');

        return { __html: html };
    };

    return <div className="prose prose-invert prose-p:my-2 prose-strong:text-cyan-400 prose-ul:list-disc prose-li:my-1" dangerouslySetInnerHTML={renderText()} />;
};


// --- Componente del Panel de Transcripción ---
const TranscriptionPanel = ({
    listening,
    transcript,
    interimTranscript,
    language,
    setLanguage,
    handleStartListening,
    handleStopListening,
    handleReset
}: any) => {
    const transcriptBoxRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (transcriptBoxRef.current) {
            transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
        }
    }, [transcript, interimTranscript]);

    return (
        <div className="bg-gray-800 rounded-2xl p-6 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">1. Transcripción de Voz</h2>
                <div className={`w-4 h-4 rounded-full transition-colors ${listening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
            </div>

            <div className="mb-4">
                <label htmlFor="language" className="text-sm font-medium text-gray-400 mr-2">Idioma:</label>
                <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={listening}
                    className="bg-gray-700 text-white rounded-md px-3 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    <option value="es-MX">Español (México)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                </select>
            </div>

            <div ref={transcriptBoxRef} className="flex-grow bg-gray-900 rounded-lg p-4 min-h-[200px] text-gray-300 overflow-y-auto mb-4 font-mono">
                <span>{transcript}</span>
                <span className="text-gray-500">{interimTranscript}</span>
                {!transcript && !interimTranscript && <span className="text-gray-500">La transcripción de la conversación aparecerá aquí...</span>}
            </div>

            <div className="flex justify-center items-center space-x-4">
                <button onClick={handleStartListening} disabled={listening} aria-label="Grabar" className="flex items-center justify-center w-32 h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-white font-semibold">
                    <Mic className="w-6 h-6 mr-2" /> Grabar
                </button>
                <button onClick={handleStopListening} disabled={!listening} aria-label="Pausar" className="flex items-center justify-center w-32 h-12 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-white font-semibold">
                    <Pause className="w-6 h-6 mr-2" /> Pausar
                </button>
                <button onClick={handleReset} aria-label="Limpiar" className="flex items-center justify-center w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-300 text-gray-300 hover:text-white">
                    <Trash2 className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

// --- Componente para Métricas de Análisis ---
const AnalysisMetrics = ({ metrics }: { metrics: any }) => {
    if (!metrics) return null;

    return (
        <div className="bg-gray-800 rounded-lg p-3 mt-3 border border-gray-600">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">📊 Métricas de Análisis</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div>
                    <span className="text-gray-400">Texto original:</span> {metrics.wordsOriginal} palabras
                </div>
                <div>
                    <span className="text-gray-400">Texto formateado:</span> {metrics.wordsFormatted} palabras
                </div>
                <div>
                    <span className="text-gray-400">Compresión:</span> {metrics.compressionRatio}%
                </div>
                <div>
                    <span className="text-gray-400">Tiempo:</span> {metrics.processingTime}ms
                </div>
                <div>
                    <span className="text-gray-400">Tokens usados:</span> {metrics.tokensUsed}
                </div>
                <div>
                    <span className="text-gray-400">Modelo:</span> {metrics.model}
                </div>
            </div>
        </div>
    );
};

// --- Componente para Estado de Conexión ---
const ConnectionStatus = ({ status, onTest }: { status: string, onTest: () => void }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'text-green-400';
            case 'failed': return 'text-red-400';
            case 'testing': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected': return '✅ Conectado';
            case 'failed': return '❌ Error';
            case 'testing': return '🔄 Probando...';
            default: return '⚪ Sin probar';
        }
    };

    return (
        <div className="flex items-center justify-between mb-3 p-2 bg-gray-700 rounded-lg">
            <span className={`text-xs font-medium ${getStatusColor()}`}>
                {getStatusText()}
            </span>
            <button
                onClick={onTest}
                disabled={status === 'testing'}
                className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded text-white transition-colors"
            >
                Probar Conexión
            </button>
        </div>
    );
};

// --- Componente del Panel de IA ---
const AiPanel = ({ transcript, formatTextForMedicalConsultation, formattedText, isLoading, error, handleCopy, isCopied, onApplyText, analysisMetrics, connectionStatus, onTestConnection }: any) => {
    return (
        <div className="bg-gray-800 rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-4">2. Formato con DeepSeek R1</h2>
            <ConnectionStatus status={connectionStatus} onTest={onTestConnection} />
            <button
                onClick={formatTextForMedicalConsultation}
                disabled={!transcript || isLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-all duration-300 mb-4 flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <Bot className="animate-spin -ml-1 mr-3 h-5 w-5" />
                        Procesando...
                    </>
                ) : (
                    <>
                        <Zap className=" -ml-1 mr-3 h-5 w-5" />
                        Generar con DeepSeek R1
                    </>
                )}
            </button>
            <div className="flex-grow bg-gray-900 rounded-lg p-4 min-h-[200px] text-gray-300 overflow-y-auto relative">
                {error && <p className="text-red-400">{error}</p>}
                {formattedText ? (
                    <>
                        <SimpleMarkdownRenderer text={formattedText} />
                        <div className="absolute top-2 right-2 flex space-x-2">
                            <button onClick={handleCopy} aria-label="Copiar resultado" className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors">
                                {isCopied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </>
                ) : (
                    <span className="text-gray-500">El resultado de la IA aparecerá aquí...</span>
                )}
            </div>
            <AnalysisMetrics metrics={analysisMetrics} />
            {formattedText && (
                 <button
                    onClick={() => onApplyText(formattedText)}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                >
                    Aplicar al Padecimiento Actual
                </button>
            )}
        </div>
    );
};


interface MedicalTranscriptionProps {
    onClose: () => void;
    onApplyText: (text: string) => void;
    isOpen: boolean;
}

// --- Componente Principal ---
const MedicalTranscription = ({ onClose, onApplyText, isOpen }: MedicalTranscriptionProps) => {
    const {
        transcript,
        interimTranscript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    const [language, setLanguage] = useState('es-MX');
    const [formattedText, setFormattedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [analysisMetrics, setAnalysisMetrics] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');

    const handleStartListening = () => {
        SpeechRecognition.startListening({ continuous: true, language: language });
    };

    const handleStopListening = () => {
        SpeechRecognition.stopListening();
    };

    const handleReset = () => {
        resetTranscript();
        setFormattedText('');
        setError('');
        setAnalysisMetrics(null);
        setConnectionStatus('idle');
    }

    // Función para probar la conexión con DeepSeek
    const testDeepSeekConnection = async () => {
        setConnectionStatus('testing');
        setError('');

        try {
            const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
            if (!apiKey) {
                throw new Error("API key de DeepSeek no configurada");
            }

            const openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });

            // Test simple de conexión
            const testCompletion = await openai.chat.completions.create({
                messages: [{ role: "user", content: "Responde solo: Conexión exitosa" }],
                model: "deepseek-chat",
                max_tokens: 10,
                temperature: 0
            });

            if (testCompletion.choices[0]?.message?.content) {
                setConnectionStatus('connected');
                console.log('✅ Conexión con DeepSeek exitosa');
            } else {
                throw new Error("Respuesta inválida de DeepSeek");
            }

        } catch (err: any) {
            setConnectionStatus('failed');
            setError(`Error de conexión: ${err.message}`);
            console.error('❌ Error de conexión con DeepSeek:', err);
        }
    }

    const formatTextForMedicalConsultation = async () => {
        if (!transcript) return;
        setIsLoading(true);
        setError('');
        setFormattedText('');
        setAnalysisMetrics(null);

        const startTime = Date.now();

        try {
            // Configurar DeepSeek API
            const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
            if (!apiKey) {
                throw new Error("API key de DeepSeek no configurada. Configura VITE_DEEPSEEK_API_KEY en tu archivo .env");
            }

            const openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: apiKey,
                dangerouslyAllowBrowser: true // Necesario para uso en el navegador
            });

            const systemPrompt = `Eres un asistente médico especializado en transformar transcripciones de conversaciones médico-paciente en notas clínicas estructuradas para el campo "Padecimiento Actual" del expediente clínico electrónico.

INSTRUCCIONES ESPECÍFICAS:
1. **Terminología Médica**: Usa terminología médica precisa y apropiada
2. **Estructura Clara**: Organiza la información de forma lógica y coherente
3. **Objetividad**: Reporta únicamente los hechos mencionados sin interpretaciones
4. **Enfoque en Padecimiento Actual**: Extrae solo información relevante para la consulta presente
5. **Formato Profesional**: Redacta en tercera persona usando "Paciente refiere..." o "Se presenta con..."

FORMATO DE SALIDA:
- Inicio del padecimiento con tiempo de evolución
- Síntomas principales con características (localización, intensidad, calidad)
- Síntomas asociados
- Factores agravantes y atenuantes
- Antecedentes relevantes al padecimiento actual

EJEMPLO DE FORMATO:
Paciente refiere inicio de cefalea hace 3 días, de localización frontal, carácter pulsátil, intensidad 8/10. Se acompaña de náuseas y fotofobia. Empeora con el movimiento y mejora parcialmente con el reposo. Antecedente de migrañas ocasionales.`;

            const userPrompt = `Transcripción a convertir en nota de padecimiento actual:

"${transcript}"

Genera la nota médica estructurada:`;

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: "deepseek-chat",
                temperature: 0.3, // Menor temperatura para mayor consistencia clínica
                max_tokens: 1000
            });

            const result = completion.choices[0]?.message?.content;
            if (result) {
                setFormattedText(result.trim());
                
                // Análisis de métricas de la respuesta
                const metrics = {
                    originalLength: transcript.length,
                    formattedLength: result.length,
                    compressionRatio: ((transcript.length - result.length) / transcript.length * 100).toFixed(1),
                    wordsOriginal: transcript.split(' ').length,
                    wordsFormatted: result.split(' ').length,
                    processingTime: Date.now() - startTime,
                    tokensUsed: completion.usage?.total_tokens || 0,
                    model: completion.model || 'deepseek-chat'
                };
                
                setAnalysisMetrics(metrics);
                console.log('📊 Métricas de análisis:', metrics);
                
                // Validación de calidad de la respuesta
                if (result.length < 20) {
                    console.warn('⚠️ Respuesta muy corta, podría indicar un problema');
                }
                
                if (!result.includes('Paciente')) {
                    console.warn('⚠️ Formato no estándar detectado');
                }
                
            } else {
                throw new Error("No se recibió respuesta del modelo DeepSeek");
            }

        } catch (err: any) {
            console.error('Error con DeepSeek API:', err);
            setError(err.message || 'No se pudo procesar la solicitud con DeepSeek. Verifica tu API key y conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        // Remove markdown for plain text copy
        const plainText = formattedText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<br \/>/g, '\n');
        navigator.clipboard.writeText(plainText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const handleApplyAndClose = (text: string) => {
        const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<br \/>/g, '\n');
        onApplyText(plainText);
        onClose();
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
           window.removeEventListener('keydown', handleEsc);
        };
     }, [onClose]);

    if (!isOpen) return null;

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 shadow-xl text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-4">Error de Compatibilidad</h2>
                    <p className="text-gray-300 mb-6">Lo siento, tu navegador no soporta el reconocimiento de voz.</p>
                    <button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col font-sans border border-gray-700">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div className='flex items-center space-x-3'>
                        <Bot className="w-7 h-7 text-cyan-400" />
                        <div>
                            <h1 className="text-xl font-bold text-cyan-400">Asistente de Consulta Médica - DeepSeek R1</h1>
                            <p className="text-sm text-gray-400">Graba la conversación, transcribe y formatea la nota del padecimiento actual con DeepSeek R1.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </header>
                <main className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto">
                    <TranscriptionPanel
                        listening={listening}
                        transcript={transcript}
                        interimTranscript={interimTranscript}
                        language={language}
                        setLanguage={setLanguage}
                        handleStartListening={handleStartListening}
                        handleStopListening={handleStopListening}
                        handleReset={handleReset}
                    />
                    <AiPanel
                        transcript={transcript}
                        formatTextForMedicalConsultation={formatTextForMedicalConsultation}
                        formattedText={formattedText}
                        isLoading={isLoading}
                        error={error}
                        handleCopy={handleCopy}
                        isCopied={isCopied}
                        onApplyText={handleApplyAndClose}
                        analysisMetrics={analysisMetrics}
                        connectionStatus={connectionStatus}
                        onTestConnection={testDeepSeekConnection}
                    />
                </main>
            </div>
        </div>
    );
};

export default MedicalTranscription; 