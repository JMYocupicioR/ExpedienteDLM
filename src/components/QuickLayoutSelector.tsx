import React, { useState } from 'react';
import { 
  Layout, FileText, Smartphone, Monitor, Printer, 
  Eye, Settings, Star, Zap, Clock, Check 
} from 'lucide-react';
import { HorizontalTemplate, HORIZONTAL_PRESCRIPTION_TEMPLATES } from './HorizontalPrescriptionTemplates';

interface QuickLayoutOption {
  id: string;
  name: string;
  description: string;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  preview: React.ReactNode;
  isPopular: boolean;
  category: 'quick' | 'horizontal' | 'vertical' | 'custom';
  estimatedTime: string; // "30 seg", "1 min"
}

const QUICK_LAYOUT_OPTIONS: QuickLayoutOption[] = [
  {
    id: 'quick_horizontal_classic',
    name: 'Horizontal Clásica',
    description: 'La más usada en consultorios - formato apaisado',
    orientation: 'landscape',
    pageSize: 'A4',
    isPopular: true,
    category: 'quick',
    estimatedTime: '30 seg',
    preview: (
      <div className="w-full h-16 bg-gradient-to-r from-blue-100 to-blue-50 rounded border flex items-center justify-center">
        <div className="flex gap-1">
          <div className="w-6 h-8 bg-blue-300 rounded"></div>
          <div className="w-8 h-8 bg-blue-400 rounded"></div>
        </div>
      </div>
    )
  },
  {
    id: 'quick_horizontal_compact',
    name: 'Horizontal Compacta',
    description: 'Máximo aprovechamiento del espacio',
    orientation: 'landscape',
    pageSize: 'Letter',
    isPopular: true,
    category: 'quick',
    estimatedTime: '20 seg',
    preview: (
      <div className="w-full h-16 bg-gradient-to-r from-green-100 to-green-50 rounded border flex items-center justify-center">
        <div className="flex gap-1">
          <div className="w-4 h-6 bg-green-300 rounded"></div>
          <div className="w-10 h-6 bg-green-400 rounded"></div>
        </div>
      </div>
    )
  },
  {
    id: 'quick_vertical_traditional',
    name: 'Vertical Tradicional',
    description: 'Formato clásico vertical - familiar para pacientes',
    orientation: 'portrait',
    pageSize: 'A4',
    isPopular: false,
    category: 'vertical',
    estimatedTime: '45 seg',
    preview: (
      <div className="w-full h-16 bg-gradient-to-b from-gray-100 to-gray-50 rounded border flex items-center justify-center">
        <div className="space-y-1">
          <div className="w-8 h-2 bg-gray-300 rounded"></div>
          <div className="w-8 h-3 bg-gray-400 rounded"></div>
          <div className="w-6 h-2 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  },
  {
    id: 'custom_editor',
    name: 'Editor Personalizado',
    description: 'Crear diseño desde cero con editor visual completo',
    orientation: 'portrait',
    pageSize: 'A4',
    isPopular: false,
    category: 'custom',
    estimatedTime: '5-10 min',
    preview: (
      <div className="w-full h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded border flex items-center justify-center">
        <Settings className="h-8 w-8 text-purple-400" />
      </div>
    )
  }
];

interface QuickLayoutSelectorProps {
  onLayoutSelect: (option: QuickLayoutOption, template?: HorizontalTemplate) => void;
  onOpenAdvancedEditor?: () => void;
  selectedLayoutId?: string;
  className?: string;
}

export default function QuickLayoutSelector({
  onLayoutSelect,
  onOpenAdvancedEditor,
  selectedLayoutId,
  className = ''
}: QuickLayoutSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'quick' | 'horizontal' | 'vertical' | 'custom'>('all');

  const filteredOptions = QUICK_LAYOUT_OPTIONS.filter(option => 
    selectedCategory === 'all' || option.category === selectedCategory
  );

  const handleOptionSelect = (option: QuickLayoutOption) => {
    // If it's a horizontal template, find the corresponding template data
    if (option.category === 'quick' && option.orientation === 'landscape') {
      const templateId = option.id.replace('quick_', '');
      const template = HORIZONTAL_PRESCRIPTION_TEMPLATES.find(t => t.id === templateId);
      onLayoutSelect(option, template);
    } else if (option.category === 'custom') {
      onOpenAdvancedEditor?.();
    } else {
      onLayoutSelect(option);
    }
  };

  return (
    <div className={`quick-layout-selector ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          Selección Rápida de Formato
        </h2>
        <p className="text-gray-600 text-sm">
          Elige un formato preconfigurado para crear recetas de forma rápida y profesional
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'Todos', icon: Layout },
          { key: 'quick', label: 'Rápidos', icon: Zap },
          { key: 'horizontal', label: 'Horizontales', icon: Monitor },
          { key: 'vertical', label: 'Verticales', icon: Smartphone },
          { key: 'custom', label: 'Personalizado', icon: Settings }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as any)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Quick Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOptions.map(option => (
          <QuickOptionCard
            key={option.id}
            option={option}
            isSelected={selectedLayoutId === option.id}
            onSelect={() => handleOptionSelect(option)}
          />
        ))}
      </div>

      {/* Popular Templates Section */}
      {selectedCategory === 'all' && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Plantillas Más Usadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_LAYOUT_OPTIONS.filter(opt => opt.isPopular).map(option => (
              <QuickOptionCard
                key={`popular_${option.id}`}
                option={option}
                isSelected={selectedLayoutId === option.id}
                onSelect={() => handleOptionSelect(option)}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}

      {filteredOptions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Layout className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">No hay opciones disponibles</p>
          <p className="text-sm">Prueba seleccionando otra categoría</p>
        </div>
      )}
    </div>
  );
}

interface QuickOptionCardProps {
  option: QuickLayoutOption;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

function QuickOptionCard({ option, isSelected, onSelect, compact = false }: QuickOptionCardProps) {
  return (
    <div
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg group ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
      } ${compact ? 'p-3' : ''}`}
      onClick={onSelect}
    >
      {/* Popular Badge */}
      {option.isPopular && !compact && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
          <Star className="h-3 w-3 mr-1" />
          Popular
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -left-2 bg-blue-600 text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}

      {/* Preview */}
      <div className={`mb-4 ${compact ? 'mb-2' : ''}`}>
        {option.preview}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-gray-800 ${compact ? 'text-sm' : ''}`}>
            {option.name}
          </h4>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {option.estimatedTime}
          </div>
        </div>
        
        {!compact && (
          <p className="text-sm text-gray-600">{option.description}</p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            {option.orientation === 'landscape' ? <Monitor className="h-3 w-3 mr-1" /> : <Smartphone className="h-3 w-3 mr-1" />}
            {option.pageSize} • {option.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}
          </span>
          <span className="capitalize font-medium">{option.category}</span>
        </div>
      </div>

      {/* Hover Effect */}
      <div className={`absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-5 rounded-xl transition-all ${
        isSelected ? 'bg-opacity-10' : ''
      }`} />
    </div>
  );
}
