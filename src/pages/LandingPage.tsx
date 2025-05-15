import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield, Users, Clock, ArrowRight, Activity, FileText } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ExpedienteDLM</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link 
                to="/auth" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            Modern Medical Records<br />Management System
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Streamline your medical practice with our comprehensive, secure, and customizable electronic health records system.
          </p>
          <Link 
            to="/auth" 
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Comprehensive Features</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to manage your medical practice efficiently</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="h-8 w-8 text-blue-600" />}
              title="HIPAA Compliant"
              description="Secure and compliant with all healthcare data protection requirements"
            />
            <FeatureCard 
              icon={<Users className="h-8 w-8 text-blue-600" />}
              title="Multi-Specialty Support"
              description="Customizable forms and workflows for different medical specialties"
            />
            <FeatureCard 
              icon={<Clock className="h-8 w-8 text-blue-600" />}
              title="Real-time Updates"
              description="Instant access to patient records and medical history"
            />
            <FeatureCard 
              icon={<Activity className="h-8 w-8 text-blue-600" />}
              title="Vital Signs Tracking"
              description="Comprehensive monitoring of patient vital signs and metrics"
            />
            <FeatureCard 
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              title="Digital Documentation"
              description="Paperless record keeping with easy document management"
            />
            <FeatureCard 
              icon={<Heart className="h-8 w-8 text-blue-600" />}
              title="Patient Care"
              description="Enhanced patient care with comprehensive medical history"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">ExpedienteDLM</span>
              </div>
              <p className="mt-4 text-gray-600">Modern medical records management for healthcare professionals.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Product</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Security</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Support</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">API Reference</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-center text-gray-600">&copy; 2025 ExpedienteDLM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default LandingPage;