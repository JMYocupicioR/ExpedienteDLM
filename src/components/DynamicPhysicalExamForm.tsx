import React from 'react';

type DynamicSection = {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
    required?: boolean;
    options?: string[];
    placeholder?: string;
  }>;
};

export default function DynamicPhysicalExamForm({
  templateName,
  templateSections,
  onSave,
  onAutoSave,
  initialData
}: {
  templateName: string;
  templateSections: DynamicSection[];
  onSave: (data: any) => Promise<void> | void;
  onAutoSave?: (data: any) => Promise<void> | void;
  initialData?: any;
}) {
  // Minimal placeholder: show read-only representation to unblock imports
  return (
    <div className="space-y-4">
      <div className="text-gray-300">Plantilla: {templateName}</div>
      {templateSections.map((section) => (
        <div key={section.id} className="bg-gray-800/50 border border-gray-700 rounded p-4">
          <div className="text-white font-medium mb-2">{section.title}</div>
          <div className="text-gray-400 text-sm">{section.questions.length} campos</div>
        </div>
      ))}
      <div className="text-right">
        <button onClick={() => onSave(initialData || {})} className="px-4 py-2 rounded bg-cyan-600 text-white">Guardar</button>
      </div>
    </div>
  );
}


