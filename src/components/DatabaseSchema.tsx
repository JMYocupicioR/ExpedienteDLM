import React from 'react';
import { Code, Database, Shield, List, FileText, User, Activity, Pill, History, CalendarClock, FormInput } from 'lucide-react';

const DatabaseSchema = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">ExpedienteDLM Database Schema</h1>
          <p className="text-gray-600">Comprehensive medical records system with customizable forms and HIPAA compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Database className="text-blue-600 mr-3" size={24} />
              <h2 className="text-xl font-bold text-gray-800">Key Features</h2>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Shield className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>HIPAA-compliant architecture with audit trails</span>
              </li>
              <li className="flex items-start">
                <List className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Multi-specialty support with customizable forms</span>
              </li>
              <li className="flex items-start">
                <FileText className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Comprehensive patient records with medical history</span>
              </li>
              <li className="flex items-start">
                <Code className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Optimized schema with proper indexing and relationships</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Shield className="text-blue-600 mr-3" size={24} />
              <h2 className="text-xl font-bold text-gray-800">Security & Compliance</h2>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Shield className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Role-based access control</span>
              </li>
              <li className="flex items-start">
                <Shield className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Comprehensive audit logging of all system changes</span>
              </li>
              <li className="flex items-start">
                <Shield className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>Soft delete functionality to prevent data loss</span>
              </li>
              <li className="flex items-start">
                <Shield className="text-green-600 mr-2 mt-0.5" size={18} />
                <span>UUID primary keys for enhanced security</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Database className="text-blue-600 mr-3" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Schema Structure</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SchemaGroup 
              title="Users & Authentication" 
              icon={<User size={20} className="text-blue-500" />}
              tables={[
                { name: "users", description: "Doctors, staff with authentication" },
                { name: "roles", description: "User roles and permissions" },
                { name: "specialties", description: "Medical specialties catalog" }
              ]}
            />
            
            <SchemaGroup 
              title="Patients" 
              icon={<User size={20} className="text-blue-500" />}
              tables={[
                { name: "patients", description: "Core patient information" },
                { name: "patient_contacts", description: "Emergency contacts" },
                { name: "medical_histories", description: "Complete health history" }
              ]}
            />
            
            <SchemaGroup 
              title="Consultations" 
              icon={<CalendarClock size={20} className="text-blue-500" />}
              tables={[
                { name: "consultations", description: "Medical appointments" },
                { name: "vital_signs", description: "Patient measurements" },
                { name: "file_attachments", description: "Medical documents" }
              ]}
            />
            
            <SchemaGroup 
              title="Medications" 
              icon={<Pill size={20} className="text-blue-500" />}
              tables={[
                { name: "medications", description: "Medication catalog" },
                { name: "prescriptions", description: "Patient prescriptions" },
                { name: "allergies", description: "Allergy records" }
              ]}
            />
            
            <SchemaGroup 
              title="Medical Tests" 
              icon={<Activity size={20} className="text-blue-500" />}
              tables={[
                { name: "medical_tests", description: "Lab and imaging studies" },
                { name: "file_attachments", description: "Test results & images" }
              ]}
            />
            
            <SchemaGroup 
              title="Customization" 
              icon={<FormInput size={20} className="text-blue-500" />}
              tables={[
                { name: "custom_fields", description: "Specialty-specific fields" },
                { name: "custom_field_values", description: "Custom data values" },
                { name: "audit_logs", description: "System change tracking" }
              ]}
            />
          </div>
        </div>

        <div className="rounded-lg bg-blue-600 text-white p-6">
          <h3 className="text-xl font-bold mb-4">Advanced Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Automatic Triggers</h4>
              <p className="text-sm">The schema includes automatic triggers for audit logging and timestamp maintenance.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Multi-language Support</h4>
              <p className="text-sm">Built-in support for multiple languages with patient language preferences.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Optimized Indexing</h4>
              <p className="text-sm">Strategic indexes on frequently queried columns for better performance.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Data Integrity</h4>
              <p className="text-sm">Foreign keys and constraints ensure all data maintains proper relationships.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SchemaGroupProps {
  title: string;
  icon: React.ReactNode;
  tables: { name: string; description: string }[];
}

const SchemaGroup = ({ title, icon, tables }: SchemaGroupProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 transition-transform hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center mb-3">
        {icon}
        <h3 className="font-semibold ml-2">{title}</h3>
      </div>
      <ul className="space-y-2">
        {tables.map((table, index) => (
          <li key={index} className="text-sm">
            <span className="font-mono text-blue-700">{table.name}</span>
            <p className="text-xs text-gray-600">{table.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DatabaseSchema;