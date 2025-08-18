#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

console.log('🔧 Actualizando rutas de importación...');

// Mapeo de rutas antiguas a nuevas
const importMappings = {
  // Authentication
  "'../hooks/useAuth'": "'../features/authentication/hooks/useAuth'",
  "'../../hooks/useAuth'": "'../../features/authentication/hooks/useAuth'",
  "'../../../hooks/useAuth'": "'../../../features/authentication/hooks/useAuth'",
  "'@/hooks/useAuth'": "'@/features/authentication/hooks/useAuth'",

  "'../components/OAuthButtons'": "'../features/authentication/components/OAuthButtons'",
  "'../../components/OAuthButtons'": "'../../features/authentication/components/OAuthButtons'",
  "'@/components/OAuthButtons'": "'@/features/authentication/components/OAuthButtons'",

  // Patients
  "'../hooks/usePatients'": "'../features/patients/hooks/usePatients'",
  "'../../hooks/usePatients'": "'../../features/patients/hooks/usePatients'",
  "'../../../hooks/usePatients'": "'../../../features/patients/hooks/usePatients'",
  "'@/hooks/usePatients'": "'@/features/patients/hooks/usePatients'",

  "'../components/NewPatientForm'": "'../features/patients/components/NewPatientForm'",
  "'../../components/NewPatientForm'": "'../../features/patients/components/NewPatientForm'",
  "'@/components/NewPatientForm'": "'@/features/patients/components/NewPatientForm'",

  "'../components/PatientSelector'": "'../features/patients/components/PatientSelector'",
  "'../../components/PatientSelector'": "'../../features/patients/components/PatientSelector'",
  "'@/components/PatientSelector'": "'@/features/patients/components/PatientSelector'",

  // Appointments
  "'../hooks/useAppointments'": "'../features/appointments/hooks/useAppointments'",
  "'../../hooks/useAppointments'": "'../../features/appointments/hooks/useAppointments'",
  "'@/hooks/useAppointments'": "'@/features/appointments/hooks/useAppointments'",

  "'../hooks/useEnhancedAppointments'": "'../features/appointments/hooks/useEnhancedAppointments'",
  "'../../hooks/useEnhancedAppointments'":
    "'../../features/appointments/hooks/useEnhancedAppointments'",
  "'@/hooks/useEnhancedAppointments'": "'@/features/appointments/hooks/useEnhancedAppointments'",

  "'../components/AppointmentForm'": "'../features/appointments/components/AppointmentForm'",
  "'../../components/AppointmentForm'": "'../../features/appointments/components/AppointmentForm'",
  "'@/components/AppointmentForm'": "'@/features/appointments/components/AppointmentForm'",

  "'../components/AppointmentsCalendar'":
    "'../features/appointments/components/AppointmentsCalendar'",
  "'../../components/AppointmentsCalendar'":
    "'../../features/appointments/components/AppointmentsCalendar'",
  "'@/components/AppointmentsCalendar'":
    "'@/features/appointments/components/AppointmentsCalendar'",

  // Clinic
  "'../context/ClinicContext'": "'../features/clinic/context/ClinicContext'",
  "'../../context/ClinicContext'": "'../../features/clinic/context/ClinicContext'",
  "'../../../context/ClinicContext'": "'../../../features/clinic/context/ClinicContext'",
  "'@/context/ClinicContext'": "'@/features/clinic/context/ClinicContext'",

  "'../hooks/useClinicSettings'": "'../features/clinic/hooks/useClinicSettings'",
  "'../../hooks/useClinicSettings'": "'../../features/clinic/hooks/useClinicSettings'",
  "'@/hooks/useClinicSettings'": "'@/features/clinic/hooks/useClinicSettings'",

  "'../components/Layout/ClinicSwitcher'": "'../features/clinic/components/ClinicSwitcher'",
  "'../../components/Layout/ClinicSwitcher'": "'../../features/clinic/components/ClinicSwitcher'",
  "'@/components/Layout/ClinicSwitcher'": "'@/features/clinic/components/ClinicSwitcher'",

  // Layout components
  "'../components/Layout/AppLayout'": "'../components/layout/AppLayout'",
  "'../../components/Layout/AppLayout'": "'../../components/layout/AppLayout'",
  "'@/components/Layout/AppLayout'": "'@/components/layout/AppLayout'",

  "'../components/Layout/PatientPortalLayout'": "'../components/layout/PatientPortalLayout'",
  "'../../components/Layout/PatientPortalLayout'": "'../../components/layout/PatientPortalLayout'",
  "'@/components/Layout/PatientPortalLayout'": "'@/components/layout/PatientPortalLayout'",

  // Shared components (Navigation)
  "'../components/Navigation/Navbar'": "'../components/shared/Navbar'",
  "'../../components/Navigation/Navbar'": "'../../components/shared/Navbar'",
  "'@/components/Navigation/Navbar'": "'@/components/shared/Navbar'",

  "'../components/Navigation/SearchBar'": "'../components/shared/SearchBar'",
  "'../../components/Navigation/SearchBar'": "'../../components/shared/SearchBar'",
  "'@/components/Navigation/SearchBar'": "'@/components/shared/SearchBar'",

  // Shared components (otros)
  "'../components/ErrorBoundary'": "'../components/shared/ErrorBoundary'",
  "'../../components/ErrorBoundary'": "'../../components/shared/ErrorBoundary'",
  "'@/components/ErrorBoundary'": "'@/components/shared/ErrorBoundary'",

  "'../components/Logo'": "'../components/shared/Logo'",
  "'../../components/Logo'": "'../../components/shared/Logo'",
  "'@/components/Logo'": "'@/components/shared/Logo'",

  "'../components/MedicalDataTable'": "'../components/shared/MedicalDataTable'",
  "'../../components/MedicalDataTable'": "'../../components/shared/MedicalDataTable'",
  "'@/components/MedicalDataTable'": "'@/components/shared/MedicalDataTable'",

  "'../components/AccessibleTable'": "'../components/shared/AccessibleTable'",
  "'../../components/AccessibleTable'": "'../../components/shared/AccessibleTable'",
  "'@/components/AccessibleTable'": "'@/components/shared/AccessibleTable'",

  "'../components/PhotoUploader'": "'../components/shared/PhotoUploader'",
  "'../../components/PhotoUploader'": "'../../components/shared/PhotoUploader'",
  "'@/components/PhotoUploader'": "'@/components/shared/PhotoUploader'",

  "'../components/ActivityFeed'": "'../components/shared/ActivityFeed'",
  "'../../components/ActivityFeed'": "'../../components/shared/ActivityFeed'",
  "'@/components/ActivityFeed'": "'@/components/shared/ActivityFeed'",

  "'../components/NotificationBell'": "'../components/shared/NotificationBell'",
  "'../../components/NotificationBell'": "'../../components/shared/NotificationBell'",
  "'@/components/NotificationBell'": "'@/components/shared/NotificationBell'",

  // Shared hooks
  "'../hooks/useNotifications'": "'../hooks/shared/useNotifications'",
  "'../../hooks/useNotifications'": "'../../hooks/shared/useNotifications'",
  "'@/hooks/useNotifications'": "'@/hooks/shared/useNotifications'",

  "'../hooks/useActivityLog'": "'../hooks/shared/useActivityLog'",
  "'../../hooks/useActivityLog'": "'../../hooks/shared/useActivityLog'",
  "'@/hooks/useActivityLog'": "'@/hooks/shared/useActivityLog'",

  "'../hooks/useProfilePhotos'": "'../hooks/shared/useProfilePhotos'",
  "'../../hooks/useProfilePhotos'": "'../../hooks/shared/useProfilePhotos'",
  "'@/hooks/useProfilePhotos'": "'@/hooks/shared/useProfilePhotos'",

  // Prescriptions
  "'../hooks/useEnhancedPrescriptions'":
    "'../features/prescriptions/hooks/useEnhancedPrescriptions'",
  "'../../hooks/useEnhancedPrescriptions'":
    "'../../features/prescriptions/hooks/useEnhancedPrescriptions'",
  "'@/hooks/useEnhancedPrescriptions'": "'@/features/prescriptions/hooks/useEnhancedPrescriptions'",

  // Medical Templates
  "'../hooks/useTemplates'": "'../features/medical-templates/hooks/useTemplates'",
  "'../../hooks/useTemplates'": "'../../features/medical-templates/hooks/useTemplates'",
  "'@/hooks/useTemplates'": "'@/features/medical-templates/hooks/useTemplates'",

  "'../hooks/useUnifiedTemplates'": "'../features/medical-templates/hooks/useUnifiedTemplates'",
  "'../../hooks/useUnifiedTemplates'":
    "'../../features/medical-templates/hooks/useUnifiedTemplates'",
  "'@/hooks/useUnifiedTemplates'": "'@/features/medical-templates/hooks/useUnifiedTemplates'",

  "'../components/Templates/TemplateEditor'":
    "'../features/medical-templates/components/TemplateEditor'",
  "'../../components/Templates/TemplateEditor'":
    "'../../features/medical-templates/components/TemplateEditor'",
  "'@/components/Templates/TemplateEditor'":
    "'@/features/medical-templates/components/TemplateEditor'",

  // Medical Records
  "'../hooks/usePhysicalExam'": "'../features/medical-records/hooks/usePhysicalExam'",
  "'../../hooks/usePhysicalExam'": "'../../features/medical-records/hooks/usePhysicalExam'",
  "'@/hooks/usePhysicalExam'": "'@/features/medical-records/hooks/usePhysicalExam'",

  "'../hooks/useValidation'": "'../features/medical-records/hooks/useValidation'",
  "'../../hooks/useValidation'": "'../../features/medical-records/hooks/useValidation'",
  "'@/hooks/useValidation'": "'@/features/medical-records/hooks/useValidation'",
};

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Aplicar cada mapeo
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      if (content.includes(oldImport)) {
        content = content.replace(
          new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newImport
        );
        modified = true;
      }
    }

    // Guardar archivo si fue modificado
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

// Buscar todos los archivos TypeScript/JavaScript en src
const files = [
  ...(await glob('src/**/*.ts', { ignore: 'src/**/*.d.ts' })),
  ...(await glob('src/**/*.tsx')),
  ...(await glob('src/**/*.js')),
  ...(await glob('src/**/*.jsx')),
];

console.log(`📁 Encontrados ${files.length} archivos para procesar...`);

let updatedFiles = 0;
files.forEach(file => {
  updatedFiles += processFile(file);
});

console.log(`\n✨ Proceso completado!`);
console.log(`📊 ${updatedFiles} archivos actualizados de ${files.length} archivos totales`);

if (updatedFiles > 0) {
  console.log(`\n🔍 Siguiente paso: ejecuta 'npm run lint' para verificar errores restantes`);
  console.log(`🛠️  Si hay errores, revísalos manualmente y ajusta las rutas según sea necesario`);
}
