import React from 'react';
import { FileText, Pill, Stethoscope, Layout, Eye, Copy, Star } from 'lucide-react';
import TemplatePreviewModal, { useTemplatePreview } from './TemplatePreviewModal';
import { supabase } from '@/lib/supabase';

export interface HorizontalTemplate {
  id: string;
  name: string;
  description: string;
  orientation: 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  category: 'classic' | 'modern' | 'compact' | 'minimal';
  preview: string; // Base64 or URL
  templateElements: any[];
  canvasSettings: {
    backgroundColor: string;
    canvasSize: { width: number; height: number };
    pageSize: string;
    margin: string;
  };
  printSettings: {
    pageMargins: Record<string, string>;
    printQuality: string;
    colorMode: string;
    scaleFactor: number;
  };
  isPopular: boolean;
  usageCount: number;
}

export const HORIZONTAL_PRESCRIPTION_TEMPLATES: HorizontalTemplate[] = [
  {
    id: 'horizontal_classic',
    name: 'Clásica Horizontal',
    description: 'Diseño tradicional de dos columnas - ideal para consultorios',
    orientation: 'landscape',
    pageSize: 'A4',
    category: 'classic',
    preview: '/api/template-previews/horizontal_classic.png',
    isPopular: true,
    usageCount: 0,
    templateElements: [
      {
        id: 'header',
        type: 'text',
        position: { x: 50, y: 30 },
        size: { width: 1000, height: 80 },
        content: '{{clinicName}}\n{{doctorName}} - Cédula: {{doctorLicense}}',
        style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'patient_info_box',
        type: 'box',
        position: { x: 50, y: 130 },
        size: { width: 500, height: 200 },
        content: '',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false,
        borderColor: '#333',
        backgroundColor: '#f9f9f9'
      },
      {
        id: 'patient_data',
        type: 'text',
        position: { x: 70, y: 150 },
        size: { width: 460, height: 160 },
        content: 'Paciente: {{patientName}}\nEdad: {{patientAge}}\nFecha: {{date}}\nDiagnóstico: {{diagnosis}}',
        style: { fontSize: 12, lineHeight: 1.5 },
        zIndex: 2,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'medications_box',
        type: 'box',
        position: { x: 570, y: 130 },
        size: { width: 500, height: 400 },
        content: '',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false,
        borderColor: '#333',
        backgroundColor: '#ffffff'
      },
      {
        id: 'medications_title',
        type: 'text',
        position: { x: 590, y: 150 },
        size: { width: 460, height: 30 },
        content: 'MEDICAMENTOS PRESCRITOS',
        style: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
        zIndex: 2,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'medications_list',
        type: 'text',
        position: { x: 590, y: 190 },
        size: { width: 460, height: 320 },
        content: '{{medications}}',
        style: { fontSize: 11, lineHeight: 1.4 },
        zIndex: 2,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'signature_area',
        type: 'signature',
        position: { x: 590, y: 550 },
        size: { width: 200, height: 60 },
        content: '{{doctorName}}',
        style: { fontSize: 10, textAlign: 'center' },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'qr_code',
        type: 'qr',
        position: { x: 50, y: 550 },
        size: { width: 80, height: 80 },
        content: '{{prescriptionId}}',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false
      }
    ],
    canvasSettings: {
      backgroundColor: '#ffffff',
      canvasSize: { width: 1123, height: 794 },
      pageSize: 'A4',
      margin: '15mm'
    },
    printSettings: {
      pageMargins: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printQuality: 'high',
      colorMode: 'color',
      scaleFactor: 1.0
    }
  },
  {
    id: 'horizontal_compact',
    name: 'Compacta Horizontal',
    description: 'Formato compacto para máxima eficiencia de espacio',
    orientation: 'landscape',
    pageSize: 'Letter',
    category: 'compact',
    preview: '/api/template-previews/horizontal_compact.png',
    isPopular: true,
    usageCount: 0,
    templateElements: [
      {
        id: 'compact_header',
        type: 'text',
        position: { x: 30, y: 20 },
        size: { width: 1000, height: 50 },
        content: '{{clinicName}} | {{doctorName}} | Tel: {{clinicPhone}}',
        style: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'patient_compact',
        type: 'text',
        position: { x: 30, y: 80 },
        size: { width: 350, height: 80 },
        content: 'Paciente: {{patientName}}\nEdad: {{patientAge}} | Fecha: {{date}}',
        style: { fontSize: 10 },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'medications_compact',
        type: 'text',
        position: { x: 30, y: 180 },
        size: { width: 720, height: 300 },
        content: 'MEDICAMENTOS:\n{{medications}}',
        style: { fontSize: 11, lineHeight: 1.3 },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'signature_compact',
        type: 'signature',
        position: { x: 30, y: 500 },
        size: { width: 200, height: 40 },
        content: '{{doctorName}}',
        style: { fontSize: 9 },
        zIndex: 1,
        isVisible: true,
        isLocked: false
      },
      {
        id: 'qr_compact',
        type: 'qr',
        position: { x: 670, y: 490 },
        size: { width: 60, height: 60 },
        content: '{{prescriptionId}}',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false
      }
    ],
    canvasSettings: {
      backgroundColor: '#ffffff',
      canvasSize: { width: 1056, height: 816 },
      pageSize: 'Letter',
      margin: '10mm'
    },
    printSettings: {
      pageMargins: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printQuality: 'high',
      colorMode: 'color',
      scaleFactor: 1.0
    }
  },
  {
    id: 'horizontal_modern',
    name: 'Moderna Horizontal',
    description: 'Diseño moderno con elementos visuales y colores',
    orientation: 'landscape',
    pageSize: 'A4',
    category: 'modern',
    preview: '/api/template-previews/horizontal_modern.png',
    isPopular: false,
    usageCount: 0,
    templateElements: [
      {
        id: 'modern_header',
        type: 'box',
        position: { x: 0, y: 0 },
        size: { width: 1123, height: 100 },
        content: '',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false,
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff'
      },
      {
        id: 'clinic_logo',
        type: 'icon',
        position: { x: 30, y: 20 },
        size: { width: 60, height: 60 },
        content: '',
        style: { color: '#2563eb' },
        zIndex: 2,
        isVisible: true,
        isLocked: false,
        iconType: 'stethoscope'
      },
      {
        id: 'medications_section',
        type: 'box',
        position: { x: 400, y: 120 },
        size: { width: 690, height: 400 },
        content: '',
        style: {},
        zIndex: 1,
        isVisible: true,
        isLocked: false,
        borderColor: '#dc2626',
        backgroundColor: '#fef2f2'
      },
      {
        id: 'medications_content',
        type: 'text',
        position: { x: 420, y: 180 },
        size: { width: 650, height: 320 },
        content: '{{medications}}',
        style: { fontSize: 11, lineHeight: 1.5, color: '#7f1d1d' },
        zIndex: 2,
        isVisible: true,
        isLocked: false
      }
    ],
    canvasSettings: {
      backgroundColor: '#ffffff',
      canvasSize: { width: 1123, height: 794 },
      pageSize: 'A4',
      margin: '15mm'
    },
    printSettings: {
      pageMargins: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printQuality: 'high',
      colorMode: 'color',
      scaleFactor: 1.0
    }
  }
];

interface HorizontalPrescriptionTemplatesProps {
  onTemplateSelect: (template: HorizontalTemplate) => void;
  selectedTemplateId?: string;
  showPreview?: boolean;
  className?: string;
}

export default function HorizontalPrescriptionTemplates({
  onTemplateSelect,
  selectedTemplateId,
  showPreview = true,
  className = ''
}: HorizontalPrescriptionTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'classic' | 'modern' | 'compact' | 'minimal'>('all');
  const { selectedTemplate, isPreviewOpen, openPreview, closePreview } = useTemplatePreview();

  const filteredTemplates = HORIZONTAL_PRESCRIPTION_TEMPLATES.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  return (
    <div className={`horizontal-templates ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Layout className="h-5 w-5 mr-2" />
          Plantillas Horizontales
        </h3>
        
        {/* Category Filter */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'all', label: 'Todas', icon: Layout },
            { key: 'classic', label: 'Clásicas', icon: FileText },
            { key: 'modern', label: 'Modernas', icon: Stethoscope },
            { key: 'compact', label: 'Compactas', icon: Pill }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as any)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4 mr-1" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={() => onTemplateSelect(template)}
            onPreview={() => openPreview(template)}
            showPreview={showPreview}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Layout className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay plantillas disponibles para esta categoría</p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          isOpen={isPreviewOpen}
          onClose={closePreview}
          onSelect={() => {
            onTemplateSelect(selectedTemplate);
            closePreview();
          }}
          onCustomize={() => {
            // TODO: Open editor with template as base
            closePreview();
          }}
          onDuplicate={() => {
            // TODO: Duplicate template
            closePreview();
          }}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: HorizontalTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  showPreview: boolean;
}

function TemplateCard({ template, isSelected, onSelect, onPreview, showPreview }: TemplateCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'classic': return FileText;
      case 'modern': return Stethoscope;
      case 'compact': return Pill;
      default: return Layout;
    }
  };

  const CategoryIcon = getCategoryIcon(template.category);

  return (
    <div
      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Popular Badge */}
      {template.isPopular && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center">
          <Star className="h-3 w-3 mr-1" />
          Popular
        </div>
      )}

      {/* Preview Area */}
      {showPreview && (
        <div className="mb-4">
          <div 
            className="w-full h-32 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden"
            style={{
              background: template.canvasSettings.backgroundColor,
              aspectRatio: `${template.canvasSettings.canvasSize.width} / ${template.canvasSettings.canvasSize.height}`
            }}
          >
            {/* Simulated layout preview */}
            <div className="absolute inset-0 p-2">
              <div className="w-full h-6 bg-gray-300 rounded mb-2"></div>
              <div className="flex gap-2 h-20">
                <div className="flex-1 bg-blue-100 rounded p-1">
                  <div className="w-full h-2 bg-blue-300 rounded mb-1"></div>
                  <div className="w-3/4 h-2 bg-blue-200 rounded mb-1"></div>
                  <div className="w-1/2 h-2 bg-blue-200 rounded"></div>
                </div>
                <div className="flex-1 bg-red-100 rounded p-1">
                  <div className="w-full h-2 bg-red-300 rounded mb-1"></div>
                  <div className="w-full h-2 bg-red-200 rounded mb-1"></div>
                  <div className="w-2/3 h-2 bg-red-200 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Orientation indicator */}
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
              📄 Horizontal
            </div>
          </div>
        </div>
      )}

      {/* Template Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <CategoryIcon className="h-4 w-4 mr-2 text-gray-600" />
            {template.name}
          </h4>
          {template.usageCount > 0 && (
            <span className="text-xs text-gray-500">
              {template.usageCount} usos
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-600">{template.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            <Layout className="h-3 w-3 mr-1" />
            {template.pageSize} • {template.canvasSettings.canvasSize.width}×{template.canvasSettings.canvasSize.height}
          </span>
          <span className="capitalize">{template.category}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isSelected ? 'Seleccionada' : 'Seleccionar'}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          title="Vista previa"
        >
          <Eye className="h-4 w-4" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement duplicate template
          }}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          title="Duplicar plantilla"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Hook para gestionar plantillas horizontales
export function useHorizontalTemplates() {
  const [templates, setTemplates] = React.useState<HorizontalTemplate[]>(HORIZONTAL_PRESCRIPTION_TEMPLATES);
  const [loading, setLoading] = React.useState(false);

  const loadUserTemplates = React.useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescription_layouts_unified')
        .select('*')
        .eq('orientation', 'landscape')
        .or(`doctor_id.eq.${userId},is_public.eq.true,is_predefined.eq.true`)
        .order('is_predefined', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;

      // Convert database layouts to HorizontalTemplate format
      const dbTemplates: HorizontalTemplate[] = (data || []).map(layout => ({
        id: layout.id,
        name: layout.name,
        description: layout.description || '',
        orientation: 'landscape' as const,
        pageSize: layout.page_size as 'A4' | 'Letter' | 'Legal',
        category: layout.category as 'classic' | 'modern' | 'compact' | 'minimal',
        preview: `/api/template-previews/${layout.id}.png`,
        templateElements: layout.template_elements as any[],
        canvasSettings: layout.canvas_settings as any,
        printSettings: layout.print_settings as any,
        isPopular: layout.usage_count > 5,
        usageCount: layout.usage_count
      }));

      // Merge with static templates (fallback)
      const allTemplates = [
        ...dbTemplates,
        ...HORIZONTAL_PRESCRIPTION_TEMPLATES.filter(
          staticTemplate => !dbTemplates.some(dbTemplate => dbTemplate.id === staticTemplate.id)
        )
      ];
      
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error loading horizontal templates:', error);
      // Fallback to static templates
      setTemplates(HORIZONTAL_PRESCRIPTION_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCustomTemplate = React.useCallback(async (
    templateData: Omit<HorizontalTemplate, 'id' | 'usageCount'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('prescription_layouts_unified')
        .insert([{
          doctor_id: user.id,
          name: templateData.name,
          description: templateData.description,
          orientation: 'landscape',
          page_size: templateData.pageSize,
          template_elements: templateData.templateElements,
          canvas_settings: templateData.canvasSettings,
          print_settings: templateData.printSettings,
          category: templateData.category,
          is_public: false,
          is_predefined: false
        }])
        .select('*')
        .single();

      if (error) throw error;

      const newTemplate: HorizontalTemplate = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        orientation: 'landscape',
        pageSize: data.page_size as 'A4' | 'Letter' | 'Legal',
        category: data.category as 'classic' | 'modern' | 'compact' | 'minimal',
        preview: `/api/template-previews/${data.id}.png`,
        templateElements: data.template_elements as any[],
        canvasSettings: data.canvas_settings as any,
        printSettings: data.print_settings as any,
        isPopular: false,
        usageCount: 0
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (error) {
      console.error('Error creating custom template:', error);
      throw error;
    }
  }, []);

  return {
    templates,
    loading,
    loadUserTemplates,
    createCustomTemplate
  };
}
