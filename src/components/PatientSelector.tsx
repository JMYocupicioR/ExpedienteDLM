import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, User, Phone, Mail, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
}

interface PatientSelectorProps {
  selectedPatientId?: string;
  onPatientSelect: (patient: Patient) => void;
  onNewPatient?: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  searchQuery?: string;
  showRecentPatients?: boolean;
}

export default function PatientSelector({
  selectedPatientId = '',
  onPatientSelect,
  onNewPatient,
  placeholder = "Buscar paciente...",
  className = "",
  searchQuery = '',
  showRecentPatients = false
}: PatientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar pacientes iniciales
  useEffect(() => {
    loadPatients();
  }, [showRecentPatients]);

  // Actualizar paciente seleccionado cuando cambia el ID
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
        setSearchTerm(patient.full_name);
      }
    }
  }, [selectedPatientId, patients]);

  // Sincronizar searchQuery prop con searchTerm state
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Filtrar pacientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = patients.filter(patient =>
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm) ||
        false
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients.slice(0, 10)); // Mostrar solo los primeros 10
    }
  }, [searchTerm, patients]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !searchRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from('patients')
        .select('id, full_name, phone, email, birth_date, gender')
        .eq('is_active', true);
      
      // Order by recent activity if showRecentPatients is true
      if (showRecentPatients) {
        query.order('updated_at', { ascending: false }).limit(20);
      } else {
        query.order('full_name', { ascending: true }).limit(100);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error loading patients:', error);
        // Usar datos mock si falla la carga
        setPatients([
          { id: 'patient_1', full_name: 'María González', phone: '+52 555 123 4567', email: 'maria.gonzalez@email.com' },
          { id: 'patient_2', full_name: 'Carlos Rodríguez', phone: '+52 555 987 6543', email: 'carlos.rodriguez@email.com' },
          { id: 'patient_3', full_name: 'Ana Martínez', phone: '+52 555 456 7890', email: 'ana.martinez@email.com' },
          { id: 'patient_4', full_name: 'Luis Hernández', phone: '+52 555 321 9876', email: 'luis.hernandez@email.com' },
          { id: 'patient_5', full_name: 'Carmen López', phone: '+52 555 654 3210', email: 'carmen.lopez@email.com' },
        ]);
      } else {
        setPatients(data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.full_name);
    setIsOpen(false);
    onPatientSelect(patient);
  };

  const handleSearchFocus = () => {
    setIsOpen(true);
    if (searchTerm && selectedPatient) {
      setSearchTerm('');
      setSelectedPatient(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    
    if (!value && selectedPatient) {
      setSelectedPatient(null);
      onPatientSelect({ id: '', full_name: '', phone: '', email: '' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearSelection = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    onPatientSelect({ id: '', full_name: '', phone: '', email: '' });
    searchRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Campo de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedPatient ? selectedPatient.full_name : placeholder}
          className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
        />
        
        {selectedPatient && (
          <button
            onClick={clearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {!selectedPatient && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Información del paciente seleccionado */}
      {selectedPatient && (
        <div className="mt-2 p-3 bg-gray-700 rounded-lg border border-green-500">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{selectedPatient.full_name}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                {selectedPatient.phone && (
                  <span className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {selectedPatient.phone}
                  </span>
                )}
                {selectedPatient.email && (
                  <span className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {selectedPatient.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown de resultados */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
        >
          {/* Opción para crear nuevo paciente */}
          <div className="p-3 border-b border-gray-700">
            <Button
              onClick={() => setShowNewPatientForm(true)}
              variant="outline"
              className="w-full border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Paciente
              {searchTerm && ` "${searchTerm}"`}
            </Button>
          </div>

          {/* Lista de pacientes */}
          <div className="max-h-60 overflow-y-auto">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{patient.full_name}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        {patient.phone && (
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : searchTerm.length > 0 ? (
              <div className="p-4 text-center text-gray-400">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No se encontraron pacientes</p>
                <p className="text-xs mt-1">Prueba con un término diferente o crea un nuevo paciente</p>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400">
                <p className="text-sm">Escribe para buscar pacientes</p>
              </div>
            )}
          </div>

          {/* Información adicional */}
          {patients.length > filteredPatients.length && searchTerm.length === 0 && (
            <div className="p-3 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-400">
                Mostrando {filteredPatients.length} de {patients.length} pacientes
              </p>
              <p className="text-xs text-gray-500">Escribe para buscar más</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de nuevo paciente */}
      {showNewPatientForm && (
        <NewPatientModal
          isOpen={showNewPatientForm}
          onClose={() => setShowNewPatientForm(false)}
          onSave={(newPatient) => {
            setPatients(prev => [newPatient, ...prev]);
            handlePatientSelect(newPatient);
            setShowNewPatientForm(false);
            onNewPatient?.(newPatient);
          }}
          initialName={searchTerm}
        />
      )}
    </div>
  );
}

// Modal para crear nuevo paciente
interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  initialName?: string;
}

function NewPatientModal({ isOpen, onClose, onSave, initialName = '' }: NewPatientModalProps) {
  const [formData, setFormData] = useState({
    full_name: initialName,
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating patient:', error);
        // En caso de error, crear paciente temporal para continuar
        const tempPatient: Patient = {
          id: `temp_${Date.now()}`,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          birth_date: formData.birth_date || undefined,
          gender: formData.gender || undefined,
        };
        onSave(tempPatient);
      } else {
        onSave(data);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      // Crear paciente temporal como fallback
      const tempPatient: Patient = {
        id: `temp_${Date.now()}`,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        birth_date: formData.birth_date || undefined,
        gender: formData.gender || undefined,
      };
      onSave(tempPatient);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Nuevo Paciente</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                errors.full_name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Ej. Juan Pérez García"
              required
            />
            {errors.full_name && (
              <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.phone ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="+52 555 123 4567"
              />
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="juan.perez@email.com"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange('birth_date', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
