import React, { useState, useEffect, Fragment, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { 
  Users, Search, UserPlus, Eye, Edit, 
  FileText, Calendar, AlertCircle, LogOut,
  Settings, Printer, Trash2, Pill, Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SettingsModal from '../components/SettingsModal';

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
  id: string;
  role: string;
  full_name: string | null;
  license_number?: string;
  phone?: string;
  schedule?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    start_time: string;
    end_time: string;
  };
};

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<NewPatientForm>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile exists, use it
      if (profile) {
        setUserProfile(profile);
      } else {
        // Only create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: 'doctor',
            full_name: session.user.email?.split('@')[0] || 'Usuario'
          })
          .select('*')
          .single();

        if (createError) throw createError;
        setUserProfile(newProfile);
      }

      // Check role permissions using the correct profile
      const currentProfile = profile || userProfile;
      if (currentProfile && currentProfile.role !== 'administrator' && currentProfile.role !== 'doctor') {
        throw new Error('No tienes permisos para acceder a esta sección');
      }

      fetchPatients();
    } catch (error: any) {
      console.error('Session check error:', error);
      setError(error.message);
      if (error.message.includes('duplicate key')) {
        setError('Error de sesión. Por favor, inicia sesión nuevamente.');
      }
      setTimeout(() => navigate('/auth'), 3000);
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

  const handleDeletePatient = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Realizar eliminación real de la base de datos
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (deleteError) {
        if (deleteError.code === '42501') {
          setError('No tienes permisos para eliminar pacientes');
        } else {
          setError('Error al eliminar el paciente');
        }
        return;
      }

      // Actualizar la lista de pacientes
      await fetchPatients();
      setPatientToDelete(null);
      
      // Mostrar mensaje de éxito
      setSuccessMessage('Paciente eliminado correctamente');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al eliminar el paciente');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPrescription = (patientId: string) => {
    // Navegar al dashboard de recetas con el paciente seleccionado
    navigate(`/recetas?paciente=${patientId}`);
  };

  const filteredPatients = patients.filter((patient: Patient) =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <span className="ml-2 text-xl font-bold text-white">Expediente DLM</span>
            </div>
            {userProfile && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">
                  {userProfile.full_name || 'Usuario'} ({userProfile.role})
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-300 hover:text-white hover:border-cyan-400 transition-all"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </button>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-red-600 text-sm leading-4 font-medium rounded-md text-red-400 hover:text-white hover:bg-red-600 transition-all"
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Sistema de Gestión de Pacientes
            </h1>
            <p className="text-gray-400">Gestiona y supervisa los expedientes médicos</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/recetas')}
              className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-800/50 hover:bg-gray-700 hover:border-cyan-400 transition-all"
            >
              <Pill className="h-5 w-5 mr-2" />
              Gestión de Recetas
            </button>
            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all"
              disabled={isLoading}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-400">
                  Total Pacientes
                </dt>
                <dd className="text-2xl font-bold text-white">
                  {patients.length}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-400">
                  Consultas Pendientes
                </dt>
                <dd className="text-2xl font-bold text-white">0</dd>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <dt className="text-sm font-medium text-gray-400">
                  Expedientes Activos
                </dt>
                <dd className="text-2xl font-bold text-white">
                  {patients.length}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Lista de Pacientes
            </h2>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pacientes..."
                className="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-400">Cargando pacientes...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fecha de Nacimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredPatients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {patient.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{patient.email}</div>
                        <div className="text-sm text-gray-400">{patient.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {format(new Date(patient.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => navigate(`/expediente/${patient.id}`)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Ver expediente"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="text-gray-400 hover:text-white transition-colors">
                              <Edit className="h-5 w-5" />
                            </Menu.Button>
                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-600 rounded-lg bg-gray-800 shadow-xl border border-gray-700 focus:outline-none">
                                <div className="px-1 py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handlePrintPrescription(patient.id)}
                                        className={`${
                                          active ? 'bg-cyan-600 text-white' : 'text-gray-300'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                                      >
                                        <Printer className="mr-2 h-5 w-5" />
                                        Imprimir Receta
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => setPatientToDelete(patient.id)}
                                        className={`${
                                          active ? 'bg-red-600 text-white' : 'text-red-400'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                                      >
                                        <Trash2 className="mr-2 h-5 w-5" />
                                        Eliminar Paciente
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPatients.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No hay pacientes registrados</p>
                  <p className="text-gray-500 text-sm">Comienza agregando tu primer paciente</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      <Transition appear show={isNewPatientOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsNewPatientOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-6">
                    Agregar Nuevo Paciente
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit(onNewPatient)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre completo *
                      </label>
                      <input
                        {...register('full_name', { required: 'El nombre es requerido' })}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                        placeholder="Nombre completo del paciente"
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-sm text-red-400">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Fecha de nacimiento *
                      </label>
                      <input
                        {...register('birth_date', { required: 'La fecha de nacimiento es requerida' })}
                        type="date"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      />
                      {errors.birth_date && (
                        <p className="mt-1 text-sm text-red-400">{errors.birth_date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Género *
                      </label>
                      <select
                        {...register('gender', { required: 'El género es requerido' })}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      >
                        <option value="">Seleccionar género</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                      {errors.gender && (
                        <p className="mt-1 text-sm text-red-400">{errors.gender.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Teléfono
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Dirección
                      </label>
                      <textarea
                        {...register('address')}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
                        placeholder="Dirección completa del paciente"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsNewPatientOpen(false)}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50"
                      >
                        {isLoading ? 'Guardando...' : 'Guardar Paciente'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={!!patientToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setPatientToDelete(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-4">
                    Confirmar Eliminación
                  </Dialog.Title>
                  
                  <div className="mb-6">
                    <p className="text-gray-300">
                      ¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setPatientToDelete(null)}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => patientToDelete && handleDeletePatient(patientToDelete)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userProfile={userProfile}
          onUpdate={setUserProfile}
        />
      )}
    </div>
  );
}