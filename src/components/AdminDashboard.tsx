/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  BadgeCheck, 
  Bell, 
  Smartphone, 
  MessageSquare, 
  AlertTriangle, 
  Send, 
  Sparkles,
  Check,
  ShieldCheck,
  SmartphoneNfc,
  Cog,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { enviarNotificacionReal, ConfigNotificaciones, DEFAULT_CONFIG_NOTIF } from '../utils/notificaciones';

interface AdminDashboardProps {
  user: Usuario;
}

interface AlertaNotificacion {
  id: string;
  tipo: 'RETRASO' | 'AUSENCIA';
  operario: string;
  telefono: string;
  mensaje: string;
  fecha_hora: string;
  obra: string;
  enviado_sms: boolean;
  enviado_telegram: boolean;
  leido: boolean;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [pendingUsers, setPendingUsers] = useState([
    { id: 'u-5', nombre: 'Alex Sola', email: 'alex.sola@ajgrupbcn.com', rol: 'operario' },
    { id: 'u-6', nombre: 'Marc Ruiz', email: 'marc.ruiz@ajgrupbcn.com', rol: 'operario' }
  ]);

  const [notifMargin, setNotifMargin] = useState<number>(15); // courteous margin in minutes
  const [channelSms, setChannelSms] = useState<boolean>(true);
  const [channelTelegram, setChannelTelegram] = useState<boolean>(true);

  // Load and save alerts from LocalStorage for seamless UX
  const [alertas, setAlertas] = useState<AlertaNotificacion[]>(() => {
    const saved = localStorage.getItem('aj_alertas_fichaje');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'al-1',
        tipo: 'RETRASO',
        operario: 'Jordi Vila',
        telefono: '+34 612 841 022',
        mensaje: 'Fichaje de Entrada demorado por 42 minutos. Hora de registro: 08:42 (Turno estándar comienza 08:00).',
        fecha_hora: new Date(Date.now() - 3600000 * 2).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        obra: 'Reforma Integral Duplex Mallorca',
        enviado_sms: true,
        enviado_telegram: true,
        leido: false
      },
      {
        id: 'al-2',
        tipo: 'AUSENCIA',
        operario: 'Juan Martínez',
        telefono: '+34 689 123 456',
        mensaje: 'Alerta por falta de fichaje. Plazo máximo de cortesía (15 min) superado sin registrar entrada programada en obra.',
        fecha_hora: new Date(Date.now() - 3600000 * 4).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        obra: 'Instalación Climatización Oficinas Gràcia',
        enviado_sms: true,
        enviado_telegram: true,
        leido: true
      }
    ];
  });

  // State for real-world notification dispatcher config
  const [configNotif, setConfigNotif] = useState<ConfigNotificaciones>(() => {
    const saved = localStorage.getItem('aj_config_notificaciones');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_CONFIG_NOTIF;
  });

  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    localStorage.setItem('aj_config_notificaciones', JSON.stringify(configNotif));
  }, [configNotif]);

  // Mobile simulator active notification display
  const [showActiveMobilePopup, setShowActiveMobilePopup] = useState<AlertaNotificacion | null>(null);

  useEffect(() => {
    localStorage.setItem('aj_alertas_fichaje', JSON.stringify(alertas));
  }, [alertas]);

  const removeUser = (id: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== id));
  };

  const markAllAsRead = () => {
    setAlertas(prev => prev.map(a => ({ ...a, leido: true })));
  };

  const deleteAlert = (id: string) => {
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  // Automated trigger simulators
  const triggerSimulation = async (type: 'RETRASO' | 'AUSENCIA') => {
    const randomOp = type === 'RETRASO' ? 'Juan Martínez' : 'Jordi Vila';
    const randomTel = type === 'RETRASO' ? '+34 689 123 456' : '+34 612 841 022';
    const randomObra = type === 'RETRASO' ? 'Instalación Eléctrica Nave Poblenou' : 'Pintura y Suelos Consultorio Médico';
    
    let msg = '';
    if (type === 'RETRASO') {
      const minutesLate = Math.floor(Math.random() * 35) + 20; // 20-55 min late
      const clockHour = `08:${minutesLate}`;
      msg = `Fichaje de Entrada tardío registrado a las ${clockHour} (Turno estipulado 08:00). Desviación de ${minutesLate} min sin justificación previa.`;
    } else {
      msg = `Ausencia de Fichaje: Jornada programada iniciada hace más de ${notifMargin} min. El operario aún no ha registrado presencia por GPS ni parte diario.`;
    }

    const newAl: AlertaNotificacion = {
      id: `al-${Date.now()}`,
      tipo: type,
      operario: randomOp,
      telefono: randomTel,
      mensaje: msg,
      fecha_hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      obra: randomObra,
      enviado_sms: channelSms,
      enviado_telegram: channelTelegram || configNotif.activo,
      leido: false
    };

    setAlertas(prev => [newAl, ...prev]);
    setShowActiveMobilePopup(newAl);

    // If real notification channel is toggled on, dispatch a live notification!
    if (configNotif.activo) {
      try {
        await enviarNotificacionReal(type, randomOp, msg, randomObra);
      } catch (err) {
        console.error('Error enviando notificación en vivo:', err);
      }
    }

    // Auto-dismiss the popup simulation after 8 seconds
    setTimeout(() => {
      setShowActiveMobilePopup(null);
    }, 8000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await enviarNotificacionReal(
        'PRUEBA',
        user.nombre,
        '¡Genial! Tu pasarela de alertas en tiempo real está correctamente configurada y vinculada a tu teléfono.',
        'Prueba de Sistemas A&J',
        true
      );
      if (res.success) {
        setTestResult({ success: true, text: `✓ Mensaje enviado correctamente: ${res.detalles || 'Pasarela activa'}` });
      } else {
        setTestResult({ success: false, text: `❌ Fallo: ${res.error || 'Causa desconocida'}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, text: `❌ Fallo técnico al contactar APIs: ${e.message || e}` });
    } finally {
      setIsTesting(false);
    }
  };

  const unreadCount = alertas.filter(a => !a.leido).length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Simulation Banner Overlay */}
      <AnimatePresence>
        {showActiveMobilePopup && (
          <motion.div 
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:w-[380px] bg-slate-900 border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl z-[100] text-white"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/25 flex items-center justify-center text-amber-400">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#99f6e4] font-bold">ALERTA DISPARADA SMS/PUSH</p>
                <p className="text-xs font-black truncate text-white">SIMULADOR MÓVIL DIRECTIVO</p>
              </div>
              <button 
                onClick={() => setShowActiveMobilePopup(null)} 
                className="text-gray-400 hover:text-white font-mono text-xs font-bold bg-slate-800 px-2 py-0.5 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{showActiveMobilePopup.tipo === 'RETRASO' ? 'Fichaje Tardío' : 'Falta de Fichaje'}</span>
              </div>
              <p className="text-[11px] text-gray-300 mt-1 leading-normal font-mono">
                &quot;A&amp;J Control: {showActiveMobilePopup.operario} {showActiveMobilePopup.tipo === 'RETRASO' ? 'llegó tarde' : 'no ha fichado todavía'} en {showActiveMobilePopup.obra}.&quot;
              </p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] text-gray-400 font-mono">
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold uppercase">SMS enviado ✓</span>
                <span className="bg-[#004e56]/30 text-teal-300 px-1.5 py-0.5 rounded-md font-bold uppercase">Telegram OK ✓</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">Panel de Administración</h2>
          <p className="text-sm text-[#64748b]">
            Bienvenido, {user.nombre}. Nivel de acceso: <span className="font-mono font-bold uppercase text-[#07474e] bg-teal-50 px-1.5 py-0.5 rounded">{user.rol.replace('_', ' ')}</span>
          </p>
        </div>

        {/* LOPD Warning badge */}
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs text-gray-500 max-w-sm">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="leading-snug">
            <strong>LOPD España:</strong> Monitoreo basado en eventos puntuales a la entrada/salida. Sin rastreo en tiempo real, conforme a la legislación laboral.
          </span>
        </div>
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

        {/* Dynamic pending alerts gauge */}
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${unreadCount > 0 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
            <Bell className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-850">{unreadCount}</div>
            <div className="text-[10px] md:text-xs text-red-600 font-bold font-mono uppercase tracking-wider">Demoras/Avisos</div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 relative overflow-hidden">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-gray-800">{pendingUsers.length}</div>
            <div className="text-[10px] md:text-xs text-gray-500 font-mono uppercase tracking-wider line-clamp-1 truncate">Ptes. Validar</div>
          </div>
        </div>
      </div>

      {/* CUSTOM SECTION: NOTIFICATIONS HUB & ALERT DISPATCH SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-1">
        
        {/* Left Column: Notification Alerts manager (lg:span-7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-gray-200 p-5 md:p-6 flex flex-col gap-4">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-[#0f172a] font-mono uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              Notificaciones de Ausencia / Retraso
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Marcar leídos
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Siempre que ocurra una demora o un abandono sin fichar, el sistema registra el evento y despacha una notificación de alerta al smartphone del **CEO/Gerente** y al **Jefe de Equipo asignado**.
          </p>

          <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
            {alertas.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center">
                <BadgeCheck className="w-10 h-10 text-emerald-450 mb-2" />
                <p className="text-xs text-gray-500 font-bold">Todo en orden. No hay alertas pendientes hoy.</p>
                <p className="text-[10px] text-gray-400 max-w-sm mt-1">Los operarios han fichado dentro de los límites estipulados.</p>
              </div>
            ) : (
              alertas.map(a => (
                <div 
                  key={a.id} 
                  className={`p-4 border rounded-2xl flex flex-col gap-2.5 transition-all relative overflow-hidden ${
                    a.leido ? 'bg-slate-25/50 border-slate-150' : 'bg-red-50/20 border-red-150 shadow-sm'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!a.leido && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" title="Nueva alerta sin leer" />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-black uppercase ${
                      a.tipo === 'RETRASO' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {a.tipo === 'RETRASO' ? '⚠️ Fichaje Tardío' : '🚨 Falta Fichaje'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{a.fecha_hora}</span>
                    <span className="text-[10px] text-gray-400 font-mono">• Obra: <strong>{a.obra}</strong></span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">
                    Operario: <strong className="text-gray-800">{a.operario}</strong> ({a.telefono})<br />
                    <span className="text-gray-600 italic mt-1 block font-mono bg-white p-1.5 rounded-lg border border-gray-100">{a.mensaje}</span>
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Check className="w-3 w-3" /> SMS CEO Enviado
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Check className="w-3 w-3" /> Telegram Jefe OK
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {!a.leido && (
                        <button 
                          onClick={() => {
                            setAlertas(prev => prev.map(al => al.id === a.id ? { ...al, leido: true } : al));
                          }}
                          className="hover:text-emerald-700 font-bold"
                        >
                          Marcar leído
                        </button>
                      )}
                      <button 
                        onClick={() => deleteAlert(a.id)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Interactive Simulators Controls (lg:span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* SIMULATE CONTROLLER PANEL CARD */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 border border-slate-800 flex flex-col gap-4">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Entorno Simulador de Campo
            </span>
            
            <h3 className="text-base font-black tracking-tight text-white leading-tight">Probar Alertas de Fichajes</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Utiliza los disparadores tácticos inferiores para simular retrasos en tiempo real y comprobar cómo repercute en los directivos.
            </p>

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                onClick={() => triggerSimulation('RETRASO')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-650 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Genera un fichaje tardío automatizado en tiempo de obra"
              >
                <Clock className="w-4 h-4 text-slate-950" />
                Simular Fichaje Tardío
              </button>

              <button
                onClick={() => triggerSimulation('AUSENCIA')}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Genera una alerta de ausencia habiendo superado la cortesía"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                Simular Ausencia de Entrada
              </button>
            </div>

            <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Parámetros del Despachador:</span>
              
              {/* Margin of tolerance input slider */}
              <div className="flex flex-col gap-1.5 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-350">
                  <span className="font-mono">Margen de Cortesía:</span>
                  <span className="font-bold text-[#99f6e4] font-mono">{notifMargin} minutos</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="45" 
                  step="5"
                  value={notifMargin} 
                  onChange={(e) => setNotifMargin(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[9px] text-slate-500 leading-normal">
                  Los avisos de incomparecencia se disparan si no entran tras {notifMargin} min del inicio de turno.
                </span>
              </div>

              {/* Channels checkboxes */}
              <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={channelSms} 
                    onChange={e => setChannelSms(e.target.checked)} 
                    className="rounded border-slate-800 text-emerald-500 focus:ring-transparent focus:ring-offset-0 bg-slate-850"
                  />
                  <span>Despacho SMS CEO</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={channelTelegram} 
                    onChange={e => setChannelTelegram(e.target.checked)} 
                    className="rounded border-slate-800 text-emerald-500 focus:ring-transparent focus:ring-offset-0 bg-slate-850"
                  />
                  <span>Canal Telegram Jefe</span>
                </label>
              </div>

            </div>
          </div>

          {/* REAL TELEGRAM AND WEBHOOK GATEWAY CONFIGURATION */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Cog className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                Pasarela de Alertas Móviles
              </span>
              
              {/* Green Single Switch Toggle Button based on user's preference in guidelines */}
              <button
                onClick={() => setConfigNotif(prev => ({ ...prev, activo: !prev.activo }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  configNotif.activo 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600' 
                    : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-150'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${configNotif.activo ? 'bg-white animate-ping' : 'bg-gray-300'}`} />
                {configNotif.activo ? 'Canal Activo ✓' : 'Inactivo'}
              </button>
            </div>

            <p className="text-[11px] text-gray-500 leading-normal">
              Vincula un Bot de Telegram gratuito para recibir alertas en tiempo real en tu móvil (CEO, Jefaturas). También soporta Webhooks universales de Zapier, Make o PowerAutomate.
            </p>

            <div className="flex flex-col gap-3">
              {/* Telegram config fields */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-150 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-[#07474e] uppercase tracking-wide flex items-center gap-1 font-mono">
                  📱 Canal Telegram (Gratuito e Instantáneo)
                </span>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-400 uppercase">Token del Bot de Telegram:</label>
                  <input
                    type="password"
                    placeholder="Ej. 12345678:ABCdef..."
                    value={configNotif.telegramToken}
                    onChange={e => setConfigNotif(prev => ({ ...prev, telegramToken: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[8px] text-gray-400 leading-none">Pídelo en Telegram a @BotFather iniciando un bot rápido de alertas.</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-400 uppercase">Chat ID del CEO o Grupo:</label>
                  <input
                    type="text"
                    placeholder="Ej. 987654321"
                    value={configNotif.telegramChatId}
                    onChange={e => setConfigNotif(prev => ({ ...prev, telegramChatId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[8px] text-gray-400 leading-none">Consigue tu ID enviando un chat al bot @userinfobot o @GetMyIdBot.</span>
                </div>
              </div>

              {/* Webhook URL config fields */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-150 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-[#07474e] uppercase tracking-wide flex items-center gap-1 font-mono">
                  🔗 Webhook Universal (Zapier, Make, Twilio)
                </span>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono font-bold text-gray-400 uppercase">URL de recepción POST:</label>
                  <input
                    type="text"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={configNotif.webhookUrl}
                    onChange={e => setConfigNotif(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <span className="text-[8px] text-gray-400 leading-none">Envía un JSON estructurado con el nombre del operario, obra y demora.</span>
                </div>
              </div>

              {/* Dynamic feedback banners */}
              {testResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <p className="font-semibold leading-relaxed font-mono whitespace-pre-line">{testResult.text}</p>
                </div>
              )}

              {/* Test Action Trigger buttons */}
              <button
                onClick={handleTestConnection}
                disabled={isTesting || (!configNotif.telegramToken && !configNotif.webhookUrl)}
                className={`w-full py-2.5 rounded-xl font-bold font-mono text-[10px] uppercase tracking-wider transition-colors active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                  isTesting 
                    ? 'bg-gray-150 text-gray-400 border border-gray-200' 
                    : (!configNotif.telegramToken && !configNotif.webhookUrl)
                      ? 'bg-gray-50 text-gray-300 border border-gray-200 cursor-not-allowed'
                      : 'bg-[#07474e] hover:bg-[#0b4e56] text-white shadow-sm'
                }`}
              >
                {isTesting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin"></div>
                    Enviando prueba al móvil...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Enviar Alerta de Prueba al Móvil
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ESCUDO ANTI-FRAUDE GPS CARD */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 flex flex-col gap-4 shadow-sm">
            <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
              Escudo Certificado Anti-Fraude GPS
            </span>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Sistema de blindaje inteligente que audita la señal entregada por el navegador del operario para certificar la veracidad de la ubicación y bloquear el "fichaje desde el sillón".
            </p>

            <div className="grid grid-cols-2 gap-3 mt-1 text-[10px]">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-150 flex flex-col gap-1">
                <span className="font-bold text-gray-800">📡 Ruido Satelital</span>
                <span className="text-gray-500 leading-snug">Deniega firmas con precisión fija artificial (e.g. 1.0m o exactamente 10m).</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-150 flex flex-col gap-1">
                <span className="font-bold text-gray-800">🚫 Bloqueo Emulaciones</span>
                <span className="text-gray-500 leading-snug">Restringe coordenadas por defecto de simuladores iOS/Android desactivados.</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-150 flex flex-col gap-1">
                <span className="font-bold text-gray-800">💻 WebDriver Audit</span>
                <span className="text-gray-500 leading-snug">Detecta proxies de pruebas o scripts automatizados de inyección GPS.</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-150 flex flex-col gap-1">
                <span className="font-bold text-gray-800">🌐 Consistencia IP</span>
                <span className="text-gray-500 leading-snug">Contingota la posición IP del operador contra los satélites declarados.</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
              <span className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-wider">Simulación de Ataque (Testing):</span>
              
              <button
                onClick={async () => {
                  const workerName = "Jordi Vila";
                  const mockObra = "Reforma Integral Duplex Mallorca";
                  const mockReasons = ["Coordenadas de Simulador de Desarrollo (Apple Cupertino)", "Entorno automatizado detectado"];
                  
                  const alertMsg = `⚠️ ADVERTENCIA DE SEGURIDAD: Se ha bloqueado un intento de fichaje simulado por GPS. Razones: ${mockReasons.join(' | ')}`;
                  
                  const newSpoofAlert = {
                    id: `sec-sim-${Date.now()}`,
                    tipo: 'AUSENCIA' as any,
                    operario: workerName,
                    telefono: '+34 612 841 022',
                    mensaje: alertMsg,
                    fecha_hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    obra: mockObra,
                    enviado_sms: true,
                    enviado_telegram: configNotif.activo,
                    leido: false
                  };

                  setAlertas(prev => [newSpoofAlert, ...prev]);
                  
                  const pushAl: AlertaNotificacion = {
                    id: `sec-sim-${Date.now()}`,
                    tipo: 'AUSENCIA',
                    operario: workerName,
                    telefono: '+34 612 841 022',
                    mensaje: `Intento de Spoofing GPS Bloqueado. Discrepancia del sensor detectada en la obra ${mockObra}.`,
                    fecha_hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    obra: mockObra,
                    enviado_sms: true,
                    enviado_telegram: true,
                    leido: false
                  };
                  setShowActiveMobilePopup(pushAl);

                  if (configNotif.activo) {
                    try {
                      await enviarNotificacionReal(
                        'AUSENCIA',
                        workerName,
                        `⚠️ ALARMA ANTI-FRAUDE: ¡Se ha intentado engañar al GPS! El operario intentó registrar un fichaje con ubicación simulada o falseada (Fake GPS/Simulador) en la obra ${mockObra}. Intento bloqueado de forma segura.`,
                        mockObra
                      );
                    } catch (e) {}
                  }

                  setTimeout(() => {
                    setShowActiveMobilePopup(null);
                  }, 8000);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-700 animate-bounce" />
                Simular Ataque Spoofing GPS Bloqueado
              </button>
            </div>
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
                    <button onClick={() => removeUser(u.id)} className="flex-1 sm:flex-none px-4 py-2 bg-[#07474e] hover:bg-[#0b4e56] text-white text-xs font-bold rounded-xl transition-colors active:scale-95 cursor-pointer">Aprobar</button>
                    <button onClick={() => removeUser(u.id)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors active:scale-95 cursor-pointer">Rechazar</button>
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
                  <span className="px-2.5 py-1 bg-[#07474e]/5 text-[#07474e] text-[10px] font-bold rounded-lg truncate max-w-[200px]">Reforma Integral Duplex Mallorca</span>
                  <span className="text-[10px] font-bold font-mono text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-lg">8 h</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">Demolición y limpieza general de tabiquería pesada.</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-150 pt-2.5 mt-1 font-mono">
                  <span>Juan Martínez</span>
                  <span>Hace 30 min</span>
                </div>
             </div>
             
             <div className="border border-gray-150 bg-gray-50/50 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-[#07474e]/5 text-[#07474e] text-[10px] font-bold rounded-lg truncate max-w-[200px]">Pintura y Suelos Consultorio</span>
                  <span className="text-[10px] font-bold font-mono text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-lg">9.5 h</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">Alisado de paredes y remate de esquinas. Colocación de perfilería y acabados.</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-150 pt-2.5 mt-1 font-mono">
                  <span>Jordi Vila</span>
                  <span>Hace 2 h</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
