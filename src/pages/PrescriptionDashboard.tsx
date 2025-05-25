import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Search, Filter, RefreshCw, Calendar, Clock, User, FileText } from 'lucide-react';
import EnhancedPrescriptionForm from '../components/EnhancedPrescriptionForm';

export default function PrescriptionDashboard() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPrescriptions(data || []);

    } catch (err: any) {
      console.error('Error fetching prescriptions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSavePrescription = async (prescriptionData: any) => {
    try {
      setError(null);
      
      const { error: saveError } = await supabase
        .from('prescriptions')
        .insert([prescriptionData]);

      if (saveError) throw saveError;

      setShowNewPrescription(false);
      fetchPrescriptions();
    } catch (err: any) {
      console.error('Error saving prescription:', err);
      setError(err.message);
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = prescription.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Recetas Médicas</h1>
            <p className="text-gray-400">Gestión de prescripciones y medicamentos</p>
          </div>
          <button
            onClick={() => setShowNewPrescription(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Receta
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por paciente o diagnóstico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="expired">Expiradas</option>
              <option value="dispensed">Dispensadas</option>
            </select>
            
            <button
              onClick={fetchPrescriptions}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Prescriptions List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {filteredPrescriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Paciente</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Diagnóstico</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Expira</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.map((prescription) => (
                    <tr key={prescription.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="py-3 px-4">
                        <div className="flex items-center text-gray-300">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(prescription.created_at), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-gray-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {format(new Date(prescription.created_at), 'HH:mm', { locale: es })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">{prescription.patients?.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate text-gray-300">
                          {prescription.diagnosis}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                          prescription.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {prescription.status === 'active' ? 'Activa' :
                           prescription.status === 'expired' ? 'Expirada' :
                           'Dispensada'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {format(new Date(prescription.expires_at), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Ver detalles"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">No hay recetas</h3>
              <p className="mt-1 text-sm text-gray-400">
                {searchTerm || statusFilter !== 'all' ? 
                  'No se encontraron recetas que coincidan con los filtros.' :
                  'Comienza creando una nueva receta médica.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewPrescription(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Receta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Prescription Modal */}
      {showNewPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <EnhancedPrescriptionForm
              patientId={selectedPatient || ''}
              patientName={patients.find(p => p.id === selectedPatient)?.full_name || ''}
              onSave={handleSavePrescription}
              previousPrescriptions={prescriptions.filter(p => p.patient_id === selectedPatient)}
              patients={patients}
              onPatientChange={setSelectedPatient}
            />
          </div>
        </div>
      )}
    </div>
  );
}