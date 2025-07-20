// Utilidades para mejorar la accesibilidad de las tablas médicas

export interface AccessibilityConfig {
  announceUpdates: boolean;
  keyboardNavigation: boolean;
  screenReaderOptimized: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export class TableAccessibilityManager {
  private config: AccessibilityConfig;
  private announcementElement: HTMLElement | null = null;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      announceUpdates: true,
      keyboardNavigation: true,
      screenReaderOptimized: true,
      highContrast: false,
      reducedMotion: false,
      ...config
    };

    this.initializeAccessibility();
  }

  private initializeAccessibility() {
    // Crear elemento para anuncios de lectores de pantalla
    if (this.config.announceUpdates && !this.announcementElement) {
      this.announcementElement = document.createElement('div');
      this.announcementElement.setAttribute('aria-live', 'polite');
      this.announcementElement.setAttribute('aria-atomic', 'true');
      this.announcementElement.className = 'sr-only';
      this.announcementElement.id = 'table-announcements';
      document.body.appendChild(this.announcementElement);
    }

    // Detectar preferencias del usuario
    this.detectUserPreferences();
  }

  private detectUserPreferences() {
    // Detectar preferencia de alto contraste
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.config.highContrast = true;
    }

    // Detectar preferencia de movimiento reducido
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.reducedMotion = true;
    }

    // Aplicar estilos según preferencias
    this.applyAccessibilityStyles();
  }

  private applyAccessibilityStyles() {
    const root = document.documentElement;

    if (this.config.highContrast) {
      root.style.setProperty('--table-bg-primary', '#000000');
      root.style.setProperty('--table-text-primary', '#ffffff');
      root.style.setProperty('--table-border-color', '#ffffff');
    }

    if (this.config.reducedMotion) {
      root.style.setProperty('--table-transition-duration', '0.01ms');
      root.style.setProperty('--table-animation-duration', '0.01ms');
    }
  }

  // Anunciar cambios a lectores de pantalla
  announceChange(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.config.announceUpdates || !this.announcementElement) return;

    this.announcementElement.setAttribute('aria-live', priority);
    this.announcementElement.textContent = message;

    // Limpiar después de un tiempo para evitar spam
    setTimeout(() => {
      if (this.announcementElement) {
        this.announcementElement.textContent = '';
      }
    }, 3000);
  }

  // Generar ID único accesible
  generateAccessibleId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Configurar navegación por teclado en tabla
  setupTableKeyboardNavigation(tableElement: HTMLTableElement) {
    if (!this.config.keyboardNavigation) return;

    const cells = tableElement.querySelectorAll('td, th');
    let currentIndex = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, shiftKey } = event;
      const rows = tableElement.querySelectorAll('tr');
      const currentCell = cells[currentIndex] as HTMLElement;
      const currentRow = currentCell?.closest('tr');
      const currentRowIndex = currentRow ? Array.from(rows).indexOf(currentRow) : 0;
      const cellsInRow = currentRow?.querySelectorAll('td, th') || [];
      const currentCellIndex = currentCell ? Array.from(cellsInRow).indexOf(currentCell) : 0;

      switch (key) {
        case 'ArrowRight':
          event.preventDefault();
          if (currentCellIndex < cellsInRow.length - 1) {
            const nextCell = cellsInRow[currentCellIndex + 1] as HTMLElement;
            nextCell.focus();
            currentIndex = Array.from(cells).indexOf(nextCell);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (currentCellIndex > 0) {
            const prevCell = cellsInRow[currentCellIndex - 1] as HTMLElement;
            prevCell.focus();
            currentIndex = Array.from(cells).indexOf(prevCell);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (currentRowIndex < rows.length - 1) {
            const nextRow = rows[currentRowIndex + 1];
            const nextRowCells = nextRow.querySelectorAll('td, th');
            const targetCell = nextRowCells[Math.min(currentCellIndex, nextRowCells.length - 1)] as HTMLElement;
            targetCell.focus();
            currentIndex = Array.from(cells).indexOf(targetCell);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (currentRowIndex > 0) {
            const prevRow = rows[currentRowIndex - 1];
            const prevRowCells = prevRow.querySelectorAll('td, th');
            const targetCell = prevRowCells[Math.min(currentCellIndex, prevRowCells.length - 1)] as HTMLElement;
            targetCell.focus();
            currentIndex = Array.from(cells).indexOf(targetCell);
          }
          break;

        case 'Home':
          event.preventDefault();
          if (ctrlKey) {
            // Ir a la primera celda de la tabla
            const firstCell = cells[0] as HTMLElement;
            firstCell.focus();
            currentIndex = 0;
          } else {
            // Ir a la primera celda de la fila actual
            const firstCellInRow = cellsInRow[0] as HTMLElement;
            firstCellInRow.focus();
            currentIndex = Array.from(cells).indexOf(firstCellInRow);
          }
          break;

        case 'End':
          event.preventDefault();
          if (ctrlKey) {
            // Ir a la última celda de la tabla
            const lastCell = cells[cells.length - 1] as HTMLElement;
            lastCell.focus();
            currentIndex = cells.length - 1;
          } else {
            // Ir a la última celda de la fila actual
            const lastCellInRow = cellsInRow[cellsInRow.length - 1] as HTMLElement;
            lastCellInRow.focus();
            currentIndex = Array.from(cells).indexOf(lastCellInRow);
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          // Trigger click on current cell
          currentCell.click();
          break;
      }

      // Anunciar posición actual
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        const rowNum = currentRowIndex + 1;
        const colNum = currentCellIndex + 1;
        const totalRows = rows.length;
        const totalCols = cellsInRow.length;
        this.announceChange(`Fila ${rowNum} de ${totalRows}, columna ${colNum} de ${totalCols}`);
      }
    };

    tableElement.addEventListener('keydown', handleKeyDown);
    
    // Hacer celdas enfocables
    cells.forEach((cell, index) => {
      const cellElement = cell as HTMLElement;
      cellElement.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      cellElement.addEventListener('focus', () => {
        currentIndex = index;
        
        // Remover tabindex de otras celdas
        cells.forEach(otherCell => {
          (otherCell as HTMLElement).setAttribute('tabindex', '-1');
        });
        
        // Hacer la celda actual enfocable
        cellElement.setAttribute('tabindex', '0');
      });
    });

    return () => {
      tableElement.removeEventListener('keydown', handleKeyDown);
    };
  }

  // Validar estructura de tabla accesible
  validateTableAccessibility(tableElement: HTMLTableElement): string[] {
    const issues: string[] = [];

    // Verificar caption
    const caption = tableElement.querySelector('caption');
    if (!caption || !caption.textContent?.trim()) {
      issues.push('La tabla debe tener un caption descriptivo');
    }

    // Verificar thead/tbody
    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');
    if (!thead) {
      issues.push('La tabla debe tener un elemento thead');
    }
    if (!tbody) {
      issues.push('La tabla debe tener un elemento tbody');
    }

    // Verificar headers con scope
    const headers = tableElement.querySelectorAll('th');
    headers.forEach((th, index) => {
      if (!th.getAttribute('scope')) {
        issues.push(`El header en posición ${index + 1} debe tener atributo scope`);
      }
    });

    // Verificar aria-labels en headers ordenables
    const sortableHeaders = tableElement.querySelectorAll('th[aria-sort]');
    sortableHeaders.forEach((th, index) => {
      if (!th.getAttribute('aria-label') && !th.getAttribute('aria-labelledby')) {
        issues.push(`Header ordenable en posición ${index + 1} debe tener aria-label`);
      }
    });

    // Verificar role y aria-label en la tabla
    if (!tableElement.getAttribute('role')) {
      issues.push('La tabla debe tener un atributo role apropiado');
    }
    if (!tableElement.getAttribute('aria-label') && !tableElement.getAttribute('aria-labelledby')) {
      issues.push('La tabla debe tener aria-label o aria-labelledby');
    }

    return issues;
  }

  // Generar estadísticas de accesibilidad
  generateAccessibilityReport(tableElement: HTMLTableElement) {
    const issues = this.validateTableAccessibility(tableElement);
    const headers = tableElement.querySelectorAll('th').length;
    const rows = tableElement.querySelectorAll('tbody tr').length;
    const hasCaption = !!tableElement.querySelector('caption');
    const hasKeyboardSupport = tableElement.hasAttribute('tabindex');
    const hasAriaLabels = !!tableElement.getAttribute('aria-label');

    return {
      totalIssues: issues.length,
      issues,
      structure: {
        headers,
        dataRows: rows,
        hasCaption,
        hasKeyboardSupport,
        hasAriaLabels
      },
      accessibility: {
        level: issues.length === 0 ? 'AAA' : issues.length <= 2 ? 'AA' : 'A',
        score: Math.max(0, 100 - (issues.length * 10))
      }
    };
  }

  // Cleanup
  destroy() {
    if (this.announcementElement) {
      document.body.removeChild(this.announcementElement);
      this.announcementElement = null;
    }
  }
}

// Utilidades específicas para contexto médico
export const getMedicalTableAriaLabel = (
  tableType: 'patients' | 'consultations' | 'prescriptions' | 'vitals' | 'tests',
  recordCount: number
): string => {
  const labels = {
    patients: `Lista de ${recordCount} pacientes registrados en el expediente médico`,
    consultations: `Historial de ${recordCount} consultas médicas`,
    prescriptions: `Lista de ${recordCount} prescripciones activas y anteriores`,
    vitals: `Registro de ${recordCount} mediciones de signos vitales`,
    tests: `Resultados de ${recordCount} exámenes y estudios médicos`
  };

  return labels[tableType] || `Tabla médica con ${recordCount} registros`;
};

export const generateMedicalCellAriaLabel = (
  value: any,
  columnType: string,
  medicalContext?: string,
  patientName?: string
): string => {
  const baseValue = value?.toString() || 'No especificado';
  
  const contextLabels = {
    'vital-signs': `Signo vital: ${baseValue}`,
    'medication': `Medicamento: ${baseValue}`,
    'diagnosis': `Diagnóstico: ${baseValue}`,
    'test-result': `Resultado: ${baseValue}`,
    'patient-data': `Información del paciente${patientName ? ` ${patientName}` : ''}: ${baseValue}`
  };

  const typeLabels = {
    'date': `Fecha: ${baseValue}`,
    'phone': `Teléfono: ${baseValue}`,
    'email': `Correo electrónico: ${baseValue}`,
    'medical-id': `Identificador médico: ${baseValue}`,
    'number': `Valor numérico: ${baseValue}`
  };

  if (medicalContext && contextLabels[medicalContext as keyof typeof contextLabels]) {
    return contextLabels[medicalContext as keyof typeof contextLabels];
  }

  if (typeLabels[columnType as keyof typeof typeLabels]) {
    return typeLabels[columnType as keyof typeof typeLabels];
  }

  return baseValue;
};

// Hook personalizado para manejo de accesibilidad de tablas
export const useTableAccessibility = (config?: Partial<AccessibilityConfig>) => {
  const managerRef = React.useRef<TableAccessibilityManager | null>(null);

  React.useEffect(() => {
    managerRef.current = new TableAccessibilityManager(config);

    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  const announceChange = (message: string, priority?: 'polite' | 'assertive') => {
    managerRef.current?.announceChange(message, priority);
  };

  const setupKeyboardNavigation = (tableElement: HTMLTableElement) => {
    return managerRef.current?.setupTableKeyboardNavigation(tableElement);
  };

  const validateTable = (tableElement: HTMLTableElement) => {
    return managerRef.current?.validateTableAccessibility(tableElement) || [];
  };

  const generateReport = (tableElement: HTMLTableElement) => {
    return managerRef.current?.generateAccessibilityReport(tableElement);
  };

  return {
    announceChange,
    setupKeyboardNavigation,
    validateTable,
    generateReport,
    manager: managerRef.current
  };
};

export default TableAccessibilityManager;