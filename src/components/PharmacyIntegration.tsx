import React, { useState, useEffect } from 'react';
import { Building, Send, Package, MapPin, Phone, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  distance: number;
  isOpen: boolean;
  rating: number;
  hasStock: boolean;
}

interface PrescriptionStatus {
  id: string;
  patientName: string;
  pharmacyName: string;
  status: 'sent' | 'received' | 'preparing' | 'ready' | 'delivered';
  sentAt: string;
  updatedAt: string;
}

export default function PharmacyIntegration() {
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [prescriptionStatuses, setPrescriptionStatuses] = useState<PrescriptionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simular carga de farmacias
    setPharmacies([
      {
        id: '1',
        name: 'Farmacia San José',
        address: 'Av. Principal 123, Centro',
        phone: '+52 555 123 4567',
        email: 'contacto@farmaciasanjose.com',
        distance: 0.8,
        isOpen: true,
        rating: 4.8,
        hasStock: true
      },
      {
        id: '2',
        name: 'Farmacia del Ahorro',
        address: 'Calle Reforma 456, Norte',
        phone: '+52 555 234 5678',
        email: 'sucursal123@fahorro.com',
        distance: 1.2,
        isOpen: true,
        rating: 4.5,
        hasStock: true
      },
      {
        id: '3',
        name: 'Farmacia Guadalajara',
        address: 'Blvd. Juárez 789, Sur',
        phone: '+52 555 345 6789',
        email: 'contacto@fguadalajara.com',
        distance: 2.1,
        isOpen: false,
        rating: 4.6,
        hasStock: false
      }
    ]);

    // Simular estados de prescripciones
    setPrescriptionStatuses([
      {
        id: '1',
        patientName: 'María García',
        pharmacyName: 'Farmacia San José',
        status: 'ready',
        sentAt: '2024-01-15T10:30:00',
        updatedAt: '2024-01-15T11:45:00'
      },
      {
        id: '2',
        patientName: 'Juan Pérez',
        pharmacyName: 'Farmacia del Ahorro',
        status: 'preparing',
        sentAt: '2024-01-15T12:00:00',
        updatedAt: '2024-01-15T12:15:00'
      },
      {
        id: '3',
        patientName: 'Ana López',
        pharmacyName: 'Farmacia San José',
        status: 'delivered',
        sentAt: '2024-01-14T09:00:00',
        updatedAt: '2024-01-14T16:30:00'
      }
    ]);
  }, []);

  const handleSendPrescription = async (pharmacyId: string) => {
    setIsLoading(true);
    // Simular envío
    setTimeout(() => {
      alert(`Receta enviada a ${pharmacies.find(p => p.id === pharmacyId)?.name}`);
      setIsLoading(false);
    }, 2000);
  };

  const getStatusColor = (status: PrescriptionStatus['status']) => {
    switch (status) {
      case 'sent': return 'text-blue-400';
      case 'received': return 'text-yellow-400';
      case 'preparing': return 'text-orange-400';
      case 'ready': return 'text-green-400';
      case 'delivered': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: PrescriptionStatus['status']) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'received': return 'Recibida';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Lista';
      case 'delivered': return 'Entregada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-100">Integración con Farmacias</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {pharmacies.filter(p => p.isOpen).length} farmacias abiertas
          </span>
          <button className="dark-button-primary">
            <Building className="h-4 w-4 mr-2" />
            Agregar Farmacia
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="dark-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Recetas Enviadas Hoy</p>
              <p className="text-2xl font-bold text-gray-100">24</p>
            </div>
            <Send className="h-6 w-6 text-blue-400" />
          </div>
        </div>
        
        <div className="dark-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">En Preparación</p>
              <p className="text-2xl font-bold text-gray-100">8</p>
            </div>
            <Package className="h-6 w-6 text-orange-400" />
          </div>
        </div>
        
        <div className="dark-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Listas para Recoger</p>
              <p className="text-2xl font-bold text-gray-100">12</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
        </div>
        
        <div className="dark-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-100">45 min</p>
            </div>
            <Clock className="h-6 w-6 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de farmacias */}
        <div className="dark-card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Farmacias Asociadas</h3>
          <div className="space-y-3">
            {pharmacies.map((pharmacy) => (
              <div
                key={pharmacy.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedPharmacy === pharmacy.id
                    ? 'border-cyan-500 bg-cyan-900/20'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                }`}
                onClick={() => setSelectedPharmacy(pharmacy.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-200">{pharmacy.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {pharmacy.address}
                    </p>
                    <p className="text-sm text-gray-400">
                      <Phone className="h-3 w-3 inline mr-1" />
                      {pharmacy.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      pharmacy.isOpen ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {pharmacy.isOpen ? 'Abierto' : 'Cerrado'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{pharmacy.distance} km</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>⭐ {pharmacy.rating}</span>
                    <span className={pharmacy.hasStock ? 'text-green-400' : 'text-red-400'}>
                      {pharmacy.hasStock ? '✓ Con stock' : '✗ Sin stock'}
                    </span>
                  </div>
                  {pharmacy.isOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendPrescription(pharmacy.id);
                      }}
                      disabled={isLoading}
                      className="px-3 py-1 text-xs dark-button-primary"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enviar Receta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado de prescripciones */}
        <div className="dark-card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Estado de Prescripciones</h3>
          <div className="space-y-3">
            {prescriptionStatuses.map((prescription) => (
              <div key={prescription.id} className="p-4 bg-gray-800/30 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-200">{prescription.patientName}</h4>
                    <p className="text-sm text-gray-400">{prescription.pharmacyName}</p>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(prescription.status)}`}>
                    {getStatusLabel(prescription.status)}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Enviada</span>
                    <span>Entregada</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        prescription.status === 'sent' ? 'w-1/5 bg-blue-500' :
                        prescription.status === 'received' ? 'w-2/5 bg-yellow-500' :
                        prescription.status === 'preparing' ? 'w-3/5 bg-orange-500' :
                        prescription.status === 'ready' ? 'w-4/5 bg-green-500' :
                        'w-full bg-gray-500'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Actualizado: {new Date(prescription.updatedAt).toLocaleString('es-MX')}
                </div>
              </div>
            ))}
          </div>
          
          {/* Notificaciones */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <p className="text-sm text-blue-300 font-medium">
                  Nueva función disponible
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  Los pacientes ahora reciben notificaciones SMS cuando su receta está lista
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de integración */}
      <div className="dark-card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Configuración de Integración</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Método de envío preferido
            </label>
            <select className="w-full dark-input">
              <option>API directa</option>
              <option>Email</option>
              <option>WhatsApp Business</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notificaciones automáticas
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-300">Notificar al paciente cuando la receta esté lista</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-300">Alertas de stock bajo en farmacias</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 