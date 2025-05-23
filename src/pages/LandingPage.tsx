import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield, Users, Clock, ArrowRight, Activity, FileText, Stethoscope } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      {/* Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <span className="ml-2 text-xl font-bold text-white">Expediente DLM</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth" className="text-gray-300 hover:text-white transition-colors">Iniciar Sesión</Link>
              <Link 
                to="/auth" 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg"
              >
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="mb-6">
            <Stethoscope className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Expediente <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">DLM</span>
          </h1>
          <h2 className="text-2xl sm:text-3xl text-cyan-300 font-semibold mb-8">
            DeepLuxMed a la vanguardia en tecnología médica
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Sistema integral de gestión de expedientes médicos que revoluciona la atención sanitaria 
            con tecnología de última generación, seguridad avanzada y una experiencia de usuario excepcional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/auth" 
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 text-lg font-medium shadow-xl"
            >
              Iniciar Prueba Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="#features" 
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300 text-lg font-medium"
            >
              Conocer Más
            </Link>
          </div>
        </div>
      </div>

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
      <footer className="bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
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