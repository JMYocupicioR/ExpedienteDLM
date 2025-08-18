# ExpedienteDLM - Script de Migración a Arquitectura por Dominios
# Este script reorganiza la estructura actual hacia una arquitectura por features/dominios

Write-Host "🚀 Iniciando migración a arquitectura por dominios..." -ForegroundColor Green

# Función para crear directorios si no existen
function New-DirectoryIfNotExists {
    param($Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "📁 Creado: $Path" -ForegroundColor Blue
    }
}

# Función para mover archivo con logging
function Move-FileWithLogging {
    param($Source, $Destination)
    if (Test-Path $Source) {
        # Crear directorio destino si no existe
        $destinationDir = Split-Path $Destination -Parent
        New-DirectoryIfNotExists $destinationDir

        Move-Item $Source $Destination -Force
        Write-Host "📦 Movido: $Source -> $Destination" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  No encontrado: $Source" -ForegroundColor Red
    }
}

Write-Host "📂 Creando estructura de features..." -ForegroundColor Cyan

# Crear estructura base de features
$features = @(
    "src/features/authentication/components",
    "src/features/authentication/hooks",
    "src/features/authentication/services",
    "src/features/authentication/pages",
    "src/features/authentication/types",

    "src/features/patients/components",
    "src/features/patients/hooks",
    "src/features/patients/services",
    "src/features/patients/types",
    "src/features/patients/pages",

    "src/features/appointments/components",
    "src/features/appointments/hooks",
    "src/features/appointments/services",
    "src/features/appointments/pages",
    "src/features/appointments/types",

    "src/features/clinic/components",
    "src/features/clinic/hooks",
    "src/features/clinic/services",
    "src/features/clinic/context",
    "src/features/clinic/pages",
    "src/features/clinic/types",

    "src/features/prescriptions/components",
    "src/features/prescriptions/hooks",
    "src/features/prescriptions/services",
    "src/features/prescriptions/pages",
    "src/features/prescriptions/types",

    "src/features/medical-templates/components",
    "src/features/medical-templates/hooks",
    "src/features/medical-templates/services",
    "src/features/medical-templates/pages",
    "src/features/medical-templates/types",

    "src/features/medical-records/components",
    "src/features/medical-records/hooks",
    "src/features/medical-records/services",
    "src/features/medical-records/types",

    "src/features/medical-scales/components",
    "src/features/medical-scales/pages",
    "src/features/medical-scales/types",

    "src/components/layout",
    "src/components/shared",
    "src/hooks/shared"
)

foreach ($feature in $features) {
    New-DirectoryIfNotExists $feature
}

Write-Host "🔄 Migrando archivos..." -ForegroundColor Cyan

# === AUTHENTICATION ===
Move-FileWithLogging "src/hooks/useAuth.ts" "src/features/authentication/hooks/useAuth.ts"
Move-FileWithLogging "src/components/OAuthButtons.tsx" "src/features/authentication/components/OAuthButtons.tsx"
Move-FileWithLogging "src/pages/Auth.tsx" "src/features/authentication/pages/Auth.tsx"
Move-FileWithLogging "src/pages/AuthCallback.tsx" "src/features/authentication/pages/AuthCallback.tsx"
Move-FileWithLogging "src/pages/EnhancedSignupQuestionnaire.tsx" "src/features/authentication/pages/EnhancedSignupQuestionnaire.tsx"

# === PATIENTS ===
Move-FileWithLogging "src/hooks/usePatients.ts" "src/features/patients/hooks/usePatients.ts"
Move-FileWithLogging "src/components/NewPatientForm.tsx" "src/features/patients/components/NewPatientForm.tsx"
Move-FileWithLogging "src/components/PatientSelector.tsx" "src/features/patients/components/PatientSelector.tsx"
Move-FileWithLogging "src/pages/PatientRecord.tsx" "src/features/patients/pages/PatientRecord.tsx"
Move-FileWithLogging "src/pages/PatientsList.tsx" "src/features/patients/pages/PatientsList.tsx"
Move-FileWithLogging "src/pages/ClinicPatients.tsx" "src/features/patients/pages/ClinicPatients.tsx"
Move-FileWithLogging "src/pages/PatientPublicRegistration.tsx" "src/features/patients/pages/PatientPublicRegistration.tsx"

# === APPOINTMENTS ===
Move-FileWithLogging "src/hooks/useAppointments.ts" "src/features/appointments/hooks/useAppointments.ts"
Move-FileWithLogging "src/hooks/useEnhancedAppointments.ts" "src/features/appointments/hooks/useEnhancedAppointments.ts"
Move-FileWithLogging "src/components/AppointmentForm.tsx" "src/features/appointments/components/AppointmentForm.tsx"
Move-FileWithLogging "src/components/AppointmentsCalendar.tsx" "src/features/appointments/components/AppointmentsCalendar.tsx"
Move-FileWithLogging "src/components/AppointmentQuickScheduler.tsx" "src/features/appointments/components/AppointmentQuickScheduler.tsx"
Move-FileWithLogging "src/pages/AppointmentsPage.tsx" "src/features/appointments/pages/AppointmentsPage.tsx"

# === CLINIC ===
Move-FileWithLogging "src/hooks/useClinicSettings.ts" "src/features/clinic/hooks/useClinicSettings.ts"
Move-FileWithLogging "src/context/ClinicContext.tsx" "src/features/clinic/context/ClinicContext.tsx"
Move-FileWithLogging "src/components/ClinicRegistrationForm.tsx" "src/features/clinic/components/ClinicRegistrationForm.tsx"
Move-FileWithLogging "src/components/ClinicStaffManagement.tsx" "src/features/clinic/components/ClinicStaffManagement.tsx"
Move-FileWithLogging "src/components/ClinicStatusCard.tsx" "src/features/clinic/components/ClinicStatusCard.tsx"
Move-FileWithLogging "src/components/Layout/ClinicSwitcher.tsx" "src/features/clinic/components/ClinicSwitcher.tsx"
Move-FileWithLogging "src/pages/ClinicAdminPage.tsx" "src/features/clinic/pages/ClinicAdminPage.tsx"
Move-FileWithLogging "src/pages/ClinicSettings.tsx" "src/features/clinic/pages/ClinicSettings.tsx"
Move-FileWithLogging "src/pages/ClinicStaff.tsx" "src/features/clinic/pages/ClinicStaff.tsx"
Move-FileWithLogging "src/pages/ClinicSummary.tsx" "src/features/clinic/pages/ClinicSummary.tsx"

# === PRESCRIPTIONS ===
Move-FileWithLogging "src/hooks/useEnhancedPrescriptions.ts" "src/features/prescriptions/hooks/useEnhancedPrescriptions.ts"
Move-FileWithLogging "src/components/VisualPrescriptionEditor.tsx" "src/features/prescriptions/components/VisualPrescriptionEditor.tsx"
Move-FileWithLogging "src/components/VisualPrescriptionRenderer.tsx" "src/features/prescriptions/components/VisualPrescriptionRenderer.tsx"
Move-FileWithLogging "src/components/PrescriptionHistoryViewer.tsx" "src/features/prescriptions/components/PrescriptionHistoryViewer.tsx"
Move-FileWithLogging "src/pages/PrescriptionDashboard.tsx" "src/features/prescriptions/pages/PrescriptionDashboard.tsx"

# === MEDICAL TEMPLATES ===
Move-FileWithLogging "src/hooks/useTemplates.ts" "src/features/medical-templates/hooks/useTemplates.ts"
Move-FileWithLogging "src/hooks/useUnifiedTemplates.ts" "src/features/medical-templates/hooks/useUnifiedTemplates.ts"
Move-FileWithLogging "src/components/Templates/TemplateEditor.tsx" "src/features/medical-templates/components/TemplateEditor.tsx"
Move-FileWithLogging "src/components/TemplateAssistant.tsx" "src/features/medical-templates/components/TemplateAssistant.tsx"
Move-FileWithLogging "src/components/TemplateRunnerModal.tsx" "src/features/medical-templates/components/TemplateRunnerModal.tsx"
Move-FileWithLogging "src/components/PhysicalExamTemplates.tsx" "src/features/medical-templates/components/PhysicalExamTemplates.tsx"
Move-FileWithLogging "src/components/PhysicalExamTemplateEditor.tsx" "src/features/medical-templates/components/PhysicalExamTemplateEditor.tsx"
Move-FileWithLogging "src/pages/MedicalTemplates.tsx" "src/features/medical-templates/pages/MedicalTemplates.tsx"

# === MEDICAL RECORDS ===
Move-FileWithLogging "src/hooks/usePhysicalExam.ts" "src/features/medical-records/hooks/usePhysicalExam.ts"
Move-FileWithLogging "src/hooks/useValidation.ts" "src/features/medical-records/hooks/useValidation.ts"
Move-FileWithLogging "src/components/ConsultationForm.tsx" "src/features/medical-records/components/ConsultationForm.tsx"
Move-FileWithLogging "src/components/ConsultationModal.tsx" "src/features/medical-records/components/ConsultationModal.tsx"
Move-FileWithLogging "src/components/ConsultationDetails.tsx" "src/features/medical-records/components/ConsultationDetails.tsx"
Move-FileWithLogging "src/components/PhysicalExamForm.tsx" "src/features/medical-records/components/PhysicalExamForm.tsx"
Move-FileWithLogging "src/components/DynamicPhysicalExamForm.tsx" "src/features/medical-records/components/DynamicPhysicalExamForm.tsx"
Move-FileWithLogging "src/components/MedicalTranscription.tsx" "src/features/medical-records/components/MedicalTranscription.tsx"
Move-FileWithLogging "src/components/StudiesSection.tsx" "src/features/medical-records/components/StudiesSection.tsx"

# === MEDICAL SCALES ===
Move-FileWithLogging "src/components/ScaleAssessments.tsx" "src/features/medical-scales/components/ScaleAssessments.tsx"
Move-FileWithLogging "src/components/ScalePicker.tsx" "src/features/medical-scales/components/ScalePicker.tsx"
Move-FileWithLogging "src/components/ScaleStepper.tsx" "src/features/medical-scales/components/ScaleStepper.tsx"
Move-FileWithLogging "src/components/MedicalScalesPanel.tsx" "src/features/medical-scales/components/MedicalScalesPanel.tsx"
Move-FileWithLogging "src/pages/MedicalScales.tsx" "src/features/medical-scales/pages/MedicalScales.tsx"
Move-FileWithLogging "src/pages/MedicalScaleBarthel.tsx" "src/features/medical-scales/pages/MedicalScaleBarthel.tsx"
Move-FileWithLogging "src/pages/MedicalScaleBoston.tsx" "src/features/medical-scales/pages/MedicalScaleBoston.tsx"

# === LAYOUT COMPONENTS ===
Move-FileWithLogging "src/components/Layout/AppLayout.tsx" "src/components/layout/AppLayout.tsx"
Move-FileWithLogging "src/components/Layout/PatientPortalLayout.tsx" "src/components/layout/PatientPortalLayout.tsx"

# === SHARED COMPONENTS ===
Move-FileWithLogging "src/components/ErrorBoundary.tsx" "src/components/shared/ErrorBoundary.tsx"
Move-FileWithLogging "src/components/Logo.tsx" "src/components/shared/Logo.tsx"
Move-FileWithLogging "src/components/MedicalDataTable.tsx" "src/components/shared/MedicalDataTable.tsx"
Move-FileWithLogging "src/components/AccessibleTable.tsx" "src/components/shared/AccessibleTable.tsx"
Move-FileWithLogging "src/components/PhotoUploader.tsx" "src/components/shared/PhotoUploader.tsx"
Move-FileWithLogging "src/components/UploadDropzone.tsx" "src/components/shared/UploadDropzone.tsx"
Move-FileWithLogging "src/components/ActivityFeed.tsx" "src/components/shared/ActivityFeed.tsx"
Move-FileWithLogging "src/components/AuditTrailViewer.tsx" "src/components/shared/AuditTrailViewer.tsx"
Move-FileWithLogging "src/components/NotificationBell.tsx" "src/components/shared/NotificationBell.tsx"
Move-FileWithLogging "src/components/ValidationNotification.tsx" "src/components/shared/ValidationNotification.tsx"
Move-FileWithLogging "src/components/MedicalStatsCard.tsx" "src/components/shared/MedicalStatsCard.tsx"
Move-FileWithLogging "src/components/QuickStartModal.tsx" "src/components/shared/QuickStartModal.tsx"
Move-FileWithLogging "src/components/GenerateInvitationLinkModal.tsx" "src/components/shared/GenerateInvitationLinkModal.tsx"
Move-FileWithLogging "src/components/SettingsExample.tsx" "src/components/shared/SettingsExample.tsx"
Move-FileWithLogging "src/components/Navigation/Navbar.tsx" "src/components/shared/Navbar.tsx"
Move-FileWithLogging "src/components/Navigation/SearchBar.tsx" "src/components/shared/SearchBar.tsx"

# === SHARED HOOKS ===
Move-FileWithLogging "src/hooks/useNotifications.ts" "src/hooks/shared/useNotifications.ts"
Move-FileWithLogging "src/hooks/useActivityLog.ts" "src/hooks/shared/useActivityLog.ts"
Move-FileWithLogging "src/hooks/useProfilePhotos.ts" "src/hooks/shared/useProfilePhotos.ts"

# Remover directorios vacíos
Write-Host "🧹 Limpiando directorios vacíos..." -ForegroundColor Cyan

$oldDirs = @(
    "src/components/Layout",
    "src/components/Navigation",
    "src/components/Templates"
)

foreach ($dir in $oldDirs) {
    if (Test-Path $dir) {
        # Solo remover si está vacío
        if ((Get-ChildItem $dir -Force | Measure-Object).Count -eq 0) {
            Remove-Item $dir -Force
            Write-Host "🗑️  Removido directorio vacío: $dir" -ForegroundColor Gray
        }
    }
}

Write-Host "✅ Migración de archivos completada!" -ForegroundColor Green
Write-Host "⚠️  IMPORTANTE: Ejecuta 'npm run fix-imports' para actualizar las rutas de importación." -ForegroundColor Yellow
Write-Host "📝 Revisa manualmente cualquier importación rota y ajusta según sea necesario." -ForegroundColor Yellow

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar: npm run fix-imports" -ForegroundColor White
Write-Host "2. Ejecutar: npm run lint" -ForegroundColor White
Write-Host "3. Ejecutar: npm run dev" -ForegroundColor White
Write-Host "4. Revisar y corregir errores de importación manualmente" -ForegroundColor White
