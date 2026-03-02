import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Calendar, Activity, FileText, Settings, ArrowLeft, Clock, Heart, Brain, Dna, Pill,
  LayoutDashboard, CheckCircle, Circle,
} from 'lucide-react';

export type SectionCompleteness = {
  patologicos?: boolean;
  'no-patologicos'?: boolean;
  heredofamiliares?: boolean;
  paciente?: boolean;
};

interface PatientRecordSidebarProps {
  patient: {
    id: string;
    full_name: string;
  };
  seccionActiva: string;
  onSeccionChange: (seccion: string) => void;
  consultationsCount: number;
  upcomingAppointmentsCount: number;
  completeness?: SectionCompleteness;
}

export default function PatientRecordSidebar({
  patient,
  seccionActiva,
  onSeccionChange,
  consultationsCount,
  upcomingAppointmentsCount,
  completeness = {},
}: PatientRecordSidebarProps) {
  const navigate = useNavigate();

  const sections = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'paciente', icon: User, label: 'Información Personal', tracked: true },
    { id: 'patologicos', icon: Heart, label: 'Antecedentes Patológicos', tracked: true },
    { id: 'no-patologicos', icon: Brain, label: 'Antecedentes No Patológicos', tracked: true },
    { id: 'heredofamiliares', icon: Dna, label: 'Antecedentes Heredofamiliares', tracked: true },
    { id: 'estudios', icon: FileText, label: 'Estudios' },
    { id: 'consultas', icon: Clock, label: 'Consultas', badge: consultationsCount },
    { id: 'escalas', icon: Activity, label: 'Escalas Médicas' },
    { id: 'recetas', icon: Pill, label: 'Historial de Recetas' },
    { id: 'citas', icon: Calendar, label: 'Citas Médicas', badge: upcomingAppointmentsCount, badgeColor: 'bg-cyan-500' },
    { id: 'auditoria', icon: Settings, label: 'Auditoría', badge: 'NOM-024', badgeColor: 'bg-orange-500' },
  ];

  return (
    <div className='w-64 border-r border-gray-700 flex flex-col' style={{ background: 'var(--bg-secondary)' }}>
      <div className='p-4 border-b border-gray-700'>
        <button
          onClick={() => navigate('/dashboard')}
          className='flex items-center text-gray-300 hover:text-white transition-colors min-h-[44px]'
        >
          <ArrowLeft className='h-5 w-5 mr-2' />
          <span>Volver</span>
        </button>
      </div>

      <nav className='flex-1 overflow-y-auto p-4'>
        <div className='mb-6'>
          <h2 className='text-base font-semibold text-white leading-tight'>{patient.full_name}</h2>
          <p className='text-xs text-gray-400'>Expediente #{patient.id.slice(0, 8)}</p>
        </div>

        <div className='text-xs uppercase tracking-wide text-gray-400 mb-2'>Secciones</div>
        <ul className='space-y-1'>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = seccionActiva === section.id;
            const showBadge = section.badge && (typeof section.badge === 'number' ? section.badge > 0 : true);
            const isComplete = section.tracked
              ? completeness[section.id as keyof SectionCompleteness]
              : undefined;

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSeccionChange(section.id)}
                  className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className='h-5 w-5 flex-shrink-0 mt-0.5' aria-hidden='true' />
                  <span className='text-left leading-snug flex-1 text-sm'>{section.label}</span>
                  {showBadge && (
                    <span
                      className={`ml-auto ${section.badgeColor || 'bg-gray-600'} text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0`}
                    >
                      {section.badge}
                    </span>
                  )}
                  {section.tracked && !showBadge && (
                    isComplete
                      ? <CheckCircle className='h-4 w-4 text-green-400 flex-shrink-0 ml-auto' aria-label='Sección completa' />
                      : <Circle className='h-4 w-4 text-gray-600 flex-shrink-0 ml-auto' aria-label='Sección incompleta' />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Completeness summary */}
        {Object.keys(completeness).length > 0 && (
          <div className='mt-6 pt-4 border-t border-gray-700'>
            <p className='text-xs text-gray-400 mb-2'>Completitud del expediente</p>
            <div className='w-full bg-gray-700 rounded-full h-1.5'>
              <div
                className='bg-gradient-to-r from-cyan-500 to-green-400 h-1.5 rounded-full transition-all'
                style={{
                  width: `${
                    Math.round(
                      (Object.values(completeness).filter(Boolean).length /
                        Math.max(Object.keys(completeness).length, 1)) * 100
                    )
                  }%`,
                }}
              />
            </div>
            <p className='text-xs text-gray-500 mt-1'>
              {Object.values(completeness).filter(Boolean).length} de {Object.keys(completeness).length} secciones
            </p>
          </div>
        )}
      </nav>
    </div>
  );
}
