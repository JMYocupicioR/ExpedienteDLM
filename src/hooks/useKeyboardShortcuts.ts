import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  onNewConsultation?: () => void;
  onNewPatient?: () => void;
  onSearchPatient?: () => void;
  onSave?: () => void;
  onCloseModal?: () => void;
  onNewPrescription?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    onNewConsultation,
    onNewPatient,
    onSearchPatient,
    onSave,
    onCloseModal,
    onNewPrescription,
    onShowHelp,
    enabled = true
  } = options;

  const navigate = useNavigate();

  const shortcuts = useCallback((): KeyboardShortcut[] => {
    const shortcutList: KeyboardShortcut[] = [];

    if (onNewConsultation) {
      shortcutList.push({
        key: 'n',
        ctrlKey: true,
        description: 'Nueva consulta',
        action: onNewConsultation
      });
    }

    if (onNewPatient) {
      shortcutList.push({
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
        description: 'Nuevo paciente',
        action: onNewPatient
      });
    }

    if (onSearchPatient) {
      shortcutList.push({
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        description: 'Buscar paciente',
        action: onSearchPatient
      });
    }

    if (onNewPrescription) {
      shortcutList.push({
        key: 'r',
        ctrlKey: true,
        description: 'Nueva receta',
        action: onNewPrescription
      });
    }

    if (onSave) {
      shortcutList.push({
        key: 's',
        ctrlKey: true,
        description: 'Guardar y continuar',
        action: onSave
      });
    }

    if (onCloseModal) {
      shortcutList.push({
        key: 'Escape',
        description: 'Cerrar modal',
        action: onCloseModal
      });
    }

    // Always available shortcuts
    shortcutList.push({
      key: 'h',
      ctrlKey: true,
      description: 'Ir al inicio',
      action: () => navigate('/dashboard')
    });

    if (onShowHelp) {
      shortcutList.push({
        key: '/',
        ctrlKey: true,
        description: 'Mostrar ayuda de atajos',
        action: onShowHelp
      });
    }

    return shortcutList;
  }, [onNewConsultation, onNewPatient, onSearchPatient, onSave, onCloseModal, onNewPrescription, onShowHelp, navigate]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeShortcuts = shortcuts();

      for (const shortcut of activeShortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Prevent default browser behavior (like Ctrl+S saving page)
          event.preventDefault();
          event.stopPropagation();

          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, shortcuts]);

  return { shortcuts: shortcuts() };
}

// Helper function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}
