import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  Phone, 
  Mail, 
  Heart, 
  AlertTriangle,
  Clock,
  MoreVertical,
  FileText,
  Pill,
  Stethoscope,
  Users,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PatientTable, PatientTableRow } from '@/components/shared/MedicalDataTable';
import NewPatientForm from '@/features/patients/components/NewPatientForm';

interface Patient extends PatientTableRow {
  last_consultation?: string;
  next_appointment?: string;
  consultation_count?: number;
  urgent_flags?: string[];
  recent_activity?: string;
}

export default function PatientsList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'activity' | 'age'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'upcoming' | 'urgent'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [quickStats, setQuickStats] = useState({
    total: 0,
    recentConsultations: 0,
    upcomingAppointments: 0,
    urgentCases: 0
  });
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterAndSortPatients();
  }, [patients, searchTerm, sortBy, sortDirection, filterBy]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          consultations:consultations(count),
          last_consultation:consultations(created_at).order(created_at.desc).limit(1),
          upcoming_appointment:appointments(scheduled_date).order(scheduled_date.asc).limit(1)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar datos para agregar información adicional
      const processedPatients = data?.map(patient => ({
        ...patient,
        consultation_count: patient.consultations?.[0]?.count || 0,
        last_consultation: patient.last_consultation?.[0]?.created_at,
        next_appointment: patient.upcoming_appointment?.[0]?.scheduled_date,
        urgent_flags: generateUrgentFlags(patient),
        recent_activity: getRecentActivity(patient)
      })) || [];

      setPatients(processedPatients);
      
      // Calcular estadísticas rápidas
      setQuickStats({
        total: processedPatients.length,
        recentConsultations: processedPatients.filter(p => 
          p.last_consultation && 
          new Date(p.last_consultation) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        upcomingAppointments: processedPatients.filter(p => 
          p.next_appointment && 
          new Date(p.next_appointment) > new Date()
        ).length,
        urgentCases: processedPatients.filter(p => p.urgent_flags && p.urgent_flags.length > 0).length
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateUrgentFlags = (patient: any): string[] => {
    const flags: string[] = [];
    const age = calculateAge(patient.birth_date);
    
    // Lógica para detectar casos urgentes
    if (age >= 75) flags.push('Adulto Mayor');
    if (patient.chronic_conditions?.length > 0) flags.push('Condiciones Crónicas');
    if (patient.last_consultation && 
        new Date() - new Date(patient.last_consultation) > 365 * 24 * 60 * 60 * 1000) {
      flags.push('Sin Consulta >1 año');
    }
    
    return flags;
  };

  const getRecentActivity = (patient: any): string => {
    if (patient.last_consultation) {
      const daysSince = Math.floor((new Date().getTime() - new Date(patient.last_consultation).getTime()) / (1000 * 3600 * 24));
      if (daysSince === 0) return 'Consultado hoy';
      if (daysSince === 1) return 'Consultado ayer';
      if (daysSince < 7) return `Consultado hace ${daysSince} días`;
      if (daysSince < 30) return `Consultado hace ${Math.floor(daysSince / 7)} semanas`;
      return `Consultado hace ${Math.floor(daysSince / 30)} meses`;
    }
    return 'Sin consultas registradas';
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

  const filterAndSortPatients = () => {
    let filtered = patients.filter(patient => {
      const matchesSearch = searchTerm === '' || 
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm);

      switch (filterBy) {
        case 'recent':
          return matchesSearch && patient.last_consultation && 
            new Date(patient.last_consultation) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        case 'upcoming':
          return matchesSearch && patient.next_appointment && 
            new Date(patient.next_appointment) > new Date();
        case 'urgent':
          return matchesSearch && patient.urgent_flags && patient.urgent_flags.length > 0;
        default:
          return matchesSearch;
      }
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'activity':
          aValue = new Date(a.last_consultation || 0).getTime();
          bValue = new Date(b.last_consultation || 0).getTime();
          break;
        case 'age':
          aValue = calculateAge(a.birth_date);
          bValue = calculateAge(b.birth_date);
          break;
        default:
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredPatients(filtered);
  };

  const handlePatientClick = (patient: Patient) => {
    navigate(`/expediente/${patient.id}`);
  };

  const handleNewPatient = () => {
    setShowNewPatientForm(true);
  };
  
  const handleNewPatientCreated = (newPatient: Patient) => {
    fetchPatients(); // Recargar la lista de pacientes
    navigate(`/expediente/${newPatient.id}`);
  };

  const handleQuickAction = (action: string, patientId: string) => {
    switch (action) {
      case 'prescription':
        navigate(`/recetas?paciente=${patientId}`);
        break;
      case 'consultation':
        navigate(`/expediente/${patientId}?tab=new-consultation`);
        break;
      case 'appointment':
        navigate(`/expediente/${patientId}?tab=appointments`);
        break;
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const PatientCard = ({ patient }: { patient: Patient }) => (
    <div 
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-cyan-400 transition-all cursor-pointer group"
      onClick={() => handlePatientClick(patient)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {patient.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{patient.full_name}</h3>
            <p className="text-gray-400 text-sm">{calculateAge(patient.birth_date)} años • {patient.gender}</p>
          </div>
        </div>
        
        {patient.urgent_flags && patient.urgent_flags.length > 0 && (
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-xs font-medium">{patient.urgent_flags.length}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300 text-sm">{patient.phone || 'No disponible'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300 text-sm truncate">{patient.email || 'No disponible'}</span>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Última consulta:</span>
          <span className="text-cyan-400 text-sm">{patient.recent_activity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Consultas totales:</span>
          <span className="text-white text-sm font-medium">{patient.consultation_count || 0}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAction('prescription', patient.id);
            }}
            className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            title="Nueva receta"
          >
            <Pill className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAction('consultation', patient.id);
            }}
            className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            title="Nueva consulta"
          >
            <Stethoscope className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAction('appointment', patient.id);
            }}
            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            title="Programar cita"
          >
            <Calendar className="h-4 w-4 text-white" />
          </button>
        </div>
        <span className="text-cyan-400 text-sm font-medium">Ver expediente →</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lista de Pacientes</h1>
            <p className="text-gray-400">Gestiona y consulta todos tus pacientes registrados</p>
          </div>
          <button
            onClick={handleNewPatient}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Paciente
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Total Pacientes</p>
                <p className="text-2xl font-bold text-white">{quickStats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Consultas Recientes</p>
                <p className="text-2xl font-bold text-white">{quickStats.recentConsultations}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-cyan-500 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Citas Programadas</p>
                <p className="text-2xl font-bold text-white">{quickStats.upcomingAppointments}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-red-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">Casos Urgentes</p>
                <p className="text-2xl font-bold text-white">{quickStats.urgentCases}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="all">Todos los pacientes</option>
              <option value="recent">Consultas recientes</option>
              <option value="upcoming">Citas programadas</option>
              <option value="urgent">Casos urgentes</option>
            </select>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Ordenar por:</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => toggleSort('name')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    sortBy === 'name' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Nombre {sortBy === 'name' && (sortDirection === 'asc' ? <SortAsc className="inline h-4 w-4" /> : <SortDesc className="inline h-4 w-4" />)}
                </button>
                <button
                  onClick={() => toggleSort('activity')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    sortBy === 'activity' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Actividad {sortBy === 'activity' && (sortDirection === 'asc' ? <SortAsc className="inline h-4 w-4" /> : <SortDesc className="inline h-4 w-4" />)}
                </button>
                <button
                  onClick={() => toggleSort('age')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    sortBy === 'age' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Edad {sortBy === 'age' && (sortDirection === 'asc' ? <SortAsc className="inline h-4 w-4" /> : <SortDesc className="inline h-4 w-4" />)}
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {error ? (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-6 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Error: {error}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Mostrando {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No se encontraron pacientes</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterBy !== 'all' 
                    ? 'Intenta ajustar tus filtros de búsqueda' 
                    : 'Comienza agregando tu primer paciente'
                  }
                </p>
                <button
                  onClick={handleNewPatient}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all"
                >
                  <Plus className="h-5 w-5 mr-2 inline" />
                  Agregar Primer Paciente
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <PatientTable
                  patients={filteredPatients}
                  onPatientClick={handlePatientClick}
                  loading={false}
                />
              </div>
            )}
          </>
        )}
      </div>

      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientCreated}
      />
    </div>
  );
}

