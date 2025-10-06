import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Calendar, Activity, FileText, Settings, ArrowLeft, Clock, Heart, Brain, Dna, Pill
} from 'lucide-react';

interface PatientRecordSidebarProps {
  patient: {
    id: string;
    full_name: string;
  };
  seccionActiva: string;
  onSeccionChange: (seccion: string) => void;
  consultationsCount: number;
  upcomingAppointmentsCount: number;
}

export default function PatientRecordSidebar({
  patient,
  seccionActiva,
  onSeccionChange,
  consultationsCount,
  upcomingAppointmentsCount
}: PatientRecordSidebarProps) {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'paciente',
      icon: User,
      label: 'Información Personal'
    },
    {
      id: 'patologicos',
      icon: Heart,
      label: 'Antecedentes Patológicos'
    },
    {
      id: 'no-patologicos',
      icon: Brain,
      label: 'Antecedentes No Patológicos'
    },
    {
      id: 'heredofamiliares',
      icon: Dna,
      label: 'Antecedentes Heredofamiliares'
    },
    {
      id: 'estudios',
      icon: FileText,
      label: 'Estudios'
    },
    {
      id: 'consultas',
      icon: Clock,
      label: 'Consultas',
      badge: consultationsCount
    },
    {
      id: 'recetas',
      icon: Pill,
      label: 'Historial de Recetas'
    },
    {
      id: 'citas',
      icon: Calendar,
      label: 'Citas Médicas',
      badge: upcomingAppointmentsCount,
      badgeColor: 'bg-cyan-500'
    },
    {
      id: 'auditoria',
      icon: Settings,
      label: 'Auditoría',
      badge: 'NOM-024',
      badgeColor: 'bg-orange-500'
    }
  ];

  return (
    <div className="w-64 border-r border-gray-700 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Volver</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white leading-tight">{patient.full_name}</h2>
          <p className="text-xs text-gray-400">Expediente #{patient.id.slice(0, 8)}</p>
        </div>

        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Secciones</div>
        <ul className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = seccionActiva === section.id;
            const showBadge = section.badge && (typeof section.badge === 'number' ? section.badge > 0 : true);

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSeccionChange(section.id)}
                  className={`flex items-start gap-3 w-full p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span className="text-left leading-snug flex-1">{section.label}</span>
                  {showBadge && (
                    <span className={`ml-auto ${section.badgeColor || 'bg-gray-600'} ${section.badgeColor ? 'text-white' : 'text-gray-200'} text-xs rounded-full px-2 py-1 flex-shrink-0`}>
                      {section.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
