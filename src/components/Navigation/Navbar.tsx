import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Stethoscope, User, Users, FileText, Calendar, 
  Settings, LogOut, Bell, Search, Home, Activity, Building,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  onClick?: () => void;
  badge?: number;
  roles?: string[];
  submenu?: NavItem[];
}

interface NavbarProps {
  onNewPatientClick: () => void;
}

export default function Navbar({ onNewPatientClick }: NavbarProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  // Navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'home',
        label: 'Inicio',
        icon: Home,
        href: '/dashboard'
      },
      {
        id: 'profile',
        label: 'Mi Perfil',
        icon: User,
        href: '/profile'
      }
    ];

    const roleSpecificItems: NavItem[] = [];

    // Items for doctors
    if (profile?.role === 'doctor' || profile?.role === 'super_admin') {
      roleSpecificItems.push(
        {
          id: 'patients',
          label: 'Pacientes',
          icon: Users,
          href: '/patients',
          submenu: [
            { id: 'patients-list', label: 'Lista de Pacientes', icon: Users, href: '/patients' },
            { id: 'patients-new', label: 'Nuevo Paciente', icon: User, href: '#', onClick: onNewPatientClick }
          ]
        },
        {
          id: 'scales',
          label: 'Escalas Médicas',
          icon: Activity,
          href: '/escalas'
        },
        {
          id: 'prescriptions',
          label: 'Recetas',
          icon: FileText,
          href: '/recetas',
          badge: 3
        },
        {
          id: 'appointments',
          label: 'Citas Médicas',
          icon: Calendar,
          href: '/citas'
        },
        {
          id: 'templates',
          label: 'Plantillas',
          icon: FileText,
          href: '/plantillas',
          submenu: [
            { id: 'templates-interrogatorio', label: 'Interrogatorio', icon: FileText, href: '/plantillas?tab=interrogatorio' },
            { id: 'templates-exploracion', label: 'Exploración Física', icon: FileText, href: '/plantillas?tab=exploracion' },
            { id: 'templates-prescripciones', label: 'Prescripciones', icon: FileText, href: '/plantillas?tab=prescripciones' }
          ]
        }
      );
    }

    // Items for health staff
    if (profile?.role === 'health_staff') {
      roleSpecificItems.push(
        {
          id: 'patients',
          label: 'Pacientes',
          icon: Users,
          href: '/patients'
        },
        {
          id: 'assistance',
          label: 'Asistencia',
          icon: Stethoscope,
          href: '/assistance'
        }
      );
    }

    // Items for admin staff
    if (profile?.role === 'admin_staff' || profile?.role === 'super_admin') {
      roleSpecificItems.push(
        {
          id: 'clinic',
          label: 'Clínica',
          icon: Building,
          href: '/clinic',
          submenu: [
            { id: 'clinic-overview', label: 'Resumen', icon: Activity, href: '/clinic' },
            { id: 'clinic-staff', label: 'Personal', icon: Users, href: '/clinic/staff' },
            { id: 'clinic-settings', label: 'Configuración', icon: Settings, href: '/clinic/settings' }
          ]
        }
      );
    }

    // Items for patients
    if (profile?.role === 'patient') {
      roleSpecificItems.push(
        {
          id: 'appointments',
          label: 'Mis Citas',
          icon: Calendar,
          href: '/appointments'
        },
        {
          id: 'medical-history',
          label: 'Mi Historial',
          icon: FileText,
          href: '/medical-history'
        }
      );
    }

    return [...baseItems, ...roleSpecificItems];
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActiveLink = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Load notifications count
  useEffect(() => {
    if (user && profile?.role === 'doctor') {
      // Simulate notifications - replace with real data
      setNotifications(Math.floor(Math.random() * 5));
    }
  }, [user, profile]);

  if (loading) {
    return null; // Or a loading skeleton
  }

  if (!user) {
    return null; // Don't show navbar if not authenticated
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div style={{ background: 'var(--bg-secondary)' }} className={`
        hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
        transition-all duration-300 ease-in-out
        border-r border-gray-800
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <span className="text-white text-lg font-bold">ExpedienteDLM</span>
            </Link>
          )}
          
          <button
            onClick={() => {
              const newCollapsedState = !isCollapsed;
              setIsCollapsed(newCollapsedState);
              // Emit custom event for layout to listen
              window.dispatchEvent(new CustomEvent('navbar-toggle', { 
                detail: { isCollapsed: newCollapsedState } 
              }));
            }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {profile?.full_name || 'Usuario'}
                </p>
                <p className="text-gray-400 text-xs capitalize">
                  {profile?.role === 'doctor' ? 'Médico' : 
                   profile?.role === 'health_staff' ? 'Personal de Salud' :
                   profile?.role === 'admin_staff' ? 'Administrador' :
                   profile?.role === 'patient' ? 'Paciente' : 
                   profile?.role}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={isActiveLink(item.href)}
            />
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          {/* Notifications */}
          {(profile?.role === 'doctor' || profile?.role === 'health_staff') && (
            <button className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <div className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                    {notifications}
                  </span>
                )}
              </div>
              {!isCollapsed && <span>Notificaciones</span>}
            </button>
          )}

          {/* Settings */}
          <Link
            to="/settings"
            className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Settings className="h-5 w-5" />
            {!isCollapsed && <span>Configuración</span>}
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div 
        className="lg:hidden bg-gray-900/95 backdrop-blur-lg border-b border-gray-800/50 px-4 py-3 fixed top-0 left-0 right-0 z-50" 
        style={{ 
          paddingTop: 'max(var(--safe-area-top), 8px)',
          height: 'var(--mobile-header-height)'
        }}
      >
        <div className="flex items-center justify-between h-full">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-lg font-bold">ExpedienteDLM</span>
          </Link>

          <div className="flex items-center space-x-2">
            {/* Search button for mobile */}
            <button className="touch-target p-2 rounded-lg bg-gray-800/70 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications for mobile */}
            {(profile?.role === 'doctor' || profile?.role === 'health_staff') && (
              <button className="touch-target p-2 rounded-lg bg-gray-800/70 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                    {notifications}
                  </span>
                )}
              </button>
            )}

            {/* Menu toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="touch-target p-2 rounded-lg bg-gray-800/70 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-64 bg-gray-900 border-l border-gray-800" onClick={(e) => e.stopPropagation()}>
            {/* Mobile menu content */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-lg font-semibold">Menú</h2>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* User info for mobile */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {profile?.full_name || 'Usuario'}
                  </p>
                  <p className="text-gray-400 text-xs capitalize">
                    {profile?.role === 'doctor' ? 'Médico' : 
                     profile?.role === 'health_staff' ? 'Personal de Salud' :
                     profile?.role === 'admin_staff' ? 'Administrador' :
                     profile?.role === 'patient' ? 'Paciente' : 
                     profile?.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  isCollapsed={false}
                  isActive={isActiveLink(item.href)}
                  isMobile={true}
                />
              ))}
            </nav>

            {/* Mobile bottom actions */}
            <div className="p-4 border-t border-gray-800 space-y-2">
              <Link
                to="/settings"
                className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                onClick={() => setIsMobileOpen(false)}
              >
                <Settings className="h-5 w-5" />
                <span>Configuración</span>
              </Link>

              <button
                onClick={() => {
                  handleSignOut();
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-800/50 backdrop-blur-lg bg-gray-900/95"
        style={{ 
          paddingBottom: 'max(var(--safe-area-bottom), 8px)',
          height: 'var(--mobile-bottom-nav-height)'
        }}
      >
        <div className="grid grid-cols-4 gap-1 px-3 py-3 text-xs text-gray-300 h-full">
          <Link 
            to="/dashboard" 
            className={`touch-target flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
              isActiveLink('/dashboard') 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs">Inicio</span>
          </Link>
          <Link 
            to="/patients" 
            className={`touch-target flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
              isActiveLink('/patients') 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs">Pacientes</span>
          </Link>
          <Link 
            to="/citas" 
            className={`touch-target flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
              isActiveLink('/citas') 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs">Citas</span>
          </Link>
          <Link 
            to="/settings" 
            className={`touch-target flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
              isActiveLink('/settings') 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Settings className="h-5 w-5 mb-1" />
            <span className="text-xs">Ajustes</span>
          </Link>
        </div>

        {/* Floating New Patient Button */}
        {(profile?.role === 'doctor' || profile?.role === 'super_admin') && (
          <button
            onClick={onNewPatientClick}
            className="absolute -top-8 right-4 p-4 rounded-full shadow-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transform hover:scale-105 transition-all duration-200"
            aria-label="Nuevo Paciente"
            style={{ 
              boxShadow: '0 10px 25px rgba(6, 182, 212, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.2)' 
            }}
          >
            <User className="h-5 w-5" />
          </button>
        )}
      </div>

    </>
  );
}

// Component for individual navigation items
interface NavItemComponentProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  isMobile?: boolean;
}

function NavItemComponent({ item, isCollapsed, isActive, isMobile = false }: NavItemComponentProps) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const Icon = item.icon;

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  if (hasSubmenu && !isCollapsed) {
    return (
      <div>
        <button
          onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
          className={`
            w-full flex items-center justify-between p-2 rounded-lg transition-colors
            ${isActive ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
          `}
        >
          <div className="flex items-center space-x-3">
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* Submenu */}
        {isSubmenuOpen && (
          <div className="ml-4 mt-2 space-y-1">
            {item.submenu?.map((subitem) => {
              const SubIcon = subitem.icon;
              return (
                <Link
                  key={subitem.id}
                  to={subitem.href}
                  onClick={(e) => {
                    if (subitem.onClick) {
                      e.preventDefault();
                      subitem.onClick();
                    }
                  }}
                  className="flex items-center space-x-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <SubIcon className="h-4 w-4" />
                  <span className="text-sm">{subitem.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={(e) => {
        if (item.onClick) {
          e.preventDefault();
          item.onClick();
        }
      }}
      className={`
        w-full flex items-center space-x-3 p-2 rounded-lg transition-colors
        ${isActive ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
      `}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5" />
      {(!isCollapsed || isMobile) && (
        <>
          <span>{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}