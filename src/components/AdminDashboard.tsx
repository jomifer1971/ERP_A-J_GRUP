/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario } from '../types';
import { Users, FileText, CheckCircle, Clock, ShieldAlert, BadgeCheck } from 'lucide-react';

interface AdminDashboardProps {
  user: Usuario;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [pendingUsers, setPendingUsers] = useState([
    { id: 'u-5', nombre: 'Nuevo Empleado', email: 'nuevo@ajgrup.com', rol: 'operario' },
    { id: 'u-6', nombre: 'Pepe Subcontrata', email: 'pepe@ajgrup.com', rol: 'operario' }
  ]);

  const removeUser = (id: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">Panel de Administración</h2>
        <p className="text-sm text-[#64748b]">
          Bienvenido, {user.nombre}. Nivel de acceso: <span className="font-mono font-bold uppercase text-[#07474e] bg-teal-50 px-1.5 py-0.5 rounded">{user.rol.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quick Stats */}
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-[#07474e] rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-800">14</div>
            <div className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-wider">Partes Hoy</div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-[#f59e0b] rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-800">112</div>
            <div className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-wider">Horas Reg.</div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-800">4</div>
            <div className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-wider">Obras Activas</div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-amber-200 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 relative overflow-hidden">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-800">{pendingUsers.length}</div>
            <div className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-wider line-clamp-1 truncate">Ptes. Validar</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Validation Queue */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 md:p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[#0f172a] font-mono uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Validación de Usuarios
          </h3>
          <p className="text-xs text-gray-500">Usuarios nuevos que requieren validación manual por parte de gerencia o administración para acceder al sistema.</p>
          
          <div className="flex flex-col gap-3">
            {pendingUsers.length === 0 ? (
              <div className="py-8 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center">
                <BadgeCheck className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-xs text-gray-500 font-medium">No hay usuarios pendientes de validación.</p>
              </div>
            ) : (
              pendingUsers.map(u => (
                <div key={u.id} className="bg-gray-50 p-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{u.nombre}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{u.email} • {u.rol}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => removeUser(u.id)} className="flex-1 sm:flex-none px-4 py-2 bg-[#07474e] hover:bg-[#0b4e56] text-white text-xs font-bold rounded-xl transition-colors active:scale-95">Aprobar</button>
                    <button onClick={() => removeUser(u.id)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors active:scale-95">Rechazar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Recent Activity */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 md:p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[#0f172a] font-mono uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#07474e]" />
            Actividad Global Hoy
          </h3>
          <p className="text-xs text-gray-500">Últimos partes de trabajo centralizados.</p>
          
          <div className="flex flex-col gap-3">
             <div className="border border-gray-150 bg-gray-50/50 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-teal-50 text-[#07474e] text-[10px] font-bold rounded-lg truncate max-w-[200px]">Reforma Integral Duplex Mallorca</span>
                  <span className="text-[10px] font-bold font-mono text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-lg">8 h</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">Demolición y limpieza general.</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-150 pt-2.5 mt-1 font-mono">
                  <span>Juan Operario</span>
                  <span>Hace 30 min</span>
                </div>
             </div>
             
             <div className="border border-gray-150 bg-gray-50/50 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-teal-50 text-[#07474e] text-[10px] font-bold rounded-lg truncate max-w-[200px]">Pintura y Suelos Consultorio</span>
                  <span className="text-[10px] font-bold font-mono text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-lg">9.5 h</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">Alisado de paredes y remate de esquinas. Colocación de perfilería y placas de pladur.</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-150 pt-2.5 mt-1 font-mono">
                  <span>Carlos Jefe</span>
                  <span>Hace 2 h</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
