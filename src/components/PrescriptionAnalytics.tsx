import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Pill, Users, Calendar, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsData {
  topMedications: { name: string; count: number; percentage: number }[];
  prescriptionsByMonth: { month: string; count: number }[];
  diagnosesTrends: { diagnosis: string; count: number }[];
  patientStats: {
    totalPatients: number;
    activePatients: number;
    newPatientsThisMonth: number;
  };
}

export default function PrescriptionAnalytics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    topMedications: [],
    prescriptionsByMonth: [],
    diagnosesTrends: [],
    patientStats: {
      totalPatients: 0,
      activePatients: 0,
      newPatientsThisMonth: 0
    }
  });

  useEffect(() => {
    // Simular datos de análisis
    setAnalyticsData({
      topMedications: [
        { name: 'Amoxicilina', count: 156, percentage: 23.5 },
        { name: 'Ibuprofeno', count: 134, percentage: 20.2 },
        { name: 'Paracetamol', count: 98, percentage: 14.8 },
        { name: 'Losartán', count: 87, percentage: 13.1 },
        { name: 'Omeprazol', count: 76, percentage: 11.5 },
        { name: 'Metformina', count: 65, percentage: 9.8 },
        { name: 'Otros', count: 47, percentage: 7.1 }
      ],
      prescriptionsByMonth: [
        { month: 'Enero', count: 45 },
        { month: 'Febrero', count: 52 },
        { month: 'Marzo', count: 61 },
        { month: 'Abril', count: 58 },
        { month: 'Mayo', count: 72 },
        { month: 'Junio', count: 85 }
      ],
      diagnosesTrends: [
        { diagnosis: 'Infección respiratoria', count: 89 },
        { diagnosis: 'Hipertensión', count: 67 },
        { diagnosis: 'Diabetes tipo 2', count: 54 },
        { diagnosis: 'Dolor lumbar', count: 43 },
        { diagnosis: 'Gastritis', count: 38 },
        { diagnosis: 'Ansiedad', count: 32 }
      ],
      patientStats: {
        totalPatients: 1247,
        activePatients: 892,
        newPatientsThisMonth: 67
      }
    });
  }, [timeRange]);

  const handleExportReport = () => {
    // Aquí iría la lógica para exportar el reporte
    alert('Exportando reporte...');
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-100">Análisis de Prescripciones</h2>
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 dark-button-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </button>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="dark-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-100">
                {analyticsData.patientStats.totalPatients.toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-cyan-400" />
          </div>
        </div>

        <div className="dark-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pacientes Activos</p>
              <p className="text-2xl font-bold text-gray-100">
                {analyticsData.patientStats.activePatients.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="dark-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Nuevos este mes</p>
              <p className="text-2xl font-bold text-gray-100">
                +{analyticsData.patientStats.newPatientsThisMonth}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="dark-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Recetas</p>
              <p className="text-2xl font-bold text-gray-100">663</p>
            </div>
            <FileText className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicamentos más recetados */}
        <div className="dark-card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
            <Pill className="h-5 w-5 mr-2 text-cyan-400" />
            Medicamentos Más Recetados
          </h3>
          <div className="space-y-3">
            {analyticsData.topMedications.map((med, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="text-sm text-gray-300 w-32">{med.name}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${med.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400 w-20 text-right">
                  <span className="text-gray-200 font-medium">{med.count}</span>
                  <span className="ml-1">({med.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tendencia de recetas por mes */}
        <div className="dark-card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Recetas por Mes
          </h3>
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-between">
              {analyticsData.prescriptionsByMonth.map((month, index) => {
                const maxCount = Math.max(...analyticsData.prescriptionsByMonth.map(m => m.count));
                const height = (month.count / maxCount) * 100;
                
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end px-1"
                  >
                    <div className="text-xs text-gray-400 mb-1">{month.count}</div>
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-gray-400 mt-2">{month.month.slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnósticos más frecuentes */}
      <div className="dark-card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Diagnósticos Más Frecuentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsData.diagnosesTrends.map((diagnosis, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-gray-200">{diagnosis.diagnosis}</h4>
                <span className="text-2xl font-bold text-cyan-400">{diagnosis.count}</span>
              </div>
              <div className="text-xs text-gray-400">
                {((diagnosis.count / analyticsData.diagnosesTrends.reduce((acc, d) => acc + d.count, 0)) * 100).toFixed(1)}% del total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights y recomendaciones */}
      <div className="dark-card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Insights y Recomendaciones
        </h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
            <div>
              <p className="text-gray-300">
                Las prescripciones han aumentado un <span className="text-green-400 font-medium">18%</span> en el último mes
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5"></div>
            <div>
              <p className="text-gray-300">
                El <span className="text-yellow-400 font-medium">23.5%</span> de las recetas son para antibióticos - considerar revisar protocolos
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5"></div>
            <div>
              <p className="text-gray-300">
                Los diagnósticos respiratorios muestran un patrón estacional - preparar stock para temporada alta
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 