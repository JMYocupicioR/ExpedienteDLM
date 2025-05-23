import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, Shield, Users, Activity, 
  Heart, Brain, FileText, Clock, ArrowLeft,
  Award, Globe, Zap
} from 'lucide-react';

export default function AboutPage() {
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
              <Link to="/" className="flex items-center text-gray-300 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </Link>
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
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Transformando la Medicina Digital
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              DeepLuxMed está revolucionando la gestión de expedientes médicos con tecnología 
              de vanguardia, inteligencia artificial y un compromiso inquebrantable con la 
              seguridad y privacidad de los datos.
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="bg-gray-900/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-cyan-400/50 transition-all">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-6">
                <Heart className="h-8 w-8 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Nuestra Misión</h2>
              <p className="text-gray-300 leading-relaxed">
                Facilitar la excelencia en la atención médica a través de soluciones 
                digitales innovadoras que permitan a los profesionales de la salud 
                enfocarse en lo más importante: sus pacientes.
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-cyan-400/50 transition-all">
              <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Nuestra Visión</h2>
              <p className="text-gray-300 leading-relaxed">
                Ser el estándar global en gestión de expedientes médicos digitales, 
                liderando la transformación digital en el sector salud con innovación 
                continua y tecnología de punta.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              ¿Por qué elegir DeepLuxMed?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Nuestra plataforma combina tecnología avanzada con facilidad de uso 
              para ofrecer la mejor experiencia en gestión médica digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
              <Shield className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Seguridad de Nivel Militar
              </h3>
              <p className="text-gray-300">
                Cifrado de extremo a extremo y cumplimiento total con HIPAA y otras 
                regulaciones internacionales de privacidad médica.
              </p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
              <Zap className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Rendimiento Superior
              </h3>
              <p className="text-gray-300">
                Tiempo de respuesta ultrarrápido y disponibilidad 24/7 con 
                sincronización en tiempo real entre dispositivos.
              </p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
              <Award className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Certificaciones
              </h3>
              <p className="text-gray-300">
                Avalados por las principales instituciones de salud y tecnología 
                médica a nivel internacional.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Comienza tu Transformación Digital Hoy
          </h2>
          <p className="text-xl text-cyan-100 mb-8 max-w-2xl mx-auto">
            Únete a miles de profesionales de la salud que ya confían en DeepLuxMed 
            para la gestión de sus expedientes médicos.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-cyan-50 transition-all duration-300 text-lg font-medium shadow-xl"
          >
            Prueba Gratuita por 30 Días
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Stethoscope className="h-8 w-8 text-cyan-400" />
              <span className="ml-2 text-xl font-bold text-white">Expediente DLM</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Privacidad</a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Términos</a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}