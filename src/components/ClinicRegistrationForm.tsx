import React, { useState } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  User,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

interface ClinicRegistrationFormProps {
  onComplete: (clinicData: any) => void;
  onBack?: () => void;
  initialData?: any;
}

export const ClinicRegistrationForm: React.FC<ClinicRegistrationFormProps> = ({
  onComplete,
  onBack,
  initialData = {}
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    name: initialData.name || '',
    type: initialData.type || 'clinic',
    address: initialData.address || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    
    // Legal Info
    license_number: initialData.license_number || '',
    tax_id: initialData.tax_id || '',
    director_name: initialData.director_name || '',
    director_license: initialData.director_license || '',
    founding_date: initialData.founding_date || '',
    
    // Services
    services: initialData.services || [],
    specialties: initialData.specialties || [],
    appointment_duration_minutes: initialData.appointment_duration_minutes || 30
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepNumber) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
        if (!formData.address.trim()) newErrors.address = 'La dirección es obligatoria';
        if (!formData.phone.trim()) newErrors.phone = 'El teléfono es obligatorio';
        if (!formData.email.trim()) newErrors.email = 'El email es obligatorio';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
        break;
      
      case 2:
        if (!formData.license_number.trim()) newErrors.license_number = 'El número de licencia es obligatorio';
        if (!formData.director_name.trim()) newErrors.director_name = 'El nombre del director es obligatorio';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleServiceAdd = (service: string) => {
    if (service.trim() && !formData.services.includes(service)) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, service]
      }));
    }
  };

  const handleServiceRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const handleSpecialtyAdd = (specialty: string) => {
    if (specialty.trim() && !formData.specialties.includes(specialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    }
  };

  const handleSpecialtyRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (validateStep(step)) {
      onComplete(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Paso {step} de 3</span>
          <span className="text-sm text-gray-400">
            {step === 1 && 'Información Básica'}
            {step === 2 && 'Información Legal'}
            {step === 3 && 'Servicios y Especialidades'}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Información Básica de la Clínica
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Clínica *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Ej: Clínica San José"
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Establecimiento
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="clinic">Clínica</option>
              <option value="hospital">Hospital</option>
              <option value="medical_center">Centro Médico</option>
              <option value="consultory">Consultorio</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                  errors.address ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Calle Principal #123, Colonia, Ciudad, Estado"
              />
            </div>
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="555-123-4567"
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="contacto@clinica.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Legal Information */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Información Legal y Administrativa
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número de Licencia Sanitaria *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                  errors.license_number ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="LS-12345-2024"
              />
            </div>
            {errors.license_number && <p className="mt-1 text-sm text-red-500">{errors.license_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              RFC / Tax ID
            </label>
            <input
              type="text"
              name="tax_id"
              value={formData.tax_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Director/Responsable Médico *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                name="director_name"
                value={formData.director_name}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 bg-gray-700 border ${
                  errors.director_name ? 'border-red-500' : 'border-gray-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Dr. Juan Pérez"
              />
            </div>
            {errors.director_name && <p className="mt-1 text-sm text-red-500">{errors.director_name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cédula Profesional del Director
              </label>
              <input
                type="text"
                name="director_license"
                value={formData.director_license}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Fundación
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="date"
                  name="founding_date"
                  value={formData.founding_date}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Services and Specialties */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Servicios y Especialidades
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Servicios que Ofrece
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Agregar servicio y presionar Enter..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleServiceAdd((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600 text-white"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => handleServiceRemove(index)}
                      className="ml-2 text-white hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Especialidades Médicas
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Agregar especialidad y presionar Enter..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSpecialtyAdd((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-600 text-white"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => handleSpecialtyRemove(index)}
                      className="ml-2 text-white hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duración de Cita Estándar (minutos)
            </label>
            <select
              name="appointment_duration_minutes"
              value={formData.appointment_duration_minutes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
              <option value="120">120 minutos</option>
            </select>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{step === 1 && onBack ? 'Volver' : 'Atrás'}</span>
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <span>Siguiente</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Check className="h-5 w-5" />
            <span>Completar Registro</span>
          </button>
        )}
      </div>
    </div>
  );
};
