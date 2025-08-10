import React from 'react';

export type TemplateElement = {
  id: string;
  type: 'text' | 'logo' | 'background' | 'signature' | 'qr' | 'separator' | 'box' | 'date' | 'time' | 'table' | 'icon';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style?: Record<string, any>;
  zIndex: number;
  isVisible: boolean;
  isLocked?: boolean;
  iconType?: string;
  borderColor?: string;
  backgroundColor?: string;
};

export function renderTemplateElement(element: TemplateElement) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    zIndex: element.zIndex,
    ...(element.style || {})
  };

  switch (element.type) {
    case 'text':
      return (
        <div key={element.id} style={baseStyle}>
          {element.content}
        </div>
      );
    case 'box':
      return (
        <div key={element.id} style={{ ...baseStyle, border: `1px solid ${element.borderColor || '#333'}`, background: element.backgroundColor || 'transparent' }} />
      );
    case 'separator':
      return (
        <div key={element.id} style={{ ...baseStyle, height: 1, background: element.borderColor || '#333' }} />
      );
    default:
      return (
        <div key={element.id} style={baseStyle}>
          {element.content}
        </div>
      );
  }
}

export default function VisualPrescriptionRenderer({
  layout
}: {
  layout: { template_elements?: TemplateElement[]; canvas_settings?: { backgroundColor?: string } } | null;
}) {
  const elements = layout?.template_elements?.filter(e => e.isVisible) || [];
  const bg = layout?.canvas_settings?.backgroundColor || '#ffffff';
  return (
    <div className="relative w-full" style={{ background: bg, minHeight: 400 }}>
      {elements.sort((a, b) => a.zIndex - b.zIndex).map(el => renderTemplateElement(el))}
    </div>
  );
}


