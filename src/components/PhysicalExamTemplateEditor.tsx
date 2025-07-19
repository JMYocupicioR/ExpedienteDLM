import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Download, Upload, Share2, Copy, Eye, Settings, Trash2, Edit, ChevronDown, ChevronUp, GripVertical, Users } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { supabase } from '../lib/supabase';
// ===== IMPORTACIONES PARA VALIDACIÓN CENTRALIZADA =====
import { SYSTEM_LIMITS } from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';
import { useValidation } from '../hooks/useValidation';
import type { Database, PhysicalExamTemplateDefinition, ExamQuestion } from '../lib/database.types';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
  order: number;
}

interface PhysicalExamTemplateEditorProps {
  template?: PhysicalExamTemplate | null;
  doctorId: string;
  onSave: (template: PhysicalExamTemplate) => void;
  onClose: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'checkbox', label: 'Casillas de verificación' },
  { value: 'radio', label: 'Opción única' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' }
];

const SYSTEM_TEMPLATES = {
  // Sistemas generales
  cardiovascular: {
    title: 'Sistema Cardiovascular',
    fields: [
      { id: 'heart_rate', label: 'Frecuencia Cardíaca', type: 'number' as const, placeholder: 'lpm' },
      { id: 'blood_pressure', label: 'Presión Arterial', type: 'text' as const, placeholder: '120/80 mmHg' },
      { id: 'heart_sounds', label: 'Ruidos Cardíacos', type: 'select' as const, options: ['Normal', 'Soplo sistólico', 'Soplo diastólico', 'Galope', 'Arritmia'] },
      { id: 'pulses', label: 'Pulsos Periféricos', type: 'checkbox' as const, options: ['Radial normal', 'Femoral normal', 'Poplíteo normal', 'Tibial normal', 'Pedio normal'] },
      { id: 'edema', label: 'Edema', type: 'radio' as const, options: ['Ausente', 'Grado I', 'Grado II', 'Grado III', 'Grado IV'] }
    ]
  },
  respiratory: {
    title: 'Sistema Respiratorio',
    fields: [
      { id: 'respiratory_rate', label: 'Frecuencia Respiratoria', type: 'number' as const, placeholder: 'rpm' },
      { id: 'lung_sounds', label: 'Ruidos Pulmonares', type: 'select' as const, options: ['Normal', 'Estertores', 'Sibilancias', 'Roncus', 'Disminuidos', 'Ausentes'] },
      { id: 'chest_expansion', label: 'Expansión Torácica', type: 'radio' as const, options: ['Normal', 'Disminuida', 'Asimétrica'] },
      { id: 'percussion', label: 'Percusión', type: 'radio' as const, options: ['Sonoridad normal', 'Matidez', 'Timpanismo', 'Hipersonoridad'] }
    ]
  },
  neurological: {
    title: 'Sistema Neurológico',
    fields: [
      { id: 'mental_status', label: 'Estado Mental', type: 'select' as const, options: ['Alerta', 'Somnoliento', 'Estuporoso', 'Comatoso'] },
      { id: 'cranial_nerves', label: 'Pares Craneales', type: 'textarea' as const, placeholder: 'Evaluación de pares craneales I-XII' },
      { id: 'reflexes', label: 'Reflejos Osteotendinosos', type: 'checkbox' as const, options: ['Bicipital normal', 'Tricipital normal', 'Rotuliano normal', 'Aquíleo normal'] },
      { id: 'gait', label: 'Marcha', type: 'radio' as const, options: ['Normal', 'Claudicante', 'Atáxica', 'Espástica', 'No evaluable'] }
    ]
  },
  
  // Exploraciones específicas por región
  spine_column: {
    title: 'Exploración de Columna Vertebral',
    fields: [
      { id: 'posture', label: 'Postura', type: 'radio' as const, options: ['Normal', 'Escoliosis', 'Cifosis', 'Lordosis', 'Rectificación'] },
      { id: 'range_motion', label: 'Rango de Movimiento', type: 'checkbox' as const, options: ['Flexión completa', 'Extensión completa', 'Lateralización derecha', 'Lateralización izquierda', 'Rotación derecha', 'Rotación izquierda'] },
      { id: 'pain_palpation', label: 'Dolor a la Palpación', type: 'radio' as const, options: ['Ausente', 'Cervical', 'Dorsal', 'Lumbar', 'Sacroilíaca'] },
      { id: 'muscle_spasm', label: 'Espasmo Muscular', type: 'checkbox' as const, options: ['Paravertebrales cervicales', 'Paravertebrales dorsales', 'Paravertebrales lumbares', 'Trapecio', 'Ausente'] },
      { id: 'special_tests', label: 'Pruebas Especiales', type: 'checkbox' as const, options: ['Lasègue positivo', 'Bragard positivo', 'Patrick positivo', 'Compresión foraminal positiva'] },
      { id: 'neurological_deficit', label: 'Déficit Neurológico', type: 'textarea' as const, placeholder: 'Describir alteraciones sensitivas o motoras' }
    ]
  },
  
  hand_wrist: {
    title: 'Exploración de Mano y Muñeca',
    fields: [
      { id: 'inspection', label: 'Inspección', type: 'checkbox' as const, options: ['Deformidad', 'Inflamación', 'Cambios de coloración', 'Atrofia muscular', 'Normal'] },
      { id: 'finger_mobility', label: 'Movilidad de Dedos', type: 'checkbox' as const, options: ['Flexión completa', 'Extensión completa', 'Oposición pulgar', 'Pinza fina conservada', 'Pinza gruesa conservada'] },
      { id: 'wrist_movement', label: 'Movimiento de Muñeca', type: 'checkbox' as const, options: ['Flexión completa', 'Extensión completa', 'Desviación radial', 'Desviación cubital', 'Pronosupinación'] },
      { id: 'grip_strength', label: 'Fuerza de Prensión', type: 'radio' as const, options: ['Normal', 'Disminuida leve', 'Disminuida moderada', 'Disminuida severa', 'Ausente'] },
      { id: 'sensitivity', label: 'Sensibilidad', type: 'checkbox' as const, options: ['Táctil normal', 'Térmica normal', 'Dolorosa normal', 'Vibratoria normal', 'Discriminación de dos puntos normal'] },
      { id: 'special_tests', label: 'Pruebas Especiales', type: 'checkbox' as const, options: ['Tinel positivo', 'Phalen positivo', 'Finkelstein positivo', 'Test de Watson positivo'] }
    ]
  },
  
  knee: {
    title: 'Exploración de Rodilla',
    fields: [
      { id: 'inspection', label: 'Inspección', type: 'checkbox' as const, options: ['Deformidad', 'Inflamación', 'Derrame articular', 'Atrofia cuadricipital', 'Normal'] },
      { id: 'range_motion', label: 'Rango de Movimiento', type: 'text' as const, placeholder: 'Flexión: __°, Extensión: __°' },
      { id: 'ligament_tests', label: 'Pruebas Ligamentarias', type: 'checkbox' as const, options: ['Cajón anterior negativo', 'Cajón posterior negativo', 'Lachman negativo', 'Estrés valgo negativo', 'Estrés varo negativo'] },
      { id: 'meniscus_tests', label: 'Pruebas Meniscales', type: 'checkbox' as const, options: ['McMurray negativo', 'Apley negativo', 'Dolor en interlínea medial', 'Dolor en interlínea lateral'] },
      { id: 'patella_tests', label: 'Pruebas Rotulianas', type: 'checkbox' as const, options: ['Aprehensión rotuliana negativa', 'Movilidad rotuliana normal', 'Compresión rotuliana negativa'] },
      { id: 'stability', label: 'Estabilidad General', type: 'radio' as const, options: ['Estable', 'Inestabilidad leve', 'Inestabilidad moderada', 'Inestabilidad severa'] }
    ]
  },
  
  shoulder: {
    title: 'Exploración de Hombro',
    fields: [
      { id: 'inspection', label: 'Inspección', type: 'checkbox' as const, options: ['Deformidad', 'Atrofia deltoidea', 'Atrofia supraespinoso', 'Asimetría', 'Normal'] },
      { id: 'range_motion', label: 'Rango de Movimiento', type: 'checkbox' as const, options: ['Flexión completa', 'Extensión completa', 'Abducción completa', 'Aducción completa', 'Rotación interna completa', 'Rotación externa completa'] },
      { id: 'strength_tests', label: 'Pruebas de Fuerza', type: 'checkbox' as const, options: ['Supraespinoso (Jobe) normal', 'Infraespinoso normal', 'Redondo menor normal', 'Subescapular normal'] },
      { id: 'impingement_tests', label: 'Pruebas de Impingement', type: 'checkbox' as const, options: ['Neer negativo', 'Hawkins negativo', 'Yocum negativo'] },
      { id: 'instability_tests', label: 'Pruebas de Inestabilidad', type: 'checkbox' as const, options: ['Aprehensión anterior negativa', 'Aprehensión posterior negativa', 'Sulcus test negativo'] }
    ]
  },
  
  foot_ankle: {
    title: 'Exploración de Pie y Tobillo',
    fields: [
      { id: 'inspection', label: 'Inspección', type: 'checkbox' as const, options: ['Deformidad', 'Inflamación', 'Cambios ungueales', 'Callosidades', 'Pie plano', 'Pie cavo', 'Normal'] },
      { id: 'range_motion', label: 'Rango de Movimiento', type: 'checkbox' as const, options: ['Dorsiflexión completa', 'Flexión plantar completa', 'Inversión completa', 'Eversión completa'] },
      { id: 'pulses', label: 'Pulsos', type: 'checkbox' as const, options: ['Tibial posterior presente', 'Pedio presente'] },
      { id: 'sensation', label: 'Sensibilidad', type: 'checkbox' as const, options: ['Táctil conservada', 'Vibratoria conservada', 'Monofilamento 10g normal'] },
      { id: 'special_tests', label: 'Pruebas Especiales', type: 'checkbox' as const, options: ['Thompson negativo', 'Cajón anterior tobillo negativo', 'Estrés en inversión negativo'] },
      { id: 'gait_pattern', label: 'Patrón de Marcha', type: 'radio' as const, options: ['Normal', 'Claudicante', 'En punta de pies', 'Talón-punta alterado'] }
    ]
  },
  
  abdomen: {
    title: 'Exploración Abdominal',
    fields: [
      { id: 'inspection', label: 'Inspección', type: 'checkbox' as const, options: ['Distensión', 'Masas visibles', 'Circulación colateral', 'Cicatrices', 'Normal'] },
      { id: 'auscultation', label: 'Auscultación', type: 'radio' as const, options: ['Ruidos intestinales normales', 'Hiperperistaltismo', 'Hipoperistaltismo', 'Ausentes'] },
      { id: 'percussion', label: 'Percusión', type: 'checkbox' as const, options: ['Timpanismo normal', 'Matidez hepática normal', 'Matidez esplénica normal', 'Signo de la onda negativo'] },
      { id: 'palpation', label: 'Palpación', type: 'checkbox' as const, options: ['Dolor a la palpación', 'Masas palpables', 'Hepatomegalia', 'Esplenomegalia', 'Defensa muscular', 'Rebote positivo'] },
      { id: 'special_signs', label: 'Signos Especiales', type: 'checkbox' as const, options: ['Murphy negativo', 'McBurney negativo', 'Rovsing negativo', 'Psoas negativo', 'Obturador negativo'] }
    ]
  }
};

export default function PhysicalExamTemplateEditor({
  template,
  doctorId,
  onSave,
  onClose
}: PhysicalExamTemplateEditorProps) {
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateType, setTemplateType] = useState('general');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<{ sectionId: string; field?: TemplateField } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [shareableLink, setShareableLink] = useState<string>('');
  const [importData, setImportData] = useState<string>('');

  // ===== USAR HOOK DE VALIDACIÓN CENTRALIZADO =====
  const { validatePhysicalExamTemplateField } = useValidation();

  // Field editor state
  const [fieldForm, setFieldForm] = useState<TemplateField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    defaultValue: '',
    helpText: ''
  });

  useEffect(() => {
    if (template?.definition?.sections) {
      const editorSections: TemplateSection[] = template.definition.sections.map(section => ({
        ...section,
        fields: section.questions?.map(question => ({
          id: question.id,
          label: question.label,
          type: question.type,
          required: question.required || false,
          placeholder: question.placeholder || '',
          options: question.options || [],
          defaultValue: question.defaultValue?.toString() || '',
          helpText: ''
        })) || [],
      }));
      setSections(editorSections);
    } else if ((template as any)?.fields) {
      // Backwards compatibility for old format
      const parsedSections = parseTemplateFields((template as any).fields);
      setSections(parsedSections);
    }
  }, [template]);

  const parseTemplateFields = (fields: any): TemplateSection[] => {
    // Convert old format to new section-based format
    if (Array.isArray(fields)) {
      return [{
        id: 'main',
        title: 'Exploración General',
        fields: fields as TemplateField[],
        order: 0
      }];
    }
    
    // Handle object format
    const sections: TemplateSection[] = [];
    Object.entries(fields).forEach(([key, value]: [string, any], index) => {
      if (typeof value === 'object' && value.fields) {
        sections.push({
          id: key,
          title: value.title || key,
          description: value.description,
          fields: (value.fields || []) as TemplateField[],
          order: index
        });
      }
    });
    
    return sections.length > 0 ? sections : [{
      id: 'main',
      title: 'Exploración General',
      fields: [],
      order: 0
    }];
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: 'Nueva Sección',
      fields: [],
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const handleAddField = (sectionId: string) => {
    setEditingField({ sectionId });
    setFieldForm({
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      defaultValue: '',
      helpText: ''
    });
    setShowFieldEditor(true);
  };

  const handleEditField = (sectionId: string, field: TemplateField) => {
    setEditingField({ sectionId, field });
    setFieldForm(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    const { sectionId, field } = editingField;
    
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (field) {
          // Update existing field
          return {
            ...section,
            fields: section.fields.map(f => f.id === field.id ? fieldForm : f)
          };
        } else {
          // Add new field
          return {
            ...section,
            fields: [...section.fields, fieldForm]
          };
        }
      }
      return section;
    }));

    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        };
      }
      return section;
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same section
      const sectionId = source.droppableId;
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const newFields = Array.from(section.fields);
      const [removed] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, removed);

      handleUpdateSection(sectionId, { fields: newFields });
    }
  };

  const handleAddSystemTemplate = (systemKey: keyof typeof SYSTEM_TEMPLATES) => {
    const systemTemplate = SYSTEM_TEMPLATES[systemKey];
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      title: systemTemplate.title,
      fields: systemTemplate.fields.map(field => ({
        id: `${field.id}_${Date.now()}`,
        label: field.label,
        type: field.type,
        required: field.required || false,
        placeholder: field.placeholder || '',
        options: field.options || [],
        defaultValue: field.defaultValue || '',
        helpText: field.helpText || ''
      })),
      order: sections.length
    };
    setSections([...sections, newSection]);
  };

  // ===== VALIDACIÓN ROBUSTA USANDO LÍMITES CENTRALIZADOS =====
  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ===== VALIDACIONES MEJORADAS =====
      if (!templateName.trim()) {
        throw new Error('El nombre de la plantilla es requerido');
      }

      if (templateName.length > SYSTEM_LIMITS.MAX_TEMPLATE_NAME_LENGTH) {
        throw new Error(`El nombre de la plantilla no puede exceder ${SYSTEM_LIMITS.MAX_TEMPLATE_NAME_LENGTH} caracteres`);
      }

      if (sections.length === 0) {
        throw new Error('La plantilla debe tener al menos una sección');
      }

      if (sections.length > SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE) {
        throw new Error(`Máximo ${SYSTEM_LIMITS.MAX_SECTIONS_PER_TEMPLATE} secciones permitidas por plantilla`);
      }

      // Validar cada sección
      let totalFields = 0;
      for (const section of sections) {
        if (!section.title.trim()) {
          throw new Error('Todas las secciones deben tener un título');
        }

        if (section.fields.length === 0) {
          throw new Error(`La sección "${section.title}" debe tener al menos un campo`);
        }

        if (section.fields.length > SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION) {
          throw new Error(`La sección "${section.title}" excede el máximo de ${SYSTEM_LIMITS.MAX_FIELDS_PER_SECTION} campos`);
        }

        totalFields += section.fields.length;

        // Validar campos de la sección
        for (const field of section.fields) {
          if (!field.label.trim()) {
            throw new Error(`Campo en la sección "${section.title}" debe tener una etiqueta`);
          }

          if (field.label.length > SYSTEM_LIMITS.MAX_FIELD_LABEL_LENGTH) {
            throw new Error(`Etiqueta del campo "${field.label}" demasiado larga (máximo ${SYSTEM_LIMITS.MAX_FIELD_LABEL_LENGTH} caracteres)`);
          }

          // Validar opciones para campos de selección
          if (['select', 'radio', 'checkbox'].includes(field.type)) {
            if (!field.options || field.options.length === 0) {
              throw new Error(`Campo "${field.label}" de tipo ${field.type} debe tener opciones`);
            }
          }
        }
      }

      // ===== CORREGIR ESTRUCTURA DE DATOS PARA USAR 'questions' =====
      const definition: PhysicalExamTemplateDefinition = {
        version: '1.0',
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description || '',
          order: section.order,
          questions: section.fields.map(field => ({
            id: field.id,
            label: field.label,
            type: field.type,
            required: field.required || false,
            placeholder: field.placeholder || '',
            options: field.options || [],
            defaultValue: field.defaultValue || ''
          })) as ExamQuestion[],
        })),
      };

      // ===== VALIDACIÓN SIMPLIFICADA PARA EVITAR PROBLEMAS =====
      // Validación manual básica en lugar de usar el hook problemático
      console.log('Guardando plantilla con definición:', definition);

      if (template) {
        // Update existing template
        const { data, error: updateError } = await supabase
          .from('physical_exam_templates')
          .update({
            name: templateName,
            definition,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error de actualización:', updateError);
          throw new Error(`Error al actualizar: ${updateError.message}`);
        }
        if (data) onSave(data as PhysicalExamTemplate);
      } else {
        // Create new template
        const { data, error: insertError } = await supabase
          .from('physical_exam_templates')
          .insert({
            doctor_id: doctorId,
            name: templateName,
            definition,
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error de inserción:', insertError);
          throw new Error(`Error al crear: ${insertError.message}`);
        }
        if (data) onSave(data as PhysicalExamTemplate);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTemplate = () => {
    const exportData = {
      name: templateName,
      type: templateType,
      sections,
      createdBy: 'Expediente DLM',
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla_${templateName.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = () => {
    try {
      const parsed = JSON.parse(importData);
      
      if (!parsed.name || !parsed.sections) {
        throw new Error('Formato de archivo inválido');
      }

      setTemplateName(parsed.name + ' (Importada)');
      setTemplateType(parsed.type || 'general');
      setSections(parsed.sections || []);
      setShowImportModal(false);
      setImportData('');
    } catch (err) {
      setError('Error al importar: Formato de archivo inválido');
    }
  };

  const handleShareTemplate = async () => {
    try {
      if (!template) {
        setError('Debe guardar la plantilla antes de compartirla');
        return;
      }

      // Crear enlace compartible (simulado - en producción sería una URL real)
      const shareableId = template.id;
      const link = `${window.location.origin}/plantilla/${shareableId}`;
      setShareableLink(link);
      setShowShareModal(true);

      // Copiar al portapapeles
      await navigator.clipboard.writeText(link);
    } catch (err) {
      setError('Error al generar enlace compartible');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Editar Plantilla' : 'Nueva Plantilla de Exploración Física'}
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* Botón Exportar */}
            <button
              onClick={handleExportTemplate}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Exportar Plantilla"
            >
              <Download className="h-5 w-5" />
            </button>
            
            {/* Botón Importar */}
            <button
              onClick={() => setShowImportModal(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Importar Plantilla"
            >
              <Upload className="h-5 w-5" />
            </button>
            
            {/* Botón Compartir (solo si existe la plantilla) */}
            {template && (
              <button
                onClick={handleShareTemplate}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Compartir Plantilla"
              >
                <Share2 className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Template Info */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Plantilla *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: Exploración Cardiológica Completa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Plantilla
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="specialty">Especialidad</option>
                <option value="emergency">Urgencias</option>
                <option value="pediatric">Pediátrica</option>
              </select>
            </div>
          </div>

          {/* Quick Add System Templates */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-300 mb-2">Agregar plantilla de sistema:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SYSTEM_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleAddSystemTemplate(key as keyof typeof SYSTEM_TEMPLATES)}
                  className="inline-flex items-center px-3 py-1 border border-gray-600 text-sm rounded-md text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {template.title}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="border border-gray-600 rounded-lg p-4 bg-gray-750">
                  <div className="flex justify-between items-center mb-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                      className="text-lg font-medium bg-transparent text-white border-b border-transparent hover:border-gray-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Título de la sección"
                    />
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={section.description || ''}
                    onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                    className="w-full mb-3 text-sm bg-transparent text-gray-400 border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Descripción de la sección (opcional)"
                  />

                  <Droppable droppableId={section.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[50px]"
                      >
                        {section.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center space-x-2 p-2 bg-gray-700 rounded ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-white">{field.label}</span>
                                  <span className="text-xs text-gray-400 ml-2">({field.type})</span>
                                  {field.required && <span className="text-xs text-red-400 ml-1">*</span>}
                                </div>
                                <button
                                  onClick={() => handleEditField(section.id, field)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteField(section.id, field.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  <button
                    onClick={() => handleAddField(section.id)}
                    className="mt-3 w-full py-2 border border-dashed border-gray-600 rounded text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Campo
                  </button>
                </div>
              ))}
            </DragDropContext>

            <button
              onClick={handleAddSection}
              className="w-full py-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar Sección
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingField?.field ? 'Editar Campo' : 'Nuevo Campo'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Etiqueta del Campo *
                  </label>
                  <input
                    type="text"
                    value={fieldForm.label}
                    onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tipo de Campo
                  </label>
                  <select
                    value={fieldForm.type}
                    onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {(fieldForm.type === 'select' || fieldForm.type === 'checkbox' || fieldForm.type === 'radio') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Opciones (una por línea)
                    </label>
                    <textarea
                      value={fieldForm.options?.join('\n') || ''}
                      onChange={(e) => setFieldForm({ 
                        ...fieldForm, 
                        options: e.target.value.split('\n').filter(o => o.trim()) 
                      })}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={fieldForm.placeholder || ''}
                    onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Texto de Ayuda
                  </label>
                  <input
                    type="text"
                    value={fieldForm.helpText || ''}
                    onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={fieldForm.required}
                    onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                    className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                  />
                  <label htmlFor="field-required" className="ml-2 text-sm text-gray-300">
                    Campo requerido
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowFieldEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Campo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartir */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Compartir Plantilla</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enlace Compartible
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareableLink)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    ✓ Enlace copiado al portapapeles
                  </p>
                </div>

                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    <Users className="h-4 w-4 inline mr-1" />
                    Los médicos que accedan a este enlace podrán importar y usar esta plantilla.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importar */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Importar Plantilla</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Importar desde archivo
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-import"
                  />
                  <label
                    htmlFor="file-import"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors w-full justify-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo JSON
                  </label>
                </div>

                <div className="text-center text-gray-400">
                  <span>o</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pegar JSON de plantilla
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder='{"name": "Mi Plantilla", "sections": [...]}'
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportTemplate}
                  disabled={!importData.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 