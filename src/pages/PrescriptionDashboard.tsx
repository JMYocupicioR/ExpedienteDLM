import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, FileText, Search, Filter, Calendar, User, 
  Printer, Download, Edit, Eye, Clock, AlertTriangle,
  Pill, Stethoscope, Activity, BookOpen, Save, Copy
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Prescription = {
  id: string;
  patient_id: string;
  patient_name: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  diagnosis: string;
  notes: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'dispensed';
  doctor_signature?: string;
};

type PredefinedPrescription = {
  id: string;
  name: string;
  category: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  diagnosis: string;
  notes: string;
};

type NewPrescriptionData = {
  patient_id: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  diagnosis: string;
  notes: string;
  expires_at: string;
};

export default function PrescriptionDashboard() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [predefinedPrescriptions, setPredefinedPrescriptions] = useState<PredefinedPrescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'history' | 'templates'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'dispensed'>('all');
  
  // Nueva receta
  const [newPrescription, setNewPrescription] = useState<NewPrescriptionData>({
    patient_id: '',
    medications: [{
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }],
    diagnosis: '',
    notes: '',
    expires_at: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchPrescriptions();
    fetchPredefinedPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      // Simulando datos de recetas
      const mockPrescriptions: Prescription[] = [
        {
          id: '1',
          patient_id: '1',
          patient_name: 'Juan Pérez',
          medications: [
            {
              name: 'Amoxicilina',
              dosage: '500mg',
              frequency: 'Cada 8 horas',
              duration: '7 días',
              instructions: 'Con alimentos'
            }
          ],
          diagnosis: 'Infección respiratoria',
          notes: 'Paciente alérgico a penicilina',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          id: '2',
          patient_id: '2',
          patient_name: 'María García',
          medications: [
            {
              name: 'Ibuprofeno',
              dosage: '400mg',
              frequency: 'Cada 6 horas',
              duration: '5 días',
              instructions: 'Después de las comidas'
            }
          ],
          diagnosis: 'Dolor lumbar',
          notes: '',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        }
      ];
      setPrescriptions(mockPrescriptions);
    } catch (err) {
      setError('Error al cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPredefinedPrescriptions = async () => {
    try {
      const mockPredefined: PredefinedPrescription[] = [
        {
          id: '1',
          name: 'Tratamiento Hipertensión',
          category: 'Cardiovascular',
          medications: [
            {
              name: 'Enalapril',
              dosage: '10mg',
              frequency: 'Una vez al día',
              duration: '30 días',
              instructions: 'En ayunas'
            }
          ],
          diagnosis: 'Hipertensión arterial',
          notes: 'Controlar presión arterial semanalmente'
        },
        {
          id: '2',
          name: 'Antibiótico Infección',
          category: 'Infectología',
          medications: [
            {
              name: 'Amoxicilina',
              dosage: '500mg',
              frequency: 'Cada 8 horas',
              duration: '7 días',
              instructions: 'Con alimentos'
            }
          ],
          diagnosis: 'Infección bacteriana',
          notes: 'Completar todo el tratamiento'
        }
      ];
      setPredefinedPrescriptions(mockPredefined);
    } catch (err) {
      setError('Error al cargar las plantillas');
    }
  };

  const handleNewPrescription = async () => {
    try {
      setIsLoading(true);
      // Aquí iría la lógica para guardar la nueva receta
      console.log('Nueva receta:', newPrescription);
      await fetchPrescriptions();
      setActiveTab('dashboard');
      // Reset form
      setNewPrescription({
        patient_id: '',
        medications: [{
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        }],
        diagnosis: '',
        notes: '',
        expires_at: ''
      });
    } catch (err) {
      setError('Error al crear la receta');
    } finally {
      setIsLoading(false);
    }
  };

  const addMedication = () => {
    setNewPrescription(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }]
    }));
  };

  const removeMedication = (index: number) => {
    setNewPrescription(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index: number, field: string, value: string) => {
    setNewPrescription(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const filteredPrescriptions = prescriptions.filter((prescription: Prescription) => {
    const matchesSearch = prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
    const matchesDate = !filterDate || prescription.created_at.includes(filterDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const recentPrescriptions = prescriptions.slice(0, 5);
  const expiringSoon = prescriptions.filter(p => {
    const expiryDate = new Date(p.expires_at);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  });

  const activePrescriptions = prescriptions.filter(p => p.status === 'active').length;
  const expiredPrescriptions = prescriptions.filter(p => p.status === 'expired').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Recetas Médicas</h1>
            </div>
            <button
              onClick={() => setActiveTab('new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Receta
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Panel Principal', icon: Activity },
              { id: 'new', label: 'Nueva Receta', icon: Plus },
              { id: 'history', label: 'Historial', icon: FileText },
              { id: 'templates', label: 'Plantillas', icon: BookOpen }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Panel Principal */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Indicadores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Recetas Activas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {activePrescriptions}
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
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Por Vencer
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {expiringSoon.length}
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
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Vencidas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {expiredPrescriptions}
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
                      <Pill className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Recetas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {prescriptions.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recetas Recientes */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Últimas 5 Recetas Emitidas
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Diagnóstico
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medicamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentPrescriptions.map((prescription: Prescription) => (
                        <tr key={prescription.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">
                                {prescription.patient_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{prescription.diagnosis}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {prescription.medications.length} medicamento(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(prescription.created_at), "dd/MM/yyyy")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                              prescription.status === 'expired' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {prescription.status === 'active' ? 'Activa' :
                               prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                <Printer className="h-4 w-4" />
                              </button>
                              <button className="text-green-600 hover:text-green-900">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recetas por Vencer */}
            {expiringSoon.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Recetas por Vencer
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Tienes {expiringSoon.length} receta(s) que vencen en los próximos 7 días.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nueva Receta */}
        {activeTab === 'new' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Crear Nueva Receta
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleNewPrescription(); }} className="space-y-6">
                {/* Información del Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Paciente
                    </label>
                    <select
                      value={newPrescription.patient_id}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, patient_id: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar paciente</option>
                      <option value="1">Juan Pérez</option>
                      <option value="2">María García</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={newPrescription.expires_at.split('T')[0]}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Diagnóstico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Diagnóstico
                  </label>
                  <input
                    type="text"
                    value={newPrescription.diagnosis}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Ingrese el diagnóstico"
                    required
                  />
                </div>

                {/* Medicamentos */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Medicamentos
                    </label>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Medicamento
                    </button>
                  </div>
                  
                  {newPrescription.medications.map((medication, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Medicamento
                          </label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Nombre del medicamento"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Dosis
                          </label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="ej. 500mg"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Frecuencia
                          </label>
                          <input
                            type="text"
                            value={medication.frequency}
                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="ej. Cada 8 horas"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Duración
                          </label>
                          <input
                            type="text"
                            value={medication.duration}
                            onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="ej. 7 días"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Instrucciones
                          </label>
                          <input
                            type="text"
                            value={medication.instructions}
                            onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="ej. Con alimentos"
                          />
                        </div>
                      </div>
                      
                      {newPrescription.medications.length > 1 && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar medicamento
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={newPrescription.notes}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Notas adicionales para el paciente o farmacéutico"
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2 inline" />
                    {isLoading ? 'Guardando...' : 'Crear Receta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Historial */}
        {activeTab === 'history' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Historial de Recetas
                </h3>
                
                {/* Filtros */}
                <div className="flex space-x-4">
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente o diagnóstico..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activas</option>
                    <option value="expired">Vencidas</option>
                    <option value="dispensed">Dispensadas</option>
                  </select>
                  
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Diagnóstico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicamentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPrescriptions.map((prescription: Prescription) => (
                      <tr key={prescription.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900">
                              {prescription.patient_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{prescription.diagnosis}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {prescription.medications.map(med => med.name).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(prescription.created_at), "dd/MM/yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(prescription.expires_at), "dd/MM/yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                            prescription.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {prescription.status === 'active' ? 'Activa' :
                             prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Printer className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Download className="h-4 w-4" />
                            </button>
                            <button className="text-blue-600 hover:text-blue-900">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Plantillas */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Prescripciones Predeterminadas
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5 mr-2" />
                Nueva Plantilla
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predefinedPrescriptions.map((template: PredefinedPrescription) => (
                <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{template.diagnosis}</p>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Medicamentos:</h5>
                      <ul className="mt-1 text-sm text-gray-600">
                        {template.medications.map((med, index) => (
                          <li key={index}>• {med.name} - {med.dosage}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </button>
                      <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        <Copy className="h-4 w-4 mr-2" />
                        Usar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 