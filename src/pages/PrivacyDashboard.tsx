import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  Download,
  Edit,
  Eye,
  FileText,
  Heart,
  History,
  Send,
  Shield,
  TestTube,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import {
  CreateDataCorrectionRequest,
  DataCorrectionRequest,
  DataCorrectionRequestType,
  PatientAccessLog,
} from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

const PrivacyDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  // Estados para datos del usuario
  const [patientData, setPatientData] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [correctionRequests, setCorrectionRequests] = useState<DataCorrectionRequest[]>([]);
  const [accessLogs, setAccessLogs] = useState<PatientAccessLog[]>([]);

  // Estados para formularios
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState<DataCorrectionRequestType>('rectification');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para formulario de solicitud
  const [formData, setFormData] = useState<CreateDataCorrectionRequest>({
    request_type: 'rectification',
    field_to_correct: '',
    current_value: '',
    requested_value: '',
    reason: '',
    additional_details: '',
  });

  useEffect(() => {
    if (user) {
      loadPatientData();
    }
  }, [user]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener información del paciente
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_user_id', user?.id)
        .single();

      if (patientError) {
        if (patientError.code === 'PGRST116') {
          setError('No se encontró un expediente médico asociado a su cuenta.');
          return;
        }
        throw patientError;
      }

      setPatientData(patient);
      setPatientId(patient.id);

      // Cargar solicitudes de corrección existentes
      await loadCorrectionRequests(patient.id);

      // Cargar logs de acceso
      await loadAccessLogs();
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError('Error al cargar la información del paciente');
    } finally {
      setLoading(false);
    }
  };

  const loadCorrectionRequests = async (pId: string) => {
    try {
      const { data, error } = await supabase
        .from('data_correction_requests')
        .select(
          `
          *,
          reviewed_by_profile:reviewed_by(full_name)
        `
        )
        .eq('patient_id', pId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCorrectionRequests(data || []);
    } catch (err) {
      console.error('Error loading correction requests:', err);
    }
  };

  const loadAccessLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_access_logs')
        .select('*')
        .eq('patient_user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAccessLogs(data || []);
    } catch (err) {
      console.error('Error loading access logs:', err);
    }
  };

  const downloadCompleteRecord = async () => {
    try {
      setSubmitting(true);

      // Llamar a la función de Supabase para obtener datos completos
      const { data, error } = await supabase.rpc('get_patient_complete_data');

      if (error) throw error;

      // Crear archivo para descarga
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expediente_completo_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Su expediente completo ha sido descargado exitosamente.');

      // Recargar logs para mostrar la descarga
      await loadAccessLogs();
    } catch (err) {
      console.error('Error downloading complete record:', err);
      setError('Error al descargar el expediente completo');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      setError('No se pudo identificar al paciente');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const requestData = {
        ...formData,
        patient_user_id: user?.id,
        patient_id: patientId,
      };

      const { error } = await supabase.from('data_correction_requests').insert(requestData);

      if (error) throw error;

      setSuccess('Su solicitud ha sido enviada exitosamente. Será revisada por el equipo médico.');
      setShowRequestForm(false);
      setFormData({
        request_type: 'rectification',
        field_to_correct: '',
        current_value: '',
        requested_value: '',
        reason: '',
        additional_details: '',
      });

      // Recargar solicitudes
      await loadCorrectionRequests(patientId);
    } catch (err) {
      console.error('Error submitting correction request:', err);
      setError('Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_review':
        return 'En Revisión';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const getRequestTypeLabel = (type: DataCorrectionRequestType) => {
    switch (type) {
      case 'access':
        return 'Acceso a Datos';
      case 'rectification':
        return 'Corrección de Datos';
      case 'cancellation':
        return 'Cancelación de Datos';
      case 'opposition':
        return 'Oposición al Tratamiento';
      default:
        return type;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view_profile':
        return User;
      case 'view_consultations':
        return Heart;
      case 'view_appointments':
        return Calendar;
      case 'view_medical_tests':
        return TestTube;
      case 'download_complete_record':
        return Download;
      default:
        return Eye;
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-2 text-gray-600'>Cargando información de privacidad...</span>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='bg-white shadow rounded-lg p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
              <Shield className='h-7 w-7 mr-3 text-blue-600' />
              Privacidad y Derechos ARCO
            </h1>
            <p className='mt-1 text-gray-600'>
              Gestione sus datos personales y ejerza sus derechos conforme a la LFPDPPP
            </p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className='bg-red-50 border border-red-200 rounded-md p-4'>
          <div className='flex'>
            <AlertTriangle className='h-5 w-5 text-red-400' />
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800'>Error</h3>
              <p className='mt-1 text-sm text-red-700'>{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className='bg-green-50 border border-green-200 rounded-md p-4'>
          <div className='flex'>
            <CheckCircle className='h-5 w-5 text-green-400' />
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-green-800'>Éxito</h3>
              <p className='mt-1 text-sm text-green-700'>{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Derechos ARCO - Cards principales */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {/* Derecho de Acceso */}
        <div className='bg-white shadow rounded-lg p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <Database className='h-8 w-8 text-blue-600' />
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-900'>Acceso</h3>
              <p className='text-sm text-gray-500'>Descargar mis datos</p>
            </div>
          </div>
          <div className='mt-4'>
            <button
              onClick={downloadCompleteRecord}
              disabled={submitting}
              className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
            >
              <Download className='h-4 w-4 mr-2' />
              {submitting ? 'Descargando...' : 'Descargar Expediente'}
            </button>
          </div>
        </div>

        {/* Derecho de Rectificación */}
        <div className='bg-white shadow rounded-lg p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <Edit className='h-8 w-8 text-green-600' />
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-900'>Rectificación</h3>
              <p className='text-sm text-gray-500'>Corregir información</p>
            </div>
          </div>
          <div className='mt-4'>
            <button
              onClick={() => {
                setRequestType('rectification');
                setFormData({ ...formData, request_type: 'rectification' });
                setShowRequestForm(true);
              }}
              className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700'
            >
              <Edit className='h-4 w-4 mr-2' />
              Solicitar Corrección
            </button>
          </div>
        </div>

        {/* Derecho de Cancelación */}
        <div className='bg-white shadow rounded-lg p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <Trash2 className='h-8 w-8 text-red-600' />
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-900'>Cancelación</h3>
              <p className='text-sm text-gray-500'>Eliminar datos</p>
            </div>
          </div>
          <div className='mt-4'>
            <button
              onClick={() => {
                setRequestType('cancellation');
                setFormData({ ...formData, request_type: 'cancellation' });
                setShowRequestForm(true);
              }}
              className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Solicitar Eliminación
            </button>
          </div>
        </div>

        {/* Derecho de Oposición */}
        <div className='bg-white shadow rounded-lg p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <XCircle className='h-8 w-8 text-orange-600' />
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-900'>Oposición</h3>
              <p className='text-sm text-gray-500'>Oponerse al uso</p>
            </div>
          </div>
          <div className='mt-4'>
            <button
              onClick={() => {
                setRequestType('opposition');
                setFormData({ ...formData, request_type: 'opposition' });
                setShowRequestForm(true);
              }}
              className='w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700'
            >
              <XCircle className='h-4 w-4 mr-2' />
              Solicitar Oposición
            </button>
          </div>
        </div>
      </div>

      {/* Información del paciente */}
      {patientData && (
        <div className='bg-white shadow rounded-lg p-6'>
          <h2 className='text-lg font-medium text-gray-900 mb-4'>Mi Información Personal</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <div>
              <label className='text-sm font-medium text-gray-500'>Nombre Completo</label>
              <p className='text-sm text-gray-900'>{patientData.full_name}</p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-500'>Email</label>
              <p className='text-sm text-gray-900'>{patientData.email || 'No especificado'}</p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-500'>Teléfono</label>
              <p className='text-sm text-gray-900'>{patientData.phone || 'No especificado'}</p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-500'>Fecha de Nacimiento</label>
              <p className='text-sm text-gray-900'>
                {format(new Date(patientData.birth_date), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-500'>Género</label>
              <p className='text-sm text-gray-900'>{patientData.gender}</p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-500'>Última Actualización</label>
              <p className='text-sm text-gray-900'>
                {format(
                  new Date(patientData.updated_at || patientData.created_at),
                  'dd/MM/yyyy HH:mm'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Solicitudes de Corrección */}
      <div className='bg-white shadow rounded-lg p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-medium text-gray-900'>Mis Solicitudes ARCO</h2>
          <button
            onClick={() => setShowRequestForm(true)}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
          >
            <Send className='h-4 w-4 mr-2' />
            Nueva Solicitud
          </button>
        </div>

        {correctionRequests.length > 0 ? (
          <div className='space-y-4'>
            {correctionRequests.map(request => (
              <div key={request.id} className='border border-gray-200 rounded-lg p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center space-x-2'>
                    <h3 className='text-sm font-medium text-gray-900'>
                      {getRequestTypeLabel(request.request_type)}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <span className='text-xs text-gray-500'>
                    {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>

                <p className='text-sm text-gray-700 mb-2'>{request.reason}</p>

                {request.field_to_correct && (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-xs'>
                    <div>
                      <span className='font-medium text-gray-500'>Campo:</span>
                      <p>{request.field_to_correct}</p>
                    </div>
                    {request.current_value && (
                      <div>
                        <span className='font-medium text-gray-500'>Valor Actual:</span>
                        <p>{request.current_value}</p>
                      </div>
                    )}
                    {request.requested_value && (
                      <div>
                        <span className='font-medium text-gray-500'>Valor Solicitado:</span>
                        <p>{request.requested_value}</p>
                      </div>
                    )}
                  </div>
                )}

                {request.review_notes && (
                  <div className='mt-3 p-3 bg-gray-50 rounded'>
                    <span className='text-xs font-medium text-gray-500'>
                      Respuesta del equipo médico:
                    </span>
                    <p className='text-sm text-gray-700 mt-1'>{request.review_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-6'>
            <FileText className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900'>No hay solicitudes</h3>
            <p className='mt-1 text-sm text-gray-500'>
              No ha realizado ninguna solicitud ARCO aún.
            </p>
          </div>
        )}
      </div>

      {/* Historial de Accesos */}
      <div className='bg-white shadow rounded-lg p-6'>
        <h2 className='text-lg font-medium text-gray-900 mb-4 flex items-center'>
          <History className='h-5 w-5 mr-2' />
          Historial de Accesos
        </h2>

        {accessLogs.length > 0 ? (
          <div className='space-y-3'>
            {accessLogs.map(log => {
              const ActionIcon = getActionIcon(log.action);
              return (
                <div key={log.id} className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'>
                  <ActionIcon className='h-5 w-5 text-gray-400' />
                  <div className='flex-1'>
                    <p className='text-sm text-gray-900'>
                      {log.action === 'view_profile' && 'Visualizó su perfil'}
                      {log.action === 'view_consultations' && 'Visualizó sus consultas'}
                      {log.action === 'view_appointments' && 'Visualizó sus citas'}
                      {log.action === 'view_medical_tests' && 'Visualizó sus estudios'}
                      {log.action === 'download_complete_record' &&
                        'Descargó su expediente completo'}
                      {log.action === 'portal_access' && 'Accedió al portal'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      {log.ip_address && ` • IP: ${log.ip_address}`}
                    </p>
                  </div>
                  {log.success ? (
                    <CheckCircle className='h-4 w-4 text-green-500' />
                  ) : (
                    <XCircle className='h-4 w-4 text-red-500' />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className='text-center py-6'>
            <Clock className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900'>No hay accesos registrados</h3>
            <p className='mt-1 text-sm text-gray-500'>Su historial de accesos aparecerá aquí.</p>
          </div>
        )}
      </div>

      {/* Modal de formulario de solicitud */}
      {showRequestForm && (
        <div className='fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-medium text-gray-900'>Nueva Solicitud ARCO</h3>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <XCircle className='h-6 w-6' />
                </button>
              </div>

              <form onSubmit={submitCorrectionRequest} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Tipo de Solicitud
                  </label>
                  <select
                    value={formData.request_type}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        request_type: e.target.value as DataCorrectionRequestType,
                      })
                    }
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  >
                    <option value='rectification'>Rectificación (Corregir datos)</option>
                    <option value='cancellation'>Cancelación (Eliminar datos)</option>
                    <option value='opposition'>Oposición (Oponerse al tratamiento)</option>
                  </select>
                </div>

                {formData.request_type === 'rectification' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Campo a Corregir
                      </label>
                      <input
                        type='text'
                        value={formData.field_to_correct}
                        onChange={e =>
                          setFormData({ ...formData, field_to_correct: e.target.value })
                        }
                        placeholder='Ej: Teléfono, Email, Dirección'
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Valor Actual (Incorrecto)
                      </label>
                      <input
                        type='text'
                        value={formData.current_value}
                        onChange={e => setFormData({ ...formData, current_value: e.target.value })}
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Valor Correcto (Solicitado)
                      </label>
                      <input
                        type='text'
                        value={formData.requested_value}
                        onChange={e =>
                          setFormData({ ...formData, requested_value: e.target.value })
                        }
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Motivo de la Solicitud *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    required
                    rows={4}
                    placeholder='Explique detalladamente el motivo de su solicitud'
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Detalles Adicionales
                  </label>
                  <textarea
                    value={formData.additional_details}
                    onChange={e => setFormData({ ...formData, additional_details: e.target.value })}
                    rows={3}
                    placeholder='Información adicional que considere relevante'
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  />
                </div>

                <div className='flex justify-end space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => setShowRequestForm(false)}
                    className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50'
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    disabled={submitting}
                    className='px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                  >
                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyDashboard;
