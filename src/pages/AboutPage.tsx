import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, Activity, FileText, Heart, ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-900" style={{ background: 'linear-gradient(to bottom, #111827, #1f2937, #000000)' }}>
      {/* Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Back Button */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Acerca de <span className="text-cyan-400">Expediente DLM</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Sistema integral de gestión de expedientes médicos desarrollado por DeepLuxMed para revolucionar la atención sanitaria.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <Shield className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Seguridad Avanzada</h3>
            <p className="text-gray-300">Cumplimiento total con normativas internacionales de protección de datos médicos y cifrado de extremo a extremo.</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <Users className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Multiusuario</h3>
            <p className="text-gray-300">Gestión colaborativa con roles personalizados para médicos, enfermeros y personal administrativo.</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <Clock className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Tiempo Real</h3>
            <p className="text-gray-300">Actualizaciones instantáneas de expedientes y sincronización automática en todos los dispositivos.</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <Activity className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Monitoreo Inteligente</h3>
            <p className="text-gray-300">Seguimiento avanzado de signos vitales con alertas automáticas y análisis predictivo.</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <FileText className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Documentación Digital</h3>
            <p className="text-gray-300">Gestión paperless completa con firma digital, plantillas personalizables y archivo automático.</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
            <Heart className="h-12 w-12 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-3">Atención Personalizada</h3>
            <p className="text-gray-300">Historial médico completo con IA para recomendaciones de tratamiento y seguimiento.</p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-gray-800/30 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Planes y Precios</h2>
            <p className="text-gray-300">Elige el plan que mejor se adapte a tus necesidades</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-4">Básico</h3>
              <div className="text-3xl font-bold text-cyan-400 mb-4">$29<span className="text-lg text-gray-400">/mes</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Hasta 100 pacientes
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Expedientes básicos
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Soporte por email
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/auth">Comenzar</Link>
              </Button>
            </div>
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl p-6 border border-cyan-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">Más Popular</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Profesional</h3>
              <div className="text-3xl font-bold text-white mb-4">$79<span className="text-lg text-cyan-100">/mes</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                  Pacientes ilimitados
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                  Expedientes avanzados
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                  Plantillas personalizables
                </li>
                <li className="flex items-center text-white">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                  Soporte prioritario
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-gray-900">
                <Link to="/auth">Comenzar</Link>
              </Button>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-4">Enterprise</h3>
              <div className="text-3xl font-bold text-cyan-400 mb-4">$199<span className="text-lg text-gray-400">/mes</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Todo del Profesional
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  API personalizada
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Integraciones avanzadas
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  Soporte 24/7
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/auth">Contactar</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Listo para comenzar?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Únete a miles de profesionales médicos que ya confían en Expediente DLM para gestionar sus expedientes de manera eficiente y segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
              <Link to="/auth">
                Iniciar Prueba Gratuita
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900">
              <Link to="/auth">
                Solicitar Demo
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Link to="/" className="inline-block mb-6">
              <Logo />
            </Link>
            <p className="text-gray-400 mb-6">
              Expediente DLM - Transformando la atención sanitaria con tecnología de vanguardia
            </p>
            <div className="flex justify-center space-x-6">
              <Link to="/" className="text-gray-400 hover:text-cyan-400 transition-colors">Inicio</Link>
              <Link to="/auth" className="text-gray-400 hover:text-cyan-400 transition-colors">Iniciar Sesión</Link>
              <Link to="/auth" className="text-gray-400 hover:text-cyan-400 transition-colors">Registrarse</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;