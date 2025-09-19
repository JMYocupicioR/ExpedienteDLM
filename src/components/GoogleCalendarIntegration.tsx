import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarDays,
  Settings,
  Sync,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react';
import { useGoogleCalendarAppointments } from '@/hooks/useGoogleCalendarAppointments';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GoogleCalendarIntegrationProps {
  className?: string;
}

export default function GoogleCalendarIntegration({ className }: GoogleCalendarIntegrationProps) {
  const {
    // State
    calendarSettings,
    isCalendarConnected,
    isSyncing,
    lastSyncAt,
    syncStatus,
    syncError,
    isLoading,
    error,

    // Operations
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncWithGoogleCalendar,
    importFromGoogleCalendar,
    updateSyncSettings,
    toggleAutoSync,
    refreshCalendarSettings,
    testGoogleConnection
  } = useGoogleCalendarAppointments();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);

  // Google OAuth URL generation
  const generateGoogleAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
    const scope = 'https://www.googleapis.com/auth/calendar';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleConnect = () => {
    const authUrl = generateGoogleAuthUrl();
    window.open(authUrl, '_blank', 'width=600,height=600');
    setIsConnecting(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncWithGoogleCalendar();
      console.log('Sync result:', result);
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const handleImport = async () => {
    try {
      const result = await importFromGoogleCalendar();
      console.log('Import result:', result);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleTestConnection = async () => {
    try {
      const isValid = await testGoogleConnection();
      setConnectionTest(isValid);
    } catch (error) {
      setConnectionTest(false);
    }
  };

  const handleSettingChange = async (setting: string, value: any) => {
    try {
      await updateSyncSettings({ [setting]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.code) {
        setIsConnecting(true);
        try {
          await connectGoogleCalendar(event.data.code);
          setIsConnecting(false);
        } catch (error) {
          console.error('Connection error:', error);
          setIsConnecting(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [connectGoogleCalendar]);

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando configuración de Google Calendar...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Integración con Google Calendar
          </CardTitle>
          <CardDescription>
            Sincroniza automáticamente tus citas médicas con Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCalendarConnected ? (
            <div className="text-center space-y-4">
              <div className="p-6 bg-gray-50 rounded-lg">
                <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Google Calendar no conectado</h3>
                <p className="text-gray-600 mb-4">
                  Conecta tu cuenta de Google para sincronizar automáticamente tus citas
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar Google Calendar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Google Calendar conectado</p>
                    <p className="text-sm text-green-600">
                      Calendar ID: {calendarSettings?.google_calendar_id}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleTestConnection}>
                    Probar conexión
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                </div>
              </div>

              {connectionTest !== null && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {connectionTest
                      ? "✅ Conexión exitosa con Google Calendar"
                      : "❌ Error en la conexión. Verifica tu configuración."
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Sync Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getSyncStatusColor()}>
                    {getSyncStatusIcon()}
                    <span className="ml-1 capitalize">{syncStatus}</span>
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">Estado de sincronización</p>
                    {lastSyncAt && (
                      <p className="text-xs text-gray-500">
                        Última sincronización: {formatDistanceToNow(new Date(lastSyncAt), {
                          locale: es,
                          addSuffix: true
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImport}
                    disabled={isSyncing}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sync className="h-4 w-4 mr-1" />
                    )}
                    Sincronizar
                  </Button>
                </div>
              </div>

              {syncError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{syncError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      {isCalendarConnected && calendarSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Sincronización
            </CardTitle>
            <CardDescription>
              Personaliza cómo se sincronizan tus citas con Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Sincronización automática</label>
                <p className="text-xs text-gray-500">
                  Sincroniza automáticamente los cambios en tiempo real
                </p>
              </div>
              <Switch
                checked={calendarSettings.sync_enabled}
                onCheckedChange={(enabled) => toggleAutoSync(enabled)}
              />
            </div>

            <Separator />

            {/* Sync Direction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección de sincronización</label>
              <Select
                value={calendarSettings.sync_direction}
                onValueChange={(value) => handleSettingChange('sync_direction', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_google">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Solo hacia Google Calendar
                    </div>
                  </SelectItem>
                  <SelectItem value="from_google">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Solo desde Google Calendar
                    </div>
                  </SelectItem>
                  <SelectItem value="bidirectional">
                    <div className="flex items-center gap-2">
                      <Sync className="h-4 w-4" />
                      Bidireccional
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Create Events */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Crear eventos automáticamente</label>
                <p className="text-xs text-gray-500">
                  Crear eventos en Google Calendar cuando se programen nuevas citas
                </p>
              </div>
              <Switch
                checked={calendarSettings.auto_create_events}
                onCheckedChange={(enabled) => handleSettingChange('auto_create_events', enabled)}
              />
            </div>

            {/* Auto Update Events */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Actualizar eventos automáticamente</label>
                <p className="text-xs text-gray-500">
                  Actualizar eventos en Google Calendar cuando cambien las citas
                </p>
              </div>
              <Switch
                checked={calendarSettings.auto_update_events}
                onCheckedChange={(enabled) => handleSettingChange('auto_update_events', enabled)}
              />
            </div>

            <Separator />

            {/* Default Reminder */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recordatorio predeterminado (minutos)</label>
              <Select
                value={calendarSettings.default_reminder_minutes?.toString()}
                onValueChange={(value) => handleSettingChange('default_reminder_minutes', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="10">10 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="1440">1 día</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sync Future Days */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Días futuros a sincronizar</label>
              <Select
                value={calendarSettings.sync_future_days?.toString()}
                onValueChange={(value) => handleSettingChange('sync_future_days', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="180">6 meses</SelectItem>
                  <SelectItem value="365">1 año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notificaciones</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Notificaciones por email</label>
                  <p className="text-xs text-gray-500">
                    Recibir notificaciones por email sobre cambios de sincronización
                  </p>
                </div>
                <Switch
                  checked={calendarSettings.email_notifications}
                  onCheckedChange={(enabled) => handleSettingChange('email_notifications', enabled)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Notificaciones por SMS</label>
                  <p className="text-xs text-gray-500">
                    Recibir notificaciones por SMS sobre cambios importantes
                  </p>
                </div>
                <Switch
                  checked={calendarSettings.sms_notifications}
                  onCheckedChange={(enabled) => handleSettingChange('sms_notifications', enabled)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}