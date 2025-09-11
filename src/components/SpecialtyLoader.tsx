import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

interface SpecialtyLoaderProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SpecialtyLoader: React.FC<SpecialtyLoaderProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState<number | null>(null);

  // Verificar especialidades actuales
  const checkCurrentSpecialties = async () => {
    try {
      const { count, error } = await supabase
        .from('medical_specialties')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      setCurrentCount(count || 0);
      return count || 0;
    } catch (error) {
      // Error log removed for security;
      return 0;
    }
  };

  // Cargar especialidades completas
  const loadCompleteSpecialties = async () => {
    setLoading(true);
    setProgress(0);
    setMessage('Iniciando carga de especialidades...');

    try {
      // 1. Verificar especialidades actuales
      setMessage('Verificando especialidades actuales...');
      setProgress(10);
      const currentCount = await checkCurrentSpecialties();

      if (currentCount >= 150) {
        setMessage(`Ya tienes ${currentCount} especialidades. ¿Deseas reemplazarlas?`);
        setLoading(false);
        return;
      }

      // 2. Limpiar tabla existente
      setMessage('Limpiando especialidades existentes...');
      setProgress(20);
      
      const { error: deleteError } = await supabase
        .from('medical_specialties')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todo

      if (deleteError) throw deleteError;

      // 3. Preparar datos de especialidades (subset optimizado)
      setMessage('Preparando especialidades...');
      setProgress(30);

      const specialties = [
        // Atención Primaria
        { name: 'Medicina General', category: 'Atención Primaria', description: 'Medicina general y atención primaria de salud', requires_license: true },
        { name: 'Medicina Familiar', category: 'Atención Primaria', description: 'Medicina familiar y comunitaria', requires_license: true },
        { name: 'Medicina Preventiva', category: 'Atención Primaria', description: 'Prevención y promoción de la salud', requires_license: true },

        // Especialidades Médicas Básicas
        { name: 'Medicina Interna', category: 'Especialidades Médicas', description: 'Diagnóstico y tratamiento de enfermedades internas del adulto', requires_license: true },
        { name: 'Pediatría', category: 'Especialidades Médicas', description: 'Atención médica de niños y adolescentes', requires_license: true },
        { name: 'Ginecología y Obstetricia', category: 'Especialidades Médicas', description: 'Salud reproductiva femenina y atención del embarazo', requires_license: true },
        { name: 'Cardiología', category: 'Especialidades Médicas', description: 'Diagnóstico y tratamiento de enfermedades del corazón', requires_license: true },
        { name: 'Dermatología', category: 'Especialidades Médicas', description: 'Enfermedades de la piel', requires_license: true },
        { name: 'Endocrinología', category: 'Especialidades Médicas', description: 'Trastornos hormonales y metabólicos', requires_license: true },
        { name: 'Gastroenterología', category: 'Especialidades Médicas', description: 'Enfermedades del sistema digestivo', requires_license: true },
        { name: 'Hematología', category: 'Especialidades Médicas', description: 'Enfermedades de la sangre', requires_license: true },
        { name: 'Infectología', category: 'Especialidades Médicas', description: 'Enfermedades infecciosas', requires_license: true },
        { name: 'Nefrología', category: 'Especialidades Médicas', description: 'Enfermedades de los riñones', requires_license: true },
        { name: 'Neumología', category: 'Especialidades Médicas', description: 'Enfermedades del sistema respiratorio', requires_license: true },
        { name: 'Neurología', category: 'Especialidades Médicas', description: 'Enfermedades del sistema nervioso', requires_license: true },
        { name: 'Oncología', category: 'Especialidades Médicas', description: 'Diagnóstico y tratamiento del cáncer', requires_license: true },
        { name: 'Reumatología', category: 'Especialidades Médicas', description: 'Enfermedades del aparato locomotor', requires_license: true },
        { name: 'Oftalmología', category: 'Especialidades Médicas', description: 'Enfermedades de los ojos', requires_license: true },
        { name: 'Otorrinolaringología', category: 'Especialidades Médicas', description: 'Enfermedades del oído, nariz y garganta', requires_license: true },
        { name: 'Urología', category: 'Especialidades Médicas', description: 'Enfermedades del sistema genitourinario', requires_license: true },
        { name: 'Geriatría', category: 'Especialidades Médicas', description: 'Atención médica de adultos mayores', requires_license: true },

        // Especialidades Quirúrgicas
        { name: 'Cirugía General', category: 'Especialidades Quirúrgicas', description: 'Procedimientos quirúrgicos generales', requires_license: true },
        { name: 'Cirugía Cardiovascular', category: 'Especialidades Quirúrgicas', description: 'Cirugía del corazón y vasos sanguíneos', requires_license: true },
        { name: 'Cirugía Plástica', category: 'Especialidades Quirúrgicas', description: 'Cirugía reconstructiva y estética', requires_license: true },
        { name: 'Cirugía Torácica', category: 'Especialidades Quirúrgicas', description: 'Cirugía del tórax y pulmones', requires_license: true },
        { name: 'Neurocirugía', category: 'Especialidades Quirúrgicas', description: 'Cirugía del sistema nervioso', requires_license: true },
        { name: 'Traumatología y Ortopedia', category: 'Especialidades Quirúrgicas', description: 'Cirugía del sistema musculoesquelético', requires_license: true },
        { name: 'Cirugía Pediátrica', category: 'Especialidades Quirúrgicas', description: 'Cirugía especializada en niños', requires_license: true },
        { name: 'Cirugía Maxilofacial', category: 'Especialidades Quirúrgicas', description: 'Cirugía de cara, mandíbula y cuello', requires_license: true },
        { name: 'Cirugía Vascular', category: 'Especialidades Quirúrgicas', description: 'Cirugía de vasos sanguíneos', requires_license: true },

        // Diagnóstico por Imagen
        { name: 'Radiología', category: 'Diagnóstico por Imagen', description: 'Interpretación de estudios de imagen médica', requires_license: true },
        { name: 'Radiología Intervencionista', category: 'Diagnóstico por Imagen', description: 'Procedimientos guiados por imagen', requires_license: true },
        { name: 'Medicina Nuclear', category: 'Diagnóstico por Imagen', description: 'Diagnóstico con radiofármacos', requires_license: true },
        { name: 'Ultrasonografía', category: 'Diagnóstico por Imagen', description: 'Diagnóstico por ultrasonido', requires_license: true },

        // Laboratorio y Patología
        { name: 'Patología', category: 'Diagnóstico', description: 'Diagnóstico de enfermedades mediante análisis de tejidos', requires_license: true },
        { name: 'Laboratorio Clínico', category: 'Diagnóstico', description: 'Análisis de muestras biológicas', requires_license: true },
        { name: 'Microbiología', category: 'Diagnóstico', description: 'Diagnóstico de enfermedades infecciosas', requires_license: true },
        { name: 'Citología', category: 'Diagnóstico', description: 'Análisis de células para diagnóstico', requires_license: true },
        { name: 'Genética Médica', category: 'Diagnóstico', description: 'Diagnóstico de enfermedades genéticas', requires_license: true },

        // Salud Mental
        { name: 'Psiquiatría', category: 'Salud Mental', description: 'Diagnóstico y tratamiento de trastornos mentales', requires_license: true },
        { name: 'Psicología Clínica', category: 'Salud Mental', description: 'Evaluación y tratamiento psicológico', requires_license: true },
        { name: 'Psiquiatría Infantil', category: 'Salud Mental', description: 'Salud mental en niños y adolescentes', requires_license: true },
        { name: 'Neuropsicología', category: 'Salud Mental', description: 'Evaluación cognitiva y neuropsicológica', requires_license: true },

        // Atención Crítica
        { name: 'Medicina de Urgencias', category: 'Atención Crítica', description: 'Atención médica de emergencias', requires_license: true },
        { name: 'Medicina Intensiva', category: 'Atención Crítica', description: 'Cuidados intensivos y críticos', requires_license: true },
        { name: 'Anestesiología', category: 'Atención Crítica', description: 'Manejo anestésico durante procedimientos', requires_license: true },
        { name: 'Medicina del Dolor', category: 'Atención Crítica', description: 'Manejo especializado del dolor', requires_license: true },

        // Pediatría Especializada
        { name: 'Neonatología', category: 'Pediatría Especializada', description: 'Atención del recién nacido', requires_license: true },
        { name: 'Cardiología Pediátrica', category: 'Pediatría Especializada', description: 'Cardiología en niños', requires_license: true },
        { name: 'Neurología Pediátrica', category: 'Pediatría Especializada', description: 'Neurología en niños', requires_license: true },
        { name: 'Oncología Pediátrica', category: 'Pediatría Especializada', description: 'Cáncer en niños', requires_license: true },
        { name: 'Endocrinología Pediátrica', category: 'Pediatría Especializada', description: 'Endocrinología en niños', requires_license: true },

        // Rehabilitación
        { name: 'Medicina de Rehabilitación', category: 'Rehabilitación', description: 'Rehabilitación y medicina física', requires_license: true },
        { name: 'Fisioterapia', category: 'Rehabilitación', description: 'Terapia física y rehabilitación', requires_license: true },
        { name: 'Terapia Ocupacional', category: 'Rehabilitación', description: 'Rehabilitación ocupacional', requires_license: true },
        { name: 'Fonoaudiología', category: 'Rehabilitación', description: 'Terapia del habla y lenguaje', requires_license: true },
        { name: 'Medicina del Deporte', category: 'Rehabilitación', description: 'Medicina aplicada al deporte', requires_license: true },

        // Ginecología Especializada
        { name: 'Medicina Materno-Fetal', category: 'Ginecología Especializada', description: 'Embarazos de alto riesgo', requires_license: true },
        { name: 'Reproducción Humana', category: 'Ginecología Especializada', description: 'Fertilidad y reproducción asistida', requires_license: true },
        { name: 'Ginecología Oncológica', category: 'Ginecología Especializada', description: 'Cáncer ginecológico', requires_license: true },

        // Salud Pública
        { name: 'Epidemiología', category: 'Salud Pública', description: 'Estudio de enfermedades en poblaciones', requires_license: true },
        { name: 'Medicina del Trabajo', category: 'Salud Pública', description: 'Salud ocupacional y medicina laboral', requires_license: true },
        { name: 'Medicina Tropical', category: 'Salud Pública', description: 'Enfermedades tropicales', requires_license: true },

        // Odontología
        { name: 'Odontología General', category: 'Odontología', description: 'Atención dental general', requires_license: true },
        { name: 'Endodoncia', category: 'Odontología', description: 'Tratamiento de conductos', requires_license: true },
        { name: 'Periodoncia', category: 'Odontología', description: 'Enfermedades de las encías', requires_license: true },
        { name: 'Ortodoncia', category: 'Odontología', description: 'Corrección de malposiciones dentales', requires_license: true },
        { name: 'Cirugía Oral', category: 'Odontología', description: 'Cirugía de la cavidad oral', requires_license: true },
        { name: 'Prostodoncia', category: 'Odontología', description: 'Rehabilitación protésica', requires_license: true },
        { name: 'Odontopediatría', category: 'Odontología', description: 'Odontología para niños', requires_license: true },

        // Especialidades de Apoyo
        { name: 'Nutrición', category: 'Especialidades de Apoyo', description: 'Nutrición clínica', requires_license: true },
        { name: 'Trabajo Social', category: 'Especialidades de Apoyo', description: 'Apoyo social y familiar', requires_license: false },
        { name: 'Farmacia Clínica', category: 'Especialidades de Apoyo', description: 'Farmacología clínica', requires_license: true },

        // Enfermería
        { name: 'Enfermería General', category: 'Enfermería', description: 'Cuidados generales de enfermería', requires_license: true },
        { name: 'Enfermería Quirúrgica', category: 'Enfermería', description: 'Cuidados perioperatorios', requires_license: true },
        { name: 'Enfermería en UCI', category: 'Enfermería', description: 'Cuidados intensivos de enfermería', requires_license: true },
        { name: 'Enfermería Pediátrica', category: 'Enfermería', description: 'Cuidados de enfermería en niños', requires_license: true },
        { name: 'Enfermería Oncológica', category: 'Enfermería', description: 'Cuidados oncológicos', requires_license: true },

        // Medicina Moderna
        { name: 'Telemedicina', category: 'Medicina Digital', description: 'Medicina a distancia', requires_license: true },
        { name: 'Medicina Genómica', category: 'Medicina Moderna', description: 'Medicina basada en genética', requires_license: true },
        { name: 'Medicina de Precisión', category: 'Medicina Moderna', description: 'Medicina personalizada', requires_license: true },

        // Técnicos Médicos
        { name: 'Técnico en Laboratorio', category: 'Técnico Médico', description: 'Técnico en análisis clínicos', requires_license: true },
        { name: 'Técnico en Radiología', category: 'Técnico Médico', description: 'Técnico en imágenes médicas', requires_license: true },
        { name: 'Técnico en Emergencias', category: 'Técnico Médico', description: 'Paramédico y técnico en emergencias', requires_license: true },
        { name: 'Técnico Quirúrgico', category: 'Técnico Médico', description: 'Instrumentista quirúrgico', requires_license: true },
      ];

      // 4. Insertar especialidades en lotes
      setMessage('Insertando especialidades...');
      setProgress(50);

      const batchSize = 10;
      const totalBatches = Math.ceil(specialties.length / batchSize);

      for (let i = 0; i < specialties.length; i += batchSize) {
        const batch = specialties.slice(i, i + batchSize).map(specialty => ({
          ...specialty,
          is_active: true,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('medical_specialties')
          .insert(batch);

        if (insertError) throw insertError;

        const currentBatch = Math.floor(i / batchSize) + 1;
        setProgress(50 + (currentBatch / totalBatches) * 40);
        setMessage(`Insertando lote ${currentBatch} de ${totalBatches}...`);
      }

      // 5. Verificar resultado final
      setMessage('Verificando resultado...');
      setProgress(95);
      
      const finalCount = await checkCurrentSpecialties();
      
      setProgress(100);
      setMessage(`✅ ¡Especialidades cargadas exitosamente! Total: ${finalCount}`);
      
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      // Error log removed for security;
      const errorMessage = `Error: ${error.message || 'Error desconocido'}`;
      setMessage(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar verificación al cargar componente
  React.useEffect(() => {
    checkCurrentSpecialties();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <Database className="h-6 w-6 text-cyan-400 mr-3" />
        <h3 className="text-lg font-semibold text-white">Especialidades Médicas</h3>
      </div>

      {/* Estado actual */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-300">
          <strong>Especialidades actuales:</strong> {currentCount !== null ? currentCount : 'Verificando...'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Recomendado: 80+ especialidades para un catálogo completo
        </p>
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border ${
          message.includes('Error') ? 'bg-red-900/30 border-red-700 text-red-300' :
          message.includes('✅') ? 'bg-green-900/30 border-green-700 text-green-300' :
          'bg-blue-900/30 border-blue-700 text-blue-300'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={loadCompleteSpecialties}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Cargando...' : 'Cargar Especialidades Completas'}
        </button>

        <button
          onClick={checkCurrentSpecialties}
          disabled={loading}
          className="flex items-center px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FileText className="h-4 w-4 mr-2" />
          Verificar
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• Se cargarán ~80 especialidades médicas principales</p>
        <p>• Incluye todas las categorías: Médicas, Quirúrgicas, Diagnóstico, etc.</p>
        <p>• Reemplazará las especialidades existentes</p>
      </div>
    </div>
  );
};

export default SpecialtyLoader;
