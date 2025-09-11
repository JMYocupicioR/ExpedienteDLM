import React, { useEffect, useState } from 'react';
import { Activity, ListChecks } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ScaleAssessmentRow {
  id: string;
  scale_id: string;
  score: number | null;
  severity: string | null;
  created_at: string;
  medical_scales?: { name: string } | null;
}

interface ScaleAssessmentsProps {
  consultationId: string;
}

export default function ScaleAssessments({ consultationId }: ScaleAssessmentsProps) {
  const [items, setItems] = useState<ScaleAssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        let { data, error } = await supabase
          .from('scale_assessments')
          .select('id, scale_id, score, severity, created_at, medical_scales(name)')
          .eq('consultation_id', consultationId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems(data || []);
      } catch (e) {
        // Error log removed for security;
      } finally {
        setLoading(false);
      }
    })();
  }, [consultationId]);

  if (loading) {
    return (
      <div className="text-gray-400">Cargando escalas...</div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay evaluaciones de escalas registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(row => (
        <div key={row.id} className="bg-gray-700 rounded p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-4 w-4 text-cyan-400 mr-2" />
            <div>
              <div className="text-white text-sm font-medium">{row.medical_scales?.name || row.scale_id}</div>
              <div className="text-xs text-gray-400">{new Date(row.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            {typeof row.score === 'number' && (
              <span className="text-white font-semibold">{row.score}</span>
            )}
            {row.severity && (
              <span className="ml-3 text-xs border border-gray-600 rounded px-2 py-0.5">{row.severity}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


