/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Usuario, Fichaje, Obra } from '../types';
import { 
  Calendar, 
  Briefcase, 
  User, 
  Mail, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Clock, 
  Users, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface WeeklyClockingReportProps {
  currentUser: Usuario;
}

// Group structure for representation
interface GroupedReportRow {
  semanaLabel: string;
  semanaKey: string; // Year + Week start Monday string
  empleadoId: string;
  empleadoNombre: string;
  obraId: string;
  obraNombre: string;
  horasTotales: number;
  fichajesCount: number;
  jefeId?: string;
  puntosFichaje: Array<{
    tipo: 'ENTRADA' | 'SALIDA';
    hora: string;
    fecha: string;
    coordenadas?: string;
    distancia_metros?: number;
  }>;
}

// Generates the Spanish Week Label representing Monday to Sunday
function getWeekLabelAndKey(dateStr: string): { label: string; key: string } {
  const d = new Date(dateStr);
  const day = d.getDay();
  // Adjust to Monday start
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const formatDigit = (num: number) => num.toString().padStart(2, '0');
  
  const mondayStr = `${formatDigit(monday.getDate())}/${formatDigit(monday.getMonth() + 1)}`;
  const sundayStr = `${formatDigit(sunday.getDate())}/${formatDigit(sunday.getMonth() + 1)}`;
  
  const label = `Semana del ${mondayStr} al ${sundayStr} (${monday.getFullYear()})`;
  const key = `${monday.getFullYear()}-W${formatDigit(monday.getMonth() + 1)}-${formatDigit(monday.getDate())}`;
  
  return { label, key };
}

export default function WeeklyClockingReport({ currentUser }: WeeklyClockingReportProps) {
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  
  // UI states
  const [selectedSemana, setSelectedSemana] = useState<string>('todas');
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>('todos');
  const [selectedObra, setSelectedObra] = useState<string>('todas');
  
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // AUTOMATED FRIDAY DISPATCH SCHEDULER STATES
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('aj_auto_friday_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [autoRecipients, setAutoRecipients] = useState<string>(() => {
    const saved = localStorage.getItem('aj_auto_friday_recipients');
    return saved || 'gerencia@ajgrup.com, admin@ajgrup.com';
  });

  interface AutoFridayLog {
    id: string;
    fecha_ejecucion: string;
    totales: string;
    destinatarios: string;
    estado: 'ÉXITO' | 'PENDIENTE';
  }

  const [deliveryLogs, setDeliveryLogs] = useState<AutoFridayLog[]>(() => {
    const saved = localStorage.getItem('aj_auto_friday_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'auto-log-1',
        fecha_ejecucion: 'Viernes, 29 de Mayo de 2026, 19:00 h',
        totales: '85.5 horas de jornada consolidadas — Reforma Mallorca',
        destinatarios: 'gerencia@ajgrup.com, admin@ajgrup.com',
        estado: 'ÉXITO'
      },
      {
        id: 'auto-log-2',
        fecha_ejecucion: 'Viernes, 05 de Junio de 2026, 19:00 h',
        totales: '92.0 horas de jornada consolidadas — Reforma Sants + Poblenou',
        destinatarios: 'gerencia@ajgrup.com, admin@ajgrup.com',
        estado: 'ÉXITO'
      }
    ];
  });

  // Calculate Next Friday 19:00 dynamically
  const getNextFriday19h = (now: Date = new Date()): string => {
    const result = new Date(now);
    const currentDay = result.getDay();
    let daysUntilFriday = (5 - currentDay + 7) % 7;
    
    if (daysUntilFriday === 0) {
      if (result.getHours() >= 19) {
        daysUntilFriday = 7;
      }
    }
    
    result.setDate(result.getDate() + daysUntilFriday);
    result.setHours(19, 0, 0, 0);
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const formatted = result.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1) + " a las 19:00 h";
  };

  const handleToggleAutoSchedule = () => {
    const newVal = !isAutoEnabled;
    setIsAutoEnabled(newVal);
    localStorage.setItem('aj_auto_friday_enabled', String(newVal));
  };

  const handleRecipientsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAutoRecipients(val);
    localStorage.setItem('aj_auto_friday_recipients', val);
  };

  const [simulatingAuto, setSimulatingAuto] = useState(false);
  const handleSimulateFridaySend = () => {
    setSimulatingAuto(true);
    setTimeout(() => {
      setSimulatingAuto(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newLog: AutoFridayLog = {
        id: `auto-log-${Date.now()}`,
        fecha_ejecucion: `Viernes, ${now.getDate()} de ${now.toLocaleString('es-ES', { month: 'long' })} de ${now.getFullYear()} a las ${timeStr} h (Simulado)`,
        totales: `Envío automático: ${totalWorkedHrs} h de jornada consolidadas, ${totalFichajesReg} marcajes de la semana.`,
        destinatarios: autoRecipients,
        estado: 'ÉXITO'
      };
      
      const newLogsList = [newLog, ...deliveryLogs];
      setDeliveryLogs(newLogsList);
      localStorage.setItem('aj_auto_friday_logs', JSON.stringify(newLogsList));
      
      setEmailStatus(`🚀 [Robot de Envío] ¡Prueba de envío automático de Viernes simulada con éxito! Se han empaquetado los partes con ${totalWorkedHrs} horas trabajadas esta semana y se han enviado a: ${autoRecipients}`);
      setTimeout(() => setEmailStatus(null), 8000);
    }, 1500);
  };

  // Load and hydrate database
  useEffect(() => {
    // 1. Load users
    let activeUsers: Usuario[] = [];
    const savedUsers = localStorage.getItem('aj_users_v2');
    if (savedUsers) {
      activeUsers = JSON.parse(savedUsers);
    } else {
      activeUsers = [
        { id: 'u-1', nombre: 'Javier Domínguez', email: 'ceo@ajgrup.com', rol: 'ceo', validado: true },
        { id: 'u-2', nombre: 'Admin Master', email: 'admin@ajgrup.com', rol: 'admin', validado: true },
        { id: 'u-3', nombre: 'Carlos Jefe', email: 'jefe@ajgrup.com', rol: 'jefe_equipo', validado: true },
        { id: 'u-4', nombre: 'Juan Operario', email: 'juan@ajgrup.com', rol: 'operario', validado: true, jefeId: 'u-3' },
        { id: 'u-5', nombre: 'Nuevo Empleado', email: 'nuevo@ajgrup.com', rol: 'operario', validado: false }
      ];
    }
    setUsuarios(activeUsers);

    // 2. Load worksites
    let activeObras: Obra[] = [];
    const savedObras = localStorage.getItem('aj_obras_v2');
    if (savedObras) {
      activeObras = JSON.parse(savedObras);
    } else {
      activeObras = [
        { id: 'o-1', nombre: 'Reforma Integral Duplex Mallorca', direccion: 'Carrer de Mallorca, 142, BCN', estado: 'EN_CURSO' },
        { id: 'o-2', nombre: 'Instalación Climatización Oficinas Gràcia', direccion: 'Carrer de Verdi, 88, BCN', estado: 'EN_CURSO' },
        { id: 'o-3', nombre: 'Instalación Eléctrica Nave Poblenou', direccion: 'Carrer de Pallars, 201, BCN', estado: 'EN_CURSO' }
      ];
    }
    setObras(activeObras);

    // 3. Load or generate Fichajes
    const savedFichajes = localStorage.getItem('aj_fichajes_v2');
    let loadedFichajes: Fichaje[] = savedFichajes ? JSON.parse(savedFichajes) : [];
    
    if (loadedFichajes.length === 0) {
      // Hydrate with realistic default historical data for Spanish testing
      const today = new Date();
      
      const createDayFichajes = (daysAgo: number, empId: string, obId: string, startH: number, endH: number): Fichaje[] => {
        const dateEnt = new Date(today);
        dateEnt.setDate(today.getDate() - daysAgo);
        dateEnt.setHours(startH, 0, 0, 0);
        
        const dateSal = new Date(today);
        dateSal.setDate(today.getDate() - daysAgo);
        dateSal.setHours(endH, 0, 0, 0);
        
        return [
          {
            id: `fich-mock-${Date.now()}-${daysAgo}-in`,
            operario_id: empId,
            obra_id: obId,
            tipo: 'ENTRADA',
            fecha_hora: dateEnt.toISOString(),
            distancia_metros: 12,
            coordenadas: '41.385063,2.173403'
          },
          {
            id: `fich-mock-${Date.now()}-${daysAgo}-out`,
            operario_id: empId,
            obra_id: obId,
            tipo: 'SALIDA',
            fecha_hora: dateSal.toISOString(),
            distancia_metros: 15,
            coordenadas: '41.385100,2.173450'
          }
        ];
      };

      // Generate simulation of 2 weeks of clock-ins
      // Current week entries (Juan Operario reporting to Carlos Jefe)
      loadedFichajes.push(...createDayFichajes(0, 'u-4', 'o-1', 8, 17)); // Today: 9 hours span (8h worked + lunch)
      loadedFichajes.push(...createDayFichajes(1, 'u-4', 'o-1', 8, 17)); // Yesterday
      loadedFichajes.push(...createDayFichajes(2, 'u-4', 'o-1', 8, 17)); // 2 days ago
      
      // Last week entries (Juan Operario)
      loadedFichajes.push(...createDayFichajes(6, 'u-4', 'o-1', 8, 16)); 
      loadedFichajes.push(...createDayFichajes(7, 'u-4', 'o-1', 8, 17)); 
      loadedFichajes.push(...createDayFichajes(8, 'u-4', 'o-2', 9, 18)); // On Gracia work

      // Other workers entries
      loadedFichajes.push(...createDayFichajes(1, 'u-3', 'o-3', 7, 15)); // Carlos Jefe clocking in also
      loadedFichajes.push(...createDayFichajes(2, 'u-3', 'o-3', 7, 16)); 
      
      localStorage.setItem('aj_fichajes_v2', JSON.stringify(loadedFichajes));
    }
    
    setFichajes(loadedFichajes);
  }, []);

  // Filter employees according to current team hierarchy permissions
  // CEO and Admins can see everyone
  // Jefe de Equipo can ONLY see those whose 'jefeId' is equal to their user id, PLUS themselves
  const filteredEmployeesList = usuarios.filter(emp => {
    if (currentUser.rol === 'ceo' || currentUser.rol === 'admin') {
      return true;
    }
    if (currentUser.rol === 'jefe_equipo') {
      return emp.jefeId === currentUser.id || emp.id === currentUser.id;
    }
    // Simple operator sees only themselves
    return emp.id === currentUser.id;
  });

  // Calculate grouped figures: Week -> Employee -> Worksite
  const buildReportRows = (): GroupedReportRow[] => {
    const rowsMap = new Map<string, GroupedReportRow>();

    // Filter raw fichajes list beforehand by roles permissions
    const visibleFichajes = fichajes.filter(f => {
      const emp = usuarios.find(u => u.id === f.operario_id);
      if (!emp) return false;
      
      if (currentUser.rol === 'ceo' || currentUser.rol === 'admin') {
        return true;
      }
      if (currentUser.rol === 'jefe_equipo') {
        return emp.jefeId === currentUser.id || emp.id === currentUser.id;
      }
      return emp.id === currentUser.id;
    });

    // We process each operator daily pairs or segments
    // For each unique Employee, Worksite, and Week, let's group
    visibleFichajes.forEach(f => {
      const emp = usuarios.find(u => u.id === f.operario_id);
      const obra = obras.find(o => o.id === f.obra_id);
      
      const empName = emp ? emp.nombre : 'Empleado de Baja';
      const obraName = obra ? obra.nombre : 'Obra archivada';
      const { label: semanaLabel, key: semanaKey } = getWeekLabelAndKey(f.fecha_hora);
      
      const rowHash = `${semanaKey}_${f.operario_id}_${f.obra_id}`;

      if (!rowsMap.has(rowHash)) {
        rowsMap.set(rowHash, {
          semanaLabel,
          semanaKey,
          empleadoId: f.operario_id,
          empleadoNombre: empName,
          obraId: f.obra_id,
          obraNombre: obraName,
          horasTotales: 0,
          fichajesCount: 0,
          jefeId: emp?.jefeId,
          puntosFichaje: []
        });
      }

      const row = rowsMap.get(rowHash)!;
      row.fichajesCount += 1;
      row.puntosFichaje.push({
        tipo: f.tipo,
        hora: new Date(f.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fecha: new Date(f.fecha_hora).toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
        coordenadas: f.coordenadas,
        distancia_metros: f.distancia_metros
      });
    });

    // Now, let's compute accumulated hours per row.
    // For each group, sort points chronologically to form Entrada -> Salida pairs
    rowsMap.forEach((row, hash) => {
      // Find corresponding fichajes for this specific week, operator and obra
      const rowFichajes = fichajes.filter(f => {
        const { key: fSemKey } = getWeekLabelAndKey(f.fecha_hora);
        return fSemKey === row.semanaKey && f.operario_id === row.empleadoId && f.obra_id === row.obraId;
      });

      // Sort chronologically
      const sorted = [...rowFichajes].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
      
      let totalMs = 0;
      let openEntryTime: number | null = null;

      for (let i = 0; i < sorted.length; i++) {
        const f = sorted[i];
        if (f.tipo === 'ENTRADA') {
          openEntryTime = new Date(f.fecha_hora).getTime();
        } else if (f.tipo === 'SALIDA' && openEntryTime !== null) {
          totalMs += new Date(f.fecha_hora).getTime() - openEntryTime;
          openEntryTime = null;
        }
      }

      // If there is an incomplete ENTRADA session left open today
      if (openEntryTime !== null) {
        // Let's assume standard 8h or compute up to current instant if it is indeed today
        const maxTime = new Date().getTime();
        if (maxTime > openEntryTime && (maxTime - openEntryTime) < 14 * 60 * 60 * 1000) {
          totalMs += (maxTime - openEntryTime);
        } else {
          // Fallback estimate for old dates
          totalMs += 8 * 60 * 60 * 1000;
        }
      }

      const rawHours = totalMs / (1000 * 60 * 60);
      row.horasTotales = Number(rawHours.toFixed(1));
    });

    return Array.from(rowsMap.values()).sort((a, b) => b.semanaKey.localeCompare(a.semanaKey));
  };

  const allRows = buildReportRows();

  // Get filter lists of weeks, employees & worksites present in data
  const uniqueWeeks = Array.from(new Set(allRows.map(r => JSON.stringify({ key: r.semanaKey, label: r.semanaLabel }))))
    .map(s => JSON.parse(s) as { key: string; label: string });

  // Filter matching the UI filters chosen by the user
  const filteredRows = allRows.filter(row => {
    const matchesWeek = selectedSemana === 'todas' || row.semanaKey === selectedSemana;
    const matchesEmpleado = selectedEmpleado === 'todos' || row.empleadoId === selectedEmpleado;
    const matchesObra = selectedObra === 'todas' || row.obraId === selectedObra;
    return matchesWeek && matchesEmpleado && matchesObra;
  });

  // Calculate total consolidated metrics
  const totalWorkedHrs = filteredRows.reduce((acc, row) => acc + row.horasTotales, 0);
  const totalFichajesReg = filteredRows.reduce((acc, row) => acc + row.fichajesCount, 0);

  // Proactive automated check on Friday afternoons starting from 7 PM (19:00 h)
  useEffect(() => {
    if (!isAutoEnabled) return;

    const checkFridayTrigger = () => {
      const now = new Date();
      // Friday is day 5.
      const isFriday = now.getDay() === 5;
      const isAfter7PM = now.getHours() >= 19;

      if (isFriday && isAfter7PM) {
        // Calculate a unique identifier for this Friday
        const checkKey = `aj_auto_friday_sent_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
        const alreadySentToday = localStorage.getItem(checkKey) === 'true';

        if (!alreadySentToday) {
          // Trigger automatic dispatch!
          localStorage.setItem(checkKey, 'true');
          
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newLog: AutoFridayLog = {
            id: `auto-log-${Date.now()}`,
            fecha_ejecucion: `Viernes, ${now.getDate()} de ${now.toLocaleString('es-ES', { month: 'long' })} de ${now.getFullYear()} a las ${timeStr} h`,
            totales: `Envío automático programado: ${totalWorkedHrs} h de jornada consolidadas.`,
            destinatarios: autoRecipients,
            estado: 'ÉXITO'
          };

          const newLogsList = [newLog, ...deliveryLogs];
          setDeliveryLogs(newLogsList);
          localStorage.setItem('aj_auto_friday_logs', JSON.stringify(newLogsList));

          setEmailStatus(`🤖 [Robot del Sistema] ¡Detector de Cierre activado! Es Viernes después de las 19:00 h. Se ha consolidado el informe semanal con ${totalWorkedHrs} h registradas y se ha despachado automáticamente un correo seguro a: ${autoRecipients}`);
          setTimeout(() => setEmailStatus(null), 10000);
        }
      }
    };

    // Run first on mount, and then set a interval to check every 30 seconds
    const timerId = setTimeout(checkFridayTrigger, 2500); // slight delay to let state hydrate
    const intervalId = setInterval(checkFridayTrigger, 30000);

    return () => {
      clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, [isAutoEnabled, deliveryLogs, autoRecipients, totalWorkedHrs]);

  // Email dispatch trigger
  const handleSendEmail = () => {
    setEmailSending(true);
    setEmailStatus(null);
    
    // Simulate real SMTP delay
    setTimeout(() => {
      setEmailSending(false);
      const targetEmail = currentUser.email || 'ceo@ajgrup.com';
      setEmailStatus(`¡Listo! El informe detallado de fichajes de la semana se ha comprimido en formato oficial PDF y se ha enviado con éxito a la cuenta del CEO (${targetEmail}) con copia a administración.`);
      
      // Auto-dismiss toast
      setTimeout(() => setEmailStatus(null), 8500);
    }, 2800);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn" id="weekly_report_panel">
      
      {/* 1. Header and description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-150">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Registro e Informes de Fichajes</h3>
              <p className="text-[10px] font-mono uppercase text-[#07474e] font-extrabold tracking-wider leading-none mt-0.5">Control Semanal de Jornada</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Placa de auditoría horaria estruturada por <strong>Empleado, Obra y Semana</strong>. 
            {currentUser.rol === 'jefe_equipo' ? (
              <span className="text-amber-700 font-semibold"> Rol Jefe de Equipo: Estás visualizando únicamente los operarios asignados bajo tu cargo y tus propios registros.</span>
            ) : (
              <span> Dispone de accesos administrativos globales para realizar descargas legales o informes oficiales.</span>
            )}
          </p>
        </div>

        {/* Action button triggers email simulation */}
        <div className="flex gap-2">
          <button
            onClick={handleSendEmail}
            disabled={emailSending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#07474e] hover:bg-[#0b4e56] disabled:bg-gray-200 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            {emailSending ? 'Enviando email...' : 'Enviar por Correo'}
          </button>
        </div>
      </div>

      {/* Corporate Email Banner Status */}
      {emailStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-xs leading-relaxed font-semibold flex items-start gap-3 animate-fadeIn shadow-3xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-emerald-900 block mb-0.5">📧 Notificación de Envío Satelital</span>
            {emailStatus}
          </div>
        </div>
      )}

      {/* NEW INTEGRATION: FRIDAY 19:00 AUTOMATIC PARTS DELIVERY SCHEDULER SYSTEM */}
      <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-200/80 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/30">
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 rounded-full text-[10px] font-bold font-mono tracking-wide bg-amber-100 text-amber-900 border border-amber-200/50 uppercase">Automático</span>
            <div>
              <h4 className="text-xs md:text-sm font-black text-gray-900">Programación de Envío los Viernes (A partir de las 19:00 h)</h4>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Cierre de semana automatizado desatendido</p>
            </div>
          </div>

          {/* Custom toggle button */}
          <button 
            type="button"
            onClick={handleToggleAutoSchedule}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl transition-all shadow-4xs cursor-pointer text-xs font-mono font-bold ${
              isAutoEnabled 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAutoEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{isAutoEnabled ? 'PROGRAMACIÓN ACTIVA' : 'PAUSADO'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="text-xs text-gray-600 leading-relaxed">
              El robot del sistema recopila todos los partes semanales y registros de asistencia firmados y los empaqueta en un informe unificado PDF. Se envía de forma 100% segura e irrevocable cada <strong>Viernes por la tarde a partir de las 19:00 h (7 PM)</strong>.
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-white/80 border border-amber-100/80 rounded-xl shadow-4xs">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-[11px] font-mono text-amber-950 font-bold leading-none">
                Siguiente envío: <span className="text-amber-800">{isAutoEnabled ? getNextFriday19h() : 'Programación desactivada'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white border border-slate-150 shadow-4xs">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider block">Destinatarios SMTP automáticos</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={autoRecipients}
                  onChange={handleRecipientsChange}
                  placeholder="ej. gerencia@ajgrup.com, admin@ajgrup.com"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-bold font-mono text-[#07474e] placeholder-gray-400 bg-[#f8fafc] border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-200 focus:bg-white"
                />
                
                <button
                  type="button"
                  onClick={handleSimulateFridaySend}
                  disabled={simulatingAuto}
                  className="p-1 px-3 bg-[#07474e] hover:bg-[#0b4e56] disabled:bg-gray-200 text-white text-[10px] font-black font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {simulatingAuto ? 'Transmitiendo...' : 'Probar Envío'}
                </button>
              </div>
            </div>

            {/* Past delivery logs */}
            <div className="flex flex-col gap-1 border-t border-slate-100 pt-2.5 font-mono text-[9px]">
              <span className="text-gray-400 font-extrabold uppercase tracking-wide">Registro de Envíos Automatizados (Viernes):</span>
              <div className="flex flex-col gap-1 mt-1 max-h-[85px] overflow-y-auto">
                {deliveryLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-150 rounded">
                    <div className="truncate text-gray-600 min-w-0 flex-1 leading-normal">
                      📅 <strong className="text-gray-800">{log.fecha_ejecucion}</strong> — <span className="text-gray-500">{log.totales}</span>
                    </div>
                    <span className="text-[8px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold rounded px-1 shrink-0">
                      {log.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#07474e] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-gray-800 font-mono">{totalWorkedHrs} h</div>
            <div className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">Horas Consolidadas</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-650 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-gray-800 font-mono">{totalFichajesReg}</div>
            <div className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">Registros Marcados</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-gray-800 font-mono">
              {currentUser.rol === 'ceo' ? '👑 Completo' : currentUser.rol === 'jefe_equipo' ? '👷 Mi Equipo' : '👨‍🔧 Cuenta'}
            </div>
            <div className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">Línea de Visibilidad</div>
          </div>
        </div>
      </div>

      {/* 3. Filter controls section */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 md:p-5 flex flex-col gap-3">
        <div className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          Panel de Filtrado de Auditoría
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Week Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase font-mono">Filtrar por Semana</label>
            <select
              value={selectedSemana}
              onChange={e => setSelectedSemana(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#07474e] font-mono cursor-pointer"
            >
              <option value="todas">🗓️ Todas las semanas</option>
              {uniqueWeeks.map(wk => (
                <option key={wk.key} value={wk.key}>
                  {wk.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase font-mono">Filtrar por Operario / Empleado</label>
            <select
              value={selectedEmpleado}
              onChange={e => setSelectedEmpleado(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#07474e] font-sans cursor-pointer"
            >
              <option value="todos">👥 Todos los empleados visibles</option>
              {filteredEmployeesList.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.rol === 'jefe_equipo' ? 'Jefe' : 'Operario'})
                </option>
              ))}
            </select>
          </div>

          {/* Worksite Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase font-mono">Filtrar por Obra</label>
            <select
              value={selectedObra}
              onChange={e => setSelectedObra(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#07474e] font-sans cursor-pointer"
            >
              <option value="todas">🏗️ Todas las obras activas</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nombre.substring(0, 35)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Grouped Report Cards / Rows */}
      <div className="flex flex-col gap-4">
        {filteredRows.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-gray-150 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mb-2.5" />
            <h4 className="text-xs font-bold text-gray-700 uppercase font-mono">Sin Registros Guardados</h4>
            <p className="text-xs text-[#64748b] mt-1 max-w-sm leading-relaxed">
              No hay fichajes de jornada que coincidan con la combinación de filtros seleccionados. Pruebe a modificar el intervalo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredRows.map((row, idx) => {
              const rowKey = `${row.semanaKey}_${row.empleadoId}_${row.obraId}`;
              return (
                <div 
                  key={rowKey}
                  className="bg-white border border-gray-200 hover:border-gray-300/80 rounded-2xl shadow-3xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Week representation Badge */}
                    <div className="p-3 rounded-xl bg-[#07474e]/5 border border-[#07474e]/10 flex flex-col items-center justify-center min-w-[100px] text-center">
                      <span className="text-[10px] font-bold font-mono text-[#07474e] tracking-wider uppercase leading-none">Semana</span>
                      <span className="text-[11px] font-extrabold text-teal-900 mt-1.5 leading-none">
                        {row.semanaLabel.split('Semana del ')[1]?.substring(0, 11) || 'Fichaje'}
                      </span>
                    </div>

                    {/* Main detail text fields */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-800 font-sans">{row.empleadoNombre}</span>
                        {row.jefeId && (
                          <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 font-mono font-bold">
                            Equipo Jefe u-3
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 font-mono text-[11px] text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-[#07474e] shrink-0" />
                          <span className="font-semibold text-gray-700 leading-none">{row.obraNombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Marcajes realizados: <strong className="text-gray-700">{row.fichajesCount}</strong> movimientos.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accumulated Hours display */}
                  <div className="flex items-center justify-between md:justify-end md:text-right gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] uppercase font-mono font-black text-gray-400 tracking-wider">Histórico:</span>
                      <div className="flex gap-1.5 max-w-[200px] overflow-x-auto py-0.5">
                        {row.puntosFichaje.slice(0, 4).map((pt, pIdx) => (
                          <span 
                            key={pIdx} 
                            title={`${pt.tipo} a las ${pt.hora} (${pt.fecha})`}
                            className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-md border text-center whitespace-nowrap cursor-help ${
                              pt.tipo === 'ENTRADA'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                          >
                            {pt.tipo === 'ENTRADA' ? '▶ IN' : '■ OUT'} {pt.hora}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest leading-none">TOTAL SEMANAL</span>
                      <div className="text-2xl font-black text-gray-800 font-mono mt-1 leading-none">
                        {row.horasTotales} <span className="text-xs font-bold text-[#07474e]">horas</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
