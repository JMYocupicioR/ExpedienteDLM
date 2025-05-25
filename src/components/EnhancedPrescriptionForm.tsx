import React, { useState, useEffect, useRef } from 'react';
import { QrCode, AlertCircle, CheckCircle, Printer, Save, Eye, Shield, History, Download, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface EnhancedPrescriptionFormProps {
  patientId: string;
  patientName: string;
  onSave: (prescription: any) => void;
  previousPrescriptions?: any[];
  patients?: { id: string; full_name: string }[];
  onPatientChange?: (patientId: string) => void;
}

// Base de datos de medicamentos comunes para autocompletado
const commonMedications = [
  { name: 'Amoxicilina', dosages: ['250mg', '500mg', '875mg'], frequencies: ['Cada 8 horas', 'Cada 12 horas'] },
  { name: 'Ibuprofeno', dosages: ['200mg', '400mg', '600mg', '800mg'], frequencies: ['Cada 4-6 horas', 'Cada 6 horas', 'Cada 8 horas'] },
  { name: 'Paracetamol', dosages: ['500mg', '650mg', '1g'], frequencies: ['Cada 4-6 horas', 'Cada 6 horas', 'Cada 8 horas'] },
  { name: 'Losartán', dosages: ['25mg', '50mg', '100mg'], frequencies: ['Una vez al día', 'Dos veces al día'] },
  { name: 'Metformina', dosages: ['500mg', '850mg', '1000mg'], frequencies: ['Una vez al día', 'Dos veces al día', 'Tres veces al día'] },
  { name: 'Omeprazol', dosages: ['20mg', '40mg'], frequencies: ['Una vez al día', 'Dos veces al día'] },
  { name: 'Atorvastatina', dosages: ['10mg', '20mg', '40mg', '80mg'], frequencies: ['Una vez al día'] },
  { name: 'Amlodipino', dosages: ['5mg', '10mg'], frequencies: ['Una vez al día'] },
  { name: 'Ciprofloxacino', dosages: ['250mg', '500mg', '750mg'], frequencies: ['Cada 12 horas'] },
  { name: 'Azitromicina', dosages: ['250mg', '500mg'], frequencies: ['Una vez al día'] }
];

// Verificador de interacciones medicamentosas (simulado)
const drugInteractions: { [key: string]: string[] } = {
  'Warfarina': ['Aspirina', 'Ibuprofeno', 'Amoxicilina'],
  'Metformina': ['Alcohol', 'Contrastes yodados'],
  'Losartán': ['Potasio', 'Espironolactona'],
  'Atorvastatina': ['Gemfibrozilo', 'Eritromicina']
};

export default function EnhancedPrescriptionForm({ 
  patientId, 
  patientName, 
  onSave,
  previousPrescriptions = [],
  patients = [],
  onPatientChange
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
  const [drugAlerts, setDrugAlerts] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
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

  // Generar código QR
  useEffect(() => {
    const generateQR = async () => {
      const prescriptionData = {
        id: Date.now().toString(),
        patient: patientName,
        date: new Date().toISOString(),
        medications: medications.filter(m => m.name),
        doctor: 'Dr. Juan Médico' // Esto vendría del perfil del usuario
      };

      try {
        const url = await QRCode.toDataURL(JSON.stringify(prescriptionData), {
          width: 150,
          margin: 1
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    if (medications.some(m => m.name)) {
      generateQR();
    }
  }, [medications, patientName]);

  // Verificar interacciones medicamentosas
  useEffect(() => {
    const alerts: string[] = [];
    medications.forEach((med, index) => {
      if (med.name && drugInteractions[med.name]) {
        medications.forEach((otherMed, otherIndex) => {
          if (index !== otherIndex && drugInteractions[med.name].includes(otherMed.name)) {
            alerts.push(`⚠️ Posible interacción entre ${med.name} y ${otherMed.name}`);
          }
        });
      }
    });
    setDrugAlerts(Array.from(new Set(alerts)));
  }, [medications]);

  // Autocompletado de medicamentos
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

  // Seleccionar sugerencia
  const selectSuggestion = (suggestion: any, index: number) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = suggestion.name;
    if (suggestion.dosages.length > 0) {
      updatedMeds[index].dosage = suggestion.dosages[0];
    }
    if (suggestion.frequencies.length > 0) {
      updatedMeds[index].frequency = suggestion.frequencies[0];
    }
    setMedications(updatedMeds);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  // Agregar medicamento
  const addMedication = () => {
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
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
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

  // Guardar receta
  const handleSave = () => {
    const prescriptionData = {
      patient_id: patientId,
      medications: medications.filter(m => m.name),
      diagnosis,
      notes,
      signature: signatureData,
      qr_code: qrCodeUrl,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

  return (
    <div className="space-y-6">
      {/* Indicador de estado offline */}
      {isOffline && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 flex items-center">
          <WifiOff className="h-5 w-5 text-yellow-400 mr-2" />
          <span className="text-yellow-300 text-sm">Modo offline: Las recetas se guardarán localmente</span>
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

      {/* Alertas de interacciones medicamentosas */}
      {drugAlerts.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-red-300 font-medium mb-2">Alertas de Interacciones</h4>
              <ul className="text-red-200 text-sm space-y-1">
                {drugAlerts.map((alert, index) => (
                  <li key={index}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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