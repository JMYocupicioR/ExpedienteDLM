import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield, Users, Clock, ArrowRight, Activity, FileText, Stethoscope, User, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LandingPage = () => {
  const { user, profile, loading, signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Mostrar loading mientras se verifica la autenticación (con timeout)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" style={{ background: 'linear-gradient(to bottom, #111827, #1f2937, #000000)' }}>
      {/* Navigation */}
      <nav id="navigation" className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="responsive-container">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center">
              <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-white">Expediente DLM</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-900" />
                      </div>
                      <span className="text-gray-300 text-sm sm:text-base hidden sm:block">
                        {profile?.full_name || user?.email || 'Usuario'}
                      </span>
                    </div>
                    <Link 
                      to="/dashboard" 
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-2 sm:px-6 sm:py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg text-sm sm:text-base touch-target"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-300 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-800"
                      title="Cerrar sesión"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/auth" 
                    className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base touch-target"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link 
                    to="/auth" 
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-2 sm:px-6 sm:py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg text-sm sm:text-base touch-target"
                  >
                    Comenzar
                  </Link>
                </>
              )}
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
            Expediente <span className="text-cyan-400" style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>DLM</span>
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-cyan-300 font-semibold mb-6 sm:mb-8">
            DeepLuxMed a la vanguardia en tecnología médica
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            Sistema integral de gestión de expedientes médicos que revoluciona la atención sanitaria 
            con tecnología de última generación, seguridad avanzada y una experiencia de usuario excepcional.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all duration-300 text-base sm:text-lg font-medium shadow-xl touch-target"
                style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)' }}
              >
                Ir al Dashboard
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all duration-300 text-base sm:text-lg font-medium shadow-xl touch-target"
                  style={{ background: 'linear-gradient(to right, #06b6d4, #3b82f6)' }}
                >
                  Iniciar Prueba Gratuita
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
                <Link 
                  to="/about" 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300 text-base sm:text-lg font-medium touch-target"
                >
                  Conocer Más
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features */}
      <div id="features" className="bg-gray-900/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-6">Tecnología Médica Avanzada</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Soluciones integrales que transforman la gestión médica con innovación, seguridad y eficiencia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-cyan-400" />}
              title="Seguridad Máxima"
              description="Cumplimiento total con normativas internacionales de protección de datos médicos y cifrado de extremo a extremo"
            />
            <FeatureCard 
              icon={<Users className="h-10 w-10 text-cyan-400" />}
              title="Multiusuario Avanzado"
              description="Gestión colaborativa con roles personalizados para médicos, enfermeros y personal administrativo"
            />
            <FeatureCard 
              icon={<Clock className="h-10 w-10 text-cyan-400" />}
              title="Tiempo Real"
              description="Actualizaciones instantáneas de expedientes y sincronización automática en todos los dispositivos"
            />
            <FeatureCard 
              icon={<Activity className="h-10 w-10 text-cyan-400" />}
              title="Monitoreo Inteligente"
              description="Seguimiento avanzado de signos vitales con alertas automáticas y análisis predictivo"
            />
            <FeatureCard 
              icon={<FileText className="h-10 w-10 text-cyan-400" />}
              title="Documentación Digital"
              description="Gestión paperless completa con firma digital, plantillas personalizables y archivo automático"
            />
            <FeatureCard 
              icon={<Heart className="h-10 w-10 text-cyan-400" />}
              title="Atención Personalizada"
              description="Historial médico completo con IA para recomendaciones de tratamiento y seguimiento"
            />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-cyan-100">Disponibilidad del Sistema</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50ms</div>
              <div className="text-cyan-100">Tiempo de Respuesta</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">256-bit</div>
              <div className="text-cyan-100">Cifrado de Seguridad</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <Stethoscope className="h-10 w-10 text-cyan-400" />
                <span className="ml-3 text-2xl font-bold text-white">Expediente DLM</span>
              </div>
              <p className="text-gray-400 text-lg mb-6 max-w-md">
                DeepLuxMed a la vanguardia en tecnología médica. 
                Transformando la atención sanitaria con soluciones digitales innovadoras.
              </p>
              <div className="flex space-x-4" role="list" aria-label="Redes sociales">
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-gray-800 touch-target"
                  aria-label="Seguir en Twitter"
                  role="listitem"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-gray-800 touch-target"
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
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Características</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Seguridad</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Precios</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Integraciones</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Soporte</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Documentación</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">API</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">&copy; 2025 Expediente DLM - DeepLuxMed. Todos los derechos reservados.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Privacidad</a>
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Términos</a>
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-cyan-400/50 transition-all duration-300 hover:bg-gray-800/70 group">
      <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-cyan-400 transition-colors">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
};

export default LandingPage;