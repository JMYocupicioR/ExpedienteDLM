import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Clock,
  ArrowRight,
  Activity,
  FileText,
  Stethoscope,
  ShieldCheck,
  Lock,
  BadgeCheck,
  CheckCircle2,
  Mic,
  PlayCircle,
  BarChart2,
  ClipboardList,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';

//

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900" style={{ background: 'linear-gradient(to bottom, #111827, #1f2937, #000000)' }}>
      {/* Navigation */}
      <nav id="navigation" className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <Link to="/" className="flex items-center">
              <Logo />
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                to="/auth" 
                className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Iniciar Sesión
              </Link>
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-2 sm:px-6 sm:py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg text-sm sm:text-base">
                <Link to="/auth">
                  Comenzar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          <div className="mb-6">
            <Stethoscope className="h-12 w-12 sm:h-16 sm:w-16 text-cyan-400 mx-auto mb-4" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
            El Expediente Clínico creado para la <span className="text-cyan-400" style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Excelencia Médica</span>, no para la Burocracia.
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-cyan-300 font-semibold mb-6 sm:mb-8">
            Ahorre horas con transcripción por IA y cuantifique la evolución con escalas clínicas validadas. La única plataforma en México en proceso de regulación como Dispositivo Médico (SaMD) ante COFEPRIS.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            Sofisticación Clínica como Servicio: seguridad y cumplimiento primero; eficiencia operativa después; excelencia clínica siempre.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            <Button asChild size="lg" className="w-full sm:w-auto text-base sm:text-lg font-medium shadow-xl" style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)' }}>
              <a href="#demo">
                Solicitar un Demo Personalizado
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg font-medium border-2 border-cyan-400 text-cyan-400 bg-transparent hover:bg-cyan-400 hover:text-gray-900">
              <a href="#features">
                Ver las Funciones Clínicas
              </a>
            </Button>
          </div>
          {/* Trust Bar */}
          <div className="mt-8 sm:mt-10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-gray-300">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-400" /> Cumple con NOM-024</div>
              <div className="flex items-center gap-2"><Lock className="h-5 w-5 text-cyan-400" /> Seguridad de Datos LFPDPPP</div>
              <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-cyan-400" /> Listo para COFEPRIS (SaMD)</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-cyan-400" /> Cifrado de 256-bit</div>
            </div>
          </div>
        </div>
      </main>

      {/* Clinical Features */}
      <div id="features" className="bg-gray-900/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* AI Transcription Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-24">
            <div>
              <div className="flex items-center gap-3 mb-4 text-cyan-300">
                <Mic className="h-5 w-5" />
                <span className="uppercase tracking-wide text-sm">Transcripción por IA</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Recupere su Tiempo. Más Pacientes, Menos Papeleo.</h3>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Nuestra IA de grado médico transforma sus notas de voz en texto clínico estructurado en segundos. Reduzca el tiempo de documentación hasta en un 70% y dedique más tiempo a lo que realmente importa: sus pacientes.
              </p>
              <div className="flex items-center gap-4 text-gray-300">
                <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-cyan-400" /> Hasta 70% menos tiempo de documentación</div>
                <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-400" /> Notas SOAP estructuradas</div>
              </div>
            </div>
            <div>
              <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-gray-800 to-gray-900 p-8 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.15),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.15),transparent_40%)]" />
                <div className="relative flex flex-col items-center justify-center text-center text-gray-300">
                  <PlayCircle className="h-16 w-16 text-cyan-400 mb-4" />
                  <p>Video demostrativo (30–45s) de transcripción en tiempo real → voz a nota SOAP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Scales Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-gray-800 to-gray-900 p-8 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.15),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.15),transparent_40%)]" />
                <div className="relative grid grid-cols-2 gap-6 text-gray-300">
                  <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-cyan-400" /> Barthel</div>
                  <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-cyan-400" /> Boston</div>
                  <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-cyan-400" /> Más de 50 escalas</div>
                  <div className="flex items-center gap-2"><LineChart className="h-5 w-5 text-cyan-400" /> Reportes visuales</div>
                </div>
                <div className="relative mt-8 flex flex-col items-center justify-center text-center text-gray-300">
                  <BarChart2 className="h-16 w-16 text-cyan-400 mb-2" />
                  <p>Carrusel/animación: completar escala y ver el progreso a lo largo del tiempo</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4 text-cyan-300">
                <Activity className="h-5 w-5" />
                <span className="uppercase tracking-wide text-sm">Escalas Clínicas y Seguimiento</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">De la Subjetividad a la Evidencia. Cuantifique el Progreso.</h3>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Utilice escalas clínicas validadas (Barthel, Boston, etc.) integradas en el flujo de trabajo para medir objetivamente los resultados del tratamiento. Genere reportes visuales y comparta el progreso basado en datos con sus pacientes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory Strength */}
      <section id="regulatory" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">La Tranquilidad de una Práctica 100% Conforme a la Normativa Mexicana</h2>
            <p className="text-gray-300 max-w-3xl mx-auto">Cumplimiento y seguridad como barrera de entrada y fuente de confianza.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-gray-700 p-8 bg-gray-800/50">
              <div className="flex items-center gap-3 text-cyan-300 mb-3"><Shield className="h-5 w-5" /> NOM-024-SSA3-2012</div>
              <p className="text-gray-300">Garantizamos la integridad, confidencialidad y seguridad de cada expediente con bitácora de auditoría inmutable y cifrado de extremo a extremo, cumpliendo rigurosamente con cada mandato de la norma.</p>
            </div>
            <div className="rounded-xl border border-gray-700 p-8 bg-gray-800/50">
              <div className="flex items-center gap-3 text-cyan-300 mb-3"><BadgeCheck className="h-5 w-5" /> COFEPRIS (SaMD)</div>
              <p className="text-gray-300">Somos más que un software. Nuestras herramientas de IA y escalas clínicas están en proceso de registro como Dispositivo Médico. Use legalmente funciones avanzadas que otros ECE no pueden ofrecer.</p>
            </div>
            <div className="rounded-xl border border-gray-700 p-8 bg-gray-800/50">
              <div className="flex items-center gap-3 text-cyan-300 mb-3"><Lock className="h-5 w-5" /> LFPDPPP</div>
              <p className="text-gray-300">Protegemos a sus pacientes y a su práctica con el más alto nivel de seguridad para datos sensibles, obteniendo consentimiento explícito y mecanismos claros para los derechos ARCO, tal como lo exige la ley.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (Clinical Value) */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">70%</div>
              <div className="text-cyan-100">Reducción en tiempo de documentación</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">+50</div>
              <div className="text-cyan-100">Escalas clínicas validadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-cyan-100">Construido sobre lógica médica</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Request Section with Consent (LFPDPPP) */}
      <DemoSection />

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <Link to="/">
                  <Logo />
                </Link>
              </div>
              <p className="text-gray-400 text-lg mb-6 max-w-md">
                Expediente DLM: Sofisticación Clínica como Servicio. Cumplimiento y excelencia clínica para transformar su práctica.
              </p>
              <div className="flex space-x-4" role="list" aria-label="Redes sociales">
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-gray-800"
                  aria-label="Seguir en Twitter"
                  role="listitem"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-gray-800"
                  aria-label="Conectar en LinkedIn"
                  role="listitem"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Producto</h3>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Características</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Seguridad</Link></li>
                <li><Link to="/auth" className="text-gray-400 hover:text-cyan-400 transition-colors">Precios</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Integraciones</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Soporte</h3>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Documentación</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">API</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Centro de Ayuda</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Contacto</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">&copy; 2025 Expediente DLM. Todos los derechos reservados.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Aviso de Privacidad</Link>
                <Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Términos</Link>
                <Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">Cookies</Link></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

// Demo Section Component with explicit consent (LFPDPPP)
const DemoSection: React.FC = () => {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!consent) {
      window.alert('Para continuar, debe aceptar el Aviso de Privacidad y consentir el tratamiento de sus datos personales.');
      return;
    }
    window.alert('Gracias por solicitar un demo. Nos pondremos en contacto pronto.');
  };

  return (
    <section id="demo" className="bg-gray-900 py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-white">Solicite un Demo Personalizado</h3>
          <p className="text-gray-300 mt-2">Conozca cómo Expediente DLM se adapta a su práctica clínica.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label htmlFor="fullName" className="text-gray-200 mb-2">Nombre completo</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Dra. / Dr. Nombre Apellido"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="email" className="text-gray-200 mb-2">Correo electrónico</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="nombre@clinica.com"
              />
            </div>
            <div className="flex flex-col sm:col-span-2">
              <label htmlFor="specialty" className="text-gray-200 mb-2">Especialidad</label>
              <input
                id="specialty"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Rehabilitación, Medicina Interna, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-cyan-600 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
              required
            />
            <label htmlFor="consent" className="text-gray-300 text-sm">
              He leído y acepto el Aviso de Privacidad y consiento el tratamiento de mis datos personales.
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" className="px-6 py-2" style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)' }}>
              Enviar solicitud
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};