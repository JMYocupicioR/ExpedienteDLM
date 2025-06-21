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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    checkSession();
  }, []);

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

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      await fetchDashboardData();
    } catch (err) {
      console.error('Session check error:', err);
      navigate('/auth');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
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
      setLoading(false);
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
      setLoading(true);
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
      setLoading(false);
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

  if (loading && !userProfile) {
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
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={handleExportMenuToggle}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center mr-3"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar
                  </button>
                  
                  {showExportMenu && (
                    <div className="export-menu absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                      <div className="py-1">
                        <button
                          onClick={handlePrint}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <Printer className="h-4 w-4 mr-3" />
                          Imprimir
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <FileDown className="h-4 w-4 mr-3" />
                          Exportar como PDF
                        </button>
                        <button
                          onClick={handleExportTXT}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Paciente
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border-b border-red-700 text-red-300 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            {filteredPatients.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Edad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {patient.full_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{patient.full_name}</div>
                            <div className="text-sm text-gray-400 capitalize">{patient.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {calculateAge(patient.birth_date)} años
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{patient.email}</div>
                        <div className="text-sm text-gray-400">{patient.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {format(new Date(patient.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/expediente/${patient.id}`)}
                          className="text-blue-400 hover:text-blue-300 mr-3 transition-colors"
                          title="Ver expediente"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <div className="relative inline-block">
                          <button 
                            onClick={() => handlePatientActionsToggle(patient.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Más opciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                                                     {showPatientActions === patient.id && (
                             <div className="patient-actions-menu absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    navigate(`/recetas?paciente=${patient.id}`);
                                    setShowPatientActions(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-cyan-300 hover:bg-gray-700 hover:text-cyan-200 transition-colors"
                                >
                                  <FileText className="h-4 w-4 mr-3" />
                                  Emitir Receta
                                </button>
                                <button
                                  onClick={() => handleNewConsultation(patient.id)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-green-300 hover:bg-gray-700 hover:text-green-200 transition-colors"
                                >
                                  <Plus className="h-4 w-4 mr-3" />
                                  Nueva Consulta
                                </button>
                                <button
                                  onClick={() => navigate(`/expediente/${patient.id}`)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-blue-300 hover:bg-gray-700 hover:text-blue-200 transition-colors"
                                >
                                  <Eye className="h-4 w-4 mr-3" />
                                  Ver Expediente
                                </button>
                                <button
                                  onClick={() => handleEditPatient(patient)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-3" />
                                  Editar Paciente
                                </button>
                                <button
                                  onClick={() => handleDeletePatient(patient.id)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Eliminar Paciente
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No hay pacientes</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {searchTerm ? 'No se encontraron pacientes que coincidan con tu búsqueda.' : 'Comienza agregando un nuevo paciente.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowNewPatientForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Paciente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Patient Modal */}
      {showNewPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Nuevo Paciente</h3>
              <button
                onClick={() => setShowNewPatientForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
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
                  />
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
                  />
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
                  />
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
                  />
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
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
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
              setUserProfile(updatedProfile);
              console.log('Profile updated:', updatedProfile);
            }
          }}
        />
      )}
    </div>
  );
}