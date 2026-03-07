import React, { useCallback, useEffect, useState } from 'react';
import { usePhysicalExam } from '@/features/medical-records/hooks/usePhysicalExam';
import { formatAssessmentDate, type ScaleAssessmentViewModel } from '@/features/medical-records/utils/scaleAssessmentViewModel';
import { fetchMedicalScalesSafe, getScaleDefinitionById } from '@/lib/services/medical-scales-service';
import { ListChecks } from 'lucide-react';
import { GuidedScaleWizard } from './medical-scales/GuidedScaleWizard';
import { ScaleTaxonomySearch } from './medical-scales/ScaleTaxonomySearch';
import { ScaleDefinition as UnifiedScaleDefinition } from '@/features/medical-records/types/medical-scale.types';



interface MedicalScalesPanelProps {
  patientId: string;
  doctorId: string;
  consultationId?: string;
  onAssessmentSaved?: () => void;
}

export default function MedicalScalesPanel({ patientId, doctorId, consultationId, onAssessmentSaved }: MedicalScalesPanelProps) {
  const { saveScaleAssessment, getScaleAssessmentsByConsultation } = usePhysicalExam({ patientId, doctorId });
  const [scales, setScales] = useState<Array<{ id: string; name: string; acronym?: string }>>([]);
  const [selectedScaleId, setSelectedScaleId] = useState<string>('');
  const [selectedScaleDef, setSelectedScaleDef] = useState<UnifiedScaleDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [existingAssessments, setExistingAssessments] = useState<ScaleAssessmentViewModel[]>([]);
  const [showGuidedWizard, setShowGuidedWizard] = useState(false);

  const loadScales = useCallback(async () => {
    const rows = await fetchMedicalScalesSafe();
    const active = rows
      .filter(r => (r as any).is_active !== false)
      .map(r => ({ id: String(r.id), name: String((r as any).name || r.id), acronym: (r as any).acronym as string | undefined }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setScales(active);
  }, []);

  const loadExisting = useCallback(async () => {
    if (!consultationId) return;
    const list = await getScaleAssessmentsByConsultation(consultationId);
    setExistingAssessments(list);
  }, [getScaleAssessmentsByConsultation, consultationId]);

  useEffect(() => {
    loadScales();
    loadExisting();
  }, [loadScales, loadExisting]);

  const handleSelectScale = async (scaleId: string) => {
    setSelectedScaleId(scaleId);
    setSelectedScaleDef(null);
    setAnswers({});
    if (!scaleId) return;
    const definition = await getScaleDefinitionById(scaleId);
    if (definition) {
      setSelectedScaleDef(definition);
      setShowGuidedWizard(true);
    } else {
      const rows = await fetchMedicalScalesSafe();
      const selected = rows.find((row) => row.id === scaleId);
      if (selected?.definition) {
        setSelectedScaleDef((selected.definition as unknown) as UnifiedScaleDefinition);
        setShowGuidedWizard(true);
      }
    }
  };

  const handleWizardSave = async (wizardAnswers: Record<string, unknown>) => {
    if (!selectedScaleId || !selectedScaleDef) return;
    
    // We need to calculate score/severity based on the answers from wizard
    // Since computedScore/computedSeverity depend on the 'answers' state, 
    // we'll update the state first, but for the save call we'll calculate them manually or 
    // use the wizard data.
    
    // Helper to calculate score manually for the save call
    const calculateScore = (data: Record<string, unknown>) => {
      if (!selectedScaleDef?.items) return 0;
      const vals: number[] = [];
      for (const item of selectedScaleDef.items) {
        const val = data[item.id];
        if (typeof val === 'number') vals.push(val);
        if (typeof val === 'string' && !isNaN(Number(val))) vals.push(Number(val));
      }
      if (vals.length === 0) return 0;
      if (selectedScaleDef.scoring?.average) {
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      return vals.reduce((a, b) => a + b, 0);
    };

    const wizardScore = calculateScore(wizardAnswers);
    const wizardSeverity = selectedScaleDef.scoring?.ranges?.find(x => wizardScore >= x.min && wizardScore <= x.max)?.severity || null;

    let computedInterpretation: Record<string, unknown> | undefined = undefined;
    if (wizardSeverity && selectedScaleDef) {
       const recommendations: string[] = [];
       const severityLower = wizardSeverity.toLowerCase();
       if (severityLower.includes('severo') || severityLower.includes('severe') || severityLower.includes('alto')) {
         recommendations.push('Considerar intervención terapéutica inmediata');
         recommendations.push('Evaluación especializada recomendada');
         recommendations.push('Seguimiento estrecho del paciente');
       } else if (severityLower.includes('moderado') || severityLower.includes('moderate')) {
         recommendations.push('Monitoreo regular recomendado');
         recommendations.push('Considerar terapia preventiva');
         recommendations.push('Reevaluación en 2-4 semanas');
       } else {
         recommendations.push('Mantener observación');
         recommendations.push('Promover medidas preventivas');
         recommendations.push('Reevaluación según evolución clínica');
       }
       computedInterpretation = {
         severity: wizardSeverity,
         score: wizardScore,
         clinical_significance: `Puntuación de ${wizardScore.toFixed(2)} indica ${wizardSeverity}`,
         recommendations,
         evaluated_at: new Date().toISOString(),
         scale_version: selectedScaleDef.version || '1.0'
       };
    }

    try {
      await saveScaleAssessment({
        consultationId,
        scaleId: selectedScaleId,
        answers: wizardAnswers,
        score: wizardScore,
        severity: wizardSeverity ?? undefined,
        interpretation: computedInterpretation,
      });
      
      setShowGuidedWizard(false);
      setSelectedScaleId('');
      setSelectedScaleDef(null);
      setAnswers({});
      await loadExisting();
      if (onAssessmentSaved) {
        onAssessmentSaved();
      }
    } catch {
      alert('Error al guardar la evaluación asistida');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      <h3 className="text-white font-medium flex items-center"><ListChecks className="h-5 w-5 mr-2" /> Escalas médicas</h3>
      <ScaleTaxonomySearch
        scales={scales}
        onSelect={handleSelectScale}
      />

      {showGuidedWizard && selectedScaleDef && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col">
          <div className="w-full h-full">
            <GuidedScaleWizard
              definition={{
                ...selectedScaleDef,
                id: selectedScaleId,
                name: scales.find(s => s.id === selectedScaleId)?.name
              } as UnifiedScaleDefinition}
              onSave={handleWizardSave}
              onCancel={() => setShowGuidedWizard(false)}
              initialAnswers={answers}
            />
          </div>
        </div>
      )}



      <div>
        <h4 className="text-gray-300 font-medium mb-2">Evaluaciones registradas</h4>
        {existingAssessments.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay evaluaciones registradas.</p>
        ) : (
          <ul className="space-y-2">
            {existingAssessments.map(a => (
              <li key={a.id} className="text-sm text-gray-300 bg-gray-700 rounded p-2 border border-gray-600">
                <div className="flex justify-between">
                  <span>Escala: {a.scaleName}</span>
                  <span>{formatAssessmentDate(a.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Aplicada por: {a.doctorName || 'No disponible'}
                </div>
                {typeof a.score === 'number' && (
                  <div>Puntuación: <span className="font-semibold text-white">{a.score}</span>{a.severity ? ` • ${a.severity}` : ''}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


