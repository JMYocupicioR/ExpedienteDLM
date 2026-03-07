export type ScaleQuestionType = 
  | 'single_choice' 
  | 'multi_choice' 
  | 'slider' 
  | 'text' 
  | 'number' 
  | 'info'
  | 'select'; // for backwards compatibility

export interface ScaleQuestionOption {
  label: string;
  value: string | number;
  description?: string;
  image_url?: string;
}

export interface ScaleQuestion {
  id: string;
  text: string;
  description?: string;
  type: ScaleQuestionType;
  options?: ScaleQuestionOption[];
  order_index?: number;
  image_url?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
  };
  logic?: {
    dependency_id?: string;
    dependency_value?: any;
    show_if?: 'equals' | 'not_equals' | 'contains';
  };
}

export interface ScaleDefinition {
  id?: string;
  name?: string;
  version?: string;
  items: ScaleQuestion[];
  scoring?: {
    sum?: 'value';
    average?: boolean;
    ranges?: Array<{ 
      min: number; 
      max: number; 
      severity: string;
      color?: string;
      description?: string;
    }>;
  };
}
