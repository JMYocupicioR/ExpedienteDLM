import React, { useState, useEffect, useRef } from 'react';
import { QrCode, AlertCircle, CheckCircle, Printer, Save, Eye, Shield, History, Download, Wifi, WifiOff, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { 
  validateMedication, 
  checkDrugInteractions, 
  calculatePrescriptionExpiry,
  MEDICATION_CONSTRAINTS,
  SYSTEM_LIMITS
} from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ValidationAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  medication?: string;
}

interface EnhancedPrescriptionFormProps {
  patientId: string;
  patientName: string;
  onSave: (prescription: any) => void;
  previousPrescriptions?: any[];
  patients?: { id: string; full_name: string }[];
  onPatientChange?: (patientId: string) => void;
  patientAllergies?: string[];
  doctorSpecialty?: string;
}

// Base de datos de medicamentos comunes para autocompletado (usando la configuración centralizada)
const commonMedications = Object.keys(MEDICATION_CONSTRAINTS).map(name => {
  const constraint = MEDICATION_CONSTRAINTS[name];
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    dosages: [`${constraint.minDosage}mg`, `${constraint.maxDosage}mg`],
    frequencies: constraint.allowedFrequencies,
    maxDuration: constraint.maxDurationDays,
    controlled: constraint.controlledSubstance || false,
    requiresSpecialist: constraint.requiresSpecialist || false
  };
});

export default function EnhancedPrescriptionForm({ 
  patientId, 
  patientName, 
  onSave,
  previousPrescriptions = [],
  patients = [],
  onPatientChange,
  patientAllergies = [],
  doctorSpecialty = 'medicina_general'
}: EnhancedPrescriptionFormProps) {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([{
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [validationAlerts, setValidationAlerts] = useState<ValidationAlert[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ===== VALIDACIÓN COMPLETA EN TIEMPO REAL =====
  useEffect(() => {
    validatePrescriptionComplete();
  }, [medications, diagnosis, patientAllergies, doctorSpecialty]);

  const validatePrescriptionComplete = async () => {
    setIsValidating(true);
    const alerts: ValidationAlert[] = [];
    
    try {
      // Validar medicamentos individuales
      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        if (!med.name) continue;

        // Extraer dosificación numérica
        const dosageMatch = med.dosage.match(/(\d+(?:\.\d+)?)/);
        const dosageNum = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
        
        // Extraer duración numérica
        const durationMatch = med.duration.match(/(\d+)/);
        const durationNum = durationMatch ? parseInt(durationMatch[1]) : 0;

        // Validar con configuración médica
        const validation = validateMedication(med.name.toLowerCase(), dosageNum, med.frequency.toLowerCase(), durationNum);
        
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            alerts.push({
              type: 'error',
              message: error,
              medication: med.name
            });
          });
        }

        validation.warnings.forEach(warning => {
          alerts.push({
            type: 'warning',
            message: warning,
            medication: med.name
          });
        });

        // Verificar alergias del paciente
        if (patientAllergies.some(allergy => med.name.toLowerCase().includes(allergy.toLowerCase()))) {
          alerts.push({
            type: 'error',
            message: `Paciente alérgico a ${med.name}`,
            medication: med.name
          });
        }

        // Verificar si requiere especialista
        const constraint = MEDICATION_CONSTRAINTS[med.name.toLowerCase()];
        if (constraint?.requiresSpecialist && doctorSpecialty === 'medicina_general') {
          alerts.push({
            type: 'warning',
            message: `${med.name} requiere prescripción por especialista`,
            medication: med.name
          });
        }
      }

      // Verificar interacciones medicamentosas
      const medicationNames = medications.filter(m => m.name).map(m => m.name);
      const interactions = checkDrugInteractions(medicationNames);
      
      interactions.forEach(interaction => {
        alerts.push({
          type: 'warning',
          message: interaction
        });
      });

      // Verificar límite de medicamentos
      if (medications.filter(m => m.name).length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
        alerts.push({
          type: 'error',
          message: `Máximo ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos por receta`
        });
      }

      // Validar usando esquema JSONB
      const medicationsForValidation = medications.filter(m => m.name).map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions
      }));

      if (medicationsForValidation.length > 0) {
        const jsonbValidation = validateJSONBSchema(medicationsForValidation, 'medications');
        if (!jsonbValidation.isValid) {
          jsonbValidation.errors.forEach(error => {
            alerts.push({
              type: 'error',
              message: `Validación de esquema: ${error}`
            });
          });
        }
      }

      // Calcular fecha de expiración inteligente
      if (medicationNames.length > 0) {
        const expiry = calculatePrescriptionExpiry(medicationNames);
        setExpiryDate(expiry);
      }

      setValidationAlerts(alerts);
    } catch (error) {
      console.error('Error en validación:', error);
      alerts.push({
        type: 'error',
        message: 'Error interno de validación'
      });
      setValidationAlerts(alerts);
    } finally {
      setIsValidating(false);
    }
  };

  // Generar código QR con información de seguridad
  useEffect(() => {
    const generateQR = async () => {
      const validMedications = medications.filter(m => m.name);
      if (validMedications.length === 0) return;

      const prescriptionData = {
        id: Date.now().toString(),
        patient: patientName,
        patientId: patientId,
        date: new Date().toISOString(),
        medications: validMedications,
        diagnosis: diagnosis,
        doctor: 'Dr. Juan Médico', // Esto vendría del perfil del usuario
        expiryDate: expiryDate?.toISOString(),
        signature: signatureData ? true : false,
        version: '1.0'
      };

      try {
        const url = await QRCode.toDataURL(JSON.stringify(prescriptionData), {
          width: 150,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
  }, [medications, patientName, patientId, diagnosis, expiryDate, signatureData]);

  // Autocompletado de medicamentos mejorado
  const handleMedicationNameChange = (index: number, value: string) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = value;
    setMedications(updatedMeds);

    if (value.length > 2) {
      const filtered = commonMedications.filter(med => 
        med.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setActiveSuggestionIndex(index);
    } else {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  // Seleccionar sugerencia con autocompletado inteligente
  const selectSuggestion = (suggestion: any, index: number) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = suggestion.name;
    
    // Autocompletar con valores sugeridos
    if (suggestion.dosages.length > 0) {
      updatedMeds[index].dosage = suggestion.dosages[0];
    }
    if (suggestion.frequencies.length > 0) {
      updatedMeds[index].frequency = suggestion.frequencies[0];
    }
    
    // Sugerir duración basada en el tipo de medicamento
    const defaultDuration = Math.min(suggestion.maxDuration, 7);
    updatedMeds[index].duration = `${defaultDuration} días`;
    
    setMedications(updatedMeds);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  // Agregar medicamento con validación
  const addMedication = () => {
    if (medications.length >= SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
      alert(`Máximo ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos permitidos por receta`);
      return;
    }
    
    setMedications([...medications, {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]);
  };

  // Eliminar medicamento
  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Actualizar medicamento
  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updatedMeds = [...medications];
    updatedMeds[index][field] = value;
    setMedications(updatedMeds);
  };

  // Firma digital - Iniciar dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Firma digital - Dibujar
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb';
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Firma digital - Terminar dibujo
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  // Limpiar firma
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // Guardar receta con validación completa
  const handleSave = () => {
    // Verificar errores críticos
    const criticalErrors = validationAlerts.filter(alert => alert.type === 'error');
    if (criticalErrors.length > 0) {
      alert('No se puede guardar la receta. Hay errores que deben corregirse:\n' + 
            criticalErrors.map(error => `• ${error.message}`).join('\n'));
      return;
    }

    // Validar campos requeridos
    if (!diagnosis.trim()) {
      alert('El diagnóstico es requerido');
      return;
    }

    const validMedications = medications.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (validMedications.length === 0) {
      alert('Debe agregar al menos un medicamento completo');
      return;
    }

    const prescriptionData = {
      patient_id: patientId,
      medications: validMedications,
      diagnosis: diagnosis.trim(),
      notes: notes.trim(),
      signature: signatureData,
      qr_code: qrCodeUrl,
      created_at: new Date().toISOString(),
      expires_at: (expiryDate || calculatePrescriptionExpiry(validMedications.map(m => m.name))).toISOString(),
      validation_alerts: validationAlerts.filter(alert => alert.type === 'warning').map(alert => alert.message)
    };

    // Si está offline, guardar en localStorage
    if (isOffline) {
      const offlinePrescriptions = JSON.parse(localStorage.getItem('offline_prescriptions') || '[]');
      offlinePrescriptions.push(prescriptionData);
      localStorage.setItem('offline_prescriptions', JSON.stringify(offlinePrescriptions));
    }

    onSave(prescriptionData);
  };

  // Imprimir receta
  const handlePrint = () => {
    window.print();
  };

  // Renderizar alertas de validación
  const renderValidationAlerts = () => {
    if (validationAlerts.length === 0) return null;

    const errors = validationAlerts.filter(alert => alert.type === 'error');
    const warnings = validationAlerts.filter(alert => alert.type === 'warning');

    return (
      <div className="space-y-2 mb-4">
        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
              <span className="text-red-300 font-medium">Errores que requieren corrección:</span>
            </div>
            {errors.map((error, index) => (
              <div key={index} className="text-red-300 text-sm ml-6">
                • {error.medication && `[${error.medication}] `}{error.message}
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <Shield className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-yellow-300 font-medium">Advertencias importantes:</span>
            </div>
            {warnings.map((warning, index) => (
              <div key={index} className="text-yellow-300 text-sm ml-6">
                • {warning.medication && `[${warning.medication}] `}{warning.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Indicador de estado offline */}
      {isOffline && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 flex items-center">
          <WifiOff className="h-5 w-5 text-yellow-400 mr-2" />
          <span className="text-yellow-300 text-sm">Modo offline: Las recetas se guardarán localmente</span>
        </div>
      )}

      {/* Estado de validación */}
      {isValidating && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3 flex items-center">
          <Clock className="h-5 w-5 text-blue-400 mr-2 animate-spin" />
          <span className="text-blue-300 text-sm">Validando receta...</span>
        </div>
      )}

      {/* Alertas de validación */}
      {renderValidationAlerts()}

      {/* Información de expiración */}
      {expiryDate && (
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-300 text-sm">
              Fecha de expiración: {format(expiryDate, 'dd/MM/yyyy', { locale: es })}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días de validez
          </div>
        </div>
      )}

      {/* Selector de paciente */}
      <div className="dark-card p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paciente <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
          <select
            value={patientId}
            onChange={(e) => onPatientChange && onPatientChange(e.target.value)}
            className="flex-1 dark-input"
            required
          >
            <option value="">Seleccione un paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate('/patients?action=new')}
            className="px-4 py-2 dark-button-secondary text-sm"
            title="Registrar nuevo paciente"
          >
            + Nuevo
          </button>
        </div>
        {!patientId && (
          <p className="mt-1 text-xs text-yellow-400">Debe seleccionar un paciente para continuar</p>
        )}
      </div>

      {/* Historial de recetas anteriores */}
      {previousPrescriptions.length > 0 && (
        <div className="dark-card p-4">
          <div className="flex items-center mb-3">
            <History className="h-5 w-5 text-cyan-400 mr-2" />
            <h3 className="text-gray-100 font-medium">Recetas Anteriores del Paciente</h3>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {previousPrescriptions.slice(0, 3).map((rx, index) => (
              <div key={index} className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded">
                <span className="text-gray-400">{format(new Date(rx.created_at), 'dd/MM/yyyy')}</span>
                <span className="mx-2">•</span>
                <span>{rx.diagnosis}</span>
                <button 
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                  onClick={() => {/* Copiar receta */}}
                >
                  Usar como base
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda - Formulario */}
        <div className="space-y-4">
          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Diagnóstico</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full dark-input"
              placeholder="Ingrese el diagnóstico"
              required
            />
          </div>

          {/* Medicamentos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Medicamentos</label>
            {medications.map((medication, index) => (
              <div key={index} className="relative mb-4 p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={medication.name}
                      onChange={(e) => handleMedicationNameChange(index, e.target.value)}
                      className="w-full dark-input"
                      placeholder="Nombre del medicamento"
                      required
                    />
                    {/* Sugerencias de autocompletado */}
                    {suggestions.length > 0 && activeSuggestionIndex === index && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectSuggestion(suggestion, index)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-cyan-400"
                          >
                            {suggestion.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={medication.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Dosis (ej. 500mg)"
                    required
                  />
                  
                  <input
                    type="text"
                    value={medication.frequency}
                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Frecuencia"
                    required
                  />
                  
                  <input
                    type="text"
                    value={medication.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Duración"
                    required
                  />
                  
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      className="w-full dark-input"
                      placeholder="Instrucciones especiales"
                    />
                  </div>
                </div>
                
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMedication}
              className="w-full py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400 rounded-lg transition-colors"
            >
              + Agregar otro medicamento
            </button>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full dark-input"
              placeholder="Recomendaciones adicionales"
            />
          </div>

          {/* Firma digital */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Firma Digital</label>
            <div className="border border-gray-700 rounded-lg p-2 bg-gray-800/30">
              <canvas
                ref={canvasRef}
                width={300}
                height={100}
                className="w-full bg-gray-900 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm text-gray-400 hover:text-gray-300"
              >
                Limpiar firma
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha - Vista previa */}
        <div className="lg:sticky lg:top-4">
          <div className="dark-card p-6 print-friendly" id="prescription-preview">
            <div className="text-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100 mb-2">RECETA MÉDICA</h2>
              <p className="text-sm text-gray-400">Dr. Juan Médico</p>
              <p className="text-xs text-gray-500">CED. PROF. 12345678</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-gray-400">Paciente:</span>
                <span className="ml-2 text-gray-200">{patientName}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Fecha:</span>
                <span className="ml-2 text-gray-200">{format(new Date(), 'dd/MM/yyyy', { locale: es })}</span>
              </div>

              {diagnosis && (
                <div>
                  <span className="text-gray-400">Diagnóstico:</span>
                  <span className="ml-2 text-gray-200">{diagnosis}</span>
                </div>
              )}

              {medications.filter(m => m.name).length > 0 && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-2">Medicamentos:</h3>
                  <div className="space-y-2">
                    {medications.filter(m => m.name).map((med, index) => (
                      <div key={index} className="pl-4 border-l-2 border-cyan-400">
                        <div className="font-medium text-gray-200">{med.name} - {med.dosage}</div>
                        <div className="text-gray-400 text-xs">
                          {med.frequency} por {med.duration}
                          {med.instructions && <span className="block">Instrucciones: {med.instructions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {notes && (
                <div>
                  <h3 className="text-gray-300 font-medium mb-1">Notas:</h3>
                  <p className="text-gray-400 text-xs">{notes}</p>
                </div>
              )}

              <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-700">
                {signatureData && (
                  <div>
                    <img src={signatureData} alt="Firma" className="h-16" />
                    <p className="text-xs text-gray-500 mt-1">Firma del médico</p>
                  </div>
                )}
                
                {qrCodeUrl && (
                  <div className="text-center">
                    <img src={qrCodeUrl} alt="QR Code" className="h-20 w-20" />
                    <p className="text-xs text-gray-500 mt-1">Código de verificación</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!patientId || !diagnosis || medications.filter(m => m.name).length === 0}
              className={`flex-1 flex items-center justify-center ${
                !patientId || !diagnosis || medications.filter(m => m.name).length === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-primary'
              }`}
              title={
                !patientId ? 'Seleccione un paciente' :
                !diagnosis ? 'Ingrese un diagnóstico' :
                medications.filter(m => m.name).length === 0 ? 'Agregue al menos un medicamento' :
                'Guardar receta'
              }
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </button>
            
            <button
              onClick={handlePrint}
              disabled={!patientId || !diagnosis || medications.filter(m => m.name).length === 0}
              className={`flex-1 flex items-center justify-center ${
                !patientId || !diagnosis || medications.filter(m => m.name).length === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-secondary'
              }`}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
          </div>

          {/* Indicadores de seguridad */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              <span>Receta segura</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Verificable</span>
            </div>
            {isOffline ? (
              <div className="flex items-center text-yellow-500">
                <WifiOff className="h-3 w-3 mr-1" />
                <span>Offline</span>
              </div>
            ) : (
              <div className="flex items-center text-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                <span>Online</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #prescription-preview, #prescription-preview * {
            visibility: visible;
          }
          #prescription-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 40px !important;
          }
          .dark-card {
            border: none !important;
            box-shadow: none !important;
          }
          .text-gray-100, .text-gray-200, .text-gray-300 {
            color: black !important;
          }
          .text-gray-400, .text-gray-500 {
            color: #666 !important;
          }
          .border-gray-700 {
            border-color: #ccc !important;
          }
          .bg-gray-800\\/30 {
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
} 