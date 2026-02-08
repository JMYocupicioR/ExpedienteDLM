import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Code, Star, Clock, TrendingUp, Database, Zap, CheckCircle, Brain } from 'lucide-react';
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

interface RawCIE10Item {
  codigo: string;
  nombre: string;
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

import { CIE10_DATA } from '../data/cie10Data';

// Base de datos CIE-10 completa importada
const CIE10_DATABASE: CIE10Code[] = (CIE10_DATA as RawCIE10Item[]).map((item) => ({
  code: item.codigo,
  description: item.nombre,
  category: 'General', // Categoría por defecto
  chapter: 'CIE-10 Completo',
  usageFrequency: 0,
  includes: []
}));

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
  const analyzeDiagnosisForCIE10 = useCallback(async () => {
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
              interface AISuggestion {
                code: string;
                reasoning: string;
                confidence: number;
              }
              
              aiAnalysis.suggestedCodes.forEach((aiCode: AISuggestion) => {
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
  }, [diagnosis, currentCondition, symptoms, patientAge, patientGender, onCodeSuggestions]);

  // Cargar códigos recientes y favoritos
  const loadUserCodes = useCallback(async () => {
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
  }, [doctorId]);

  // Seleccionar código
  const handleCodeSelect = (code: CIE10Code) => {
    setSelectedCode(code);
    onCodeSelect(code);

    // Agregar a códigos recientes
    const updatedRecent = [code, ...recentCodes.filter(c => c.code !== code.code)].slice(0, 10);
    setRecentCodes(updatedRecent);
    localStorage.setItem(`recent_cie10_${doctorId}`, JSON.stringify(updatedRecent));

    // Actualizar frecuencia de uso
    // Actualizar frecuencia de uso
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
  }, [isVisible, doctorId, loadUserCodes]);

  useEffect(() => {
    if ((diagnosis || currentCondition) && isVisible) {
      const timeoutId = setTimeout(() => {
        analyzeDiagnosisForCIE10();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [diagnosis, currentCondition, symptoms, patientAge, patientGender, isVisible, analyzeDiagnosisForCIE10]);

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
              onClick={() => setActiveTab(tab.id as 'search' | 'suggestions' | 'recent' | 'favorites')}
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
                {codeSuggestions.map((suggestion) => (
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