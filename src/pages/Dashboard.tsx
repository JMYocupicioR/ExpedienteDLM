import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Activity, FileText, Plus, Search, Filter, 
  MoreVertical, Edit, Trash2, Eye, Settings, LogOut, Bell,
  TrendingUp, Clock, Heart, Brain, Stethoscope, AlertCircle,
  CheckCircle, RefreshCw, Download, Upload, BarChart3, X,
  FileDown, Printer, FileText as FileTextIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SettingsModal from '../components/SettingsModal';
import { PatientTable } from '../components/MedicalDataTable';
import type { PatientTableRow } from '../components/MedicalDataTable';
import { useAuth } from '../hooks/useAuth';

interface Patient {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  email: string;
  phone: string;
  created_at: string;
}

interface DashboardStats {
  totalPatients: number;
  totalConsultations: number;
  pendingTasks: number;
  todayAppointments: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    user, 
    profile: userProfile, 
    loading: authLoading, 
    signOut, 
    isAuthenticated 
  } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientActions, setShowPatientActions] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalConsultations: 0,
    pendingTasks: 0,
    todayAppointments: 0
  });

  // New patient form state
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    birth_date: '',
    gender: 'masculino',
    email: '',
    phone: '',
    address: '',
    city_of_birth: '',
    city_of_residence: '',
    social_security_number: ''
  });

  useEffect(() => {
    // Si la autenticación ha terminado y no hay usuario, redirigir
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    // Si el perfil está disponible, cargar los datos del dashboard
    if (userProfile) {
      fetchDashboardData();
    }
  }, [userProfile]);

  useEffect(() => {
    const filtered = patients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm)
    );
    setFilteredPatients(filtered);
  }, [patients, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.patient-actions-menu') && 
          !target.closest('.notifications-menu') && 
          !target.closest('.export-menu')) {
        setShowPatientActions(null);
        setShowNotifications(false);
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      setError(null);

      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Fetch consultations for stats
      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select('id, created_at');

      if (consultationsError) throw consultationsError;

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayConsultations = consultationsData?.filter(c => 
        c.created_at.startsWith(today)
      ).length || 0;

      setStats({
        totalPatients: patientsData?.length || 0,
        totalConsultations: consultationsData?.length || 0,
        pendingTasks: Math.floor(Math.random() * 10), // Mock data
        todayAppointments: todayConsultations
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDashboardLoading(true);
      setError(null);

      const { error } = await supabase
        .from('patients')
        .insert([newPatient]);

      if (error) throw error;

      setShowNewPatientForm(false);
      setNewPatient({
        full_name: '',
        birth_date: '',
        gender: 'masculino',
        email: '',
        phone: '',
        address: '',
        city_of_birth: '',
        city_of_residence: '',
        social_security_number: ''
      });
      
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      setError(error.message);
    } finally {
      setDashboardLoading(false);
    }
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este paciente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDashboardLoading(true);
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;
      
      await fetchDashboardData();
      setShowPatientActions(null);
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      setError(error.message);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    // Aquí podrías abrir un modal de edición o navegar a una página de edición
    setSelectedPatient(patient);
    setShowPatientActions(null);
    // Por ahora, navegar al expediente del paciente
    navigate(`/expediente/${patient.id}`);
  };

  const handlePatientActionsToggle = (patientId: string) => {
    setShowPatientActions(showPatientActions === patientId ? null : patientId);
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNewConsultation = (patientId: string) => {
    // Navegar al expediente del paciente con parámetro para abrir nueva consulta
    navigate(`/expediente/${patientId}?nueva-consulta=true`);
    setShowPatientActions(null);
  };

  const handleExportMenuToggle = () => {
    setShowExportMenu(!showExportMenu);
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lista de Pacientes - Expediente DLM</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .header-info { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setShowExportMenu(false);
  };

  const handleExportTXT = () => {
    const txtContent = generateTXTContent();
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pacientes_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    // Para PDF, vamos a generar un HTML que se puede imprimir como PDF
    const pdfContent = generatePrintContent();
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head>
            <title>Lista de Pacientes - Expediente DLM</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .header-info { margin-bottom: 20px; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${pdfContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      pdfWindow.document.close();
    }
    setShowExportMenu(false);
  };

  const generatePrintContent = () => {
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    return `
      <div class="header-info">
        <h1>Lista de Pacientes - Expediente DLM</h1>
        <p><strong>Fecha de generación:</strong> ${currentDate}</p>
        <p><strong>Total de pacientes:</strong> ${filteredPatients.length}</p>
        <p><strong>Generado por:</strong> ${userProfile?.full_name}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Edad</th>
            <th>Género</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Fecha de Registro</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPatients.map(patient => `
            <tr>
              <td>${patient.full_name}</td>
              <td>${calculateAge(patient.birth_date)} años</td>
              <td style="text-transform: capitalize;">${patient.gender}</td>
              <td>${patient.email}</td>
              <td>${patient.phone}</td>
              <td>${format(new Date(patient.created_at), 'dd/MM/yyyy')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateTXTContent = () => {
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    let content = `LISTA DE PACIENTES - EXPEDIENTE DLM\n`;
    content += `===========================================\n\n`;
    content += `Fecha de generación: ${currentDate}\n`;
    content += `Total de pacientes: ${filteredPatients.length}\n`;
    content += `Generado por: ${userProfile?.full_name}\n\n`;
    
    content += `DATOS DE PACIENTES:\n`;
    content += `===================\n\n`;
    
    filteredPatients.forEach((patient, index) => {
      content += `${index + 1}. ${patient.full_name}\n`;
      content += `   - Edad: ${calculateAge(patient.birth_date)} años\n`;
      content += `   - Género: ${patient.gender}\n`;
      content += `   - Email: ${patient.email}\n`;
      content += `   - Teléfono: ${patient.phone}\n`;
      content += `   - Fecha de registro: ${format(new Date(patient.created_at), 'dd/MM/yyyy')}\n\n`;
    });
    
    return content;
  };

  if (authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <span className="ml-2 text-xl font-bold text-white">Expediente DLM</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={handleNotificationsToggle}
                  className="p-2 text-gray-400 hover:text-white transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                
                {showNotifications && (
                  <div className="notifications-menu absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-sm font-medium text-white">Notificaciones</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="p-4 hover:bg-gray-700 transition-colors">
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                          <div>
                            <p className="text-sm text-white">Nueva consulta programada</p>
                            <p className="text-xs text-gray-400 mt-1">Hace 2 horas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 hover:bg-gray-700 transition-colors">
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                          <div>
                            <p className="text-sm text-white">Paciente registrado exitosamente</p>
                            <p className="text-xs text-gray-400 mt-1">Hace 4 horas</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 hover:bg-gray-700 transition-colors">
                        <div className="flex items-start">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></div>
                          <div>
                            <p className="text-sm text-white">Recordatorio de cita</p>
                            <p className="text-xs text-gray-400 mt-1">Hace 1 día</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-gray-700">
                      <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Ver todas las notificaciones
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative group">
                <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {userProfile?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{userProfile?.full_name}</p>
                    <p className="text-xs text-gray-400">{userProfile?.role}</p>
                  </div>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Configuración
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenido, {userProfile?.full_name}
          </h1>
          <p className="text-gray-400">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Pacientes</p>
                <p className="text-2xl font-bold text-white">{stats.totalPatients}</p>
              </div>
              <Users className="h-8 w-8 text-cyan-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Consultas Totales</p>
                <p className="text-2xl font-bold text-white">{stats.totalConsultations}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Citas Hoy</p>
                <p className="text-2xl font-bold text-white">{stats.todayAppointments}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tareas Pendientes</p>
                <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Patients Section */}
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Pacientes</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar pacientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Buscar pacientes por nombre, email o teléfono"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={handleExportMenuToggle}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center mr-3"
                    aria-label="Exportar lista de pacientes"
                    aria-expanded={showExportMenu}
                    aria-haspopup="menu"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar
                  </button>
                  
                  {showExportMenu && (
                    <div 
                      className="export-menu absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10"
                      role="menu"
                      aria-labelledby="export-menu-button"
                    >
                      <div className="py-1">
                        <button
                          onClick={handlePrint}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          role="menuitem"
                          aria-label="Imprimir lista de pacientes"
                        >
                          <Printer className="h-4 w-4 mr-3" />
                          Imprimir
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          role="menuitem"
                          aria-label="Exportar como archivo PDF"
                        >
                          <FileDown className="h-4 w-4 mr-3" />
                          Exportar como PDF
                        </button>
                        <button
                          onClick={handleExportTXT}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          role="menuitem"
                          aria-label="Exportar como archivo de texto"
                        >
                          <FileTextIcon className="h-4 w-4 mr-3" />
                          Exportar como TXT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setShowNewPatientForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  aria-label="Registrar nuevo paciente en el sistema"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Paciente
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border-b border-red-700 text-red-300 flex items-center" role="alert">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Usar tabla accesible mejorada */}
          <PatientTable
            patients={filteredPatients as PatientTableRow[]}
            onPatientClick={(patient) => navigate(`/expediente/${patient.id}`)}
            loading={dashboardLoading}
            error={error}
          />
        </div>
      </main>

      {/* New Patient Modal */}
      {showNewPatientForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-labelledby="new-patient-title"
          aria-describedby="new-patient-description"
        >
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 id="new-patient-title" className="text-lg font-medium text-white">Registrar Nuevo Paciente</h3>
              <button
                onClick={() => setShowNewPatientForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Cerrar formulario de nuevo paciente"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div id="new-patient-description" className="sr-only">
              Formulario para registrar un nuevo paciente en el sistema de expedientes médicos.
              Complete todos los campos obligatorios marcados con asterisco.
            </div>

            <form onSubmit={handleCreatePatient} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatient.full_name}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    aria-required="true"
                    aria-describedby="full-name-help"
                  />
                  <div id="full-name-help" className="sr-only">
                    Ingrese el nombre completo del paciente incluyendo apellidos
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newPatient.birth_date}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    aria-required="true"
                    aria-describedby="birth-date-help"
                  />
                  <div id="birth-date-help" className="sr-only">
                    Seleccione la fecha de nacimiento del paciente para calcular la edad automáticamente
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Género *
                  </label>
                  <select
                    required
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    aria-required="true"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newPatient.email}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    aria-required="true"
                    aria-describedby="email-help"
                  />
                  <div id="email-help" className="sr-only">
                    Dirección de correo electrónico para comunicaciones médicas importantes
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    aria-required="true"
                    aria-describedby="phone-help"
                    placeholder="Ej: +52 555 123 4567"
                  />
                  <div id="phone-help" className="sr-only">
                    Número de teléfono de contacto principal del paciente
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ciudad de Nacimiento
                  </label>
                  <input
                    type="text"
                    value={newPatient.city_of_birth}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, city_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ciudad de Residencia
                  </label>
                  <input
                    type="text"
                    value={newPatient.city_of_residence}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, city_of_residence: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número de Seguro Social
                  </label>
                  <input
                    type="text"
                    value={newPatient.social_security_number}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, social_security_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dirección
                  </label>
                  <textarea
                    value={newPatient.address}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPatientForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  aria-label="Cancelar registro de nuevo paciente"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dashboardLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  aria-label="Guardar nuevo paciente en el sistema"
                >
                  {dashboardLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Paciente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {userProfile && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userProfile={userProfile}
          onUpdate={(updatedProfile) => {
            if (updatedProfile) {
              // Assuming useAuth handles state updates for profile
              // No need to setUserProfile here directly, as useAuth will manage it
              console.log('Profile updated:', updatedProfile);
            }
          }}
        />
      )}
    </div>
  );
}