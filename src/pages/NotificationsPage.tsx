import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Check,
  CheckCircle,
  Trash2,
  Filter,
  RefreshCw,
  Link as LinkIcon,
  Activity,
  FileText,
  QrCode,
  Copy,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import useNotifications from '@/hooks/shared/useNotifications';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { supabase } from '@/lib/supabase';
import { Notification, NotificationPriority } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import QRCodeLib from 'qrcode';

const priorityConfig: Record<NotificationPriority, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  low: { icon: Clock, label: 'Baja', color: 'text-gray-400' },
  normal: { icon: Bell, label: 'Normal', color: 'text-blue-400' },
  high: { icon: BellRing, label: 'Alta', color: 'text-yellow-400' },
  urgent: { icon: AlertCircle, label: 'Urgente', color: 'text-red-400' },
};

const entityTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  appointment: { icon: Calendar, label: 'Cita' },
  patient: { icon: User, label: 'Paciente' },
  consultation: { icon: Clock, label: 'Consulta' },
  clinical_rule: { icon: AlertCircle, label: 'Regla clínica' },
  staff_request: { icon: User, label: 'Solicitud de personal' },
  registration_token: { icon: LinkIcon, label: 'Enlace de registro' },
  scale_assessment: { icon: Activity, label: 'Escala médica' },
  prescription: { icon: FileText, label: 'Receta' },
  error: { icon: AlertCircle, label: 'Error' },
  default: { icon: Bell, label: 'General' },
};

type PendingTokenRow = {
  id: string;
  token: string;
  doctor_id: string;
  clinic_id: string;
  assigned_patient_id: string | null;
  selected_scale_ids: string[] | null;
  expires_at: string;
  created_at: string;
  doctor?: { full_name: string | null } | null;
  patient?: { full_name: string } | null;
  patients?: { full_name: string } | null;
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { activeClinic } = useClinic();
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'notifications' | 'links'>('notifications');
  const [pendingTokens, setPendingTokens] = useState<PendingTokenRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [notificationQrUrls, setNotificationQrUrls] = useState<Record<string, string>>({});
  const [notificationTokens, setNotificationTokens] = useState<Record<string, string>>({});

  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getUnreadCount,
    refresh,
    loadNotifications,
  } = useNotifications({
    autoLoad: true,
    realTime: true,
    filters: { limit: 100 },
  });

  const applyFilters = useCallback(() => {
    const filters: Parameters<typeof loadNotifications>[0] = { limit: 100 };
    if (filterRead === 'unread') filters.is_read = false;
    if (filterRead === 'read') filters.is_read = true;
    if (filterPriority !== 'all') filters.priority = [filterPriority];
    if (filterType !== 'all') filters.related_entity_type = filterType;
    loadNotifications(filters);
  }, [filterRead, filterPriority, filterType, loadNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (filterRead === 'unread' && n.is_read) return false;
    if (filterRead === 'read' && !n.is_read) return false;
    if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
    if (filterType !== 'all' && n.related_entity_type !== filterType) return false;
    return true;
  });

  const unreadCount = getUnreadCount();

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.action_url && n.related_entity_type !== 'registration_token') navigate(n.action_url);
  };

  const entityTypes = Array.from(new Set(notifications.map((n) => n.related_entity_type).filter(Boolean))) as string[];

  useEffect(() => {
    if (activeTab !== 'links' || !activeClinic?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingLinks(true);
      try {
        const { data, error } = await supabase
          .from('patient_registration_tokens')
          .select(`
            id, token, doctor_id, clinic_id, assigned_patient_id, selected_scale_ids, expires_at, created_at,
            doctor:profiles(full_name),
            patients(full_name)
          `)
          .eq('clinic_id', activeClinic.id)
          .eq('status', 'pending')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setPendingTokens((data || []) as unknown as PendingTokenRow[]);
      } catch {
        if (!cancelled) setPendingTokens([]);
      } finally {
        if (!cancelled) setLoadingLinks(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, activeClinic?.id]);

  useEffect(() => {
    if (pendingTokens.length === 0) return;
    const origin = window.location.origin;
    const generate = async () => {
      const map: Record<string, string> = {};
      for (const row of pendingTokens) {
        const link = `${origin}/register/patient/${encodeURIComponent(row.token)}`;
        try {
          map[row.id] = await QRCodeLib.toDataURL(link, { width: 120, margin: 1 });
        } catch {
          map[row.id] = '';
        }
      }
      setQrUrls(map);
    };
    generate();
  }, [pendingTokens]);

  // Generar QR para notificaciones de enlace de registro (para escaneo rápido en tablet)
  const registrationTokenIds = notifications
    .filter((n) => n.related_entity_type === 'registration_token' && n.related_entity_id)
    .map((n) => n.related_entity_id as string);
  useEffect(() => {
    if (registrationTokenIds.length === 0) return;
    let cancelled = false;
    const origin = window.location.origin;
    (async () => {
      const qrMap: Record<string, string> = {};
      const tokenMap: Record<string, string> = {};
      const { data: rows } = await supabase
        .from('patient_registration_tokens')
        .select('id, token')
        .in('id', [...new Set(registrationTokenIds)]);
      if (cancelled || !rows?.length) return;
      for (const row of rows) {
        tokenMap[row.id] = row.token;
        const link = `${origin}/register/patient/${encodeURIComponent(row.token)}`;
        try {
          qrMap[row.id] = await QRCodeLib.toDataURL(link, { width: 160, margin: 1 });
        } catch {
          qrMap[row.id] = '';
        }
      }
      if (!cancelled) {
        setNotificationQrUrls((prev) => ({ ...prev, ...qrMap }));
        setNotificationTokens((prev) => ({ ...prev, ...tokenMap }));
      }
    })();
    return () => { cancelled = true; };
  }, [registrationTokenIds.join(',')]);

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/register/patient/${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(link).then(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-7 w-7 text-cyan-400" />
            Notificaciones y Pendientes
          </h1>
          <p className="text-gray-400 mt-1">
            Alertas, pendientes, solicitudes y tareas del equipo de la clínica
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4 inline mr-2" />
            Notificaciones
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'links'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="h-4 w-4 inline mr-2" />
            Enlaces pendientes
          </button>
        </div>

        {activeTab === 'links' && (
          <div className="mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-cyan-400" />
                Enlaces de registro pendientes
              </h2>
              {!activeClinic ? (
                <p className="text-gray-400">Selecciona una clínica para ver los enlaces pendientes.</p>
              ) : loadingLinks ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
                </div>
              ) : pendingTokens.length === 0 ? (
                <p className="text-gray-400">No hay enlaces de registro pendientes para esta clínica.</p>
              ) : (
                <div className="space-y-4">
                  {pendingTokens.map((row) => {
                    const patientName = row.patient?.full_name ?? row.patients?.full_name ?? (row.assigned_patient_id ? 'Paciente asignado' : 'Sin paciente asignado');
                    const doctorName = row.doctor?.full_name ?? 'Doctor';
                    const scaleCount = row.selected_scale_ids?.length ?? 0;
                    const isExpired = new Date(row.expires_at) < new Date();
                    const link = `${window.location.origin}/register/patient/${encodeURIComponent(row.token)}`;
                    return (
                      <div
                        key={row.id}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{doctorName}</span>
                            <span className="text-xs text-gray-500">→</span>
                            <span className="text-gray-300">{patientName}</span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {scaleCount > 0 ? `${scaleCount} escala(s)` : 'Sin escalas'} · Expira {format(new Date(row.expires_at), "d MMM yyyy", { locale: es })}
                            {isExpired && <span className="text-amber-400 ml-1">(Expirado)</span>}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleCopyLink(row.token)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200"
                            >
                              <Copy className="h-3 w-3" /> Copiar link
                            </button>
                            {row.assigned_patient_id && (
                              <Link
                                to={`/expediente/${row.assigned_patient_id}`}
                                className="inline-flex items-center px-2 py-1 bg-cyan-700 hover:bg-cyan-600 rounded text-sm text-white"
                              >
                                Ver expediente
                              </Link>
                            )}
                          </div>
                        </div>
                        {qrUrls[row.id] && (
                          <div className="flex-shrink-0">
                            <img src={qrUrls[row.id]} alt="QR" className="w-24 h-24 rounded border border-gray-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
        <>
        {/* Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Estado</label>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value as 'all' | 'unread' | 'read')}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="all">Todas</option>
                <option value="unread">No leídas</option>
                <option value="read">Leídas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Prioridad</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as NotificationPriority | 'all')}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="all">Todas</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="all">Todos</option>
                {entityTypes.map((t) => (
                  <option key={t} value={t}>
                    {entityTypeConfig[t]?.label ?? t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={applyFilters}
                className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Aplicar
              </Button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-white rounded"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400 text-sm">
            {filteredNotifications.length} notificación(es)
            {unreadCount > 0 && (
              <span className="ml-2 text-cyan-400">({unreadCount} sin leer)</span>
            )}
          </span>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/30"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar todas leídas
              </Button>
            )}
            <Button
              variant="outline"
              onClick={deleteAllRead}
              className="border-gray-600 text-gray-400 hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar leídas
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No hay notificaciones con los filtros seleccionados</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const cfg = entityTypeConfig[n.related_entity_type ?? 'default'] ?? entityTypeConfig.default;
              const priorityCfg = priorityConfig[n.priority];
              const Icon = cfg.icon;
              const isRegistrationLink = n.related_entity_type === 'registration_token' && n.related_entity_id;
              const qrDataUrl = isRegistrationLink ? notificationQrUrls[n.related_entity_id!] : null;
              const tokenForCopy = isRegistrationLink ? notificationTokens[n.related_entity_id!] : null;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`bg-gray-800 border rounded-lg p-4 flex items-start gap-3 transition-colors ${
                    n.is_read ? 'border-gray-700' : 'border-cyan-700/50 bg-gray-800/90'
                  } ${!isRegistrationLink ? 'cursor-pointer hover:bg-gray-750' : ''}`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${n.is_read ? 'bg-gray-900' : 'bg-cyan-900/30'}`}>
                    <Icon className={`h-5 w-5 ${n.is_read ? 'text-gray-500' : priorityCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.title && (
                        <span className={`font-medium ${n.is_read ? 'text-gray-300' : 'text-white'}`}>
                          {n.title}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${priorityCfg.color}`}>
                        {priorityCfg.label}
                      </span>
                      {n.related_entity_type && (
                        <span className="text-xs text-gray-500">{cfg.label}</span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${n.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      {' · '}
                      {format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                  {isRegistrationLink && qrDataUrl && (
                    <div
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-white p-1.5 rounded-lg">
                        <img src={qrDataUrl} alt="QR para escanear en sala de espera" className="w-[140px] h-[140px]" />
                      </div>
                      <span className="text-xs text-gray-400 text-center">Escanear con tablet</span>
                      {tokenForCopy && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = `${window.location.origin}/register/patient/${encodeURIComponent(tokenForCopy)}`;
                            navigator.clipboard.writeText(link);
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar link
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="p-2 text-gray-400 hover:text-cyan-400"
                        title="Marcar como leída"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
