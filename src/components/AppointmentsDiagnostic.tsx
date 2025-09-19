import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Users, Calendar, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function AppointmentsDiagnostic() {
  const { user, profile } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // 1. Verificar autenticación
      if (!user?.id) {
        diagnosticResults.push({
          name: 'Autenticación',
          status: 'error',
          message: 'Usuario no autenticado',
          details: 'Debe iniciar sesión para usar el sistema de citas'
        });
      } else {
        diagnosticResults.push({
          name: 'Autenticación',
          status: 'success',
          message: 'Usuario autenticado correctamente',
          details: `ID: ${user.id}`
        });
      }

      // 2. Verificar perfil
      if (!profile) {
        diagnosticResults.push({
          name: 'Perfil de Usuario',
          status: 'error',
          message: 'Perfil no encontrado',
          details: 'El usuario no tiene un perfil completo en el sistema'
        });
      } else {
        diagnosticResults.push({
          name: 'Perfil de Usuario',
          status: 'success',
          message: `Perfil encontrado - Rol: ${profile.role}`,
          details: profile.clinic_id ? `Clínica asociada: ${profile.clinic_id}` : 'Sin clínica asociada'
        });
      }

      // 3. Verificar tabla appointments
      try {
        const { error: appointmentsError } = await supabase
          .from('appointments')
          .select('id')
          .limit(1);

        if (appointmentsError) {
          diagnosticResults.push({
            name: 'Tabla Appointments',
            status: 'error',
            message: 'Error al acceder a la tabla appointments',
            details: appointmentsError.message
          });
        } else {
          diagnosticResults.push({
            name: 'Tabla Appointments',
            status: 'success',
            message: 'Tabla appointments accesible',
            details: 'RLS configurado correctamente'
          });
        }
      } catch (error) {
        diagnosticResults.push({
          name: 'Tabla Appointments',
          status: 'error',
          message: 'Error de conectividad con appointments',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

      // 4. Verificar tabla medical_practice_settings
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('medical_practice_settings')
          .select('*')
          .eq('user_id', user?.id || '')
          .maybeSingle();

        if (settingsError) {
          diagnosticResults.push({
            name: 'Configuración Médica',
            status: 'error',
            message: 'Error al acceder a configuración médica',
            details: settingsError.message
          });
        } else if (!settings) {
          diagnosticResults.push({
            name: 'Configuración Médica',
            status: 'warning',
            message: 'No hay configuración médica',
            details: 'Se usarán valores por defecto. Recomendamos configurar horarios personalizados.'
          });
        } else {
          diagnosticResults.push({
            name: 'Configuración Médica',
            status: 'success',
            message: 'Configuración médica encontrada',
            details: `Horarios: ${settings.weekday_start_time} - ${settings.weekday_end_time}`
          });
        }
      } catch (error) {
        diagnosticResults.push({
          name: 'Configuración Médica',
          status: 'error',
          message: 'Error al verificar configuración médica',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

      // 5. Verificar tabla patients
      try {
        const { error: patientsError } = await supabase
          .from('patients')
          .select('id')
          .limit(1);

        if (patientsError) {
          diagnosticResults.push({
            name: 'Tabla Patients',
            status: 'error',
            message: 'Error al acceder a la tabla patients',
            details: patientsError.message
          });
        } else {
          diagnosticResults.push({
            name: 'Tabla Patients',
            status: 'success',
            message: 'Tabla patients accesible',
            details: 'Necesaria para crear citas'
          });
        }
      } catch (error) {
        diagnosticResults.push({
          name: 'Tabla Patients',
          status: 'error',
          message: 'Error de conectividad con patients',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

      // 6. Verificar función check_appointment_conflicts
      try {
        const { error: functionError } = await supabase.rpc('check_appointment_conflicts', {
          p_doctor_id: user?.id || '',
          p_appointment_date: '2024-01-01',
          p_appointment_time: '09:00',
          p_duration: 30
        });

        if (functionError) {
          diagnosticResults.push({
            name: 'Función de Conflictos',
            status: 'error',
            message: 'Función check_appointment_conflicts no disponible',
            details: functionError.message
          });
        } else {
          diagnosticResults.push({
            name: 'Función de Conflictos',
            status: 'success',
            message: 'Función de verificación de conflictos operativa',
            details: 'Necesaria para validar horarios'
          });
        }
      } catch (error) {
        diagnosticResults.push({
          name: 'Función de Conflictos',
          status: 'error',
          message: 'Error al verificar función de conflictos',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

      // 7. Verificar integridad de datos (perfiles huérfanos)
      try {
        const { data: orphanedProfiles, error: orphanedError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .not('id', 'in', `(${user?.id || '00000000-0000-0000-0000-000000000000'})`); // Simplified check

        if (orphanedError) {
          diagnosticResults.push({
            name: 'Integridad de Datos',
            status: 'warning',
            message: 'No se pudo verificar integridad de perfiles',
            details: orphanedError.message
          });
        } else {
          diagnosticResults.push({
            name: 'Integridad de Datos',
            status: 'success',
            message: 'Verificación de integridad completada',
            details: `${orphanedProfiles?.length || 0} perfiles encontrados en el sistema`
          });
        }
      } catch (error) {
        diagnosticResults.push({
          name: 'Integridad de Datos',
          status: 'warning',
          message: 'Error al verificar integridad de datos',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }

    } catch (error) {
      diagnosticResults.push({
        name: 'Diagnóstico General',
        status: 'error',
        message: 'Error durante el diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }

    setResults(diagnosticResults);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, [user?.id]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const successCount = results.filter(r => r.status === 'success').length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Diagnóstico del Sistema de Citas
              </h2>
            </div>
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-green-600">Exitosos</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-yellow-600">Advertencias</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-red-600">Errores</div>
            </div>
          </div>

          {/* Resultados detallados */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-sm font-medium text-gray-900">
                      {result.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-xs text-gray-500 mt-2 font-mono">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recomendaciones */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Recomendaciones para resolver problemas:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {errorCount > 0 && (
                  <li>• Ejecutar las migraciones de base de datos faltantes</li>
                )}
                {results.some(r => r.message.includes('RLS')) && (
                  <li>• Verificar las políticas de seguridad (RLS) en Supabase</li>
                )}
                {results.some(r => r.message.includes('configuración médica')) && (
                  <li>• Configurar horarios médicos en el perfil de usuario</li>
                )}
                {results.some(r => r.message.includes('foreign key constraint')) && (
                  <li>• Ejecutar script de limpieza de datos huérfanos: <code>clean-orphaned-profiles.sql</code></li>
                )}
                {results.some(r => r.message.includes('violates foreign key')) && (
                  <li>• Problema de integridad referencial - revisar perfiles sin usuarios válidos</li>
                )}
                {!profile?.clinic_id && (
                  <li>• Asociar el usuario a una clínica</li>
                )}
                <li>• Ejecutar script de diagnóstico completo: <code>fix-appointments-system.sql</code></li>
                <li>• Contactar al administrador del sistema si los problemas persisten</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
