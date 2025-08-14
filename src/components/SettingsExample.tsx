import React from 'react';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Ejemplo de cómo estructurar secciones y listas usando el sistema de diseño unificado
 */
export function SettingsExample() {
  return (
    <div className="page-container">
      {/* Sección principal con título y descripción */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Configuración de Notificaciones</h2>
          <p className="section-subtitle">
            Administra cómo y cuándo recibir alertas importantes sobre tu práctica médica
          </p>
        </div>

        {/* Card con lista de viñetas */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Tipos de Notificaciones</h3>
          
          <ul className="list mb-6">
            <li className="list-item">
              <span>Nuevos pacientes registrados en el sistema</span>
            </li>
            <li className="list-item">
              <span>Citas programadas para el día siguiente</span>
            </li>
            <li className="list-item">
              <span>Resultados de laboratorio disponibles</span>
            </li>
            <li className="list-item">
              <span>Recordatorios de seguimiento de pacientes</span>
            </li>
          </ul>

          {/* Lista numerada */}
          <h4 className="text-base font-medium mb-3">Prioridades de Notificación</h4>
          <ol className="list list-numbered">
            <li className="list-item">
              <span>Emergencias médicas (notificación inmediata)</span>
            </li>
            <li className="list-item">
              <span>Citas del día actual (notificación 1 hora antes)</span>
            </li>
            <li className="list-item">
              <span>Recordatorios generales (resumen diario)</span>
            </li>
          </ol>
        </div>
      </section>

      {/* Sección con grid de cards */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Canales de Comunicación</h2>
        </div>

        <div className="content-grid content-grid-md">
          <div className="card">
            <div className="flex items-start space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-sm text-gray-400">
                  Recibe notificaciones detalladas en tu correo
                </p>
              </div>
            </div>
            
            <ul className="list">
              <li className="list-item">
                <span className="text-sm">Resúmenes diarios</span>
              </li>
              <li className="list-item">
                <span className="text-sm">Alertas importantes</span>
              </li>
              <li className="list-item">
                <span className="text-sm">Informes semanales</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">SMS</h3>
                <p className="text-sm text-gray-400">
                  Notificaciones urgentes vía mensaje de texto
                </p>
              </div>
            </div>
            
            <ul className="list">
              <li className="list-item">
                <span className="text-sm">Solo emergencias</span>
              </li>
              <li className="list-item">
                <span className="text-sm">Confirmaciones de citas</span>
              </li>
              <li className="list-item">
                <span className="text-sm">Alertas críticas</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sección con formulario */}
      <section className="section">
        <div className="card">
          <h3 className="text-lg font-semibold mb-6">Preferencias de Horario</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="form-group">
              <label className="form-label">No molestar desde</label>
              <input type="time" className="form-input" defaultValue="22:00" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input type="time" className="form-input" defaultValue="07:00" />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm">
                  Durante el horario de "No molestar" solo recibirás notificaciones 
                  marcadas como emergencia.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button className="btn btn-secondary">
              Cancelar
            </button>
            <button className="btn btn-primary">
              Guardar Cambios
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Ejemplo de toggle switches con el sistema unificado
 */
export function NotificationToggleExample() {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-6">Configuración de Alertas</h3>
      
      <div className="space-y-4">
        {[
          {
            title: 'Nuevos Pacientes',
            description: 'Recibir alertas cuando se registren nuevos pacientes',
            enabled: true
          },
          {
            title: 'Citas Próximas',
            description: 'Recordatorios 24 horas antes de cada cita',
            enabled: true
          },
          {
            title: 'Resultados de Laboratorio',
            description: 'Notificaciones cuando estén listos los resultados',
            enabled: false
          }
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
            <div className="flex-1 pr-4">
              <h4 className="font-medium">{item.title}</h4>
              <p className="text-sm text-gray-400 mt-1">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                defaultChecked={item.enabled}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
