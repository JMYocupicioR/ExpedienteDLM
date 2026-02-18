import { usePatientAuth } from '@/context/PatientAuthContext';
import { BarChart3, Calendar, Home, MessageCircle, Pill, User } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/citas', label: 'Citas', icon: Calendar },
  { to: '/mensajes', label: 'Mensajes', icon: MessageCircle },
  { to: '/progreso', label: 'Progreso', icon: BarChart3 },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function PatientMobileLayout() {
  const { profile } = usePatientAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <div>
            <p className="text-xs text-slate-400">Portal del paciente</p>
            <p className="text-sm font-semibold">{profile?.full_name || 'Paciente'}</p>
          </div>
          <NavLink
            to="/medicamentos"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            <Pill className="h-3.5 w-3.5" />
            Medicamentos
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-4xl grid-cols-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? 'text-cyan-300' : 'text-slate-400'
                }`
              }
              end={to === '/'}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
