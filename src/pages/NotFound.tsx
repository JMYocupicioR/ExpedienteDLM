import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo className="h-16 w-auto" />
        </div>
        
        {/* 404 Number */}
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-gray-300 leading-none">404</h1>
        </div>
        
        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Página no encontrada
          </h2>
          <p className="text-gray-600">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 block"
          >
            Volver al inicio
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Volver atrás
          </button>
        </div>
        
        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            ¿Necesitas ayuda?{' '}
            <Link to="/contact" className="text-blue-600 hover:text-blue-700 underline">
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
