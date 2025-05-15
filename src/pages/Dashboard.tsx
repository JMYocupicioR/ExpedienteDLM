import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog } from '@headlessui/react';
import { 
  Users, Search, UserPlus, Eye, Edit, 
  FileText, Calendar, AlertCircle, LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Patient = {
  id: string;
  full_name: string;
  birth_date: string;
  email: string;
  phone: string;
  created_at: string;
};

type NewPatientForm = {
  full_name: string;
  birth_date: string;
  gender: 'masculino' | 'femenino' | 'otro';
  email?: string;
  phone?: string;
  address?: string;
};

type UserProfile = {
  role: string;
  full_name: string | null;
};

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<NewPatientForm>();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Error al verificar la sesión');
      }

      if (!session) {
        navigate('/auth');
        return;
      }

      // First try to get the existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

      // If no profile exists or there's a PGRST116 error, create one with default values
      if ((!profile && !profileError) || (profileError && profileError.code === 'PGRST116')) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: session.user.id,
            email: session.user.email,
            role: 'doctor', // Default role
            full_name: session.user.email?.split('@')[0] || 'Usuario' // Default name from email
          }])
          .select('role, full_name')
          .single();

        if (createError) {
          throw new Error('Error al crear el perfil de usuario');
        }

        setUserProfile(newProfile);
      } else if (profileError && profileError.code !== 'PGRST116') {
        // Handle other profile errors
        throw new Error('Error al obtener el perfil de usuario');
      } else {
        // Profile exists, check permissions
        if (profile.role !== 'administrator' && profile.role !== 'doctor') {
          throw new Error('No tienes permisos para acceder a esta sección');
        }

        setUserProfile(profile);
      }

      fetchPatients();

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error al verificar la sesión');
      }
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === '42501') {
          setError('No tienes permisos para ver pacientes');
        } else {
          setError('Error al cargar los pacientes');
        }
        return;
      }

      setPatients(data || []);
    } catch (err) {
      setError('Error al cargar los pacientes');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onNewPatient = async (data: NewPatientForm) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('patients')
        .insert([data]);

      if (insertError) {
        if (insertError.code === '42501') {
          setError('No tienes permisos para crear pacientes');
        } else {
          setError('Error al crear el paciente');
        }
        return;
      }

      await fetchPatients();
      setIsNewPatientOpen(false);
      reset();
    } catch (err) {
      setError('Error al crear el paciente');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ExpedienteDLM</span>
            </div>
            {userProfile && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {userProfile.full_name || 'Usuario'} ({userProfile.role})
                </span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema de Gestión de Pacientes
          </h1>
          <button
            onClick={() => setIsNewPatientOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Nuevo Paciente
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Pacientes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {patients.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Consultas Pendientes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Expedientes Activos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {patients.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Pacientes */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Lista de Pacientes
              </h2>
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar pacientes..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando pacientes...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Nacimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.full_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.email}</div>
                          <div className="text-sm text-gray-500">{patient.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => navigate(`/expediente/${patient.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/expediente/${patient.id}/editar`)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Nuevo Paciente */}
        <Dialog
          open={isNewPatientOpen}
          onClose={() => setIsNewPatientOpen(false)}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                Nuevo Paciente
              </Dialog.Title>
              
              <form onSubmit={handleSubmit(onNewPatient)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    {...register('full_name', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">
                      Este campo es requerido
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    {...register('birth_date', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Género
                  </label>
                  <select
                    {...register('gender', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dirección
                  </label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewPatientOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}