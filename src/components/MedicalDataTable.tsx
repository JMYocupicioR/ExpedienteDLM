import React from 'react';
import AccessibleTable, { TableColumn, TableRow } from './AccessibleTable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Definiciones específicas para tablas médicas
export interface PatientTableRow extends TableRow {
  full_name: string;
  birth_date: string;
  gender: string;
  email: string;
  phone: string;
  created_at: string;
  medical_record_number?: string;
  insurance_number?: string;
  emergency_contact?: string;
}

export interface ConsultationTableRow extends TableRow {
  date: string;
  time: string;
  doctor_name: string;
  diagnosis: string;
  treatment: string;
  status: 'completed' | 'pending' | 'cancelled';
  follow_up_required: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface PrescriptionTableRow extends TableRow {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribed_date: string;
  status: 'active' | 'completed' | 'discontinued';
  doctor_name: string;
  pharmacy: string;
  refills_remaining: number;
}

export interface VitalSignsTableRow extends TableRow {
  date: string;
  time: string;
  temperature: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  weight: number;
  height: number;
  bmi: number;
}

// Componente especializado para tabla de pacientes
export const PatientTable: React.FC<{
  patients: PatientTableRow[];
  onPatientClick?: (patient: PatientTableRow) => void;
  loading?: boolean;
  error?: string;
}> = ({ patients, onPatientClick, loading, error }) => {
  
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

  const columns: TableColumn[] = [
    {
      key: 'full_name',
      label: 'Nombre del Paciente',
      sortable: true,
      filterable: true,
      type: 'text',
      medicalContext: 'patient-data',
      ariaLabel: 'Nombre completo del paciente'
    },
    {
      key: 'age',
      label: 'Edad',
      sortable: true,
      type: 'number',
      format: (row: PatientTableRow) => `${calculateAge(row.birth_date)} años`,
      medicalContext: 'patient-data',
      ariaLabel: 'Edad del paciente en años'
    },
    {
      key: 'gender',
      label: 'Género',
      sortable: true,
      filterable: true,
      type: 'text',
      format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
      medicalContext: 'patient-data',
      ariaLabel: 'Género del paciente'
    },
    {
      key: 'phone',
      label: 'Teléfono',
      type: 'phone',
      medicalContext: 'patient-data',
      ariaLabel: 'Número de teléfono de contacto'
    },
    {
      key: 'email',
      label: 'Correo Electrónico',
      type: 'email',
      filterable: true,
      medicalContext: 'patient-data',
      ariaLabel: 'Dirección de correo electrónico'
    },
    {
      key: 'created_at',
      label: 'Fecha de Registro',
      sortable: true,
      type: 'date',
      format: (value: string) => format(new Date(value), "dd 'de' MMMM, yyyy", { locale: es }),
      medicalContext: 'patient-data',
      ariaLabel: 'Fecha de registro en el sistema'
    }
  ];

  return (
    <AccessibleTable
      id="patients-table"
      caption="Lista de Pacientes Registrados"
      columns={columns}
      data={patients}
      onRowClick={onPatientClick}
      loading={loading}
      error={error}
      emptyMessage="No hay pacientes registrados en el sistema"
      medicalContext="patient-list"
      className="medical-patients-table"
    />
  );
};

// Componente especializado para historial de consultas
export const ConsultationTable: React.FC<{
  consultations: ConsultationTableRow[];
  onConsultationClick?: (consultation: ConsultationTableRow) => void;
  loading?: boolean;
  error?: string;
}> = ({ consultations, onConsultationClick, loading, error }) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📋';
      case 'low': return '📝';
      default: return '📋';
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'date',
      label: 'Fecha de Consulta',
      sortable: true,
      type: 'date',
      format: (value: string) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
      medicalContext: 'diagnosis',
      ariaLabel: 'Fecha en que se realizó la consulta médica'
    },
    {
      key: 'time',
      label: 'Hora',
      type: 'text',
      ariaLabel: 'Hora de la consulta médica'
    },
    {
      key: 'doctor_name',
      label: 'Médico',
      sortable: true,
      filterable: true,
      type: 'text',
      ariaLabel: 'Nombre del médico que realizó la consulta'
    },
    {
      key: 'diagnosis',
      label: 'Diagnóstico',
      filterable: true,
      type: 'text',
      medicalContext: 'diagnosis',
      ariaLabel: 'Diagnóstico médico establecido en la consulta'
    },
    {
      key: 'priority',
      label: 'Prioridad',
      sortable: true,
      type: 'text',
      format: (value: string) => `${getPriorityIcon(value)} ${value.charAt(0).toUpperCase() + value.slice(1)}`,
      ariaLabel: 'Nivel de prioridad médica de la consulta'
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      filterable: true,
      type: 'text',
      format: (value: string) => {
        const labels = {
          completed: 'Completada',
          pending: 'Pendiente',
          cancelled: 'Cancelada'
        };
        return labels[value as keyof typeof labels] || value;
      },
      ariaLabel: 'Estado actual de la consulta médica'
    },
    {
      key: 'follow_up_required',
      label: 'Seguimiento',
      type: 'boolean',
      format: (value: boolean) => value ? '✅ Requerido' : '➖ No requerido',
      ariaLabel: 'Indica si se requiere consulta de seguimiento'
    }
  ];

  return (
    <AccessibleTable
      id="consultations-table"
      caption="Historial de Consultas Médicas"
      columns={columns}
      data={consultations}
      onRowClick={onConsultationClick}
      loading={loading}
      error={error}
      emptyMessage="No hay consultas registradas para este paciente"
      medicalContext="consultation-history"
      className="medical-consultations-table"
    />
  );
};

// Componente especializado para prescripciones
export const PrescriptionTable: React.FC<{
  prescriptions: PrescriptionTableRow[];
  onPrescriptionClick?: (prescription: PrescriptionTableRow) => void;
  loading?: boolean;
  error?: string;
}> = ({ prescriptions, onPrescriptionClick, loading, error }) => {

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-900/50 text-green-300 border-green-700',
      completed: 'bg-gray-900/50 text-gray-300 border-gray-700',
      discontinued: 'bg-red-900/50 text-red-300 border-red-700'
    };
    const labels = {
      active: 'Activa',
      completed: 'Completada',
      discontinued: 'Discontinuada'
    };
    
    return `${labels[status as keyof typeof labels] || status}`;
  };

  const columns: TableColumn[] = [
    {
      key: 'medication_name',
      label: 'Medicamento',
      sortable: true,
      filterable: true,
      type: 'text',
      medicalContext: 'medication',
      ariaLabel: 'Nombre del medicamento prescrito'
    },
    {
      key: 'dosage',
      label: 'Dosis',
      type: 'text',
      medicalContext: 'medication',
      ariaLabel: 'Dosis prescrita del medicamento'
    },
    {
      key: 'frequency',
      label: 'Frecuencia',
      type: 'text',
      medicalContext: 'medication',
      ariaLabel: 'Frecuencia de administración del medicamento'
    },
    {
      key: 'duration',
      label: 'Duración',
      type: 'text',
      medicalContext: 'medication',
      ariaLabel: 'Duración del tratamiento'
    },
    {
      key: 'prescribed_date',
      label: 'Fecha de Prescripción',
      sortable: true,
      type: 'date',
      format: (value: string) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
      ariaLabel: 'Fecha en que se prescribió el medicamento'
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      filterable: true,
      type: 'text',
      format: getStatusBadge,
      ariaLabel: 'Estado actual de la prescripción'
    },
    {
      key: 'refills_remaining',
      label: 'Repeticiones',
      type: 'number',
      format: (value: number) => `${value} restantes`,
      ariaLabel: 'Número de repeticiones restantes de la prescripción'
    }
  ];

  return (
    <AccessibleTable
      id="prescriptions-table"
      caption="Lista de Prescripciones Médicas"
      columns={columns}
      data={prescriptions}
      onRowClick={onPrescriptionClick}
      loading={loading}
      error={error}
      emptyMessage="No hay prescripciones registradas"
      medicalContext="prescription-list"
      className="medical-prescriptions-table"
    />
  );
};

// Componente especializado para signos vitales
export const VitalSignsTable: React.FC<{
  vitalSigns: VitalSignsTableRow[];
  onVitalSignClick?: (vitalSign: VitalSignsTableRow) => void;
  loading?: boolean;
  error?: string;
}> = ({ vitalSigns, onVitalSignClick, loading, error }) => {

  const getVitalSignStatus = (value: number, normal_range: [number, number]): string => {
    if (value < normal_range[0]) return '⬇️ Bajo';
    if (value > normal_range[1]) return '⬆️ Alto';
    return '✅ Normal';
  };

  const columns: TableColumn[] = [
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      type: 'date',
      format: (value: string) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
      ariaLabel: 'Fecha de registro de signos vitales'
    },
    {
      key: 'time',
      label: 'Hora',
      type: 'text',
      ariaLabel: 'Hora de registro'
    },
    {
      key: 'temperature',
      label: 'Temperatura (°C)',
      sortable: true,
      type: 'number',
      medicalContext: 'vital-signs',
      format: (value: number) => `${value}°C ${getVitalSignStatus(value, [36.0, 37.5])}`,
      ariaLabel: 'Temperatura corporal en grados Celsius'
    },
    {
      key: 'blood_pressure',
      label: 'Presión Arterial',
      type: 'text',
      medicalContext: 'vital-signs',
      format: (row: VitalSignsTableRow) => 
        `${row.blood_pressure_systolic}/${row.blood_pressure_diastolic} mmHg`,
      ariaLabel: 'Presión arterial sistólica y diastólica en milímetros de mercurio'
    },
    {
      key: 'heart_rate',
      label: 'Frecuencia Cardíaca',
      sortable: true,
      type: 'number',
      medicalContext: 'vital-signs',
      format: (value: number) => `${value} lpm ${getVitalSignStatus(value, [60, 100])}`,
      ariaLabel: 'Frecuencia cardíaca en latidos por minuto'
    },
    {
      key: 'respiratory_rate',
      label: 'Frecuencia Respiratoria',
      sortable: true,
      type: 'number',
      medicalContext: 'vital-signs',
      format: (value: number) => `${value} rpm ${getVitalSignStatus(value, [12, 20])}`,
      ariaLabel: 'Frecuencia respiratoria en respiraciones por minuto'
    },
    {
      key: 'oxygen_saturation',
      label: 'Saturación O₂',
      sortable: true,
      type: 'number',
      medicalContext: 'vital-signs',
      format: (value: number) => `${value}% ${getVitalSignStatus(value, [95, 100])}`,
      ariaLabel: 'Saturación de oxígeno en porcentaje'
    },
    {
      key: 'bmi',
      label: 'IMC',
      sortable: true,
      type: 'number',
      medicalContext: 'vital-signs',
      format: (value: number) => {
        let category = '';
        if (value < 18.5) category = '(Bajo peso)';
        else if (value < 25) category = '(Normal)';
        else if (value < 30) category = '(Sobrepeso)';
        else category = '(Obesidad)';
        return `${value.toFixed(1)} ${category}`;
      },
      ariaLabel: 'Índice de masa corporal'
    }
  ];

  return (
    <AccessibleTable
      id="vital-signs-table"
      caption="Registro de Signos Vitales"
      columns={columns}
      data={vitalSigns}
      onRowClick={onVitalSignClick}
      loading={loading}
      error={error}
      emptyMessage="No hay registros de signos vitales"
      medicalContext="test-results"
      className="medical-vital-signs-table"
    />
  );
};

export default AccessibleTable;