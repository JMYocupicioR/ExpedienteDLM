import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Search, AlertTriangle, CheckCircle, Plus, Trash2, Clock, Info, Zap, ShieldAlert, Book, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  indication: string;
  route: string;
  quantity?: string;
  refills?: number;
  substitutable?: boolean;
}

interface DrugInfo {
  name: string;
  genericName: string;
  category: string;
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  dosageInfo: {
    adult: string;
    pediatric?: string;
    elderly?: string;
    renal?: string;
    hepatic?: string;
  };
  maxDose: string;
  monitoring: string[];
  pregnancy: 'A' | 'B' | 'C' | 'D' | 'X';
  lactation: 'safe' | 'caution' | 'avoid';
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  category: string;
  medications: Medication[];
  indications: string[];
  ageGroup: 'adult' | 'pediatric' | 'elderly' | 'all';
  specialty?: string;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  effect: string;
  management: string;
  alternatives: string[];
}

interface AdvancedPrescriptionSystemProps {
  diagnosis: string;
  patientAge?: number;
  patientWeight?: number;
  patientAllergies?: string[];
  currentMedications?: string[];
  patientConditions?: string[];
  onPrescriptionUpdate: (medications: Medication[]) => void;
  onTemplateSelect?: (template: PrescriptionTemplate) => void;
  isVisible: boolean;
}

// Base de datos de medicamentos simplificada
const DRUG_DATABASE: Record<string, DrugInfo> = {
  'paracetamol': {
    name: 'Paracetamol',
    genericName: 'Acetaminofén',
    category: 'Analgésico/Antipirético',
    indications: ['Dolor leve a moderado', 'Fiebre'],
    contraindications: ['Hipersensibilidad', 'Hepatopatía severa'],
    sideEffects: ['Hepatotoxicidad (sobredosis)', 'Rash cutáneo'],
    interactions: ['Warfarina', 'Alcohol'],
    dosageInfo: {
      adult: '500-1000mg cada 6-8h',
      pediatric: '10-15mg/kg cada 6h',
      elderly: '500mg cada 6-8h',
      hepatic: 'Reducir dosis 50%'
    },
    maxDose: '4g/día',
    monitoring: ['Función hepática en uso prolongado'],
    pregnancy: 'B',
    lactation: 'safe'
  },
  'ibuprofeno': {
    name: 'Ibuprofeno',
    genericName: 'Ibuprofeno',
    category: 'AINE',
    indications: ['Dolor', 'Inflamación', 'Fiebre'],
    contraindications: ['Úlcera péptica activa', 'Asma sensible a AINE', 'Embarazo tercer trimestre'],
    sideEffects: ['Gastropatía', 'Nefrotoxicidad', 'Hipertensión'],
    interactions: ['ACE inhibidores', 'Warfarina', 'Metotexato'],
    dosageInfo: {
      adult: '200-400mg cada 6-8h',
      pediatric: '5-10mg/kg cada 6-8h',
      elderly: 'Iniciar con dosis mínima',
      renal: 'Evitar si ClCr <30ml/min'
    },
    maxDose: '2.4g/día',
    monitoring: ['Función renal', 'Presión arterial'],
    pregnancy: 'C',
    lactation: 'caution'
  },
  'amoxicilina': {
    name: 'Amoxicilina',
    genericName: 'Amoxicilina',
    category: 'Antibiótico β-lactámico',
    indications: ['Infecciones bacterianas', 'Profilaxis endocarditis'],
    contraindications: ['Alergia a penicilinas', 'Mononucleosis'],
    sideEffects: ['Diarrea', 'Rash', 'Candidiasis'],
    interactions: ['Anticoagulantes orales', 'Metotrexato'],
    dosageInfo: {
      adult: '500mg cada 8h o 875mg cada 12h',
      pediatric: '20-40mg/kg/día dividido cada 8h',
      renal: 'Ajustar según ClCr'
    },
    maxDose: '3g/día',
    monitoring: ['Signos de sobreinfección'],
    pregnancy: 'B',
    lactation: 'safe'
  },
  'omeprazol': {
    name: 'Omeprazol',
    genericName: 'Omeprazol',
    category: 'Inhibidor bomba protones',
    indications: ['ERGE', 'Úlcera péptica', 'Síndrome Zollinger-Ellison'],
    contraindications: ['Hipersensibilidad'],
    sideEffects: ['Cefalea', 'Diarrea', 'Déficit B12 (uso prolongado)'],
    interactions: ['Clopidogrel', 'Warfarina', 'Digoxina'],
    dosageInfo: {
      adult: '20-40mg una vez al día',
      elderly: 'Sin ajuste necesario',
      hepatic: 'Reducir dosis'
    },
    maxDose: '80mg/día',
    monitoring: ['Magnesio sérico (uso prolongado)'],
    pregnancy: 'C',
    lactation: 'caution'
  }
};

// Plantillas de prescripción
const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'hypertension_basic',
    name: 'Hipertensión - Tratamiento inicial',
    category: 'Cardiovascular',
    ageGroup: 'adult',
    specialty: 'Cardiología',
    indications: ['Hipertensión arterial primaria'],
    medications: [
      {
        id: '1',
        name: 'Losartán',
        dosage: '50mg',
        frequency: 'Una vez al día',
        duration: '30 días',
        instructions: 'Tomar en ayunas',
        indication: 'Control de presión arterial',
        route: 'Oral'
      }
    ]
  },
  {
    id: 'diabetes_starter',
    name: 'Diabetes Tipo 2 - Inicio',
    category: 'Endocrinología',
    ageGroup: 'adult',
    indications: ['Diabetes mellitus tipo 2'],
    medications: [
      {
        id: '1',
        name: 'Metformina',
        dosage: '500mg',
        frequency: 'Dos veces al día',
        duration: '30 días',
        instructions: 'Tomar con alimentos',
        indication: 'Control glucémico',
        route: 'Oral'
      }
    ]
  },
  {
    id: 'pain_mild',
    name: 'Dolor leve a moderado',
    category: 'Analgesia',
    ageGroup: 'all',
    indications: ['Dolor leve', 'Dolor moderado', 'Cefalea'],
    medications: [
      {
        id: '1',
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'Cada 6 horas',
        duration: '5 días',
        instructions: 'Según necesidad',
        indication: 'Alivio del dolor',
        route: 'Oral'
      }
    ]
  }
];

export default function AdvancedPrescriptionSystem({
  diagnosis,
  patientAge = 30,
  patientWeight = 70,
  patientAllergies = [],
  currentMedications = [],
  patientConditions = [],
  onPrescriptionUpdate,
  onTemplateSelect,
  isVisible
}: AdvancedPrescriptionSystemProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [suggestedTemplates, setSuggestedTemplates] = useState<PrescriptionTemplate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'interactions' | 'database'>('compose');
  const [dosageCalculator, setDosageCalculator] = useState<{
    isOpen: boolean;
    drug: string;
    weight: number;
    age: number;
  }>({ isOpen: false, drug: '', weight: patientWeight, age: patientAge });

  // Buscar medicamentos en la base de datos
  const searchDrugs = useMemo(() => {
    if (!searchTerm) return [];

    return Object.values(DRUG_DATABASE).filter(drug =>
      drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.indications.some(ind => ind.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

  // Analizar interacciones
  const analyzeInteractions = (meds: Medication[]) => {
    const allMeds = [...meds.map(m => m.name), ...currentMedications];
    const foundInteractions: DrugInteraction[] = [];

    // Simular análisis de interacciones
    const knownInteractions = [
      {
        drug1: 'Warfarina',
        drug2: 'Paracetamol',
        severity: 'moderate' as const,
        effect: 'Aumento del efecto anticoagulante',
        management: 'Monitoreo estrecho del INR',
        alternatives: ['Ibuprofeno (con precaución)']
      },
      {
        drug1: 'Ibuprofeno',
        drug2: 'Enalapril',
        severity: 'moderate' as const,
        effect: 'Reducción del efecto antihipertensivo',
        management: 'Monitoreo de presión arterial',
        alternatives: ['Paracetamol']
      }
    ];

    allMeds.forEach(med1 => {
      allMeds.forEach(med2 => {
        if (med1 !== med2) {
          const interaction = knownInteractions.find(
            int => (int.drug1.toLowerCase().includes(med1.toLowerCase()) && int.drug2.toLowerCase().includes(med2.toLowerCase())) ||
                   (int.drug2.toLowerCase().includes(med1.toLowerCase()) && int.drug1.toLowerCase().includes(med2.toLowerCase()))
          );
          if (interaction && !foundInteractions.find(fi => fi.drug1 === interaction.drug1 && fi.drug2 === interaction.drug2)) {
            foundInteractions.push(interaction);
          }
        }
      });
    });

    setInteractions(foundInteractions);
  };

  // Sugerir plantillas basadas en diagnóstico
  const suggestTemplates = async () => {
    setIsAnalyzing(true);

    try {
      // Buscar plantillas relevantes
      const relevant = PRESCRIPTION_TEMPLATES.filter(template =>
        template.indications.some(indication =>
          diagnosis.toLowerCase().includes(indication.toLowerCase()) ||
          indication.toLowerCase().includes(diagnosis.toLowerCase())
        )
      );

      // Usar IA para sugerencias más precisas
      if (diagnosis.length > 5) {
        try {
          const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
          if (apiKey) {
            const openai = new OpenAI({
              baseURL: 'https://api.deepseek.com',
              apiKey: apiKey,
              dangerouslyAllowBrowser: true
            });

            const systemPrompt = `Eres un farmacólogo clínico. Basado en el diagnóstico, sugiere medicamentos apropiados.

RESPONDE SOLO CON UN JSON con esta estructura:
{
  "suggestedMedications": [
    {
      "name": "Nombre del medicamento",
      "dosage": "500mg",
      "frequency": "Cada 8 horas",
      "duration": "7 días",
      "indication": "Razón específica",
      "route": "Oral"
    }
  ],
  "considerations": ["consideración1", "consideración2"]
}`;

            const completion = await openai.chat.completions.create({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Diagnóstico: ${diagnosis}, Edad: ${patientAge}, Peso: ${patientWeight}kg, Alergias: ${patientAllergies.join(', ')}` }
              ],
              model: "deepseek-chat",
              temperature: 0.3,
              max_tokens: 1000
            });

            const result = completion.choices[0]?.message?.content;
            if (result) {
              const aiSuggestion = JSON.parse(result);
              if (aiSuggestion.suggestedMedications) {
                const aiTemplate: PrescriptionTemplate = {
                  id: 'ai_suggested',
                  name: `IA: ${diagnosis}`,
                  category: 'IA Generated',
                  ageGroup: 'all',
                  indications: [diagnosis],
                  medications: aiSuggestion.suggestedMedications.map((med: any, index: number) => ({
                    id: `ai_${index}`,
                    name: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    duration: med.duration,
                    instructions: med.instructions || '',
                    indication: med.indication,
                    route: med.route
                  }))
                };
                relevant.unshift(aiTemplate);
              }
            }
          }
        } catch (error) {
          console.warn('Error en sugerencias IA:', error);
        }
      }

      setSuggestedTemplates(relevant);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calcular dosis pediátrica/ajustada
  const calculateDose = (drugName: string, weight: number, age: number): string => {
    const drug = DRUG_DATABASE[drugName.toLowerCase()];
    if (!drug) return 'Consultar referencia';

    if (age < 18 && drug.dosageInfo.pediatric) {
      // Dosis pediátrica basada en peso
      const match = drug.dosageInfo.pediatric.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?mg\/kg/);
      if (match) {
        const minDose = parseFloat(match[1]);
        const maxDose = match[2] ? parseFloat(match[2]) : minDose;
        const calculatedMin = minDose * weight;
        const calculatedMax = maxDose * weight;
        return `${calculatedMin.toFixed(0)}-${calculatedMax.toFixed(0)}mg`;
      }
    }

    if (age >= 65 && drug.dosageInfo.elderly) {
      return drug.dosageInfo.elderly;
    }

    return drug.dosageInfo.adult;
  };

  // Agregar medicamento
  const addMedication = () => {
    const newMed: Medication = {
      id: Date.now().toString(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      indication: '',
      route: 'Oral'
    };
    const newMeds = [...medications, newMed];
    setMedications(newMeds);
    onPrescriptionUpdate(newMeds);
  };

  // Actualizar medicamento
  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    const newMeds = medications.map(med =>
      med.id === id ? { ...med, [field]: value } : med
    );
    setMedications(newMeds);
    onPrescriptionUpdate(newMeds);
    analyzeInteractions(newMeds);
  };

  // Eliminar medicamento
  const removeMedication = (id: string) => {
    const newMeds = medications.filter(med => med.id !== id);
    setMedications(newMeds);
    onPrescriptionUpdate(newMeds);
    analyzeInteractions(newMeds);
  };

  // Aplicar plantilla
  const applyTemplate = (template: PrescriptionTemplate) => {
    setMedications(template.medications);
    onPrescriptionUpdate(template.medications);
    onTemplateSelect?.(template);
    analyzeInteractions(template.medications);
    setActiveTab('compose');
  };

  // Efectos
  useEffect(() => {
    if (diagnosis && isVisible) {
      suggestTemplates();
    }
  }, [diagnosis, isVisible]);

  useEffect(() => {
    analyzeInteractions(medications);
  }, [medications, currentMedications]);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Pill className="h-5 w-5 text-green-400" />
          <h4 className="text-lg font-medium text-white">Sistema Avanzado de Prescripción</h4>
          {isAnalyzing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
              <span className="text-sm text-green-300">Analizando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-400">IA + Vademécum</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'compose', label: 'Prescribir', icon: Pill, count: medications.length },
          { id: 'templates', label: 'Plantillas', icon: Book, count: suggestedTemplates.length },
          { id: 'interactions', label: 'Interacciones', icon: ShieldAlert, count: interactions.length },
          { id: 'database', label: 'Vademécum', icon: Search, count: 0 }
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
      <div className="space-y-4">
        {/* Prescribir */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="text-lg font-medium text-green-300">Medicamentos Prescritos</h5>
              <button
                onClick={addMedication}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Medicamento</span>
              </button>
            </div>

            {medications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay medicamentos prescritos</p>
                <p className="text-sm">Agrega medicamentos o usa una plantilla</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((med, index) => (
                  <div key={med.id} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-green-300">Medicamento #{index + 1}</span>
                      <button
                        onClick={() => removeMedication(med.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Nombre del medicamento con búsqueda */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Medicamento *</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => {
                            updateMedication(med.id, 'name', e.target.value);
                            if (e.target.value.length > 2) {
                              setSearchTerm(e.target.value);
                            }
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                          placeholder="Nombre del medicamento"
                        />

                        {/* Dropdown de búsqueda */}
                        {searchTerm && searchDrugs.length > 0 && med.name.includes(searchTerm) && (
                          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {searchDrugs.map((drug, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  updateMedication(med.id, 'name', drug.name);
                                  setSelectedDrug(drug);
                                  setSearchTerm('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                              >
                                <div className="font-medium">{drug.name}</div>
                                <div className="text-sm text-gray-400">{drug.category}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Dosis *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                            placeholder="500mg"
                          />
                          <button
                            onClick={() => setDosageCalculator({
                              isOpen: true,
                              drug: med.name,
                              weight: patientWeight,
                              age: patientAge
                            })}
                            className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                            title="Calcular dosis"
                          >
                            <Calculator className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Frecuencia *</label>
                        <select
                          value={med.frequency}
                          onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Seleccionar frecuencia</option>
                          <option value="Una vez al día">Una vez al día</option>
                          <option value="Dos veces al día">Dos veces al día</option>
                          <option value="Tres veces al día">Tres veces al día</option>
                          <option value="Cuatro veces al día">Cuatro veces al día</option>
                          <option value="Cada 4 horas">Cada 4 horas</option>
                          <option value="Cada 6 horas">Cada 6 horas</option>
                          <option value="Cada 8 horas">Cada 8 horas</option>
                          <option value="Cada 12 horas">Cada 12 horas</option>
                          <option value="Según necesidad">Según necesidad</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Duración *</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          placeholder="7 días"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Vía</label>
                        <select
                          value={med.route}
                          onChange={(e) => updateMedication(med.id, 'route', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="Oral">Oral</option>
                          <option value="Sublingual">Sublingual</option>
                          <option value="Tópica">Tópica</option>
                          <option value="Intramuscular">Intramuscular</option>
                          <option value="Intravenosa">Intravenosa</option>
                          <option value="Subcutánea">Subcutánea</option>
                          <option value="Inhalatoria">Inhalatoria</option>
                          <option value="Oftálmica">Oftálmica</option>
                          <option value="Ótica">Ótica</option>
                          <option value="Nasal">Nasal</option>
                          <option value="Rectal">Rectal</option>
                          <option value="Vaginal">Vaginal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Indicación</label>
                        <input
                          type="text"
                          value={med.indication}
                          onChange={(e) => updateMedication(med.id, 'indication', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          placeholder="Para qué se prescribe"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Instrucciones especiales</label>
                      <textarea
                        value={med.instructions}
                        onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                        rows={2}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                        placeholder="Tomar con alimentos, evitar alcohol, etc."
                      />
                    </div>

                    {/* Información del medicamento */}
                    {selectedDrug && med.name.toLowerCase().includes(selectedDrug.name.toLowerCase()) && (
                      <div className="mt-3 p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Info className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-300">Información del medicamento</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-blue-300">Dosis sugerida: </span>
                            <span className="text-blue-200">{calculateDose(selectedDrug.name, patientWeight, patientAge)}</span>
                          </div>
                          <div>
                            <span className="text-blue-300">Dosis máxima: </span>
                            <span className="text-blue-200">{selectedDrug.maxDose}</span>
                          </div>
                          <div>
                            <span className="text-blue-300">Embarazo: </span>
                            <span className="text-blue-200">Categoría {selectedDrug.pregnancy}</span>
                          </div>
                          <div>
                            <span className="text-blue-300">Lactancia: </span>
                            <span className="text-blue-200">{selectedDrug.lactation}</span>
                          </div>
                        </div>
                        {selectedDrug.contraindications.length > 0 && (
                          <div className="mt-2">
                            <span className="text-red-300 text-xs font-medium">Contraindicaciones: </span>
                            <span className="text-red-200 text-xs">{selectedDrug.contraindications.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Calculadora de dosis */}
            {dosageCalculator.isOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-lg font-medium text-white">Calculadora de Dosis</h6>
                    <button
                      onClick={() => setDosageCalculator({ ...dosageCalculator, isOpen: false })}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Medicamento</label>
                      <input
                        type="text"
                        value={dosageCalculator.drug}
                        readOnly
                        className="w-full bg-gray-700 text-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Peso (kg)</label>
                        <input
                          type="number"
                          value={dosageCalculator.weight}
                          onChange={(e) => setDosageCalculator({ ...dosageCalculator, weight: parseFloat(e.target.value) })}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Edad (años)</label>
                        <input
                          type="number"
                          value={dosageCalculator.age}
                          onChange={(e) => setDosageCalculator({ ...dosageCalculator, age: parseFloat(e.target.value) })}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="bg-green-900/30 border border-green-600 rounded p-3">
                      <div className="text-sm font-medium text-green-300 mb-1">Dosis calculada:</div>
                      <div className="text-green-200">
                        {calculateDose(dosageCalculator.drug, dosageCalculator.weight, dosageCalculator.age)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plantillas */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <h5 className="text-lg font-medium text-green-300">Plantillas Sugeridas</h5>
            {suggestedTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay plantillas sugeridas</p>
                <p className="text-sm">Ingresa un diagnóstico para ver sugerencias</p>
              </div>
            ) : (
              suggestedTemplates.map((template) => (
                <div key={template.id} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h6 className="font-medium text-white">{template.name}</h6>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{template.category}</span>
                        <span>•</span>
                        <span>{template.ageGroup}</span>
                        {template.specialty && (
                          <>
                            <span>•</span>
                            <span>{template.specialty}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => applyTemplate(template)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >
                      Aplicar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {template.medications.map((med, index) => (
                      <div key={index} className="bg-gray-700/50 rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-green-200">{med.name}</span>
                          <span className="text-gray-300">{med.dosage}</span>
                        </div>
                        <div className="text-gray-400">{med.frequency} por {med.duration}</div>
                        {med.indication && (
                          <div className="text-blue-300 text-xs">Para: {med.indication}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Interacciones */}
        {activeTab === 'interactions' && (
          <div className="space-y-3">
            <h5 className="text-lg font-medium text-green-300">Interacciones de Medicamentos</h5>
            {interactions.length === 0 ? (
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-300">No se detectaron interacciones</p>
                <p className="text-sm text-green-200">Los medicamentos prescritos son compatibles</p>
              </div>
            ) : (
              interactions.map((interaction, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  interaction.severity === 'major' ? 'bg-red-900/30 border-red-600' :
                  interaction.severity === 'moderate' ? 'bg-orange-900/30 border-orange-600' :
                  'bg-yellow-900/30 border-yellow-600'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className={`h-4 w-4 ${
                        interaction.severity === 'major' ? 'text-red-400' :
                        interaction.severity === 'moderate' ? 'text-orange-400' :
                        'text-yellow-400'
                      }`} />
                      <span className="font-medium text-white">
                        {interaction.drug1} + {interaction.drug2}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      interaction.severity === 'major' ? 'bg-red-800 text-red-100' :
                      interaction.severity === 'moderate' ? 'bg-orange-800 text-orange-100' :
                      'bg-yellow-800 text-yellow-100'
                    }`}>
                      {interaction.severity}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">{interaction.effect}</p>
                  <p className="text-sm text-gray-200 mb-2">
                    <strong>Manejo:</strong> {interaction.management}
                  </p>

                  {interaction.alternatives.length > 0 && (
                    <div className="text-sm">
                      <strong className="text-green-300">Alternativas:</strong>
                      <span className="text-green-200 ml-1">{interaction.alternatives.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Base de datos de medicamentos */}
        {activeTab === 'database' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar medicamento..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              {searchDrugs.map((drug, index) => (
                <div key={index} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h6 className="font-medium text-white">{drug.name}</h6>
                      <p className="text-sm text-gray-400">{drug.genericName} • {drug.category}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDrug(selectedDrug?.name === drug.name ? null : drug)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>

                  {selectedDrug?.name === drug.name && (
                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <strong className="text-green-300">Indicaciones:</strong>
                        <p className="text-gray-300">{drug.indications.join(', ')}</p>
                      </div>

                      <div>
                        <strong className="text-blue-300">Dosis adulto:</strong>
                        <p className="text-gray-300">{drug.dosageInfo.adult}</p>
                      </div>

                      {drug.dosageInfo.pediatric && (
                        <div>
                          <strong className="text-purple-300">Dosis pediátrica:</strong>
                          <p className="text-gray-300">{drug.dosageInfo.pediatric}</p>
                        </div>
                      )}

                      <div>
                        <strong className="text-red-300">Contraindicaciones:</strong>
                        <p className="text-gray-300">{drug.contraindications.join(', ')}</p>
                      </div>

                      <div>
                        <strong className="text-yellow-300">Efectos secundarios:</strong>
                        <p className="text-gray-300">{drug.sideEffects.join(', ')}</p>
                      </div>

                      <div className="flex items-center space-x-4 text-xs">
                        <span>Embarazo: <strong>Categoría {drug.pregnancy}</strong></span>
                        <span>Lactancia: <strong>{drug.lactation}</strong></span>
                        <span>Dosis máxima: <strong>{drug.maxDose}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}