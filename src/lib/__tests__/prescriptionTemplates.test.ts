import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import {
  getOrCreateTemplateForUser,
  saveTemplateForUser,
  type PrescriptionTemplateData,
} from '../prescriptionTemplates';

describe('prescriptionTemplates', () => {
  describe('getOrCreateTemplateForUser', () => {
    it('returns normalized template when doctor has default layout', async () => {
      const dbRow = {
        doctor_id: 'doc-1',
        template_elements: [{ id: 'el1', type: 'text', content: '{{patientName}}' }],
        canvas_settings: { backgroundColor: '#fff', canvasSize: { width: 794, height: 1123 } },
        print_settings: { paperSize: 'a4', orientation: 'portrait', margins: 'normal' },
        logo_url: 'https://example.com/logo.png',
      };
      const chain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: dbRow, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(chain),
      } as any);

      const result = await getOrCreateTemplateForUser('doc-1');

      expect(result.template_elements).toEqual(dbRow.template_elements);
      expect(result.logo_url).toBe('https://example.com/logo.png');
      expect(result.print_settings?.paperSize).toBe('a4');
    });

    it('returns default template when no layout found', async () => {
      const mockSingle = vi.fn()
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: null, error: {} });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ maybeSingle: mockSingle }),
            }),
          }),
        }),
      } as any);

      const result = await getOrCreateTemplateForUser('doc-1');

      expect(result.template_elements).toEqual([]);
      expect(result.canvas_settings?.canvasSize).toEqual({ width: 794, height: 1123 });
    });
  });
});
