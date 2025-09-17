import React, { useState, useEffect, useMemo } from 'react';
import { Search, Book, Code, FileText, Star, Clock, TrendingUp, Database, Zap, CheckCircle, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

interface CIE10Code {
  code: string;
  description: string;
  category: string;
  chapter: string;
  subcategory?: string;
  notes?: string[];
  excludes?: string[];
  includes?: string[];
  usageFrequency?: number;
  lastUsed?: string;
}

interface MedicalDatabase {
  id: string;
  name: string;
  type: 'diagnostic' | 'therapeutic' | 'pharmacological' | 'reference';
  description: string;
  content: any;
  tags: string[];
  lastUpdated: string;
}

interface CodeSuggestion {
  code: CIE10Code;
  relevanceScore: number;
  reasoning: string;
  confidence: number;
}

interface CIE10IntegrationProps {
  diagnosis: string;
  currentCondition: string;
  symptoms?: string[];
  patientAge?: number;
  patientGender?: string;
  onCodeSelect: (code: CIE10Code) => void;
  onCodeSuggestions: (suggestions: CodeSuggestion[]) => void;
  isVisible: boolean;
  doctorId: string;
}

// Base de datos CIE-10 simplificada (principales códigos)
const CIE10_DATABASE: CIE10Code[] = [
  // Capítulo I: Ciertas enfermedades infecciosas y parasitarias (A00-B99)
  {
    code: 'A09',
    description: 'Diarrea y gastroenteritis de presunto origen infeccioso',
    category: 'Infecciosas',
    chapter: 'I - Enfermedades infecciosas y parasitarias',
    includes: ['Diarrea infecciosa', 'Gastroenteritis infecciosa'],
    usageFrequency: 85
  },
  {
    code: 'B34.9',
    description: 'Infección viral, no especificada',
    category: 'Infecciosas',
    chapter: 'I - Enfermedades infecciosas y parasitarias',
    includes: ['Virosis', 'Síndrome viral'],
    usageFrequency: 92
  },

  // Capítulo II: Neoplasias (C00-D48)
  {
    code: 'D22.9',
    description: 'Nevo melanocítico, sitio no especificado',
    category: 'Neoplasias benignas',
    chapter: 'II - Neoplasias',
    usageFrequency: 45
  },

  // Capítulo IV: Enfermedades endocrinas, nutricionales y metabólicas (E00-E89)
  {
    code: 'E11.9',
    description: 'Diabetes mellitus tipo 2 sin complicaciones',
    category: 'Endocrinas',
    chapter: 'IV - Enfermedades endocrinas, nutricionales y metabólicas',
    includes: ['Diabetes tipo 2', 'Diabetes del adulto'],
    usageFrequency: 150
  },
  {
    code: 'E78.5',
    description: 'Hiperlipidemia, no especificada',
    category: 'Endocrinas',
    chapter: 'IV - Enfermedades endocrinas, nutricionales y metabólicas',
    includes: ['Dislipidemia', 'Colesterol elevado'],
    usageFrequency: 120
  },

  // Capítulo V: Trastornos mentales y del comportamiento (F00-F99)
  {
    code: 'F32.9',
    description: 'Episodio depresivo, no especificado',
    category: 'Mentales',
    chapter: 'V - Trastornos mentales y del comportamiento',
    includes: ['Depresión', 'Estado depresivo'],
    usageFrequency: 78
  },
  {
    code: 'F41.9',
    description: 'Trastorno de ansiedad, no especificado',
    category: 'Mentales',
    chapter: 'V - Trastornos mentales y del comportamiento',
    includes: ['Ansiedad', 'Estado ansioso'],
    usageFrequency: 89
  },

  // Capítulo VI: Enfermedades del sistema nervioso (G00-G99)
  {
    code: 'G43.9',
    description: 'Migraña, no especificada',
    category: 'Neurológicas',
    chapter: 'VI - Enfermedades del sistema nervioso',
    includes: ['Migraña', 'Jaqueca'],
    usageFrequency: 67
  },
  {
    code: 'G44.2',
    description: 'Cefalea de tipo tensional',
    category: 'Neurológicas',
    chapter: 'VI - Enfermedades del sistema nervioso',
    includes: ['Cefalea tensional', 'Dolor de cabeza por tensión'],
    usageFrequency: 98
  },

  // Capítulo IX: Enfermedades del sistema circulatorio (I00-I99)
  {
    code: 'I10',
    description: 'Hipertensión esencial (primaria)',
    category: 'Cardiovasculares',
    chapter: 'IX - Enfermedades del sistema circulatorio',
    includes: ['Hipertensión arterial', 'Presión alta'],
    usageFrequency: 200
  },
  {
    code: 'I25.9',
    description: 'Enfermedad isquémica crónica del corazón, no especificada',
    category: 'Cardiovasculares',
    chapter: 'IX - Enfermedades del sistema circulatorio',
    usageFrequency: 75
  },

  // Capítulo X: Enfermedades del sistema respiratorio (J00-J99)
  {
    code: 'J00',
    description: 'Rinofaringitis aguda [resfriado común]',
    category: 'Respiratorias',
    chapter: 'X - Enfermedades del sistema respiratorio',
    includes: ['Resfriado común', 'Catarro común'],
    usageFrequency: 180
  },
  {
    code: 'J06.9',
    description: 'Infección aguda de las vías respiratorias superiores, no especificada',
    category: 'Respiratorias',
    chapter: 'X - Enfermedades del sistema respiratorio',
    includes: ['IVAS', 'Infección respiratoria alta'],
    usageFrequency: 145
  },
  {
    code: 'J45.9',
    description: 'Asma, no especificada',
    category: 'Respiratorias',
    chapter: 'X - Enfermedades del sistema respiratorio',
    includes: ['Asma bronquial'],
    usageFrequency: 95
  },

  // Capítulo XI: Enfermedades del sistema digestivo (K00-K95)
  {
    code: 'K21.9',
    description: 'Enfermedad por reflujo gastroesofágico sin esofagitis',
    category: 'Digestivas',
    chapter: 'XI - Enfermedades del sistema digestivo',
    includes: ['ERGE', 'Reflujo gastroesofágico'],
    usageFrequency: 110
  },
  {
    code: 'K59.0',
    description: 'Estreñimiento',
    category: 'Digestivas',
    chapter: 'XI - Enfermedades del sistema digestivo',
    includes: ['Constipación'],
    usageFrequency: 87
  },

  // Capítulo XII: Enfermedades de la piel y tejido subcutáneo (L00-L99)
  {
    code: 'L20.9',
    description: 'Dermatitis atópica, no especificada',
    category: 'Dermatológicas',
    chapter: 'XII - Enfermedades de la piel y tejido subcutáneo',
    includes: ['Eczema atópico'],
    usageFrequency: 56
  },
  {
    code: 'L30.9',
    description: 'Dermatitis, no especificada',
    category: 'Dermatológicas',
    chapter: 'XII - Enfermedades de la piel y tejido subcutáneo',
    usageFrequency: 78
  },

  // Capítulo XIII: Enfermedades del sistema musculoesquelético (M00-M99)
  {
    code: 'M54.5',
    description: 'Lumbago',
    category: 'Musculoesqueléticas',
    chapter: 'XIII - Enfermedades del sistema musculoesquelético',
    includes: ['Lumbalgia', 'Dolor lumbar'],
    usageFrequency: 165
  },
  {
    code: 'M79.3',
    description: 'Paniculitis, no especificada',
    category: 'Musculoesqueléticas',
    chapter: 'XIII - Enfermedades del sistema musculoesquelético',
    usageFrequency: 34
  },

  // Capítulo XIV: Enfermedades del sistema genitourinario (N00-N99)
  {
    code: 'N39.0',
    description: 'Infección de vías urinarias, sitio no especificado',
    category: 'Genitourinarias',
    chapter: 'XIV - Enfermedades del sistema genitourinario',
    includes: ['ITU', 'Cistitis'],
    usageFrequency: 125
  },

  // Capítulo XVIII: Síntomas, signos y hallazgos clínicos anormales (R00-R99)
  {
    code: 'R50.9',
    description: 'Fiebre, no especificada',
    category: 'Síntomas y signos',
    chapter: 'XVIII - Síntomas, signos y hallazgos anormales',
    includes: ['Fiebre', 'Hipertermia'],
    usageFrequency: 140
  },
  {
    code: 'R51',
    description: 'Cefalea',
    category: 'Síntomas y signos',
    chapter: 'XVIII - Síntomas, signos y hallazgos anormales',
    includes: ['Dolor de cabeza'],
    usageFrequency: 156
  },
  {
    code: 'R06.0',
    description: 'Disnea',
    category: 'Síntomas y signos',
    chapter: 'XVIII - Síntomas, signos y hallazgos anormales',
    includes: ['Dificultad respiratoria', 'Falta de aire'],
    usageFrequency: 98
  },

  // Capítulo XIX: Traumatismos y envenenamientos (S00-T98)
  {
    code: 'S06.0',
    description: 'Conmoción cerebral',
    category: 'Traumatismos',
    chapter: 'XIX - Traumatismos, envenenamientos',
    usageFrequency: 42
  },

  // Capítulo XXI: Factores que influyen en el estado de salud (Z00-Z99)
  {
    code: 'Z00.0',
    description: 'Examen médico general',
    category: 'Factores de salud',
    chapter: 'XXI - Factores que influyen en el estado de salud',
    includes: ['Chequeo médico', 'Revisión general'],
    usageFrequency: 220
  }
];

export default function CIE10Integration({
  diagnosis,
  currentCondition,
  symptoms = [],
  patientAge,
  patientGender,
  onCodeSelect,
  onCodeSuggestions,
  isVisible,
  doctorId
}: CIE10IntegrationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCode, setSelectedCode] = useState<CIE10Code | null>(null);
  const [codeSuggestions, setCodeSuggestions] = useState<CodeSuggestion[]>([]);
  const [recentCodes, setRecentCodes] = useState<CIE10Code[]>([]);
  const [favoriteCodes, setFavoriteCodes] = useState<CIE10Code[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'recent' | 'favorites'>('suggestions');

  // Búsqueda en CIE-10
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const term = searchTerm.toLowerCase();
    return CIE10_DATABASE.filter(code =>
      code.code.toLowerCase().includes(term) ||
      code.description.toLowerCase().includes(term) ||
      code.category.toLowerCase().includes(term) ||
      code.includes?.some(inc => inc.toLowerCase().includes(term))
    ).slice(0, 20);
  }, [searchTerm]);

  // Analizar y sugerir códigos CIE-10
  const analyzeDiagnosisForCIE10 = async () => {
    if (!diagnosis && !currentCondition) return;

    setIsAnalyzing(true);

    try {
      // Análisis básico por patrones de texto
      const combinedText = `${diagnosis} ${currentCondition} ${symptoms.join(' ')}`.toLowerCase();
      const basicSuggestions: CodeSuggestion[] = [];

      // Buscar coincidencias directas
      CIE10_DATABASE.forEach(code => {
        let relevanceScore = 0;
        let reasoning = '';

        // Coincidencia en descripción
        if (combinedText.includes(code.description.toLowerCase())) {
          relevanceScore += 50;
          reasoning += 'Coincidencia directa en descripción. ';
        }

        // Coincidencia en sinónimos
        if (code.includes) {
          code.includes.forEach(include => {
            if (combinedText.includes(include.toLowerCase())) {
              relevanceScore += 40;
              reasoning += `Coincidencia con término incluido: ${include}. `;
            }
          });
        }

        // Coincidencia parcial en palabras clave
        const keywords = code.description.toLowerCase().split(' ');
        keywords.forEach(keyword => {
          if (keyword.length > 3 && combinedText.includes(keyword)) {
            relevanceScore += 10;
            reasoning += `Palabra clave: ${keyword}. `;
          }
        });

        // Frecuencia de uso
        if (code.usageFrequency) {
          relevanceScore += Math.min(code.usageFrequency / 10, 15);
          reasoning += `Código frecuentemente usado. `;
        }

        // Ajustes por edad y género
        if (patientAge) {
          if (patientAge < 18 && ['pediátrico', 'infantil', 'congénito'].some(term =>
            code.description.toLowerCase().includes(term))) {
            relevanceScore += 10;
            reasoning += 'Apropiado para edad pediátrica. ';
          }
          if (patientAge > 65 && ['geriátrico', 'senil', 'del adulto mayor'].some(term =>
            code.description.toLowerCase().includes(term))) {
            relevanceScore += 10;
            reasoning += 'Apropiado para adulto mayor. ';
          }
        }

        if (relevanceScore > 20) {
          basicSuggestions.push({
            code,
            relevanceScore,
            reasoning: reasoning.trim(),
            confidence: Math.min(relevanceScore / 100, 1)
          });
        }
      });

      // Análisis avanzado con IA
      try {
        const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        if (apiKey) {
          const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
          });

          const systemPrompt = `Eres un especialista en codificación médica CIE-10. Analiza el diagnóstico y síntomas para sugerir códigos CIE-10 apropiados.

RESPONDE SOLO CON UN JSON con esta estructura:
{
  "suggestedCodes": [
    {
      "code": "I10",
      "reasoning": "Razón específica para este código",
      "confidence": 0.9
    }
  ],
  "primaryCode": "I10",
  "alternativeCodes": ["I10.1", "I10.9"]
}`;

          const completion = await openai.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Diagnóstico: ${diagnosis}, Síntomas: ${currentCondition}, Edad: ${patientAge}, Género: ${patientGender}` }
            ],
            model: "deepseek-chat",
            temperature: 0.3,
            max_tokens: 800
          });

          const result = completion.choices[0]?.message?.content;
          if (result) {
            const aiAnalysis = JSON.parse(result);

            // Integrar sugerencias de IA
            if (aiAnalysis.suggestedCodes) {
              aiAnalysis.suggestedCodes.forEach((aiCode: any) => {
                const cieCode = CIE10_DATABASE.find(c => c.code === aiCode.code);
                if (cieCode) {
                  const existingIndex = basicSuggestions.findIndex(s => s.code.code === aiCode.code);
                  if (existingIndex >= 0) {
                    // Aumentar puntuación si ya existe
                    basicSuggestions[existingIndex].relevanceScore += 30;
                    basicSuggestions[existingIndex].confidence = Math.max(
                      basicSuggestions[existingIndex].confidence,
                      aiCode.confidence
                    );
                    basicSuggestions[existingIndex].reasoning += ` IA: ${aiCode.reasoning}`;
                  } else {
                    // Agregar nueva sugerencia
                    basicSuggestions.push({
                      code: cieCode,
                      relevanceScore: 70,
                      reasoning: `IA: ${aiCode.reasoning}`,
                      confidence: aiCode.confidence
                    });
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error en análisis IA para CIE-10:', error);
      }

      // Ordenar por relevancia y limitar
      const sortedSuggestions = basicSuggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8);

      setCodeSuggestions(sortedSuggestions);
      onCodeSuggestions(sortedSuggestions);

    } catch (error) {
      console.error('Error analizando diagnóstico:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Cargar códigos recientes y favoritos
  const loadUserCodes = async () => {
    try {
      // Códigos recientes (simulado)
      const recentCodesData = await localStorage.getItem(`recent_cie10_${doctorId}`);
      if (recentCodesData) {
        setRecentCodes(JSON.parse(recentCodesData).slice(0, 10));
      }

      // Códigos favoritos (simulado)
      const favoriteCodesData = await localStorage.getItem(`favorite_cie10_${doctorId}`);
      if (favoriteCodesData) {
        setFavoriteCodes(JSON.parse(favoriteCodesData));
      }
    } catch (error) {
      console.warn('Error cargando códigos del usuario:', error);
    }
  };

  // Seleccionar código
  const handleCodeSelect = (code: CIE10Code) => {
    setSelectedCode(code);
    onCodeSelect(code);

    // Agregar a códigos recientes
    const updatedRecent = [code, ...recentCodes.filter(c => c.code !== code.code)].slice(0, 10);
    setRecentCodes(updatedRecent);
    localStorage.setItem(`recent_cie10_${doctorId}`, JSON.stringify(updatedRecent));

    // Actualizar frecuencia de uso
    const updatedCode = { ...code, usageFrequency: (code.usageFrequency || 0) + 1, lastUsed: new Date().toISOString() };
    // Aquí se podría actualizar en base de datos
  };

  // Agregar/quitar de favoritos
  const toggleFavorite = (code: CIE10Code) => {
    const isFavorite = favoriteCodes.some(c => c.code === code.code);
    let updatedFavorites;

    if (isFavorite) {
      updatedFavorites = favoriteCodes.filter(c => c.code !== code.code);
    } else {
      updatedFavorites = [...favoriteCodes, code];
    }

    setFavoriteCodes(updatedFavorites);
    localStorage.setItem(`favorite_cie10_${doctorId}`, JSON.stringify(updatedFavorites));
  };

  // Efectos
  useEffect(() => {
    if (isVisible) {
      loadUserCodes();
    }
  }, [isVisible, doctorId]);

  useEffect(() => {
    if ((diagnosis || currentCondition) && isVisible) {
      const timeoutId = setTimeout(() => {
        analyzeDiagnosisForCIE10();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [diagnosis, currentCondition, symptoms, patientAge, patientGender, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <h4 className="text-lg font-medium text-white">CIE-10 & Bases Médicas</h4>
          {isAnalyzing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
              <span className="text-sm text-indigo-300">Analizando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-400">IA + CIE-10</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'suggestions', label: 'Sugerencias', icon: TrendingUp, count: codeSuggestions.length },
          { id: 'search', label: 'Buscar', icon: Search, count: searchResults.length },
          { id: 'recent', label: 'Recientes', icon: Clock, count: recentCodes.length },
          { id: 'favorites', label: 'Favoritos', icon: Star, count: favoriteCodes.length }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium
                ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
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
        {/* Sugerencias IA */}
        {activeTab === 'suggestions' && (
          <div>
            {codeSuggestions.length === 0 && !isAnalyzing ? (
              <div className="text-center py-8 text-gray-400">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay sugerencias disponibles</p>
                <p className="text-sm">Ingresa un diagnóstico para obtener códigos CIE-10 sugeridos</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-indigo-300 mb-2">Códigos sugeridos basados en diagnóstico</h5>
                {codeSuggestions.map((suggestion, index) => (
                  <div key={suggestion.code.code} className="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Code className="h-4 w-4 text-indigo-400" />
                          <span className="font-medium text-indigo-200">{suggestion.code.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            suggestion.confidence >= 0.8 ? 'bg-green-800 text-green-100' :
                            suggestion.confidence >= 0.6 ? 'bg-yellow-800 text-yellow-100' :
                            'bg-orange-800 text-orange-100'
                          }`}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                          <button
                            onClick={() => toggleFavorite(suggestion.code)}
                            className={`${
                              favoriteCodes.some(c => c.code === suggestion.code.code)
                                ? 'text-yellow-400'
                                : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        </div>
                        <h6 className="font-medium text-white mb-1">{suggestion.code.description}</h6>
                        <p className="text-sm text-indigo-300 mb-2">{suggestion.code.chapter}</p>
                        <p className="text-xs text-gray-400">{suggestion.reasoning}</p>
                        {suggestion.code.includes && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Incluye: </span>
                            <span className="text-xs text-gray-400">{suggestion.code.includes.join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleCodeSelect(suggestion.code)}
                        className="ml-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                      >
                        Seleccionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Búsqueda */}
        {activeTab === 'search' && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar código o descripción CIE-10..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              {searchResults.map((code) => (
                <div key={code.code} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Code className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-blue-200">{code.code}</span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{code.category}</span>
                        <button
                          onClick={() => toggleFavorite(code)}
                          className={`${
                            favoriteCodes.some(c => c.code === code.code)
                              ? 'text-yellow-400'
                              : 'text-gray-400 hover:text-yellow-400'
                          }`}
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      </div>
                      <h6 className="font-medium text-white mb-1">{code.description}</h6>
                      <p className="text-sm text-gray-400">{code.chapter}</p>
                      {code.includes && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">Incluye: </span>
                          <span className="text-xs text-gray-400">{code.includes.join(', ')}</span>
                        </div>
                      )}
                      {code.usageFrequency && (
                        <div className="mt-1 text-xs text-gray-500">
                          Usado {code.usageFrequency} veces
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCodeSelect(code)}
                      className="ml-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Seleccionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Códigos recientes */}
        {activeTab === 'recent' && (
          <div>
            <h5 className="text-sm font-medium text-indigo-300 mb-3">Códigos usados recientemente</h5>
            {recentCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay códigos recientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCodes.map((code) => (
                  <div key={code.code} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Code className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-green-200">{code.code}</span>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{code.category}</span>
                        </div>
                        <h6 className="font-medium text-white text-sm">{code.description}</h6>
                        {code.lastUsed && (
                          <p className="text-xs text-gray-400 mt-1">
                            Último uso: {new Date(code.lastUsed).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCodeSelect(code)}
                        className="ml-3 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Códigos favoritos */}
        {activeTab === 'favorites' && (
          <div>
            <h5 className="text-sm font-medium text-indigo-300 mb-3">Códigos favoritos</h5>
            {favoriteCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay códigos favoritos</p>
                <p className="text-sm">Marca códigos como favoritos para acceso rápido</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteCodes.map((code) => (
                  <div key={code.code} className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="font-medium text-yellow-200">{code.code}</span>
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{code.category}</span>
                          <button
                            onClick={() => toggleFavorite(code)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <h6 className="font-medium text-white text-sm">{code.description}</h6>
                        <p className="text-xs text-yellow-300">{code.chapter}</p>
                      </div>
                      <button
                        onClick={() => handleCodeSelect(code)}
                        className="ml-3 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Código seleccionado */}
      {selectedCode && (
        <div className="mt-4 bg-green-900/30 border border-green-600/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Código Seleccionado</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-green-200">{selectedCode.code}</span>
              <span className="ml-2 text-green-200">- {selectedCode.description}</span>
            </div>
            <button
              onClick={() => setSelectedCode(null)}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}