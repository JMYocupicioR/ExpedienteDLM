import React, { useState } from 'react';
import ClinicManagementTable from '../components/ClinicManagementTable';
import AdminUserList from '../components/AdminUserList';
import PendingApprovalsTable from '../components/PendingApprovalsTable';
import { LayoutDashboard, Users, UserCheck } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'clinics' | 'admins' | 'approvals'>('clinics');

  return (
    <div className="min-h-screen bg-[#0F1218] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Panel de Super Administrador
            </h1>
            <p className="text-gray-400 mt-1">
              Gestión centralizada de la plataforma ExpedienteDLM
            </p>
          </div>
        </div>

        {/* Stats / Quick Cards (Optional future expansion) */}
        
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('clinics')}
            className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'clinics'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Clínicas y Pagos
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            Administradores
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 px-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Aprobaciones Pendientes
          </button>
        </div>

        {/* Content */}
        <div className="animate-in fade-in py-4">
          {activeTab === 'clinics' ? (
            <ClinicManagementTable />
          ) : activeTab === 'admins' ? (
            <AdminUserList />
          ) : (
            <PendingApprovalsTable />
          )}
        </div>

      </div>
    </div>
  );
}
