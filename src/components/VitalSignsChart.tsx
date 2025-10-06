import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface VitalSignsChartProps {
  consultations: Consultation[];
  signToShow?: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'all';
}

interface VitalSignData {
  date: string;
  value: number | string;
  consultation: Consultation;
}

export default function VitalSignsChart({ consultations, signToShow = 'all' }: VitalSignsChartProps) {
  const vitalSignsData = useMemo(() => {
    // Ordenar consultas por fecha (más antiguas primero para el gráfico)
    const sorted = [...consultations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const data: Record<string, VitalSignData[]> = {
      systolic: [],
      diastolic: [],
      heart_rate: [],
      temperature: [],
      weight: []
    };

    sorted.forEach(consultation => {
      const vitalSigns = (consultation.vital_signs as any) || {};
      const dateStr = format(new Date(consultation.created_at), 'dd/MM', { locale: es });

      if (vitalSigns.systolic_pressure) {
        data.systolic.push({
          date: dateStr,
          value: vitalSigns.systolic_pressure,
          consultation
        });
      }
      if (vitalSigns.diastolic_pressure) {
        data.diastolic.push({
          date: dateStr,
          value: vitalSigns.diastolic_pressure,
          consultation
        });
      }
      if (vitalSigns.heart_rate) {
        data.heart_rate.push({
          date: dateStr,
          value: vitalSigns.heart_rate,
          consultation
        });
      }
      if (vitalSigns.temperature) {
        data.temperature.push({
          date: dateStr,
          value: vitalSigns.temperature,
          consultation
        });
      }
      if (vitalSigns.weight) {
        data.weight.push({
          date: dateStr,
          value: vitalSigns.weight,
          consultation
        });
      }
    });

    return data;
  }, [consultations]);

  const getTrend = (data: VitalSignData[]) => {
    if (data.length < 2) return 'stable';
    const first = Number(data[0].value);
    const last = Number(data[data.length - 1].value);
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const renderMiniChart = (data: VitalSignData[], label: string, unit: string, color: string) => {
    if (data.length === 0) return null;

    const values = data.map(d => Number(d.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const trend = getTrend(data);

    // Normalizar valores para el gráfico (0-100)
    const normalizedValues = values.map(v => ((v - min) / range) * 100);

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-white font-medium">{label}</h4>
            <p className="text-2xl font-bold text-white mt-1">
              {values[values.length - 1]} <span className="text-sm text-gray-400">{unit}</span>
            </p>
          </div>
          <div className="flex flex-col items-end">
            {getTrendIcon(trend)}
            <span className="text-xs text-gray-400 mt-1">
              {trend === 'up' ? '+' : trend === 'down' ? '-' : '='}
              {Math.abs(((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Gráfico de líneas simplificado */}
        <div className="relative h-24 flex items-end gap-1">
          {normalizedValues.map((value, index) => {
            const height = Math.max(value, 5); // Mínimo 5% para visibilidad
            return (
              <div
                key={index}
                className="flex-1 relative group"
                style={{ height: '100%' }}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${color} opacity-70 group-hover:opacity-100`}
                  style={{ height: `${height}%` }}
                />
                {/* Tooltip al hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap border border-gray-600">
                    <div>{data[index].date}</div>
                    <div className="font-bold">{values[index]} {unit}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Etiquetas del eje X */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{data[0].date}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)].date}</span>}
          <span>{data[data.length - 1].date}</span>
        </div>

        {/* Rango */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Min: {min} {unit}</span>
          <span>Max: {max} {unit}</span>
        </div>
      </div>
    );
  };

  if (consultations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
        <Activity className="mx-auto h-12 w-12 text-gray-500 mb-3" />
        <p className="text-gray-400">No hay datos de signos vitales para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Tendencias de Signos Vitales</h3>
        <span className="text-sm text-gray-400">
          Basado en {consultations.length} consultas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderMiniChart(vitalSignsData.systolic, 'Presión Sistólica', 'mmHg', 'bg-red-500')}
        {renderMiniChart(vitalSignsData.diastolic, 'Presión Diastólica', 'mmHg', 'bg-orange-500')}
        {renderMiniChart(vitalSignsData.heart_rate, 'Frecuencia Cardíaca', 'lpm', 'bg-pink-500')}
        {renderMiniChart(vitalSignsData.temperature, 'Temperatura', '°C', 'bg-yellow-500')}
        {renderMiniChart(vitalSignsData.weight, 'Peso', 'kg', 'bg-purple-500')}
      </div>
    </div>
  );
}
