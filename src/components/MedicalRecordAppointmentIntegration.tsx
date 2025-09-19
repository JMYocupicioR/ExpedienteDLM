import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Stethoscope,
  Pill,
  Calendar,
  User,
  ClipboardList,
  Activity,
  Heart,
  Thermometer,
  Weight,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Edit
} from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { EnhancedAppointment } from '@/lib/database.types';
import MedicalRecordAppointmentIntegrationService, {
  AppointmentConsultationLink
} from '@/lib/services/medical-record-appointment-integration';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MedicalRecordAppointmentIntegrationProps {
  className?: string;
}

interface ConsultationFormData {
  diagnosis: string;
  symptoms: string;
  treatment_plan: string;
  vital_signs: {
    blood_pressure: string;
    heart_rate: string;
    temperature: string;
    weight: string;
    height: string;
    oxygen_saturation: string;
  };
  follow_up_required: boolean;
  follow_up_date: string;
  notes: string;
}

interface PrescriptionFormData {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  instructions: string;
  duration_days: number;
  notes: string;
}

export default function MedicalRecordAppointmentIntegration({ className }: MedicalRecordAppointmentIntegrationProps) {
  const { user } = useAuth();

  const [appointmentsReady, setAppointmentsReady] = useState<EnhancedAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<EnhancedAppointment | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<AppointmentConsultationLink | null>(null);
  const [showConsultationDialog, setShowConsultationDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [consultationForm, setConsultationForm] = useState<ConsultationFormData>({
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    vital_signs: {
      blood_pressure: '',
      heart_rate: '',
      temperature: '',
      weight: '',
      height: '',
      oxygen_saturation: ''
    },
    follow_up_required: false,
    follow_up_date: '',
    notes: ''
  });

  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormData>({
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    instructions: '',
    duration_days: 30,
    notes: ''
  });

  // Load appointments ready for consultation
  const loadAppointmentsReady = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const appointments = await MedicalRecordAppointmentIntegrationService
        .getAppointmentsReadyForConsultation(user.id);

      setAppointmentsReady(appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointmentsReady();
  }, [user?.id]);

  // Handle appointment selection
  const handleAppointmentSelect = async (appointment: EnhancedAppointment) => {
    setSelectedAppointment(appointment);

    try {
      const record = await MedicalRecordAppointmentIntegrationService
        .getAppointmentMedicalRecord(appointment.id);
      setMedicalRecord(record);
    } catch (err) {
      console.error('Error loading medical record:', err);
    }
  };

  // Handle consultation form submission
  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSaving(true);
    try {
      await MedicalRecordAppointmentIntegrationService.linkAppointmentToConsultation(
        selectedAppointment.id,
        {
          diagnosis: consultationForm.diagnosis,
          symptoms: consultationForm.symptoms,
          treatment_plan: consultationForm.treatment_plan,
          vital_signs: consultationForm.vital_signs,
          follow_up_required: consultationForm.follow_up_required,
          follow_up_date: consultationForm.follow_up_required ? consultationForm.follow_up_date : undefined,
          notes: consultationForm.notes
        }
      );

      // Update appointment status
      await MedicalRecordAppointmentIntegrationService.updateAppointmentStatus(
        selectedAppointment.id,
        'completed'
      );

      setShowConsultationDialog(false);
      await loadAppointmentsReady();

      // Reset form
      setConsultationForm({
        diagnosis: '',
        symptoms: '',
        treatment_plan: '',
        vital_signs: {
          blood_pressure: '',
          heart_rate: '',
          temperature: '',
          weight: '',
          height: '',
          oxygen_saturation: ''
        },
        follow_up_required: false,
        follow_up_date: '',
        notes: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving consultation');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle prescription form submission
  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSaving(true);
    try {
      await MedicalRecordAppointmentIntegrationService.linkToPrescription(
        selectedAppointment.id,
        {
          medications: prescriptionForm.medications.filter(med => med.name.trim() !== ''),
          instructions: prescriptionForm.instructions,
          duration_days: prescriptionForm.duration_days,
          notes: prescriptionForm.notes
        }
      );

      setShowPrescriptionDialog(false);

      // Reset form
      setPrescriptionForm({
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        instructions: '',
        duration_days: 30,
        notes: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving prescription');
    } finally {
      setIsSaving(false);
    }
  };

  // Add medication to prescription form
  const addMedication = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  // Remove medication from prescription form
  const removeMedication = (index: number) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  // Update medication in prescription form
  const updateMedication = (index: number, field: string, value: string) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'confirmed_by_patient':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
            <p>Cargando expedientes médicos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expedientes Médicos - Integración con Citas
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Appointments Ready for Consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Citas Pendientes de Consulta ({appointmentsReady.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointmentsReady.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay citas pendientes de consulta para hoy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointmentsReady.map(appointment => (
                <div
                  key={appointment.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAppointmentSelect(appointment)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium">{appointment.patient?.name}</h3>
                        <p className="text-sm text-gray-500">{appointment.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {appointment.appointment_time}
                      </span>
                    </div>
                  </div>

                  {selectedAppointment?.id === appointment.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConsultationDialog(true);
                          }}
                        >
                          <Stethoscope className="h-4 w-4 mr-1" />
                          Crear Consulta
                        </Button>

                        {medicalRecord?.consultation && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPrescriptionDialog(true);
                            }}
                          >
                            <Pill className="h-4 w-4 mr-1" />
                            Agregar Receta
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRecordDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Expediente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultation Dialog */}
      <Dialog open={showConsultationDialog} onOpenChange={setShowConsultationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Consulta Médica</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConsultationSubmit} className="space-y-6">
            <Tabs defaultValue="consultation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="consultation">Consulta</TabsTrigger>
                <TabsTrigger value="vitals">Signos Vitales</TabsTrigger>
                <TabsTrigger value="follow-up">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="consultation" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnóstico *</Label>
                  <Input
                    id="diagnosis"
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder="Diagnóstico principal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Síntomas</Label>
                  <Textarea
                    id="symptoms"
                    value={consultationForm.symptoms}
                    onChange={(e) => setConsultationForm(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="Síntomas reportados por el paciente..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatment">Plan de Tratamiento</Label>
                  <Textarea
                    id="treatment"
                    value={consultationForm.treatment_plan}
                    onChange={(e) => setConsultationForm(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    placeholder="Plan de tratamiento recomendado..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={consultationForm.notes}
                    onChange={(e) => setConsultationForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observaciones adicionales..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="vitals" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bp" className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      Presión Arterial
                    </Label>
                    <Input
                      id="bp"
                      value={consultationForm.vital_signs.blood_pressure}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, blood_pressure: e.target.value }
                      }))}
                      placeholder="120/80 mmHg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hr" className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      Frecuencia Cardíaca
                    </Label>
                    <Input
                      id="hr"
                      value={consultationForm.vital_signs.heart_rate}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, heart_rate: e.target.value }
                      }))}
                      placeholder="72 bpm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp" className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      Temperatura
                    </Label>
                    <Input
                      id="temp"
                      value={consultationForm.vital_signs.temperature}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, temperature: e.target.value }
                      }))}
                      placeholder="36.5°C"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center gap-1">
                      <Weight className="h-4 w-4" />
                      Peso
                    </Label>
                    <Input
                      id="weight"
                      value={consultationForm.vital_signs.weight}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, weight: e.target.value }
                      }))}
                      placeholder="70 kg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Altura</Label>
                    <Input
                      id="height"
                      value={consultationForm.vital_signs.height}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, height: e.target.value }
                      }))}
                      placeholder="170 cm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oxygen">Saturación de Oxígeno</Label>
                    <Input
                      id="oxygen"
                      value={consultationForm.vital_signs.oxygen_saturation}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        vital_signs: { ...prev.vital_signs, oxygen_saturation: e.target.value }
                      }))}
                      placeholder="98%"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="follow-up" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="follow-up">Requiere seguimiento</Label>
                    <p className="text-sm text-gray-500">
                      Programar automáticamente una cita de seguimiento
                    </p>
                  </div>
                  <Switch
                    id="follow-up"
                    checked={consultationForm.follow_up_required}
                    onCheckedChange={(checked) => setConsultationForm(prev => ({
                      ...prev,
                      follow_up_required: checked
                    }))}
                  />
                </div>

                {consultationForm.follow_up_required && (
                  <div className="space-y-2">
                    <Label htmlFor="follow-up-date">Fecha de Seguimiento</Label>
                    <Input
                      id="follow-up-date"
                      type="date"
                      value={consultationForm.follow_up_date}
                      onChange={(e) => setConsultationForm(prev => ({
                        ...prev,
                        follow_up_date: e.target.value
                      }))}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required={consultationForm.follow_up_required}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setShowConsultationDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Crear Consulta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Receta Médica</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePrescriptionSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medicamentos</Label>
                <Button type="button" size="sm" onClick={addMedication}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Medicamento
                </Button>
              </div>

              {prescriptionForm.medications.map((medication, index) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Medicamento {index + 1}</h4>
                      {prescriptionForm.medications.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMedication(index)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nombre del Medicamento *</Label>
                        <Input
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          placeholder="Ej: Paracetamol"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Dosis</Label>
                        <Input
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          placeholder="Ej: 500mg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Frecuencia</Label>
                        <Input
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          placeholder="Ej: Cada 8 horas"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Duración</Label>
                        <Input
                          value={medication.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          placeholder="Ej: 7 días"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Instrucciones Específicas</Label>
                      <Textarea
                        value={medication.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="Instrucciones especiales para este medicamento..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prescription-instructions">Instrucciones Generales</Label>
                <Textarea
                  id="prescription-instructions"
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Instrucciones generales para toda la receta..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration-days">Duración Total (días)</Label>
                  <Input
                    id="duration-days"
                    type="number"
                    value={prescriptionForm.duration_days}
                    onChange={(e) => setPrescriptionForm(prev => ({
                      ...prev,
                      duration_days: parseInt(e.target.value) || 30
                    }))}
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prescription-notes">Notas Adicionales</Label>
                <Textarea
                  id="prescription-notes"
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales o recomendaciones..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Crear Receta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Medical Record View Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expediente Médico</DialogTitle>
          </DialogHeader>

          {medicalRecord && (
            <div className="space-y-6">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nombre</p>
                      <p className="font-medium">{medicalRecord.appointment.patient?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Cita</p>
                      <p className="font-medium">
                        {format(parseISO(medicalRecord.appointment.appointment_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consultation */}
              {medicalRecord.consultation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      Consulta Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Diagnóstico</p>
                      <p className="font-medium">{medicalRecord.consultation.diagnosis}</p>
                    </div>

                    {medicalRecord.consultation.symptoms && (
                      <div>
                        <p className="text-sm text-gray-500">Síntomas</p>
                        <p>{medicalRecord.consultation.symptoms}</p>
                      </div>
                    )}

                    {medicalRecord.consultation.treatment_plan && (
                      <div>
                        <p className="text-sm text-gray-500">Plan de Tratamiento</p>
                        <p>{medicalRecord.consultation.treatment_plan}</p>
                      </div>
                    )}

                    {medicalRecord.consultation.vital_signs && Object.keys(medicalRecord.consultation.vital_signs).length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Signos Vitales</p>
                        <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                          {medicalRecord.consultation.vital_signs.blood_pressure && (
                            <div>
                              <p className="text-xs text-gray-500">Presión Arterial</p>
                              <p className="text-sm font-medium">{medicalRecord.consultation.vital_signs.blood_pressure}</p>
                            </div>
                          )}
                          {medicalRecord.consultation.vital_signs.heart_rate && (
                            <div>
                              <p className="text-xs text-gray-500">Frecuencia Cardíaca</p>
                              <p className="text-sm font-medium">{medicalRecord.consultation.vital_signs.heart_rate}</p>
                            </div>
                          )}
                          {medicalRecord.consultation.vital_signs.temperature && (
                            <div>
                              <p className="text-xs text-gray-500">Temperatura</p>
                              <p className="text-sm font-medium">{medicalRecord.consultation.vital_signs.temperature}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Prescription */}
              {medicalRecord.prescription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      Receta Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Medicamentos</p>
                      <div className="space-y-2">
                        {medicalRecord.prescription.medications.map((med: any, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded">
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-gray-600">
                              {med.dosage} - {med.frequency} - {med.duration}
                            </p>
                            {med.instructions && (
                              <p className="text-sm text-gray-500 mt-1">{med.instructions}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {medicalRecord.prescription.instructions && (
                      <div>
                        <p className="text-sm text-gray-500">Instrucciones Generales</p>
                        <p>{medicalRecord.prescription.instructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}