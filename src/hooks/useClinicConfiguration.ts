import { useState, useEffect, useCallback } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import {
  ClinicConfigService,
  ClinicConfiguration,
  UserClinicPreferences,
  EffectiveConfiguration,
} from '@/lib/services/clinic-config-service';

export interface UseClinicConfigurationReturn {
  // Configuración de clínica (Admin)
  clinicConfig: ClinicConfiguration | null;
  updateClinicConfig: (updates: Partial<ClinicConfiguration>) => Promise<void>;
  isAdmin: boolean;

  // Preferencias de usuario (Médico)
  userPreferences: UserClinicPreferences | null;
  updateUserPreferences: (updates: Partial<UserClinicPreferences>) => Promise<void>;

  // Configuración efectiva (la que se aplica)
  effectiveConfig: EffectiveConfiguration | null;
  refreshConfig: () => Promise<void>;

  // Estado
  loading: boolean;
  error: string | null;
}

/**
 * Hook para gestionar configuración de clínica y preferencias de usuario
 * 
 * USO:
 * - Administradores: Pueden ver y editar configuración de clínica
 * - Médicos: Pueden ver configuración y editar sus preferencias personales
 * - Todos: Obtienen configuración efectiva para aplicar al sistema
 */
export function useClinicConfiguration(): UseClinicConfigurationReturn {
  const { user } = useAuth();
  const { activeClinic } = useClinic();

  const [clinicConfig, setClinicConfig] = useState<ClinicConfiguration | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserClinicPreferences | null>(null);
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveConfiguration | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar configuración completa
   */
  const loadConfiguration = useCallback(async () => {
    if (!user || !activeClinic) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando configuración para clínica:', activeClinic.id);

      // Verificar si es admin
      const adminStatus = await ClinicConfigService.isClinicAdmin(user.id, activeClinic.id);
      setIsAdmin(adminStatus);

      // Cargar configuración de clínica
      const clinicCfg = await ClinicConfigService.getClinicConfiguration(activeClinic.id);
      setClinicConfig(clinicCfg);

      // Cargar preferencias de usuario
      const userPrefs = await ClinicConfigService.getUserClinicPreferences(user.id, activeClinic.id);
      setUserPreferences(userPrefs);

      // Cargar configuración efectiva (combinada)
      const effective = await ClinicConfigService.getEffectiveConfiguration(activeClinic.id);
      setEffectiveConfig(effective);

      console.log('✅ Configuración cargada:', {
        isAdmin: adminStatus,
        hasClinicConfig: !!clinicCfg,
        hasUserPreferences: !!userPrefs,
        isCustomized: effective.isUserCustomized,
      });
    } catch (err: any) {
      console.error('❌ Error cargando configuración:', err);
      setError(err.message || 'Error cargando configuración');
    } finally {
      setLoading(false);
    }
  }, [user, activeClinic]);

  /**
   * Actualizar configuración de clínica (solo admins)
   */
  const updateClinicConfig = useCallback(async (updates: Partial<ClinicConfiguration>) => {
    if (!activeClinic) throw new Error('No hay clínica activa');
    if (!isAdmin) throw new Error('No eres administrador de esta clínica');

    try {
      setLoading(true);
      setError(null);

      const updated = await ClinicConfigService.updateClinicConfiguration(
        activeClinic.id,
        updates
      );
      
      setClinicConfig(updated);

      // Recargar configuración efectiva
      await loadConfiguration();

      console.log('✅ Configuración de clínica actualizada');
    } catch (err: any) {
      console.error('❌ Error actualizando configuración de clínica:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeClinic, isAdmin, loadConfiguration]);

  /**
   * Actualizar preferencias de usuario
   */
  const updateUserPreferences = useCallback(async (updates: Partial<UserClinicPreferences>) => {
    if (!activeClinic) throw new Error('No hay clínica activa');

    try {
      setLoading(true);
      setError(null);

      const updated = await ClinicConfigService.updateUserClinicPreferences(
        activeClinic.id,
        updates
      );

      setUserPreferences(updated);

      // Recargar configuración efectiva
      await loadConfiguration();

      console.log('✅ Preferencias de usuario actualizadas');
    } catch (err: any) {
      console.error('❌ Error actualizando preferencias:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeClinic, loadConfiguration]);

  /**
   * Refrescar configuración
   */
  const refreshConfig = useCallback(async () => {
    await loadConfiguration();
  }, [loadConfiguration]);

  // Cargar configuración al montar o cambiar clínica
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    // Configuración de clínica
    clinicConfig,
    updateClinicConfig,
    isAdmin,

    // Preferencias de usuario
    userPreferences,
    updateUserPreferences,

    // Configuración efectiva
    effectiveConfig,
    refreshConfig,

    // Estado
    loading,
    error,
  };
}
