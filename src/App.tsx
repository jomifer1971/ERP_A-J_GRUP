/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ParteDiarioForm from './components/ParteDiarioForm';
import Logo from './components/Logo';
import { LogOut, User as UserIcon, Database, Wifi, WifiOff, LayoutDashboard, Briefcase, Warehouse, UserCheck, ShieldCheck, Clock8, Smartphone, Monitor, Menu, X, ChevronDown, Users, LayoutGrid, FileSpreadsheet } from 'lucide-react';
import { isSupabaseConfigured } from './config/supabaseClient';
import ObrasTab from './components/ObrasTab';
import AlmacenesTab from './components/AlmacenesTab';
import CuentaTab from './components/CuentaTab';
import TurnosTab from './components/TurnosTab';
import RolesTab from './components/RolesTab';
import OperariosTab from './components/OperariosTab';
import WeeklyClockingReport from './components/WeeklyClockingReport';

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

  const [activeTab, setActiveTab ] = useState<'launcher' | 'dashboard' | 'fichaje' | 'informes' | 'obras' | 'almacenes' | 'cuenta' | 'turnos' | 'roles' | 'operarios'>(() => {
    return 'launcher';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = (loggedInUser: Usuario) => {
    setUser(loggedInUser);
    localStorage.setItem('aj_user_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aj_user_session');
  };

  const [devicePlatform, setDevicePlatform] = useState<'movil' | 'pc'>(() => {
    const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
    return (isMobileUA || isSmallScreen) ? 'movil' : 'pc';
  });

  const [useMobileViewOnPC, setUseMobileViewOnPC] = useState<boolean>(false);

  // Monitor screen size dynamically for adaptiveness
  useEffect(() => {
    const handleResize = () => {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 1024;
      setDevicePlatform((isMobileUA || isSmallScreen) ? 'movil' : 'pc');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <div className="flex items-center gap-3 md:gap-4">
          {/* Odoo-style apps launcher trigger */}
          <button
            onClick={() => setActiveTab('launcher')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black font-mono uppercase tracking-wider transition-all border cursor-pointer outline-none ${
              activeTab === 'launcher'
                ? 'bg-[#07474e] text-white border-[#07474e] shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200'
            }`}
            title="Ver Panel de Aplicaciones"
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Mis Aplicaciones</span>
            <span className="sm:hidden">Apps</span>
          </button>

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
              className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-xl cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN RESPONSIVE CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
              {/* UNIFIED COLLAPSIBLE NAVIGATION MENU: Responsive on both mobile and computer */}
        <div className="flex flex-col gap-2 relative w-full md:max-w-xl mx-auto mb-1 select-none">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between gap-3 p-4 bg-[#07474e] hover:bg-[#0b5c65] text-white rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs md:text-sm font-black font-mono uppercase tracking-wider">
              {activeTab === 'launcher' && <LayoutGrid className="w-4 h-4 text-amber-400" />}
              {activeTab === 'dashboard' && <LayoutDashboard className="w-4 h-4 text-emerald-400" />}
              {activeTab === 'fichaje' && <Clock8 className="w-4 h-4 text-teal-300" />}
              {activeTab === 'informes' && <FileSpreadsheet className="w-4 h-4 text-amber-300 animate-pulse" />}
              {activeTab === 'obras' && <Briefcase className="w-4 h-4 text-amber-400" />}
              {activeTab === 'almacenes' && <Warehouse className="w-4 h-4 text-[#bfdbfe]" />}
              {activeTab === 'cuenta' && <UserCheck className="w-4 h-4 text-[#99f6e4]" />}
              {activeTab === 'turnos' && <Clock8 className="w-4 h-4 text-indigo-300 animate-pulse" />}
              {activeTab === 'roles' && <ShieldCheck className="w-4 h-4 text-rose-400" />}
              {activeTab === 'operarios' && <Users className="w-4 h-4 text-teal-400" />}
              
              <span>
                Menú: {
                  activeTab === 'launcher' ? 'Panel de Aplicaciones (Home)' :
                  activeTab === 'dashboard' ? 'Mando Central' :
                  activeTab === 'fichaje' ? 'Registrar Parte / Fichaje' :
                  activeTab === 'informes' ? 'Control e Informes de Horas' :
                  activeTab === 'obras' ? 'Obras y Planos' :
                  activeTab === 'almacenes' ? 'Almacenes y OCR' :
                  activeTab === 'cuenta' ? 'Ficha y Estadísticas' :
                  activeTab === 'turnos' ? 'Turnos y Horarios' :
                  activeTab === 'roles' ? 'Seguridad / Roles' :
                  activeTab === 'operarios' ? 'Personal y Jefes' : 'Sección'
                }
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold tracking-wide text-teal-100 opacity-90 border border-teal-200/25 px-2 py-0.5 rounded-md bg-white/10 hidden xs:inline-block">
                {devicePlatform === 'pc' ? 'Click para cambiar' : 'Tocar para cambiar'}
              </span>
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </div>
          </button>

          {/* Collapsible Dropdown Overlaid list */}
          {mobileMenuOpen && (
            <div className="absolute top-14 left-0 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2.5 flex flex-col gap-1.5 animate-fadeIn">
              <button
                type="button"
                onClick={() => { setActiveTab('launcher'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'launcher'
                    ? 'bg-amber-50 text-amber-900 border-l-4 border-amber-500'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-amber-600" />
                📱 Panel de Aplicaciones
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                      : 'bg-white text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-[#07474e]" />
                  Mando Central
                </button>
              )}

              <button
                type="button"
                onClick={() => { setActiveTab('fichaje'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'fichaje'
                    ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Clock8 className="w-4 h-4 text-teal-600" />
                Registrar Parte / Fichaje
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('informes'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'informes'
                    ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                Control e Informes de Horas
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('obras'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'obras'
                    ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-amber-600" />
                Obras y Planos
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('almacenes'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'almacenes'
                    ? 'bg-[#07474e]/5 text-[#07474e] border-l-4 border-indigo-600'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <Warehouse className="w-4 h-4 text-indigo-600" />
                Almacenes y OCR
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('cuenta'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                  activeTab === 'cuenta'
                    ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                    : 'bg-white text-gray-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4 text-teal-700" />
                Ficha y Estadísticas
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('turnos'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === 'turnos'
                        ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                        : 'bg-white text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock8 className="w-4 h-4 text-indigo-700" />
                    Turnos y Horarios
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('roles'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === 'roles'
                        ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                        : 'bg-white text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    Seguridad / Roles
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('operarios'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer ${
                      activeTab === 'operarios'
                        ? 'bg-teal-50 text-[#07474e] border-l-4 border-[#07474e]'
                        : 'bg-white text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-teal-600" />
                    Personal y Jefes
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Route Screen Switcher */}
        {activeTab === 'launcher' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Odoo Header banner with high resolution styling */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden border border-slate-800 shadow-md">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none rounded-r-3xl"></div>
              <div className="flex flex-col gap-2 relative z-10">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/50 border border-emerald-900/40 px-3 py-1 rounded-full self-start leading-none">
                  A&J GRUP BCN • GESTOR DE APLICACIONES
                </span>
                <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">Menú de Aplicaciones Integrado</h1>
                <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed mt-1">
                  Bienvenido, <strong className="text-white">{user.nombre}</strong>. Tienes sesión activa como <span className="text-emerald-400 uppercase font-mono font-bold">[{user.rol}]</span>. 
                  Selecciona cualquiera de las secciones inferiores para saltar de forma ágil entre informes de horas, obras u operaciones de campo.
                </p>
              </div>
            </div>

            {/* Odoo Layout Applications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {[
                {
                  id: 'fichaje',
                  nombre: 'Planilla de Fichajes',
                  icon: Clock8,
                  badge: 'Operativo',
                  color: 'from-emerald-500 to-teal-600',
                  borderColor: 'border-emerald-200/55',
                  textColor: 'text-emerald-700',
                  accentBg: 'bg-emerald-50 text-emerald-700',
                  descripcion: 'Registrador diario de asistencia, geolocalización satelital activa, geovallado de obras y partes de trabajo.',
                  visible: true
                },
                {
                  id: 'informes',
                  nombre: 'Informe de Horas Trabajadas',
                  icon: FileSpreadsheet,
                  badge: 'Filtros y PDF',
                  color: 'from-amber-500 to-orange-600',
                  borderColor: 'border-amber-200/55',
                  textColor: 'text-amber-700',
                  accentBg: 'bg-amber-50 text-amber-955',
                  descripcion: 'Visor intuitivo de horas trabajadas para inspección, filtros dinámicos por empleado o semana, y envío automatizado de informes de jornada.',
                  visible: true
                },
                {
                  id: 'dashboard',
                  nombre: 'Mando Central',
                  icon: LayoutDashboard,
                  badge: 'Configuración',
                  color: 'from-cyan-500 to-blue-600',
                  borderColor: 'border-cyan-200/55',
                  textColor: 'text-cyan-700',
                  accentBg: 'bg-cyan-50 text-cyan-700',
                  descripcion: 'Consola global de métricas del negocio, histórico de alertas, controles del robot de notificaciones y simulador de campo.',
                  visible: isAdmin
                },
                {
                  id: 'obras',
                  nombre: 'Obras y Planimetrías',
                  icon: Briefcase,
                  badge: 'Documental',
                  color: 'from-blue-500 to-indigo-600',
                  borderColor: 'border-blue-200/55',
                  textColor: 'text-blue-700',
                  accentBg: 'bg-blue-50 text-blue-700',
                  descripcion: 'Historial de obras en curso, planos arquitectónicos cargados con zoom interactivo y radios de geocercado GPS.',
                  visible: true
                },
                {
                  id: 'almacenes',
                  nombre: 'Almacenes y OCR',
                  icon: Warehouse,
                  badge: 'Materiales',
                  color: 'from-violet-500 to-purple-600',
                  borderColor: 'border-violet-200/55',
                  textColor: 'text-purple-700',
                  accentBg: 'bg-violet-50 text-purple-700',
                  descripcion: 'Centro de inventario, herramientas compartidas y escaneo inteligente OCR con IA de tickets de compra de proveedores.',
                  visible: true
                },
                {
                  id: 'operarios',
                  nombre: 'Personal y Jefes',
                  icon: Users,
                  badge: 'RRHH',
                  color: 'from-pink-500 to-rose-600',
                  borderColor: 'border-rose-200/55',
                  textColor: 'text-rose-700',
                  accentBg: 'bg-pink-50 text-rose-700',
                  descripcion: 'Altas y bajas de operariado en plantilla, asignación directa de Jefes de Equipo y firma electrónica de protección de datos.',
                  visible: isAdmin
                },
                {
                  id: 'turnos',
                  nombre: 'Horarios y Turnos',
                  icon: Clock8,
                  badge: 'Jornada',
                  color: 'from-indigo-500 to-violet-600',
                  borderColor: 'border-indigo-200/55',
                  textColor: 'text-indigo-700',
                  accentBg: 'bg-indigo-50 text-indigo-700',
                  descripcion: 'Gestión de turnos de entrada continuos, partidos o nocturnos y solapes de cortesía horaria.',
                  visible: isAdmin
                },
                {
                  id: 'roles',
                  nombre: 'Roles y Seguridad',
                  icon: ShieldCheck,
                  badge: 'Firewall',
                  color: 'from-rose-500 to-red-600',
                  borderColor: 'border-rose-200/55',
                  textColor: 'text-rose-700',
                  accentBg: 'bg-rose-50 text-rose-700',
                  descripcion: 'Matriz interna de seguridad y credenciales, perfiles y políticas activas de geolocalización en las aplicaciones cliente.',
                  visible: isAdmin
                },
                {
                  id: 'cuenta',
                  nombre: 'Ficha del Colaborador',
                  icon: UserIcon,
                  badge: 'Perfil',
                  color: 'from-slate-500 to-slate-700',
                  borderColor: 'border-slate-200/55',
                  textColor: 'text-slate-700',
                  accentBg: 'bg-slate-50 text-slate-700',
                  descripcion: 'Ficha contractual de empleado, estadísticas personales de rendimiento, puntualidad histórica y boletines RGPD.',
                  visible: true
                }
              ].filter(module => module.visible).map((module) => {
                const IconComp = module.icon;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveTab(module.id as any)}
                    className={`flex flex-col text-left bg-white border ${module.borderColor} hover:border-gray-300 rounded-3xl p-6 shadow-3xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1.5 group cursor-pointer`}
                    id={`odoo_app_${module.id}`}
                  >
                    <div className="flex items-start justify-between w-full h-12 mb-4">
                      {/* High contrast colorful avatar box */}
                      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${module.color} text-white shadow-xs group-hover:scale-110 transition-transform duration-300`}>
                        <IconComp className="w-5.5 h-5.5" />
                      </div>
                      <span className={`text-[10px] font-mono font-black uppercase px-2 py-1 rounded-full border ${module.borderColor} ${module.accentBg}`}>
                        {module.badge}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-black tracking-tight text-slate-900 group-hover:text-teal-905 transition-colors">
                      {module.nombre}
                    </h3>
                    
                    <p className="text-xs text-gray-500 leading-normal mt-2 flex-1">
                      {module.descripcion}
                    </p>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase mt-4 text-[#07474e] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Acceder</span>
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'informes' && (
          <div className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 lg:p-8 animate-fadeIn shadow-sm">
            <WeeklyClockingReport currentUser={user} />
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboard user={user} />
        )}

        {activeTab === 'fichaje' && (
          <div className="flex flex-col gap-6 items-center w-full animate-fadeIn">
            <div className="w-full max-w-4xl transition-all duration-300 flex flex-col gap-6">
              
              {/* Control banner for adaptive view */}
              <div className="w-full bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-50 rounded-2xl text-[#07474e] shrink-0">
                    {devicePlatform === 'pc' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs md:text-sm font-bold text-gray-900 leading-tight">Adaptabilidad Inteligente</h4>
                      <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase">
                        {devicePlatform === 'pc' ? '🖥️ Entorno PC / Oficina' : '📱 Entorno Móvil / Obra'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {devicePlatform === 'pc' 
                        ? (useMobileViewOnPC 
                            ? 'Detector: Estás en ordenador. Se ha seleccionado la vista simulada en móvil para pruebas.'
                            : 'Detector: Estás conectado desde un ordenador de control. Mostrando la vista optimizada de pantalla completa para oficina.')
                        : 'Detector: Estás conectado desde un smartphone de campo en obra. El diseño se adapta de forma nativa a tu pantalla.'}
                    </p>
                  </div>
                </div>

                {devicePlatform === 'pc' && (
                  <div className="flex items-center gap-1.5 self-start md:self-auto shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-150">
                    <button
                      type="button"
                      onClick={() => setUseMobileViewOnPC(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        useMobileViewOnPC 
                          ? 'bg-white shadow-4xs text-[#07474e] border border-slate-250/20' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseMobileViewOnPC(false)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !useMobileViewOnPC
                          ? 'bg-white shadow-4xs text-[#07474e] border border-slate-250/20'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Pantalla Completa
                    </button>
                  </div>
                )}
              </div>

              {/* Main title section */}
              <div className="flex flex-col gap-1 items-center text-center">
                <span className="text-[10px] font-mono font-black text-[#07474e] uppercase tracking-widest leading-none">Portal del Operario</span>
                <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Registro Diario de Trabajo</h2>
                <p className="text-xs text-[#64748b] leading-relaxed max-w-md mt-1 px-4 text-center">
                  Ficha tu jornada, controla tu posición GPS con geovallado activo y registra materiales instalados en obra de forma ágil.
                </p>
              </div>
              
              {devicePlatform === 'pc' && useMobileViewOnPC ? (
                <div className="flex justify-center w-full py-4 relative">
                  {/* Smartphone frame container */}
                  <div className="relative mx-auto rounded-[50px] border-[12px] border-slate-900 bg-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] w-[385px] min-h-[790px] max-w-full overflow-hidden flex flex-col hover:border-slate-800 transition-colors duration-300">
                    
                    {/* Dynamic Notch / Island */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-slate-900 rounded-[20px] z-50 flex items-center justify-between px-3">
                      <span className="w-2 h-2 rounded-full bg-slate-800/80 border border-slate-700/50"></span>
                      <span className="w-12 h-1 bg-slate-950 rounded-full"></span>
                      <span className="w-2 h-2 rounded-full bg-blue-900 border border-blue-600/30"></span>
                    </div>

                    {/* Volume button simulations */}
                    <div className="absolute -left-[14px] top-32 w-[3px] h-12 bg-slate-700 rounded-l-md z-40"></div>
                    <div className="absolute -left-[14px] top-48 w-[3px] h-12 bg-slate-700 rounded-l-md z-40"></div>
                    
                    {/* Power button simulation */}
                    <div className="absolute -right-[14px] top-40 w-[3px] h-16 bg-slate-700 rounded-r-md z-40"></div>

                    {/* Simulated Mobile Status bar */}
                    <div className="bg-[#f8fafc] text-slate-800 px-5 pt-8 pb-1.5 flex justify-between items-center text-[10px] font-bold font-mono tracking-wide z-40 select-none border-b border-gray-100/50">
                      <span className="text-[#07474e]">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} h
                      </span>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Wifi className="w-3 h-3 text-[#07474e]" />
                        <span className="text-[8px] font-black bg-[#eefcfd] text-[#07474e] border border-teal-150 px-1 rounded scale-90">5G</span>
                        <span>94% 🔋</span>
                      </div>
                    </div>

                    {/* Screen Content */}
                    <div className="flex-1 w-full bg-[#f1f5f9] overflow-y-auto max-h-[660px] custom-scrollbar relative">
                      <div className="sticky top-0 bg-[#07474e] text-white p-3.5 text-center shadow-xs z-30">
                        <p className="text-[9px] font-mono tracking-widest uppercase text-teal-200">AJ GRUP BCN • SIMULADOR</p>
                        <h3 className="text-xs font-black tracking-tight leading-none mt-1 uppercase">Fichajes y Partes Diarios</h3>
                      </div>
                      
                      <div className="p-3">
                        <ParteDiarioForm user={user} forceMobileLayout={true} />
                      </div>
                    </div>

                    {/* iOS Indicator Bar */}
                    <div className="bg-[#f8fafc] py-2 flex items-center justify-center border-t border-gray-150 z-40">
                      <div className="w-24 h-1 bg-slate-900/60 rounded-full"></div>
                    </div>

                  </div>
                </div>
              ) : (
                <ParteDiarioForm user={user} forceMobileLayout={false} />
              )}

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

        {isAdmin && activeTab === 'operarios' && (
          <OperariosTab user={user} />
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
