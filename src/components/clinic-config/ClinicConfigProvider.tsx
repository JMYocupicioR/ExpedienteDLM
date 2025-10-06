import React, { createContext, useContext, ReactNode } from 'react';
import { useClinicConfiguration } from '@/hooks/useClinicConfiguration';
import type { EffectiveConfiguration } from '@/lib/services/clinic-config-service';

interface ClinicConfigContextType {
  config: EffectiveConfiguration | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ClinicConfigContext = createContext<ClinicConfigContextType | undefined>(undefined);

/**
 * Provider para hacer la configuración efectiva disponible globalmente
 * Útil para aplicar configuraciones en toda la aplicación
 */
export const ClinicConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { effectiveConfig, loading, refreshConfig } = useClinicConfiguration();

  return (
    <ClinicConfigContext.Provider
      value={{
        config: effectiveConfig,
        isLoading: loading,
        refresh: refreshConfig,
      }}
    >
      {children}
    </ClinicConfigContext.Provider>
  );
};

/**
 * Hook para consumir la configuración efectiva desde cualquier componente
 */
export const useConfig = () => {
  const context = useContext(ClinicConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ClinicConfigProvider');
  }
  return context;
};
