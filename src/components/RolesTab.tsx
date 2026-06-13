/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { Shield, ShieldAlert, ShieldCheck, UserPlus, Trash2, Key, Check, X, RefreshCw, Lock, Unlock } from 'lucide-react';

const ESPECIALIDADES_OPCIONES = [
  { id: 'paleta', nombre: '🧱 Paleta' },
  { id: 'pintor', nombre: '🖌️ Pintor' },
  { id: 'electricista', nombre: '⚡ Electricista' },
  { id: 'fontanero', nombre: '🚰 Fontanero' },
];

interface RolesTabProps {
  user: Usuario;
}

export default function RolesTab({ user }: RolesTabProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTelefono, setNewUserTelefono] = useState('');
  const [newUserRol, setNewUserRol] = useState<'ceo' | 'admin' | 'jefe_equipo' | 'operario'>('operario');
  const [newUserEspecialidades, setNewUserEspecialidades] = useState<string[]>([]);
  const [newUserJefeId, setNewUserJefeId] = useState<string>('');
  const [editingUserSpecialties, setEditingUserSpecialties] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Hydrate local users database
  useEffect(() => {
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
              telefono: dbU.telefono
            }));
            setUsuarios(mapped);
            localStorage.setItem('aj_users_v2', JSON.stringify(mapped));
            loaded = true;
          }
        } catch (err) {
          console.warn('No se pudo cargar desde Supabase:', err);
        }
      }
      
      if (!loaded) {
        const saved = localStorage.getItem('aj_users_v2');
        if (saved) {
          try {
            setUsuarios(JSON.parse(saved));
          } catch {
            initializeDefaultUsers();
          }
        } else {
          initializeDefaultUsers();
        }
      }
    };
    loadUsers();
  }, []);

  const initializeDefaultUsers = () => {
    const defaults: Usuario[] = [
      { id: 'u-1', nombre: 'Javier Domínguez', email: 'ceo@ajgrup.com', rol: 'ceo', validado: true, especialidades: ['electricista', 'fontanero'], telefono: '+34 601 234 567' },
      { id: 'u-2', nombre: 'Admin Master', email: 'admin@ajgrup.com', rol: 'admin', validado: true, especialidades: ['electricista'], telefono: '+34 602 345 678' },
      { id: 'u-3', nombre: 'Carlos Jefe', email: 'jefe@ajgrup.com', rol: 'jefe_equipo', validado: true, especialidades: ['paleta', 'fontanero'], telefono: '+34 603 456 789' },
      { id: 'u-4', nombre: 'Juan Operario', email: 'juan@ajgrup.com', rol: 'operario', validado: true, especialidades: ['paleta'], jefeId: 'u-3', telefono: '+34 604 567 890' },
      { id: 'u-5', nombre: 'Nuevo Empleado', email: 'nuevo@ajgrup.com', rol: 'operario', validado: false, especialidades: ['pintor'], telefono: '+34 605 678 901' },
    ];
    setUsuarios(defaults);
    localStorage.setItem('aj_users_v2', JSON.stringify(defaults));
  };

  const saveToStorage = async (updated: Usuario[]) => {
    setUsuarios(updated);
    localStorage.setItem('aj_users_v2', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        const formattedUsers = updated.map(u => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          validado: u.validado,
          especialidades: u.especialidades || [],
          jefe_id: u.jefeId || null,
          telefono: u.telefono || null
        }));
        await supabase.from('usuarios').upsert(formattedUsers);
      } catch (err) {
        console.warn('Omitido guardar en Supabase (tabla no sinc aún):', err);
      }
    }
  };

  // Shield: Approve / Block user immediately
  const handleToggleValidation = (userId: string) => {
    // A CEO cannot block themselves
    if (userId === 'u-1' && user.id === 'u-1') {
      showError('No puedes bloquear tu propia cuenta de fundador/CEO.');
      return;
    }

    const updated = usuarios.map(u => {
      if (u.id === userId) {
        const nextState = !u.validado;
        // If we are blocking the currently logged-in user in another tab, they'd be kicked out on reload
        return { ...u, validado: nextState };
      }
      return u;
    });

    saveToStorage(updated);
    showSuccess('Estado de seguridad del usuario modificado con éxito.');
  };

  // Change user access role
  const handleChangeRole = (userId: string, targetRol: 'ceo' | 'admin' | 'jefe_equipo' | 'operario') => {
    if (userId === 'u-1') {
      showError('El rol principal del fundador/CEO no puede ser cambiado.');
      return;
    }

    const updated = usuarios.map(u => {
      if (u.id === userId) {
        return { ...u, rol: targetRol };
      }
      return u;
    });

    saveToStorage(updated);
    showSuccess('Rol y privilegios actualizados.');
  };

  const handleToggleSpecialty = (userId: string, specialtyId: string) => {
    const updated = usuarios.map(u => {
      if (u.id === userId) {
        const current = u.especialidades || [];
        const next = current.includes(specialtyId)
          ? current.filter(id => id !== specialtyId)
          : [...current, specialtyId];
        return { ...u, especialidades: next };
      }
      return u;
    });
    saveToStorage(updated);
  };

  const handleAssignJefe = (userId: string, jefeId: string) => {
    const updated = usuarios.map(u => {
      if (u.id === userId) {
        return { ...u, jefeId: jefeId || undefined };
      }
      return u;
    });
    saveToStorage(updated);
    showSuccess('Jefe de equipo asignado al operario con éxito.');
  };

  // Add new corporate employee manually
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newUserNombre.trim() || !newUserEmail.trim()) {
      setErrorMsg('Completa todos los campos obligatorios.');
      return;
    }

    const cleanEmail = newUserEmail.trim().toLowerCase();
    
    // Check duplication
    if (usuarios.some(u => u.email.toLowerCase() === cleanEmail)) {
      setErrorMsg('Este correo electrónico ya está registrado en la empresa.');
      return;
    }

    const newUser: Usuario = {
      id: `u-${Date.now()}`,
      nombre: newUserNombre.trim(),
      email: cleanEmail,
      rol: newUserRol,
      validado: true, // Pre-approved by admin
      especialidades: newUserEspecialidades,
      jefeId: newUserRol === 'operario' && newUserJefeId ? newUserJefeId : undefined,
      telefono: newUserTelefono.trim() || undefined
    };

    const updated = [...usuarios, newUser];
    saveToStorage(updated);
    
    setNewUserNombre('');
    setNewUserEmail('');
    setNewUserTelefono('');
    setNewUserRol('operario');
    setNewUserEspecialidades([]);
    setNewUserJefeId('');
    setIsAdding(false);
    showSuccess(`Usuario ${newUser.nombre} registrado con éxito y pre-validado.`);
  };

  // Delete worker node
  const handleDeleteUser = async (userId: string) => {
    if (userId === 'u-1' || userId === 'u-2') {
      showError('Las cuentas maestras de sistema (CEO y Admin principal) están blindadas contra borrados.');
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente a este usuario? Perderá todo acceso al instante.')) {
      const updated = usuarios.filter(u => u.id !== userId);
      await saveToStorage(updated);
      
      if (isSupabaseConfigured) {
        try {
          await supabase.from('usuarios').delete().eq('id', userId);
        } catch (err) {
          console.warn('Error delete de usuario Supabase:', err);
        }
      }
      showSuccess('Usuario eliminado permanentemente del sistema.');
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="roles_tab_panel" className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-200/80 flex flex-col gap-6">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Blindaje y Roles de Acceso</h2>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mt-0.5">Control de Privilegios Corporativos</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-2xl">
            Desde este panel de seguridad puedes aprobar inmediatamente los nuevos registros de personal, denegar accesos no autorizados mediante bloqueo instantáneo y configurar los roles de la plantilla de obras.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all self-start md:self-center"
        >
          <UserPlus className="w-4 h-4" />
          {isAdding ? 'CANCELAR' : 'Añadir Empleado'}
        </button>
      </div>

      {/* Info Banners */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-pulse">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-amber-50 border border-amber-150 text-amber-900 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add New User Panel Accordion */}
      {isAdding && (
        <form onSubmit={handleCreateUser} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 flex flex-col gap-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Nombre Completo</label>
              <input 
                type="text" 
                value={newUserNombre}
                onChange={e => setNewUserNombre(e.target.value)}
                placeholder="Ej. Pedro Picapiedra"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-slate-400"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Email Corporativo</label>
              <input 
                type="email" 
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="pedro@ajgrup.com"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-slate-400"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Móvil / Contacto</label>
              <input 
                type="text" 
                value={newUserTelefono}
                onChange={e => setNewUserTelefono(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Rol Organizativo</label>
              <select
                value={newUserRol}
                onChange={e => setNewUserRol(e.target.value as any)}
                className="w-full px-2.5 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none focus:border-slate-405"
              >
                <option value="operario">👨‍🔧 OPERARIO</option>
                <option value="jefe_equipo">👷 JEFE DE EQUIPO</option>
                <option value="admin">💻 ADMINISTRADOR</option>
                <option value="ceo">👑 CEO / GERENTE</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Jefe Asignado</label>
              <select
                value={newUserJefeId}
                onChange={e => setNewUserJefeId(e.target.value)}
                disabled={newUserRol !== 'operario'}
                className="w-full px-2.5 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-bold text-gray-700 font-mono focus:outline-none focus:border-slate-400 disabled:opacity-50"
              >
                <option value="">-- Sin Jefe --</option>
                {usuarios.filter(lead => lead.rol === 'jefe_equipo').map(lead => (
                  <option key={lead.id} value={lead.id}>
                    👷 {lead.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Specialties multi-select pills panel */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/60 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
              🛠️ Especialidades / Oficios (Asigna más de uno):
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              {ESPECIALIDADES_OPCIONES.map((opt) => {
                const isSelected = newUserEspecialidades.includes(opt.id);
                return (
                  <label 
                    key={opt.id} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-mono font-bold text-xs ${
                      isSelected
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-3xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setNewUserEspecialidades(newUserEspecialidades.filter(id => id !== opt.id));
                        } else {
                          setNewUserEspecialidades([...newUserEspecialidades, opt.id]);
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{opt.nombre}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <button 
              type="submit"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-xs"
            >
              Guardar Nuevo Empleado
            </button>
          </div>
        </form>
      )}

      {/* Main Table Content */}
      <div className="flex flex-col gap-4">
        {/* Search tool */}
        <div className="flex items-center gap-3 bg-[#f8fafc] border border-gray-200 rounded-2xl px-3.5 py-1.5 max-w-md self-start w-full">
          <Key className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nombre, correo o tipo de rol..."
            className="w-full bg-transparent border-none outline-none text-xs font-medium text-gray-800 placeholder-gray-400 py-1"
          />
        </div>

        {/* User Nodes responsive list */}
        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-gray-200">
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider">Empleado</th>
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider">Rol de Acceso</th>
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider">Especialidades (Oficios)</th>
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider">Jefe de Equipo (Fichaje)</th>
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider">Blindaje / Estado</th>
                <th className="p-4 text-[10px] font-black font-mono uppercase text-gray-400 tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsuarios.map((u) => {
                const isMaestro = u.email === 'ceo@ajgrup.com' || u.email === 'admin@ajgrup.com';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* User profile */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black font-mono border ${
                          u.validado 
                            ? 'bg-slate-50 text-slate-805 border-slate-200' 
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {u.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-gray-800">{u.nombre}</div>
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">{u.email}</div>
                          {u.telefono && (
                            <div className="text-[9px] font-mono font-bold text-slate-800 mt-1 bg-slate-50 px-1.5 py-0.5 rounded inline-block">📞 {u.telefono}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="p-4">
                      {isMaestro ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono bg-slate-800 text-white uppercase border border-slate-800 shadow-xs">
                          {u.rol === 'ceo' ? '👑 FUNDADOR / CEO' : '⚙️ ADMIN MAESTRO'}
                        </span>
                      ) : (
                        <select
                           value={u.rol}
                           onChange={(e) => handleChangeRole(u.id, e.target.value as any)}
                           className="px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold font-mono text-slate-800 bg-white outline-none focus:ring-1 focus:ring-slate-100"
                        >
                          <option value="operario">👨‍🔧 OPERARIO</option>
                          <option value="jefe_equipo">👷 JEFE DE EQUIPO</option>
                          <option value="admin">💻 ADMINISTRADOR</option>
                          <option value="ceo">👑 CEO / GERENTE</option>
                        </select>
                      )}
                    </td>

                    {/* Specialties Multi-selection inline editor column */}
                    <td className="p-4 relative">
                      {editingUserSpecialties === u.id ? (
                        <div className="absolute z-50 bg-white border border-gray-200 rounded-2xl p-3 shadow-xl flex flex-col gap-2 min-w-[180px] animate-fadeIn left-4 top-2">
                          <div className="text-[9px] font-extrabold text-gray-400 font-mono uppercase tracking-wider flex items-center justify-between border-b pb-1.5">
                            <span>Oficios de {u.nombre.split(' ')[0]}</span>
                            <button 
                              type="button" 
                              onClick={() => setEditingUserSpecialties(null)} 
                              className="text-xs font-black text-gray-500 hover:text-gray-900 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
                            {ESPECIALIDADES_OPCIONES.map((opt) => {
                              const hasOpt = (u.especialidades || []).includes(opt.id);
                              return (
                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1.5 hover:bg-slate-50 rounded-lg text-xs font-mono font-bold text-gray-700">
                                  <input 
                                    type="checkbox" 
                                    checked={hasOpt} 
                                    onChange={() => handleToggleSpecialty(u.id, opt.id)}
                                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span>{opt.nombre}</span>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingUserSpecialties(null)}
                            className="mt-1 bg-slate-800 hover:bg-slate-700 text-white text-[9px] py-1.5 px-2 rounded-lg font-black font-mono uppercase tracking-wider transition-all text-center cursor-pointer"
                          >
                            Listo
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center max-w-[260px]">
                          {(u.especialidades || []).length > 0 ? (
                            (u.especialidades || []).map(specId => {
                              const opt = ESPECIALIDADES_OPCIONES.find(o => o.id === specId);
                              return (
                                <span key={specId} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                  {opt?.nombre || specId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] italic text-gray-400 font-mono">Sin especialidad</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingUserSpecialties(u.id)}
                            className="ml-1.5 text-[9px] text-slate-800 hover:text-slate-700 font-bold underline font-mono cursor-pointer shrink-0"
                          >
                            (Editar)
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Team Lead Column */}
                    <td className="p-4">
                      {u.rol === 'operario' ? (
                        <select
                          value={u.jefeId || ''}
                          onChange={(e) => handleAssignJefe(u.id, e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-[10px] font-semibold font-mono text-gray-700 bg-white outline-none focus:ring-1 focus:ring-amber-100 w-full max-w-[140px] truncate"
                        >
                          <option value="">-- Sin asignar --</option>
                          {usuarios.filter(lead => lead.rol === 'jefe_equipo').map(lead => (
                            <option key={lead.id} value={lead.id}>
                              👷 {lead.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono italic">No aplica</span>
                      )}
                    </td>

                    {/* Status Approval with visual locker */}
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleValidation(u.id)}
                        disabled={isMaestro}
                        className={`flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-black font-mono tracking-wide transition-all shadow-2xs ${
                          u.validado
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 disabled:hover:bg-emerald-50'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {u.validado ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                            ACTIVO (APROBADO)
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            BLOQUEADO / PENDIENTE
                          </>
                        )}
                      </button>
                    </td>

                    {/* Delete item */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={isMaestro}
                        className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Eliminar usuario permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-gray-400 font-mono">
                    No se encontraron usuarios con ese criterio ...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety instructions card */}
      <div className="bg-rose-50/30 border border-semibold border-rose-100/60 p-4 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div className="text-xs text-rose-950 font-medium">
          <strong className="block font-extrabold uppercase font-mono tracking-wide text-rose-800 mb-1">🛡️ Sistema de Blindaje Activo</strong>
          Las cuentas bloqueadas reciben un mensaje denegando el inicio de sesión de forma proactiva. Las contraseñas temporales para nuevos usuarios son siempre <span className="font-bold underline">123456</span> por defecto corporativo. El CEO y el Administrador principal están protegidos contra auto-bloqueos involuntarios para asegurar que nunca te quedes fuera de tu propio portal de obras.
        </div>
      </div>

    </div>
  );
}
