/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, HardHat, FileCheck, Plus, Trash2, Check, Landmark, Users } from 'lucide-react';

interface Turno {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  diasLaborables: string[]; // ["Lunes", "Martes", ...]
  descripcion: string;
}

interface Festivo {
  id: string;
  fecha: string;
  descripcion: string;
}

export default function TurnosTab() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  
  // New Turno fields
  const [nombre, setNombre] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('17:00');
  const [diasSel, setDiasSel] = useState<string[]>(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
  const [descripcion, setDescripcion] = useState('');

  // New Festivo fields
  const [festivoFecha, setFestivoFecha] = useState('');
  const [festivoDesc, setFestivoDesc] = useState('');

  const [notif, setNotif] = useState('');

  // Initial Seed for work shifts and holidays to Catalan building framework
  useEffect(() => {
    const savedTurnos = localStorage.getItem('aj_turnos');
    const savedFestivos = localStorage.getItem('aj_festivos');

    if (savedTurnos) {
      try { setTurnos(JSON.parse(savedTurnos)); } catch {}
    } else {
      const defaultTurnos: Turno[] = [
        { id: 't-1', nombre: 'Turno Estándar de Obra (Partido)', horaInicio: '08:00', horaFin: '17:00', diasLaborables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], descripcion: 'Jornada estándar con corte de 1h para comer.' },
        { id: 't-2', nombre: 'Turno Intensivo de Verano', horaInicio: '07:00', horaFin: '15:00', diasLaborables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], descripcion: 'Evita las horas de extremo calor en cubiertas y fachadas.' },
        { id: 't-3', nombre: 'Turno Especial Sábados Urgentes', horaInicio: '08:00', horaFin: '14:00', diasLaborables: ['Sábado'], descripcion: 'Turnos extraordinarios autorizados para cierres de local.' }
      ];
      setTurnos(defaultTurnos);
      localStorage.setItem('aj_turnos', JSON.stringify(defaultTurnos));
    }

    if (savedFestivos) {
      try { setFestivos(JSON.parse(savedFestivos)); } catch {}
    } else {
      const defaultFestivos: Festivo[] = [
        { id: 'f-1', fecha: '2026-01-01', descripcion: 'Año Nuevo' },
        { id: 'f-2', fecha: '2026-04-03', descripcion: 'Viernes Santo' },
        { id: 'f-3', fecha: '2026-05-01', descripcion: 'Fiesta del Trabajo' },
        { id: 'f-4', fecha: '2026-06-24', descripcion: 'San Juan (Catalunya)' },
        { id: 'f-5', fecha: '2026-09-11', descripcion: 'Diada Nacional de Catalunya' },
        { id: 'f-6', fecha: '2026-12-25', descripcion: 'Navidad' }
      ];
      setFestivos(defaultFestivos);
      localStorage.setItem('aj_festivos', JSON.stringify(defaultFestivos));
    }
  }, []);

  const saveTurnos = (updated: Turno[]) => {
    setTurnos(updated);
    localStorage.setItem('aj_turnos', JSON.stringify(updated));
  };

  const saveFestivos = (updated: Festivo[]) => {
    setFestivos(updated);
    localStorage.setItem('aj_festivos', JSON.stringify(updated));
  };

  const handleAddTurno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const newTurno: Turno = {
      id: `t-${Date.now()}`,
      nombre: nombre.trim(),
      horaInicio,
      horaFin,
      diasLaborables: diasSel,
      descripcion: descripcion.trim() || 'Sin descripción adicional.'
    };

    const updated = [...turnos, newTurno];
    saveTurnos(updated);
    
    setNombre('');
    setDescripcion('');
    setDiasSel(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
    triggerNotif('Turno de trabajo creado correctamente.');
  };

  const handleDeleteTurno = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este turno de trabajo?')) {
      const updated = turnos.filter(t => t.id !== id);
      saveTurnos(updated);
      triggerNotif('Turno eliminado.');
    }
  };

  const handleAddFestivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivoFecha || !festivoDesc.trim()) return;

    const newFestivo: Festivo = {
      id: `f-${Date.now()}`,
      fecha: festivoFecha,
      descripcion: festivoDesc.trim()
    };

    const updated = [...festivos, newFestivo].sort((a,b) => a.fecha.localeCompare(b.fecha));
    saveFestivos(updated);

    setFestivoFecha('');
    setFestivoDesc('');
    triggerNotif('Festivo de calendario añadido.');
  };

  const handleDeleteFestivo = (id: string) => {
    const updated = festivos.filter(f => f.id !== id);
    saveFestivos(updated);
    triggerNotif('Festivo retirado.');
  };

  const toggleDia = (dia: string) => {
    if (diasSel.includes(dia)) {
      setDiasSel(prev => prev.filter(d => d !== dia));
    } else {
      setDiasSel(prev => [...prev, dia]);
    }
  };

  const triggerNotif = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(''), 3000);
  };

  const diasDeLaSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-200/80 shadow-sm flex flex-col gap-6">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-700">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Turnos y Horarios Oficiales</h2>
            <p className="text-xs text-gray-400 font-mono tracking-wider uppercase mt-0.5">Gestión de Calendario y Jornada Laboral</p>
          </div>
        </div>

        {notif && (
          <span className="px-3 py-1 text-[11px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 rounded-full animate-fade-in uppercase">
            ✓ {notif}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Turnos list & Creation (7 spans Grid) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black font-mono uppercase text-gray-800 tracking-wide flex items-center gap-1.5 label-section">
              <HardHat className="w-4 h-4 text-indigo-600" />
              Plantillas de Turnos Activos
            </h3>
            <p className="text-xs text-gray-400">Pre-configuraciones de horarios y días válidos sobre los que se puede fichar.</p>
          </div>

          <div className="flex flex-col gap-3">
            {turnos.map(t => (
              <div key={t.id} className="border border-indigo-100 bg-slate-50/55 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-extrabold text-sm text-gray-900">{t.nombre}</div>
                  <button
                    onClick={() => handleDeleteTurno(t.id)}
                    className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 leading-relaxed italic">{t.descripcion}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-50/.5 pt-2.5 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-bold font-mono text-gray-700 uppercase bg-white border px-2 py-0.5 rounded-md shadow-3xs">
                      {t.horaInicio} - {t.horaFin}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {diasDeLaSemana.map(d => {
                      const isWorkDay = t.diasLaborables.includes(d);
                      return (
                        <span 
                          key={d} 
                          className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                            isWorkDay 
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-150' 
                              : 'bg-gray-100/60 text-gray-400 line-through'
                          }`}
                        >
                          {d.substring(0, 2)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New Turno Form Expansion */}
          <form onSubmit={handleAddTurno} className="bg-[#f8fafc] border border-gray-200 rounded-3xl p-4 flex flex-col gap-4 mt-2">
            <span className="text-[10px] font-black font-mono uppercase text-[#07474e]">Crear Nueva Plantilla de Turno</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Nombre del Turno</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Intensivo de Invierno"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Descripción breve</label>
                <input 
                  type="text" 
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej. Aplicable a obras interiores"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Hora Inicio</label>
                <input 
                  type="time" 
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono text-[#07474e]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Hora Fin</label>
                <input 
                  type="time" 
                  value={horaFin}
                  onChange={e => setHoraFin(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono text-[#07474e]"
                  required
                />
              </div>
            </div>

            {/* Checkboxes of days selectable */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Días Laborables Planificados</label>
              <div className="flex flex-wrap gap-1.5">
                {diasDeLaSemana.map(d => {
                  const active = diasSel.includes(d);
                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDia(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        active 
                          ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-55'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" 
              className="py-2.5 bg-[#07474e] hover:bg-[#07474e]/90 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              Registrar Plantilla de Turno
            </button>
          </form>
        </div>

        {/* Right Column - Festivos Calendar & Insertion (5 spans Grid) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black font-mono uppercase text-gray-800 tracking-wide flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-rose-500" />
              Festivos Inhábiles ({festivos.length})
            </h3>
            <p className="text-xs text-gray-400">Días inhábiles nacionales o sectoriales del convenio de la construcción.</p>
          </div>

          <form onSubmit={handleAddFestivo} className="border border-gray-200 bg-[#fff] rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black font-mono uppercase text-rose-700">Añadir Festivo al Calendario</span>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Fecha Festivo</label>
              <input 
                type="date"
                value={festivoFecha}
                onChange={e => setFestivoFecha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs font-bold font-mono text-[#07474e]"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Motivo / Nombre Festivo</label>
              <input 
                type="text"
                value={festivoDesc}
                onChange={e => setFestivoDesc(e.target.value)}
                placeholder="Ej. Día de la Hispanidad"
                className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <button 
              type="submit"
              className="py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Inhábil
            </button>
          </form>

          {/* List of Festivos with timeline style */}
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
            {festivos.map(f => {
              // Format beautiful date
              const dateObj = new Date(f.fecha);
              const day = dateObj.getDate();
              const month = dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
              
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 bg-rose-50/20 border border-rose-100 rounded-xl px-3 py-2 transition-all hover:bg-rose-50/40">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-rose-200 text-rose-700 text-center rounded-lg px-2 py-1 flex flex-col shrink-0 min-w-[40px] items-center justify-center shadow-2xs">
                      <span className="text-[14px] font-black font-mono leading-none">{day}</span>
                      <span className="text-[8px] font-mono font-black mt-0.5 tracking-wider">{month}</span>
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-gray-800">{f.descripcion}</div>
                      <div className="text-[9px] font-mono text-gray-400 mt-0.5">{f.fecha}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteFestivo(f.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
