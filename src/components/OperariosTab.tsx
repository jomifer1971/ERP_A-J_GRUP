/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2, 
  UserCheck, 
  FileSignature, 
  MapPin, 
  Info, 
  AlertTriangle, 
  ChevronRight, 
  Phone, 
  Mail, 
  Lock, 
  Unlock, 
  UserPlus2, 
  Calendar,
  Layers,
  Send,
  Check
} from 'lucide-react';

const ESPECIALIDADES_LIST = [
  'paleta',
  'pintor',
  'electricista',
  'fontanero',
  'cerrajero',
  'yesero',
  'peón'
];

interface OperariosTabProps {
  user: Usuario;
}

export default function OperariosTab({ user }: OperariosTabProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<'ceo' | 'admin' | 'jefe_equipo' | 'operario'>('operario');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [jefeId, setJefeId] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rgpdFirmado, setRgpdFirmado] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  // UI States
  const [revealedDnis, setRevealedDnis] = useState<{ [userId: string]: boolean }>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Loaded users hydrate
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    let loaded = false;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*');
        if (!error && data && data.length > 0) {
          const mapped: Usuario[] = data.map((dbU: any) => ({
            id: dbU.id,
            nombre: dbU.nombre,
            email: dbU.email,
            rol: dbU.rol,
            validado: dbU.validado,
            especialidades: dbU.especialidades || [],
            jefeId: dbU.jefe_id,
            telefono: dbU.telefono,
            dni: dbU.dni,
            fechaNacimiento: dbU.fecha_nacimiento,
            direccion: dbU.direccion,
            rgpdFirmado: dbU.rgpd_firmado === true,
            telegramChatId: dbU.telegram_chat_id
          }));
          setUsuarios(mapped);
          localStorage.setItem('aj_users_v2', JSON.stringify(mapped));
          loaded = true;
        }
      } catch (err) {
        console.warn('Supabase load error:', err);
      }
    }
    
    if (!loaded) {
      const saved = localStorage.getItem('aj_users_v2');
      if (saved) {
        try {
          setUsuarios(JSON.parse(saved));
        } catch {
          initializeDefaults();
        }
      } else {
        initializeDefaults();
      }
    }
  };

  const initializeDefaults = () => {
    const defaults: Usuario[] = [
      { id: 'u-1', nombre: 'Javier Domínguez', email: 'ceo@ajgrup.com', rol: 'ceo', validado: true, especialidades: ['electricista', 'fontanero'], telefono: '+34 601 234 567', dni: '46382914K', rgpdFirmado: true },
      { id: 'u-2', nombre: 'Admin Master', email: 'admin@ajgrup.com', rol: 'admin', validado: true, especialidades: ['electricista'], telefono: '+34 602 345 678', dni: '45341235F', rgpdFirmado: true },
      { id: 'u-3', nombre: 'Carlos Jefe', email: 'jefe@ajgrup.com', rol: 'jefe_equipo', validado: true, especialidades: ['paleta', 'fontanero'], telefono: '+34 603 456 789', dni: '42211995X', rgpdFirmado: true, telegramChatId: '987654321' },
      { id: 'u-4', nombre: 'Juan Operario', email: 'juan@ajgrup.com', rol: 'operario', validado: true, especialidades: ['paleta'], jefeId: 'u-3', telefono: '+34 604 567 890', dni: '47209384B', rgpdFirmado: true },
      { id: 'u-5', nombre: 'Nuevo Empleado', email: 'nuevo@ajgrup.com', rol: 'operario', validado: false, especialidades: ['pintor'], telefono: '+34 605 678 901', dni: '41123456L', rgpdFirmado: false },
    ];
    setUsuarios(defaults);
    localStorage.setItem('aj_users_v2', JSON.stringify(defaults));
  };

  const saveChanges = async (nextUsers: Usuario[]) => {
    setUsuarios(nextUsers);
    localStorage.setItem('aj_users_v2', JSON.stringify(nextUsers));

    if (isSupabaseConfigured) {
      try {
        const dbFormatted = nextUsers.map(u => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          validado: u.validado,
          especialidades: u.especialidades || [],
          jefe_id: u.jefeId || null,
          telefono: u.telefono || null,
          dni: u.dni || null,
          fecha_nacimiento: u.fechaNacimiento || null,
          direccion: u.direccion || null,
          rgpd_firmado: u.rgpdFirmado === true,
          telegram_chat_id: u.telegramChatId || null
        }));
        await supabase.from('usuarios').upsert(dbFormatted);
      } catch (err) {
        console.warn('Omitido guardar en BD remota:', err);
      }
    }
  };

  const handleOpenAdd = () => {
    setNombre('');
    setEmail('');
    setTelefono('');
    setRol('operario');
    setEspecialidades([]);
    setJefeId('');
    setDni('');
    setFechaNacimiento('');
    setDireccion('');
    setRgpdFirmado(false);
    setTelegramChatId('');
    setIsAdding(true);
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleOpenEdit = (u: Usuario) => {
    setSelectedUser(u);
    setNombre(u.nombre);
    setEmail(u.email);
    setTelefono(u.telefono || '');
    setRol(u.rol);
    setEspecialidades(u.especialidades || []);
    setJefeId(u.jefeId || '');
    setDni(u.dni || '');
    setFechaNacimiento(u.fechaNacimiento || '');
    setDireccion(u.direccion || '');
    setRgpdFirmado(u.rgpdFirmado === true);
    setTelegramChatId(u.telegramChatId || '');
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombre || !email) {
      setErrorMsg('El nombre corporativo y correo electrónico son obligatorios.');
      return;
    }

    if (isAdding) {
      // Check if email already exists
      if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
        setErrorMsg('La dirección de correo ya está asignada a otro miembro.');
        return;
      }

      const newUserItem: Usuario = {
        id: `u-${Date.now()}`,
        nombre,
        email: email.trim().toLowerCase(),
        telefono,
        rol,
        especialidades,
        jefeId: rol === 'operario' ? jefeId : undefined,
        dni,
        fechaNacimiento,
        direccion,
        rgpdFirmado,
        telegramChatId: rol === 'jefe_equipo' || rol === 'ceo' ? telegramChatId : undefined,
        validado: true
      };

      const updated = [...usuarios, newUserItem];
      saveChanges(updated);
      setSuccessMsg(`✓ Operario ${nombre} creado y registrado con éxito.`);
      setIsAdding(false);
    } else if (isEditing && selectedUser) {
      const updated = usuarios.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            nombre,
            email: email.trim().toLowerCase(),
            telefono,
            rol,
            especialidades,
            jefeId: rol === 'operario' ? jefeId : undefined,
            dni,
            fechaNacimiento,
            direccion,
            rgpdFirmado,
            telegramChatId: rol === 'jefe_equipo' || rol === 'ceo' ? telegramChatId : undefined
          };
        }
        return u;
      });

      saveChanges(updated);
      setSuccessMsg(`✓ Información de ${nombre} actualizada de forma protegida.`);
      setIsEditing(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === 'u-1' || userId === user.id) {
      setErrorMsg('No puedes dar de baja tu propio perfil autenticado o la cuenta fundadora.');
      return;
    }

    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${userName}? Esta acción no se puede deshacer y borrará sus registros de LOPD.`)) {
      const updated = usuarios.filter(u => u.id !== userId);
      saveChanges(updated);
      setSuccessMsg(`✓ Operario ${userName} dado de baja de los registros.`);
    }
  };

  const handleToggleDniReveal = (userId: string) => {
    setRevealedDnis(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleToggleEspecialidad = (esp: string) => {
    if (especialidades.includes(esp)) {
      setEspecialidades(prev => prev.filter(e => e !== esp));
    } else {
      setEspecialidades(prev => [...prev, esp]);
    }
  };

  const getMaskedDni = (realDni?: string, userId?: string) => {
    if (!realDni) return 'Pendiente';
    const isRevealed = userId ? !!revealedDnis[userId] : false;
    if (isRevealed) return realDni;
    
    // Simple LOPD mask (reveals first 3 and last letter, covers middle with asterisks)
    if (realDni.length > 4) {
      return realDni.substring(0, 3) + '****' + realDni.substring(realDni.length - 1);
    }
    return '****' + realDni.substring(realDni.length - 1);
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.telefono && u.telefono.includes(searchQuery))
  );

  const jefesDisponibles = usuarios.filter(u => u.rol === 'jefe_equipo');

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-10">
      
      {/* SECTION HEADER CARD */}
      <div className="bg-gradient-to-r from-[#07474e] to-[#042f34] rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Gestión del Personal y RGPD</h2>
            <p className="text-xs text-teal-150 max-w-xl mt-1 leading-normal">
              Directorio corporativo y base de datos de operarios de A&J Grup. Permite configurar asignaciones, roles y supervisar el cumplimiento de la directiva de protección de datos personales.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Operario
        </button>
      </div>

      {/* COMPLIANCE WARNING BANNER */}
      <div className="bg-[#eff6ff] border border-blue-200 rounded-2xl p-4 flex gap-3 text-xs text-blue-800 leading-normal">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <p className="font-bold">🔒 Cumplimiento estricto RGPD / Ley Orgánica de Protección de Datos (LOPD-GDD)</p>
          <p className="mt-1 text-blue-700">
            Conforme al Artículo 20.3 del Estatuto de los Trabajadores en España, los datos de geolocalización solo se registrarán durante la entrada y salida, nunca de forma continua. Recuerda que es preceptivo que cada operario firme previamente el anexo de información y consentimiento informado de geovallado antes de activar su perfil móvil.
          </p>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-xs font-bold font-mono">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3.5 text-xs font-bold font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
          {errorMsg}
        </div>
      )}

      {/* GRID LAYOUT: LIST ON THE LEFT, EDITING WINDOW OR HELP ON THE RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLS: SEARCH AND LIST OF WORKERS */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
            <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">Buscador Integrado:</span>
            <input
              type="text"
              placeholder="Escribe el nombre del operario, correo o teléfono móvil..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-300 rounded-2xl text-xs text-gray-800 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            {filteredUsuarios.map(u => {
              const matchesJefe = u.jefeId ? usuarios.find(x => x.id === u.jefeId) : null;
              
              return (
                <div 
                  key={u.id}
                  className={`bg-white rounded-3xl border p-5 shadow-4xs transition-all hover:shadow-2xs duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedUser?.id === u.id 
                      ? 'border-teal-500 ring-2 ring-teal-50 shadow-sm' 
                      : 'border-slate-200/90'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-150 relative">
                      <span className="text-xl">👤</span>
                      {u.rgpdFirmado ? (
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white" title="Consentimiento RGPD Firmado">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white" title="RGPD No Firmado">
                          <span className="text-[9px] font-black leading-none">!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-xs text-slate-900 truncate">{u.nombre}</p>
                        <span className={`text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded ${
                          u.rol === 'ceo' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                          u.rol === 'admin' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                          u.rol === 'jefe_equipo' ? 'bg-teal-50 text-teal-800 border border-teal-150' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {u.rol === 'ceo' ? 'FOUNDER & CEO' :
                           u.rol === 'admin' ? 'ADMINISTRACIÓN' :
                           u.rol === 'jefe_equipo' ? 'JEFE EQUIPO' :
                           'OPERARIO'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                        <p className="flex items-center gap-1.5 min-w-0 truncate">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{u.telefono || 'Sin tfno'}</span>
                        </p>

                        <p className="flex items-center gap-1.5">
                          <FileSignature className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-mono">DNI: {getMaskedDni(u.dni, u.id)}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDniReveal(u.id)}
                            className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            title="Mostrar/Ocultar DNI"
                          >
                            {revealedDnis[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </p>

                        {u.rol === 'operario' && (
                          <p className="flex items-center gap-1.5 text-indigo-700 truncate">
                            <Users className="w-3 h-3 shrink-0 text-indigo-400" />
                            <span className="truncate">
                              Jefe: {matchesJefe ? matchesJefe.nombre : 'Sin asig. (CEO Avisos)'}
                            </span>
                          </p>
                        )}

                        {(u.rol === 'jefe_equipo' || u.rol === 'ceo') && (
                          <p className="flex items-center gap-1.5 text-teal-700 truncate font-mono text-[9px] font-bold">
                            <Send className="w-3 h-3 shrink-0 text-teal-500" />
                            <span>Telegram: {u.telegramChatId ? `Activo (${u.telegramChatId})` : 'No configurado'}</span>
                          </p>
                        )}
                      </div>

                      {/* Display specializations */}
                      {u.especialidades && u.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {u.especialidades.map(esp => (
                            <span key={esp} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 capitalize">
                              {esp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-3 py-1.5 rounded-lg border border-slate-250 text-slate-700 hover:bg-slate-50 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      Editar Ficha
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(u.id, u.nombre)}
                      disabled={u.id === 'u-1' || u.id === user.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Baja Operario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsuarios.length === 0 && (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-200">
                <p className="text-xs text-gray-500 italic">No se ha encontrado ningún operario con tus criterios de búsqueda o filtros.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COL: FORM PANEL */}
        <div className="lg:col-span-1">
          {isAdding || isEditing ? (
            <form 
              onSubmit={handleSaveSubmit} 
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 sticky top-24"
            >
              <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600 animate-pulse" />
                  {isAdding ? 'Ficha de Registro' : 'Editar Ficha Asegurada'}
                </span>
                
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); setSelectedUser(null); }}
                  className="text-[10px] font-bold text-gray-400 hover:text-gray-800 uppercase font-mono cursor-pointer"
                >
                  Cancelar X
                </button>
              </div>

              {/* CORPORATE GENERAL DATA */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez Martínez"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-sans outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase">Email Corporativo:</label>
                  <input
                    type="email"
                    required
                    placeholder="juan@ajgrup.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase">Teléfono Móvil:</label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold text-gray-500 uppercase">Rol Organizativo:</label>
                  <select
                    value={rol}
                    onChange={e => {
                      const r = e.target.value as any;
                      setRol(r);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="operario">Operario de Campo</option>
                    <option value="jefe_equipo">Jefe de Equipo (Recibe alertas)</option>
                    <option value="admin">Administrador General</option>
                    <option value="ceo">CEO - Director General</option>
                  </select>
                </div>

                {/* Team leader assignment for operators */}
                {rol === 'operario' && (
                  <div className="flex flex-col gap-1 bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100">
                    <label className="text-[10px] font-mono font-black text-indigo-950 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Jefe de Equipo Supervisor:
                    </label>
                    <select
                      value={jefeId}
                      onChange={e => setJefeId(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-indigo-900"
                    >
                      <option value="">Ninguno (Notificaciones directas a CEO)</option>
                      {jefesDisponibles.map(j => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                    <p className="text-[8px] text-indigo-500/80 leading-none mt-1">Este operario enviará sus alertas de tardanza y spoofing al Jefe elegido.</p>
                  </div>
                )}

                {/* Telegram notifications setup for Team Leader role */}
                {(rol === 'jefe_equipo' || rol === 'ceo') && (
                  <div className="flex flex-col gap-1 bg-teal-50/50 p-2.5 rounded-2xl border border-teal-100">
                    <label className="text-[10px] font-mono font-black text-teal-950 uppercase flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                      ID de Telegram para Alertas:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 128471924"
                      value={telegramChatId}
                      onChange={e => setTelegramChatId(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-mono font-bold outline-none text-teal-900"
                    />
                    <p className="text-[8.5px] text-teal-600 leading-relaxed mt-1">
                      Si este usuario tiene asignado personal a cargo, recibirá en este ID los avisos de fraude o retrasos de su equipo.
                    </p>
                  </div>
                )}
              </div>

              {/* LOPD / RGPD MANDATORY BLOCKS (PERSONAL DATA) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-3.5 mt-2">
                <span className="text-[9px] font-black text-[#07474e] uppercase tracking-wider font-mono flex items-center gap-1">
                  🛡️ LOPD / Datos Personales Sensibles
                </span>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">DNI o NIE del trabajador:</label>
                  <input
                    type="text"
                    placeholder="Ej. 46382914K"
                    value={dni}
                    onChange={e => setDni(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5 leading-none">Se ocultará por defecto con máscara de astérescos.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">Fecha de Nacimiento:</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={e => setFechaNacimiento(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-500 uppercase">Dirección Domicilio Físico:</label>
                  <input
                    type="text"
                    placeholder="Carrer de Provença 194, Barcelona"
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 outline-none"
                  />
                </div>

                {/* Consent checkbox signature for geolocation track */}
                <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-gray-150">
                  <input
                    type="checkbox"
                    id="chk-rgpd-firmado"
                    checked={rgpdFirmado}
                    onChange={e => setRgpdFirmado(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chk-rgpd-firmado" className="text-[10px] text-gray-600 leading-snug font-medium select-none cursor-pointer">
                    <span className="font-extrabold text-slate-800">Consentimiento Firmado (Geovallas):</span> El operario ha rubricado el boletín formal para registrar su fichaje con geocercas activas.
                  </label>
                </div>
              </div>

              {/* Professional qualifications select component */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold text-gray-500 uppercase">Especialidades Profesionales:</label>
                <div className="flex flex-wrap gap-1">
                  {ESPECIALIDADES_LIST.map(esp => {
                    const active = especialidades.includes(esp);
                    return (
                      <button
                        type="button"
                        key={esp}
                        onClick={() => handleToggleEspecialidad(esp)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-500 text-white border border-teal-500'
                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {esp}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                className="w-full bg-[#07474e] hover:bg-[#093d43] text-white font-extrabold font-mono text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer mt-2"
              >
                {isAdding ? 'Crear Registro Seguro ✓' : 'Guardar Ficha en LOPD'}
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col gap-4 text-xs sticky top-24">
              <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 animate-pulse" />
                Guía LOPD de Operarios
              </span>

              <p className="text-gray-500 leading-normal text-[11px]">
                Desde este panel blindado, puedes administrar las credenciales de entrada y modificar los datos profesionales y personales.
              </p>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex flex-col gap-2 leading-relaxed text-[11.5px]">
                <p className="font-bold flex items-center gap-1 text-amber-950">
                  ⚠️ Importancia del Consentimiento
                </p>
                <p className="text-[10.5px] text-amber-800">
                  En España, no se pueden registrar coordenadas de georreferencia ni procesar datos sin firma previa del trabajador. Los operarios sin el "Consentimiento Firmado" activado se mostrarán con advertencias visuales en el sistema de fichajes.
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                <span className="text-[10px] uppercase text-gray-400 font-bold font-mono">Jerarquía de Alertas:</span>
                <p className="text-[10px] text-gray-505 leading-relaxed">
                  - 👑 <strong className="text-slate-800 font-bold">Fundador/CEO:</strong> Recibe alertas en vivo de todos los retrasos y spoofing a nivel global.
                </p>
                <p className="text-[10px] text-gray-550 leading-relaxed">
                  - 👥 <strong className="text-slate-800 font-bold">Jefes de Equipo:</strong> Reciben alertas exclusivamente de los operarios vinculados a su cargo.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
