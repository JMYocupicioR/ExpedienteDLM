import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface LabResult {
  id?: string;
  parameter_name: string;
  value?: number | null;
  value_text?: string;
  unit?: string;
  reference_min?: number | null;
  reference_max?: number | null;
  reference_text?: string;
  is_abnormal?: boolean;
  abnormal_flag?: 'high' | 'low' | 'critical_high' | 'critical_low' | null;
  notes?: string;
}

interface LabResultsFormProps {
  medicalTestId: string;
  testName: string;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_PARAMETERS = [
  // Química sanguínea
  { name: 'Glucosa', unit: 'mg/dL', min: 70, max: 100 },
  { name: 'Hemoglobina', unit: 'g/dL', min: 12, max: 16 },
  { name: 'Creatinina', unit: 'mg/dL', min: 0.6, max: 1.2 },
  { name: 'Urea', unit: 'mg/dL', min: 10, max: 50 },
  { name: 'Colesterol Total', unit: 'mg/dL', min: 0, max: 200 },
  { name: 'Triglicéridos', unit: 'mg/dL', min: 0, max: 150 },
  { name: 'HDL', unit: 'mg/dL', min: 40, max: 999 },
  { name: 'LDL', unit: 'mg/dL', min: 0, max: 130 },
  { name: 'ALT (TGP)', unit: 'U/L', min: 7, max: 56 },
  { name: 'AST (TGO)', unit: 'U/L', min: 10, max: 40 },
  { name: 'Bilirrubina Total', unit: 'mg/dL', min: 0.1, max: 1.2 },
  { name: 'Proteínas Totales', unit: 'g/dL', min: 6.4, max: 8.3 },
  { name: 'Albúmina', unit: 'g/dL', min: 3.5, max: 5.5 },

  // Biometría hemática
  { name: 'Leucocitos', unit: '10³/µL', min: 4.5, max: 11 },
  { name: 'Eritrocitos', unit: '10⁶/µL', min: 4.5, max: 5.9 },
  { name: 'Plaquetas', unit: '10³/µL', min: 150, max: 400 },
  { name: 'Hematocrito', unit: '%', min: 38, max: 52 },
  { name: 'VCM', unit: 'fL', min: 80, max: 100 },

  // Electrolitos
  { name: 'Sodio', unit: 'mEq/L', min: 136, max: 145 },
  { name: 'Potasio', unit: 'mEq/L', min: 3.5, max: 5.0 },
  { name: 'Cloro', unit: 'mEq/L', min: 98, max: 107 },
  { name: 'Calcio', unit: 'mg/dL', min: 8.5, max: 10.5 },

  // Hormonas
  { name: 'TSH', unit: 'µUI/mL', min: 0.4, max: 4.0 },
  { name: 'T4 Libre', unit: 'ng/dL', min: 0.8, max: 1.8 },
];

export default function LabResultsForm({
  medicalTestId,
  testName,
  onClose,
  onSaved
}: LabResultsFormProps) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExistingResults();
  }, [medicalTestId]);

  const loadExistingResults = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('medical_test_id', medicalTestId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      setResults(data as LabResult[]);
    } else {
      // Iniciar con una fila vacía
      addEmptyRow();
    }
    setLoading(false);
  };

  const addEmptyRow = () => {
    setResults(prev => [...prev, {
      parameter_name: '',
      value: null,
      value_text: '',
      unit: '',
      reference_min: null,
      reference_max: null,
      reference_text: '',
      is_abnormal: false,
      abnormal_flag: null,
      notes: ''
    }]);
  };

  const removeRow = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof LabResult, value: any) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], [field]: value };

      // Auto-calcular si es anormal
      if (field === 'value' || field === 'reference_min' || field === 'reference_max') {
        const result = newResults[index];
        if (result.value !== null && result.value !== undefined) {
          const val = Number(result.value);
          const min = result.reference_min ? Number(result.reference_min) : null;
          const max = result.reference_max ? Number(result.reference_max) : null;

          if (min !== null && val < min) {
            newResults[index].is_abnormal = true;
            newResults[index].abnormal_flag = val < (min * 0.5) ? 'critical_low' : 'low';
          } else if (max !== null && val > max) {
            newResults[index].is_abnormal = true;
            newResults[index].abnormal_flag = val > (max * 2) ? 'critical_high' : 'high';
          } else {
            newResults[index].is_abnormal = false;
            newResults[index].abnormal_flag = null;
          }
        }
      }

      return newResults;
    });
  };

  const selectCommonParameter = (index: number, paramName: string) => {
    const common = COMMON_PARAMETERS.find(p => p.name === paramName);
    if (common) {
      updateRow(index, 'parameter_name', common.name);
      updateRow(index, 'unit', common.unit);
      updateRow(index, 'reference_min', common.min);
      updateRow(index, 'reference_max', common.max);
    }
  };

  const handleSave = async () => {
    // Filtrar resultados vacíos
    const validResults = results.filter(r =>
      r.parameter_name && (r.value !== null || r.value_text)
    );

    if (validResults.length === 0) {
      alert('Debes agregar al menos un resultado válido');
      return;
    }

    setSaving(true);
    try {
      // Borrar resultados existentes primero
      await supabase
        .from('lab_results')
        .delete()
        .eq('medical_test_id', medicalTestId);

      // Insertar nuevos resultados
      const payload = validResults.map(r => ({
        medical_test_id: medicalTestId,
        parameter_name: r.parameter_name,
        value: r.value,
        value_text: r.value_text || null,
        unit: r.unit || null,
        reference_min: r.reference_min,
        reference_max: r.reference_max,
        reference_text: r.reference_text || null,
        is_abnormal: r.is_abnormal || false,
        abnormal_flag: r.abnormal_flag || null,
        notes: r.notes || null
      }));

      const { error } = await supabase
        .from('lab_results')
        .insert(payload);

      if (error) throw error;

      // Actualizar el estado del estudio a "completed" si tiene resultados
      await supabase
        .from('medical_tests')
        .update({
          status: 'completed',
          result_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', medicalTestId);

      onSaved();
      onClose();
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
        <div className="text-white">Cargando resultados...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Resultados de Laboratorio</h2>
            <p className="text-sm text-gray-400">{testName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.is_abnormal
                    ? result.abnormal_flag?.includes('critical')
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-yellow-500 bg-yellow-900/20'
                    : 'border-gray-600 bg-gray-800'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  {/* Parámetro */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Parámetro *</label>
                    <input
                      type="text"
                      list={`parameters-${index}`}
                      value={result.parameter_name}
                      onChange={(e) => updateRow(index, 'parameter_name', e.target.value)}
                      onBlur={(e) => selectCommonParameter(index, e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="Ej: Glucosa"
                    />
                    <datalist id={`parameters-${index}`}>
                      {COMMON_PARAMETERS.map(p => (
                        <option key={p.name} value={p.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Valor *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={result.value || ''}
                      onChange={(e) => updateRow(index, 'value', e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="100"
                    />
                  </div>

                  {/* Unidad */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unidad</label>
                    <input
                      type="text"
                      value={result.unit || ''}
                      onChange={(e) => updateRow(index, 'unit', e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="mg/dL"
                    />
                  </div>

                  {/* Mín */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ref. Mín</label>
                    <input
                      type="number"
                      step="0.01"
                      value={result.reference_min || ''}
                      onChange={(e) => updateRow(index, 'reference_min', e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="70"
                    />
                  </div>

                  {/* Máx */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ref. Máx</label>
                    <input
                      type="number"
                      step="0.01"
                      value={result.reference_max || ''}
                      onChange={(e) => updateRow(index, 'reference_max', e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Notas y acciones */}
                <div className="mt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Notas</label>
                    <input
                      type="text"
                      value={result.notes || ''}
                      onChange={(e) => updateRow(index, 'notes', e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="Observaciones adicionales..."
                    />
                  </div>

                  {/* Indicador de estado */}
                  <div className="flex items-center gap-2">
                    {result.is_abnormal ? (
                      <AlertTriangle className={`h-5 w-5 ${result.abnormal_flag?.includes('critical') ? 'text-red-400' : 'text-yellow-400'}`} />
                    ) : result.value !== null ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : null}

                    <button
                      onClick={() => removeRow(index)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Eliminar fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addEmptyRow}
            className="mt-4 w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar parámetro
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            {results.filter(r => r.is_abnormal).length > 0 && (
              <span className="text-yellow-400">
                ⚠️ {results.filter(r => r.is_abnormal).length} valor(es) anormal(es)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Resultados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
