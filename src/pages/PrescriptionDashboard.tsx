import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, FileText, Search, Filter, Calendar, User, 
  Printer, Download, Edit, Eye, Clock, AlertTriangle,
  Pill, Stethoscope, Activity, BookOpen, Save, Copy,
  GripVertical, RotateCcw, Settings, Shield, QrCode,
  History, Wifi, WifiOff, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SectionData {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  defaultOrder: number;
}

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'history' | 'templates' | 'layout'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'dispensed'>('all');
  const [patients, setPatients] = useState<{id: string, full_name: string}[]>([]);
  
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

  // Estados para el editor de layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'seccion-superior', 
    'prescripcion', 
    'info-receta'
  ]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchPrescriptions();
    fetchPredefinedPrescriptions();
    fetchPatients();
    
    // Verificar si hay un paciente preseleccionado en la URL
    const pacienteId = searchParams.get('paciente');
    if (pacienteId) {
      setNewPrescription(prev => ({ ...prev, patient_id: pacienteId }));
      setActiveTab('new'); // Cambiar a la pestaña de nueva receta
    }
  }, [searchParams]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

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

  // Funciones para el editor de layout
  const updatePrintStyles = (order: string[]) => {
    let existingStyle = document.querySelector('#css-print-orden');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'css-print-orden';
    style.textContent = `
      @media print {
        body { margin: 0; padding: 0; }
        .no-print { display: none !important; }
        .print-container { 
          display: flex; 
          flex-direction: column; 
          width: 100%; 
          height: 100vh;
          overflow: hidden;
        }
        .seccion { 
          page-break-inside: avoid;
          margin-bottom: 1rem;
        }
        ${order.map((id: string, idx: number) => `
          .seccion[data-section-id="${id}"] { 
            order: ${idx + 1}; 
          }
        `).join('\n')}
      }
    `;
    document.head.appendChild(style);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handleSaveOrder = () => {
    localStorage.setItem('prescription-section-order', JSON.stringify(sectionOrder));
    alert('Orden de secciones guardado correctamente');
  };

  const handleResetOrder = () => {
    const defaultOrder = ['seccion-superior', 'prescripcion', 'info-receta'];
    setSectionOrder(defaultOrder);
    updatePrintStyles(defaultOrder);
    localStorage.removeItem('prescription-section-order');
  };

  // Función para manejar el drag and drop con react-beautiful-dnd
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSectionOrder(items);
    updatePrintStyles(items);
    localStorage.setItem('prescription-section-order', JSON.stringify(items));
  };

  // Definición de las secciones con datos por defecto
  const getSectionData = (): SectionData[] => {
    const defaultData = {
      patient: { name: 'Paciente Ejemplo', age: 35, address: 'Dirección del paciente' },
      doctor: { name: 'Dr. Juan Médico', license: 'CED-12345678', specialty: 'Medicina General' },
      medications: [
        { name: 'Amoxicilina', dosage: '500mg', frequency: 'Cada 8 horas', duration: '7 días', instructions: 'Con alimentos' },
        { name: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 6 horas', duration: '5 días', instructions: 'Después de las comidas' }
      ],
      vitalSigns: { bloodPressure: '120/80 mmHg', heartRate: '72 bpm', temperature: '36.5°C', weight: '70 kg' },
      diagnosis: 'Infección respiratoria aguda',
      recommendations: 'Reposo relativo, abundantes líquidos, evitar cambios bruscos de temperatura.',
      date: new Date().toLocaleDateString('es-ES')
    };

    return [
      {
        id: 'seccion-superior',
        title: 'Encabezado y Títulos',
        icon: FileText,
        defaultOrder: 1,
        content: (
          <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
            <div className="flex items-center justify-center mb-2">
              <Stethoscope className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">RECETA MÉDICA</h1>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-semibold">{defaultData.doctor.name}</p>
              <p>{defaultData.doctor.specialty}</p>
              <p>Cédula Profesional: {defaultData.doctor.license}</p>
            </div>
            <div className="mt-2 text-right text-sm text-gray-500">
              Fecha: {defaultData.date}
            </div>
          </div>
        )
      },
      {
        id: 'prescripcion',
        title: 'Prescripción de Medicamentos',
        icon: Pill,
        defaultOrder: 2,
        content: (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Pill className="h-5 w-5 mr-2" />
              PRESCRIPCIÓN
            </h2>
            <div className="space-y-3">
              {defaultData.medications.map((med, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-medium text-gray-900">{med.name}</div>
                  <div className="text-sm text-gray-600">
                    <span className="inline-block mr-4">Dosis: {med.dosage}</span>
                    <span className="inline-block mr-4">Frecuencia: {med.frequency}</span>
                    <span className="inline-block">Duración: {med.duration}</span>
                  </div>
                  {med.instructions && (
                    <div className="text-sm text-gray-500 italic">
                      Instrucciones: {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      },
      {
        id: 'info-receta',
        title: 'Información Clínica',
        icon: Stethoscope,
        defaultOrder: 3,
        content: (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              INFORMACIÓN CLÍNICA
            </h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-700 mb-2">Datos del Paciente:</h3>
              <p><span className="font-medium">Nombre:</span> {defaultData.patient.name}</p>
              <p><span className="font-medium">Edad:</span> {defaultData.patient.age} años</p>
              <p><span className="font-medium">Dirección:</span> {defaultData.patient.address}</p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-medium text-gray-700 mb-2">Signos Vitales:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-medium">Presión Arterial:</span> {defaultData.vitalSigns.bloodPressure}</p>
                <p><span className="font-medium">Frecuencia Cardíaca:</span> {defaultData.vitalSigns.heartRate}</p>
                <p><span className="font-medium">Temperatura:</span> {defaultData.vitalSigns.temperature}</p>
                <p><span className="font-medium">Peso:</span> {defaultData.vitalSigns.weight}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded">
              <h3 className="font-medium text-gray-700 mb-2">Diagnóstico:</h3>
              <p className="text-sm">{defaultData.diagnosis}</p>
            </div>

            <div className="p-3 bg-yellow-50 rounded">
              <h3 className="font-medium text-gray-700 mb-2">Recomendaciones Generales:</h3>
              <p className="text-sm">{defaultData.recommendations}</p>
            </div>
          </div>
        )
      }
    ];
  };

  // Cargar orden guardado al montar el componente
  useEffect(() => {
    const savedOrder = localStorage.getItem('prescription-section-order');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        setSectionOrder(order);
        updatePrintStyles(order);
      } catch (error) {
        console.error('Error loading saved order:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="dark-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <h1 className="text-2xl font-bold text-gray-100">Dashboard de Recetas Médicas</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 dark-button-secondary"
              >
                Volver al Dashboard
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className="inline-flex items-center px-4 py-2 dark-button-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nueva Receta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dark-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Panel Principal', icon: Activity },
              { id: 'new', label: 'Nueva Receta', icon: Plus },
              { id: 'history', label: 'Historial', icon: FileText },
              { id: 'templates', label: 'Plantillas', icon: BookOpen },
              { id: 'layout', label: 'Editor de Layout', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
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
          <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Panel Principal */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Indicadores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="dark-card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">
                          Recetas Activas
                        </dt>
                        <dd className="text-lg font-medium text-gray-100">
                          {activePrescriptions}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dark-card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">
                          Por Vencer
                        </dt>
                        <dd className="text-lg font-medium text-gray-100">
                          {expiringSoon.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dark-card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">
                          Vencidas
                        </dt>
                        <dd className="text-lg font-medium text-gray-100">
                          {expiredPrescriptions}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dark-card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Pill className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">
                          Total Recetas
                        </dt>
                        <dd className="text-lg font-medium text-gray-100">
                          {prescriptions.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recetas Recientes */}
            <div className="dark-card">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-100 mb-4">
                  Últimas 5 Recetas Emitidas
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Diagnóstico
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Medicamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentPrescriptions.map((prescription: Prescription) => (
                        <tr key={prescription.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-200">
                                {prescription.patient_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{prescription.diagnosis}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {prescription.medications.length} medicamento(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {format(new Date(prescription.created_at), "dd/MM/yyyy")}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              prescription.status === 'active' ? 'bg-green-900 text-green-300' :
                              prescription.status === 'expired' ? 'bg-red-900 text-red-300' :
                              'bg-yellow-900 text-yellow-300'
                            }`}>
                              {prescription.status === 'active' ? 'Activa' :
                               prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-gray-400 hover:text-gray-300 transition-colors">
                                <Printer className="h-4 w-4" />
                              </button>
                              <button className="text-green-400 hover:text-green-300 transition-colors">
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
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-300">
                      Recetas por Vencer
                    </h3>
                    <div className="mt-2 text-sm text-yellow-200">
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
          <div className="dark-card">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-100 mb-6">
                Crear Nueva Receta
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleNewPrescription(); }} className="space-y-6">
                {/* Información del Paciente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Paciente
                    </label>
                    <select
                      value={newPrescription.patient_id}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, patient_id: e.target.value }))}
                      className="mt-1 block w-full dark-input"
                      required
                    >
                      <option value="">Seleccionar paciente</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={newPrescription.expires_at.split('T')[0]}
                      onChange={(e) => setNewPrescription(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="mt-1 block w-full dark-input"
                      required
                    />
                  </div>
                </div>

                {/* Diagnóstico */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Diagnóstico
                  </label>
                  <input
                    type="text"
                    value={newPrescription.diagnosis}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="mt-1 block w-full dark-input"
                    placeholder="Ingrese el diagnóstico"
                    required
                  />
                </div>

                {/* Medicamentos */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-300">
                      Medicamentos
                    </label>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-cyan-300 bg-cyan-900/30 hover:bg-cyan-900/50 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Medicamento
                    </button>
                  </div>
                  
                  {newPrescription.medications.map((medication, index) => (
                    <div key={index} className="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Medicamento
                          </label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            className="mt-1 block w-full dark-input"
                            placeholder="Nombre del medicamento"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Dosis
                          </label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            className="mt-1 block w-full dark-input"
                            placeholder="ej. 500mg"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Frecuencia
                          </label>
                          <input
                            type="text"
                            value={medication.frequency}
                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            className="mt-1 block w-full dark-input"
                            placeholder="ej. Cada 8 horas"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300">
                            Duración
                          </label>
                          <input
                            type="text"
                            value={medication.duration}
                            onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                            className="mt-1 block w-full dark-input"
                            placeholder="ej. 7 días"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Instrucciones
                          </label>
                          <input
                            type="text"
                            value={medication.instructions}
                            onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                            className="mt-1 block w-full dark-input"
                            placeholder="ej. Con alimentos"
                          />
                        </div>
                      </div>
                      
                      {newPrescription.medications.length > 1 && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-red-400 hover:text-red-300 text-sm transition-colors"
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
                  <label className="block text-sm font-medium text-gray-300">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={newPrescription.notes}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full dark-input"
                    placeholder="Notas adicionales para el paciente o farmacéutico"
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-4 py-2 text-sm font-medium dark-button-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium dark-button-primary"
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
          <div className="dark-card">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-100">
                  Historial de Recetas
                </h3>
                
                {/* Filtros */}
                <div className="flex space-x-4">
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente o diagnóstico..."
                      className="pl-10 pr-4 py-2 dark-input"
                      value={searchTerm}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="dark-input"
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
                    className="dark-input"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Diagnóstico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Medicamentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Vence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredPrescriptions.map((prescription: Prescription) => (
                      <tr key={prescription.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-200">
                              {prescription.patient_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{prescription.diagnosis}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {prescription.medications.map(med => med.name).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {format(new Date(prescription.created_at), "dd/MM/yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {format(new Date(prescription.expires_at), "dd/MM/yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            prescription.status === 'active' ? 'bg-green-900 text-green-300' :
                            prescription.status === 'expired' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {prescription.status === 'active' ? 'Activa' :
                             prescription.status === 'expired' ? 'Vencida' : 'Dispensada'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-300 transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-300 transition-colors">
                              <Printer className="h-4 w-4" />
                            </button>
                            <button className="text-green-400 hover:text-green-300 transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                            <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
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
              <h3 className="text-lg leading-6 font-medium text-gray-100">
                Prescripciones Predeterminadas
              </h3>
              <button className="inline-flex items-center px-4 py-2 dark-button-primary">
                <Plus className="h-5 w-5 mr-2" />
                Nueva Plantilla
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predefinedPrescriptions.map((template: PredefinedPrescription) => (
                <div key={template.id} className="dark-card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-100">{template.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900 text-cyan-300">
                        {template.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{template.diagnosis}</p>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-300">Medicamentos:</h5>
                      <ul className="mt-1 text-sm text-gray-400">
                        {template.medications.map((med, index) => (
                          <li key={index}>• {med.name} - {med.dosage}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 inline-flex justify-center items-center px-3 py-2 dark-button-secondary text-sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </button>
                      <button className="flex-1 inline-flex justify-center items-center px-3 py-2 dark-button-primary text-sm">
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

        {/* Editor de Layout */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            {/* Controles */}
            <div className="no-print dark-card p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-100">
                  Editor de Layout de Receta
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleResetOrder}
                    className="inline-flex items-center px-3 py-2 dark-button-secondary text-sm"
                    title="Restablecer orden por defecto"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Resetear
                  </button>
                  <button
                    onClick={handleSaveOrder}
                    className="inline-flex items-center px-3 py-2 dark-button-secondary text-sm"
                    title="Guardar orden actual"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </button>
                  <button
                    onClick={handlePreview}
                    className={`inline-flex items-center px-3 py-2 text-sm ${
                      isPreviewMode 
                        ? 'dark-button-primary' 
                        : 'dark-button-secondary'
                    }`}
                    title="Vista previa de impresión"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {isPreviewMode ? 'Salir Vista Previa' : 'Vista Previa'}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center px-3 py-2 dark-button-primary text-sm"
                    title="Imprimir receta"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir
                  </button>
                </div>
              </div>
              
              {!isPreviewMode && (
                <div className="text-sm text-gray-400">
                  <p className="flex items-center">
                    <GripVertical className="h-4 w-4 mr-2" />
                    Arrastra las secciones por el ícono de líneas para reordenarlas según tus preferencias de impresión.
                  </p>
                </div>
              )}
            </div>

            {/* Contenedor de secciones con DragDropContext */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="prescription-sections" isDropDisabled={isPreviewMode}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`print-container space-y-4 ${
                      isPreviewMode ? 'bg-white shadow-lg rounded-lg p-6 print-friendly' : ''
                    } ${snapshot.isDraggingOver ? 'bg-gray-800/50' : ''}`}
                  >
                    {sectionOrder.map((sectionId, index) => {
                      const sectionData = getSectionData().find(s => s.id === sectionId);
                      if (!sectionData) return null;
                      
                      const IconComponent = sectionData.icon;
                      
                      return (
                        <Draggable 
                          key={sectionId} 
                          draggableId={sectionId} 
                          index={index}
                          isDragDisabled={isPreviewMode}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              data-section-id={sectionId}
                              className={`seccion ${
                                isPreviewMode ? 'bg-white border-transparent' : 'dark-card'
                              } ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                                transition: snapshot.isDragging ? 'none' : 'all 0.2s ease'
                              }}
                            >
                              {!isPreviewMode && (
                                <div className="no-print flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700 rounded-t-lg">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="drag-handle cursor-grab text-gray-400 hover:text-gray-200 active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                    <IconComponent className="h-5 w-5 text-gray-400" />
                                    <span className="font-medium text-gray-200">{sectionData.title}</span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Orden: {index + 1}
                                  </div>
                                </div>
                              )}
                              <div className={isPreviewMode ? 'p-0' : 'p-4'}>
                                {sectionData.content}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Estilos CSS para drag and drop */}
            <style>{`
              .drag-handle:hover {
                background-color: #f3f4f6;
                border-radius: 4px;
                padding: 2px;
              }
              
              .seccion {
                transition: all 0.2s ease;
              }
              
              .seccion:hover {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              
              @media print {
                .no-print { display: none !important; }
                .print-container { 
                  display: flex; 
                  flex-direction: column; 
                  width: 100%; 
                  height: 100vh;
                  overflow: hidden;
                  background: white !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  padding: 0 !important;
                }
                .seccion { 
                  page-break-inside: avoid;
                  margin-bottom: 1rem;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
} 