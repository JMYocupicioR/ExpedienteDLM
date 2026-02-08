
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  Thermometer, 
  Heart, 
  Wind, 
  Weight, 
  Stethoscope, 
  Microscope, 
  Pill, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Save, 
  Printer,
  Wand2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import CIE10Integration from '@/components/CIE10Integration';

interface ClassicConsultationData {
  vital_signs: {
    blood_pressure: string;
    heart_rate: string;
    respiratory_rate: string;
    temperature: string;
    weight: string;
    height: string;
    bmi: string;
    oxygen_saturation: string;
    glucose: string;
  };
  evolution: string;
  physical_exam: string;
  studies: string;
  clinical_diagnosis: string;
  cie10_codes: any[]; // To be typed properly
  prognosis: string;
  therapeutic_plan: {
    medications: any[];
    physical_therapy: string;
    other_indications: string;
  };
}

interface ClassicConsultationFormProps {
  patientId: string;
  patientName?: string;
  patientData?: any; // Name, age, sex, etc.
  doctorId: string;
  onSave: (data: ClassicConsultationData) => Promise<void>;
  onClose: () => void;
  initialData?: Partial<ClassicConsultationData>;
  isSaving?: boolean;
}

export default function ClassicConsultationForm({
  patientId,
  patientName,
  patientData,
  doctorId,
  onSave,
  onClose,
  initialData,
  isSaving = false
}: ClassicConsultationFormProps) {
  const [activeSection, setActiveSection] = useState<string | null>('evolution');
  const [showCIE10, setShowCIE10] = useState(false);

  const { register, control, handleSubmit, watch, setValue, getValues } = useForm<ClassicConsultationData>({
    defaultValues: initialData || {
      vital_signs: {
        blood_pressure: '',
        heart_rate: '',
        respiratory_rate: '',
        temperature: '',
        weight: '',
        height: '',
        bmi: '',
        oxygen_saturation: '',
        glucose: ''
      },
      evolution: '',
      physical_exam: '',
      studies: '',
      clinical_diagnosis: '',
      cie10_codes: [],
      prognosis: '',
      therapeutic_plan: {
        medications: [],
        physical_therapy: '',
        other_indications: ''
      }
    }
  });

  const { fields: medicationFields, append: appendMed, remove: removeMed } = useFieldArray({
    control,
    name: "therapeutic_plan.medications"
  });

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const calculateBMI = () => {
    const w = parseFloat(watch('vital_signs.weight'));
    const h = parseFloat(watch('vital_signs.height')); // Assuming cm
    if (w && h) {
      const heightInMeters = h / 100;
      const bmi = (w / (heightInMeters * heightInMeters)).toFixed(2);
      setValue('vital_signs.bmi', bmi);
    }
  };

  const fillNormalVitalSigns = () => {
    setValue('vital_signs.blood_pressure', '120/80');
    setValue('vital_signs.heart_rate', '75');
    setValue('vital_signs.respiratory_rate', '18');
    setValue('vital_signs.temperature', '36.5');
    setValue('vital_signs.oxygen_saturation', '98');
    setValue('vital_signs.glucose', '90');
  };

  // Sections config
  const SECTIONS = [
    { id: 'vitals', title: 'Signos Vitales y Antropometría', icon: Activity },
    { id: 'evolution', title: 'Evolución y Padecimiento Actual', icon: FileText },
    { id: 'exam', title: 'Exploración Física', icon: Stethoscope },
    { id: 'studies', title: 'Resultados de Estudios', icon: Microscope },
    { id: 'diagnosis', title: 'Diagnósticos', icon: Activity },
    { id: 'prognosis', title: 'Pronóstico', icon: AlertCircle },
    { id: 'plan', title: 'Plan Terapéutico', icon: Pill },
  ];

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 max-w-5xl mx-auto p-4">
      {/* Patient Header - Simplified for classic view */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 border-cyan-500 mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Nota de Evolución / Consulta</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 text-xs uppercase">Paciente</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{patientName}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase">Edad/Sexo</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {patientData?.age || '--'} años / {patientData?.gender || '--'}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase">Fecha</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase">Expediente</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{patientId.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {SECTIONS.map(section => (
        <div key={section.id} className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(section.id)}
            className={`w-full flex items-center justify-between p-4 transition-colors ${
              activeSection === section.id 
                ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' 
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <section.icon className={`h-5 w-5 ${activeSection === section.id ? 'text-cyan-600' : 'text-gray-400'}`} />
              <span className="font-semibold text-lg">{section.title}</span>
            </div>
            {activeSection === section.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>

          {activeSection === section.id && (
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-300">
              
              {/* VITALS SECTION */}
              {section.id === 'vitals' && (
                <div className="space-y-4">
                  <div className="flex justify-end mb-2">
                    <button 
                      type="button" 
                      onClick={fillNormalVitalSigns}
                      className="text-xs flex items-center text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-2 py-1 rounded"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      Llenar Normales
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">T/A (mmHg)</label>
                      <input 
                        {...register('vital_signs.blood_pressure')}
                        placeholder="120/80" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">F.C. (lpm)</label>
                      <input 
                        {...register('vital_signs.heart_rate')}
                        placeholder="75" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">F.R. (rpm)</label>
                      <input 
                        {...register('vital_signs.respiratory_rate')}
                        placeholder="18" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Temp (°C)</label>
                      <input 
                        {...register('vital_signs.temperature')}
                        placeholder="36.5" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Peso (kg)</label>
                      <input 
                        {...register('vital_signs.weight')}
                        onBlur={calculateBMI}
                        placeholder="0.00" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Talla (cm)</label>
                      <input 
                        {...register('vital_signs.height')}
                        onBlur={calculateBMI}
                        placeholder="0" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">IMC</label>
                      <input 
                        {...register('vital_signs.bmi')}
                        readOnly
                        className="w-full p-2 bg-gray-50 border rounded-md text-gray-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">SatO2 (%)</label>
                      <input 
                        {...register('vital_signs.oxygen_saturation')}
                        placeholder="98" 
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* EVOLUTION & EXAM & STUDIES - Rich Text Areas */}
              {['evolution', 'exam', 'studies', 'prognosis'].includes(section.id) && (
                <div className="relative">
                  <textarea
                    {...register(section.id === 'exam' ? 'physical_exam' : (section.id as any))}
                    rows={6}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none resize-y text-base"
                    placeholder={`Escriba detalles de ${section.title.toLowerCase()}...`}
                  />
                  {/* Quick Macros can be added here later */}
                </div>
              )}

              {/* DIAGNOSIS */}
              {section.id === 'diagnosis' && (
                <div className="space-y-4">
                  <textarea
                    {...register('clinical_diagnosis')}
                    rows={3}
                    placeholder="Diagnóstico clínico (texto libre)..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none mb-4"
                  />
                  
                  <div className="border p-4 rounded-lg bg-gray-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Códigos CIE-10</h4>
                      <button
                        type="button"
                        onClick={() => setShowCIE10(!showCIE10)}
                        className="text-xs text-cyan-600 hover:underline flex items-center"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {showCIE10 ? 'Ocultar Búsqueda' : 'Agregar Código'}
                      </button>
                    </div>
                    
                    {/* Selected Codes List */}
                    <div className="space-y-2 mb-4">
                      {watch('cie10_codes')?.map((code: any, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border border-gray-200 shadow-sm">
                          <div>
                            <span className="font-bold text-cyan-700 mr-2">{code.code}</span>
                            <span className="text-sm">{code.description}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const current = getValues('cie10_codes');
                              setValue('cie10_codes', current.filter((_, i) => i !== index));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {(!watch('cie10_codes') || watch('cie10_codes').length === 0) && (
                        <p className="text-sm text-gray-400 italic">No hay códigos CIE-10 seleccionados.</p>
                      )}
                    </div>

                    <CIE10Integration
                      isVisible={showCIE10}
                      diagnosis={watch('clinical_diagnosis')}
                      currentCondition={watch('evolution')}
                      doctorId={doctorId}
                      onCodeSelect={(code) => {
                        const current = getValues('cie10_codes') || [];
                        if (!current.find((c:any) => c.code === code.code)) {
                          setValue('cie10_codes', [...current, code]);
                        }
                      }}
                      onCodeSuggestions={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* THERAPEUTIC PLAN */}
              {section.id === 'plan' && (
                <div className="space-y-6">
                  {/* Medications Table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Medicamentos</h4>
                       <button
                         type="button"
                         onClick={() => appendMed({ name: '', dose: '', route: 'Oral', frequency: '', duration: '' })}
                         className="text-xs bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full hover:bg-cyan-200 font-medium"
                       >
                         + Agregar Medicamento
                       </button>
                    </div>
                    
                    {medicationFields.length > 0 ? (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medicamento</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dosis</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vía</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frec.</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {medicationFields.map((field, index) => (
                              <tr key={field.id}>
                                <td className="p-2">
                                  <input {...register(`therapeutic_plan.medications.${index}.name`)} className="w-full p-1 bg-transparent border-b border-transparent focus:border-cyan-500 outline-none text-sm" placeholder="Nombre" />
                                </td>
                                <td className="p-2">
                                  <input {...register(`therapeutic_plan.medications.${index}.dose`)} className="w-full p-1 bg-transparent border-b border-transparent focus:border-cyan-500 outline-none text-sm" placeholder="500mg" />
                                </td>
                                <td className="p-2">
                                  <select {...register(`therapeutic_plan.medications.${index}.route`)} className="w-full p-1 bg-transparent border-b border-transparent focus:border-cyan-500 outline-none text-sm">
                                    <option value="Oral">Oral</option>
                                    <option value="IV">IV</option>
                                    <option value="IM">IM</option>
                                    <option value="Subcutánea">Subcutánea</option>
                                    <option value="Tópica">Tópica</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input {...register(`therapeutic_plan.medications.${index}.frequency`)} className="w-full p-1 bg-transparent border-b border-transparent focus:border-cyan-500 outline-none text-sm" placeholder="c/8h" />
                                </td>
                                <td className="p-2">
                                  <input {...register(`therapeutic_plan.medications.${index}.duration`)} className="w-full p-1 bg-transparent border-b border-transparent focus:border-cyan-500 outline-none text-sm" placeholder="7 días" />
                                </td>
                                <td className="p-2 text-right">
                                  <button type="button" onClick={() => removeMed(index)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                        No hay medicamentos agregados
                      </div>
                    )}
                  </div>

                  {/* Physical Therapy */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Terapia Física / Rehabilitación</h4>
                    <textarea 
                      {...register('therapeutic_plan.physical_therapy')}
                      rows={3}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                      placeholder="Programa de rehabilitación..."
                    />
                  </div>

                  {/* Other Indications */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Otras Indicaciones</h4>
                    <textarea 
                      {...register('therapeutic_plan.other_indications')}
                      rows={3}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                      placeholder="Dieta, cuidados generales, etc..."
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>Guardando...</>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar Nota
            </>
          )}
        </button>
      </div>
    </form>
  );
}
