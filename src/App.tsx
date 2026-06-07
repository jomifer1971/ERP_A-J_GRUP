/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ParteDiarioForm from './components/ParteDiarioForm';
import Logo from './components/Logo';
import { LogOut, User as UserIcon, Database, Wifi, WifiOff, LayoutDashboard, Briefcase, Warehouse, UserCheck, ShieldCheck, Clock8 } from 'lucide-react';
import { isSupabaseConfigured } from './config/supabaseClient';
import ObrasTab from './components/ObrasTab';
import AlmacenesTab from './components/AlmacenesTab';
import CuentaTab from './components/CuentaTab';
import TurnosTab from './components/TurnosTab';
import RolesTab from './components/RolesTab';

export default function App() {
  const currentYear = new Date().getFullYear();
  // We use localStorage to persist the login simulation across reloads during dev
  const [user, setUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('aj_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fichaje' | 'obras' | 'almacenes' | 'cuenta' | 'turnos' | 'roles'>(() => {
    const saved = localStorage.getItem('aj_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const admin = u.rol === 'ceo' || u.rol === 'admin';
        return admin ? 'dashboard' : 'fichaje';
      } catch {
        return 'fichaje';
      }
    }
    return 'fichaje';
  });

  const handleLogin = (loggedInUser: Usuario) => {
    setUser(loggedInUser);
    localStorage.setItem('aj_user_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aj_user_session');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.rol === 'ceo' || user.rol === 'admin';

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans flex flex-col antialiased">
      
      {/* 1. MASTER RESPONSIVE HEADER */}
      <header className="h-16 bg-white border-b border-[#e2e8f0] px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Logo className="h-9 md:h-11 shrink-0" />

        {/* Administrator connection status badge */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-bold font-mono tracking-wide shadow-sm border bg-emerald-50 text-emerald-800 border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xs:inline">ADMIN: COPIAS EN LÍNEA (SUPABASE)</span>
            <span className="xs:hidden">SUPABASE EN LÍNEA</span>
          </div>
        )}

        {/* User profile actions */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-[#0f172a] truncate max-w-[150px]">{user.nombre}</div>
            <div className="text-[10px] font-medium text-[#07474e] font-mono uppercase bg-teal-50 px-1 rounded inline-block">{user.rol}</div>
          </div>
          
          <div className="relative group cursor-pointer flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#f8fafc] border-2 border-[#07474e] overflow-hidden flex items-center justify-center text-[#07474e] shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <button 
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN RESPONSIVE CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
              {/* Navigation Tabs Grid-style or flex wrap for premium adaptivity */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Mando Central
            </button>
          )}

          <button
            onClick={() => setActiveTab('fichaje')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
              activeTab === 'fichaje'
                ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Clock8 className="w-3.5 h-3.5" />
            Registrar Parte / Fichaje
          </button>
          
          <button
            onClick={() => setActiveTab('obras')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
              activeTab === 'obras'
                ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Obras y Planos
          </button>

          <button
            onClick={() => setActiveTab('almacenes')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
              activeTab === 'almacenes'
                ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            Almacenes y OCR
          </button>

          <button
            onClick={() => setActiveTab('cuenta')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
              activeTab === 'cuenta'
                ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Ficha y Estadísticas
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('turnos')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
                  activeTab === 'turnos'
                    ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Clock8 className="w-3.5 h-3.5 text-indigo-700 animate-pulse" />
                Turnos y Horarios
              </button>

              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold uppercase border-b-2 transition-all ${
                  activeTab === 'roles'
                    ? 'border-[#07474e] text-[#07474e] bg-white rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                Seguridad / Roles
              </button>
            </>
          )}
        </div>

        {/* Dynamic Route Screen Switcher */}
        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboard user={user} />
        )}

        {activeTab === 'fichaje' && (
          <div className="flex flex-col gap-6 items-center">
            <div className="w-full max-w-xl">
              <div className="mb-6 flex flex-col gap-1 items-center text-center">
                <span className="text-[10px] font-mono font-black text-[#07474e] uppercase tracking-widest leading-none">Portal del Operario</span>
                <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Registro Diario de Trabajo</h2>
                <p className="text-xs text-[#64748b] leading-relaxed max-w-sm mt-1.5">
                  Ficha tu jornada, controla tu posición GPS con geovallado activo y registra materiales instalados en obra de forma ágil.
                </p>
              </div>
              
              <ParteDiarioForm user={user} />
            </div>
          </div>
        )}

        {activeTab === 'obras' && (
          <ObrasTab user={user} />
        )}

        {activeTab === 'almacenes' && (
          <AlmacenesTab />
        )}

        {activeTab === 'cuenta' && (
          <CuentaTab user={user} />
        )}

        {isAdmin && activeTab === 'turnos' && (
          <TurnosTab />
        )}

        {isAdmin && activeTab === 'roles' && (
          <RolesTab user={user} />
        )}

      </main>

      {/* 3. PERSISTENT FOOTER */}
      <footer className="bg-white border-t border-[#e2e8f0] py-4 px-6 text-center text-[10px] md:text-xs font-mono tracking-wider text-[#64748b] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {currentYear} A&J GRUP BCN • v2.0 - Responsive Setup</p>
          <div className="flex gap-4">
            <span className="text-[#07474e] font-bold">REFORMAS INTEGRALES</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
