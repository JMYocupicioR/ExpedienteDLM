import { ArrowLeft, Calendar, ClipboardList, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchScaleAssessmentById,
  formatAssessmentDate,
  type ScaleAssessmentViewModel,
} from '@/features/medical-records/utils/scaleAssessmentViewModel';

export default function ScaleAssessmentSession() {
  const navigate = useNavigate();
  const { id: patientId, assessmentId } = useParams<{ id: string; assessmentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ScaleAssessmentViewModel | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!assessmentId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchScaleAssessmentById(assessmentId);
        if (!data) {
          setError('No se encontró la sesión de escala solicitada.');
          return;
        }
        if (patientId && data.patientId !== patientId) {
          setError('La sesión no corresponde al paciente actual.');
          return;
        }
        setAssessment(data);
      } catch {
        setError('No fue posible cargar la sesión de escala.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [assessmentId, patientId]);

  if (loading) {
    return (
      <div className='p-6'>
        <div className='text-gray-400'>Cargando sesión de escala...</div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className='p-6 space-y-4'>
        <button
          onClick={() => navigate(-1)}
          className='inline-flex items-center text-cyan-400 hover:text-cyan-300'
        >
          <ArrowLeft className='h-4 w-4 mr-1' /> Volver
        </button>
        <div className='bg-red-900/20 border border-red-700 text-red-300 rounded p-4'>
          {error || 'No se encontró la sesión.'}
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 space-y-5'>
      <div className='flex items-center justify-between'>
        <button
          onClick={() => navigate(-1)}
          className='inline-flex items-center text-cyan-400 hover:text-cyan-300'
        >
          <ArrowLeft className='h-4 w-4 mr-1' /> Volver al historial
        </button>
      </div>

      <div className='bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-4'>
        <h1 className='text-xl font-semibold text-white'>{assessment.scaleName}</h1>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='bg-gray-900 border border-gray-700 rounded p-3'>
            <div className='text-xs uppercase text-gray-400'>Médico aplicador</div>
            <div className='text-sm text-white mt-1 flex items-center'>
              <UserCircle2 className='h-4 w-4 mr-2 text-cyan-400' />
              {assessment.doctorName || 'No disponible'}
            </div>
            <div className='text-xs text-gray-500 mt-1'>ID: {assessment.doctorId}</div>
          </div>
          <div className='bg-gray-900 border border-gray-700 rounded p-3'>
            <div className='text-xs uppercase text-gray-400'>Fecha y hora</div>
            <div className='text-sm text-white mt-1 flex items-center'>
              <Calendar className='h-4 w-4 mr-2 text-cyan-400' />
              {formatAssessmentDate(assessment.createdAt)}
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              Actualizado: {formatAssessmentDate(assessment.updatedAt)}
            </div>
          </div>
          <div className='bg-gray-900 border border-gray-700 rounded p-3'>
            <div className='text-xs uppercase text-gray-400'>Resultado</div>
            <div className='text-sm text-white mt-1'>
              Score: {typeof assessment.score === 'number' ? assessment.score : '-'}
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              Severidad: {assessment.severity || 'No disponible'}
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='bg-gray-800 border border-gray-700 rounded-lg p-4'>
          <h2 className='text-sm font-semibold text-white mb-3'>Respuestas de la sesión</h2>
          {assessment.answerDetails.length === 0 ? (
            <p className='text-sm text-gray-400'>Sin respuestas registradas.</p>
          ) : (
            <div className='space-y-2'>
              {assessment.answerDetails.map((entry) => (
                <div key={entry.questionId} className='bg-gray-900 border border-gray-700 rounded p-2'>
                  <div className='text-xs font-semibold text-gray-300'>{entry.questionText}</div>
                  <div className='text-xs text-gray-400 mt-1 break-words'>
                    {entry.valueLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='bg-gray-800 border border-gray-700 rounded-lg p-4'>
          <h2 className='text-sm font-semibold text-white mb-3'>Interpretación y metadatos</h2>
          {assessment.interpretation || assessment.clinicalSummary ? (
            <div className='space-y-3'>
              {assessment.clinicalSummary && (
                <p className='text-sm text-gray-300'>{assessment.clinicalSummary}</p>
              )}
              {assessment.recommendationList.length > 0 && (
                  <ul className='list-disc list-inside text-xs text-gray-400 space-y-1'>
                    {assessment.recommendationList.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              <div className='text-xs text-gray-500 space-y-1 border-t border-gray-700 pt-2'>
                <div className='flex items-center'><ClipboardList className='h-3 w-3 mr-1' /> ID evaluación: {assessment.id}</div>
                <div>Escala ID: {assessment.scaleId}</div>
                <div>Consulta ID: {assessment.consultationId || 'No vinculada'}</div>
                <div>Versión: {assessment.scaleVersion || 'No disponible'}</div>
                <div>Evaluado: {assessment.evaluatedAt ? formatAssessmentDate(assessment.evaluatedAt) : 'No disponible'}</div>
              </div>
            </div>
          ) : (
            <p className='text-sm text-gray-400'>Sin interpretación disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
}
