import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ClinicConfiguration, UserClinicPreferences } from '../clinic-config-service';

// Mock de Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: mockGetUser,
    },
  },
}));

import { ClinicConfigService } from '../clinic-config-service';

describe('ClinicConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpsert.mockReturnValue({ select: mockSelect });
  });

  describe('getClinicConfiguration', () => {
    it('should return clinic configuration when it exists', async () => {
      const mockConfig: Partial<ClinicConfiguration> = {
        id: 'config-1',
        clinic_id: 'clinic-1',
        timezone: 'America/Mexico_City',
        language: 'es',
        default_consultation_duration: 30,
      };

      mockSingle.mockResolvedValue({
        data: mockConfig,
        error: null,
      });

      const result = await ClinicConfigService.getClinicConfiguration('clinic-1');

      expect(result).toEqual(mockConfig);
      expect(mockFrom).toHaveBeenCalledWith('clinic_configurations');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
    });

    it('should return null when configuration does not exist', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });

      const result = await ClinicConfigService.getClinicConfiguration('clinic-1');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      });

      await expect(
        ClinicConfigService.getClinicConfiguration('clinic-1')
      ).rejects.toThrow();
    });
  });

  describe('updateClinicConfiguration', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
    });

    it('should update clinic configuration when user is admin', async () => {
      const mockUpdatedConfig: Partial<ClinicConfiguration> = {
        id: 'config-1',
        clinic_id: 'clinic-1',
        default_consultation_duration: 45,
      };

      // Mock isClinicAdmin
      mockEq.mockImplementation((field, value) => {
        if (field === 'user_id') {
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role_in_clinic: 'admin_staff' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (field === 'clinic_id') {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedConfig,
                error: null,
              }),
            }),
          };
        }
        return { single: mockSingle, maybeSingle: mockMaybeSingle };
      });

      const updates = { default_consultation_duration: 45 };
      const result = await ClinicConfigService.updateClinicConfiguration(
        'clinic-1',
        updates
      );

      expect(result).toEqual(mockUpdatedConfig);
    });

    it('should throw error when user is not admin', async () => {
      mockEq.mockImplementation((field, value) => {
        if (field === 'user_id') {
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role_in_clinic: 'doctor' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { single: mockSingle };
      });

      await expect(
        ClinicConfigService.updateClinicConfiguration('clinic-1', {})
      ).rejects.toThrow('No tienes permisos de administrador');
    });
  });

  describe('getUserClinicPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreferences: Partial<UserClinicPreferences> = {
        id: 'pref-1',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        preferred_consultation_duration: 45,
      };

      mockMaybeSingle.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const result = await ClinicConfigService.getUserClinicPreferences(
        'user-1',
        'clinic-1'
      );

      expect(result).toEqual(mockPreferences);
      expect(mockFrom).toHaveBeenCalledWith('user_clinic_preferences');
    });

    it('should return null when preferences do not exist', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await ClinicConfigService.getUserClinicPreferences(
        'user-1',
        'clinic-1'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateUserClinicPreferences', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        upsert: mockUpsert,
      });

      mockUpsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });
    });

    it('should upsert user preferences', async () => {
      const mockPreferences: Partial<UserClinicPreferences> = {
        id: 'pref-1',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        preferred_consultation_duration: 45,
      };

      mockSingle.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const updates = { preferred_consultation_duration: 45 };
      const result = await ClinicConfigService.updateUserClinicPreferences(
        'clinic-1',
        updates
      );

      expect(result).toEqual(mockPreferences);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          clinic_id: 'clinic-1',
          preferred_consultation_duration: 45,
        }),
        { onConflict: 'user_id,clinic_id' }
      );
    });
  });

  describe('getEffectiveConfiguration', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
    });

    it('should call RPC function and return effective configuration', async () => {
      const mockEffectiveConfig = {
        id: 'config-1',
        clinic_id: 'clinic-1',
        default_consultation_duration: 30,
        preferred_consultation_duration: 45,
      };

      mockRpc.mockResolvedValue({
        data: mockEffectiveConfig,
        error: null,
      });

      mockMaybeSingle.mockResolvedValue({
        data: { id: 'pref-1' },
        error: null,
      });

      const result = await ClinicConfigService.getEffectiveConfiguration('clinic-1');

      expect(result).toEqual({
        ...mockEffectiveConfig,
        isUserCustomized: true,
      });
      expect(mockRpc).toHaveBeenCalledWith('get_effective_config', {
        p_user_id: 'user-1',
        p_clinic_id: 'clinic-1',
      });
    });

    it('should fallback to clinic config when RPC fails', async () => {
      const mockClinicConfig: Partial<ClinicConfiguration> = {
        id: 'config-1',
        clinic_id: 'clinic-1',
        default_consultation_duration: 30,
      };

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      mockSingle.mockResolvedValue({
        data: mockClinicConfig,
        error: null,
      });

      const result = await ClinicConfigService.getEffectiveConfiguration('clinic-1');

      expect(result).toEqual({
        ...mockClinicConfig,
        isUserCustomized: false,
      });
    });
  });

  describe('isClinicAdmin', () => {
    it('should return true when user is admin', async () => {
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role_in_clinic: 'admin_staff' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await ClinicConfigService.isClinicAdmin('user-1', 'clinic-1');

      expect(result).toBe(true);
    });

    it('should return false when user is not admin', async () => {
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role_in_clinic: 'doctor' },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const result = await ClinicConfigService.isClinicAdmin('user-1', 'clinic-1');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
              }),
            }),
          }),
        }),
      }));

      const result = await ClinicConfigService.isClinicAdmin('user-1', 'clinic-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserAdminClinics', () => {
    it('should return array of clinic IDs where user is admin', async () => {
      const mockClinics = [
        { clinic_id: 'clinic-1' },
        { clinic_id: 'clinic-2' },
      ];

      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockClinics,
              error: null,
            }),
          }),
        }),
      }));

      const result = await ClinicConfigService.getUserAdminClinics('user-1');

      expect(result).toEqual(['clinic-1', 'clinic-2']);
    });

    it('should return empty array on error', async () => {
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Error' },
            }),
          }),
        }),
      }));

      const result = await ClinicConfigService.getUserAdminClinics('user-1');

      expect(result).toEqual([]);
    });
  });
});
