/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { Obra, Usuario, ParteTrabajo, Fichaje } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import WeeklyClockingReport from './WeeklyClockingReport';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Briefcase, 
  User, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Minus,
  Database,
  Wifi,
  WifiOff,
  ClipboardList,
  Shield,
  Locate,
  MapPin,
  LogIn,
  LogOut
} from 'lucide-react';

// Mock active works for fallback
const MOCK_OBRAS: Obra[] = [
  { id: 'o-1', nombre: 'Reforma Integral Duplex Mallorca', direccion: 'Carrer de Mallorca, 142, BCN', estado: 'EN_CURSO' },
  { id: 'o-2', nombre: 'Instalación Climatización Oficinas Gràcia', direccion: 'Carrer de Verdi, 88, BCN', estado: 'EN_CURSO' },
  { id: 'o-3', nombre: 'Instalación Eléctrica Nave Poblenou', direccion: 'Carrer de Pallars, 201, BCN', estado: 'EN_CURSO' },
  { id: 'o-4', nombre: 'Pintura y Suelos Consultorio Médico', direccion: 'Gran Via de les Corts Catalanes, 560, BCN', estado: 'EN_CURSO' }
];

// Mock workers for selection fallback (when no Supabase Session is active yet)
const MOCK_OPERARIOS: Usuario[] = [
  { id: 'op-1', nombre: 'Juan Martínez', email: 'juan@aygrupbcn.com', rol: 'operario', validado: true },
  { id: 'op-2', nombre: 'Jordi Vila', email: 'jordi@aygrupbcn.com', rol: 'operario', validado: true },
  { id: 'op-3', nombre: 'Andrés Gómez', email: 'andres@aygrupbcn.com', rol: 'jefe_equipo', validado: true }
];

// Popular pre-defined phrases for quick insertion on mobile
const QUICK_TASK_PHRASES = [
  'Demolición y desescombro de tabiquería.',
  'Colocación de perfilería y placas de pladur.',
  'Instalación de fontanería (tuberías multicapa).',
  'Tendido de cableado eléctrico y colocación de mecanismos.',
  'Pintura plástica lisa blanca lavable en salón y pasillo.',
  'Alisado de paredes y remate de esquinas.',
  'Colocación de tarima flotante AC5 con aislante.',
  'Limpieza general de escombros e inspección de obra.'
];

interface ParteDiarioFormProps {
  user?: Usuario | null;
}

function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

export default function ParteDiarioForm({ user }: ParteDiarioFormProps) {
  // Resolve activeSession user
  const activeUser = user || (() => {
    const saved = localStorage.getItem('aj_user_session');
    if (saved) {
      try {
        return JSON.parse(saved) as Usuario;
      } catch {
        return null;
      }
    }
    return null;
  })();

  // State for config status
  const [usingSimulatedData, setUsingSimulatedData] = useState(!isSupabaseConfigured);

  // Loaded DB entities
  const [obras, setObras] = useState<Obra[]>([]);
  const [operarios, setOperarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Form State
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [selectedOperarioId, setSelectedOperarioId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [horas, setHoras] = useState<number>(8); // Defaults to standard 8h shift
  const [descripcion, setDescripcion] = useState<string>('');
  const [materiales, setMateriales] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [formValidationErrors, setFormValidationErrors] = useState<{ [key: string]: string }>({});

  // Live digital clock logic for clocking in/out
  const [liveTime, setLiveTime] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Geovalla verification status states
  const [gpsChecking, setGpsChecking] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsVerifiedDistance, setGpsVerifiedDistance] = useState<number | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>('');

  // Local state to show successfully added reports (persistence across browser reload)
  const [partesHoy, setPartesHoy] = useState<ParteTrabajo[]>(() => {
    const saved = localStorage.getItem('aj_partes_hoy');
    return saved ? JSON.parse(saved) : [];
  });

  // Dual state for Fichajes, Partes vs. Informe Semanal
  const [activeSubTab, setActiveSubTab] = useState<'fichaje' | 'parte' | 'informe'>(() => {
    // If the active user is a CEO, we default them directly to the 'informe' tab since they don't need to clock in!
    const saved = localStorage.getItem('aj_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && u.rol === 'ceo') {
          return 'informe';
        }
      } catch {}
    }
    return 'fichaje';
  });
  
  // Local state for Fichajes (Clock in / Clock out)
  const [fichajes, setFichajes] = useState<Fichaje[]>(() => {
    const saved = localStorage.getItem('aj_fichajes_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // State for clocking notification
  const [fichajeSuccess, setFichajeSuccess] = useState<string | null>(null);

  // Sync Fichajes with localStorage
  useEffect(() => {
    localStorage.setItem('aj_fichajes_v2', JSON.stringify(fichajes));
  }, [fichajes]);

  // Load Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorStatus(null);

      if (!isSupabaseConfigured) {
        // Fallback directly to simulated data
        const savedObras = localStorage.getItem('aj_obras_v2');
        let currentObrasList = MOCK_OBRAS;
        if (savedObras) {
          try {
            currentObrasList = JSON.parse(savedObras);
          } catch {}
        } else {
          localStorage.setItem('aj_obras_v2', JSON.stringify(MOCK_OBRAS));
        }
        setObras(currentObrasList);
        setOperarios(MOCK_OPERARIOS);
        setSelectedOperarioId(MOCK_OPERARIOS[0].id);
        if (currentObrasList.length > 0) {
          setSelectedObraId(currentObrasList[0].id);
        }
        setUsingSimulatedData(true);
        setLoading(false);
        return;
      }

      try {
        // Attempt real load from Supabase
        const { data: dbObras, error: obrasErr } = await supabase
          .from('obras')
          .select('*')
          .eq('estado', 'EN_CURSO');

        let dbOperarios: Usuario[] = [];
        try {
          // Attempt loading operarios and team leads
          const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .in('rol', ['operario', 'jefe_equipo']);
          if (!error && data) dbOperarios = data;
        } catch {
          // Swallow subtable errors if user has slightly different structure
        }

        if (obrasErr) {
          throw new Error(obrasErr.message);
        }

        if (dbObras && dbObras.length > 0) {
          setObras(dbObras as Obra[]);
          setSelectedObraId(dbObras[0].id);
        } else {
          // No active obras returned, fallback to mock to make the UI testable
          const savedObras = localStorage.getItem('aj_obras_v2');
          let currentObrasList = MOCK_OBRAS;
          if (savedObras) {
            try { currentObrasList = JSON.parse(savedObras); } catch {}
          }
          setObras(currentObrasList);
          if (currentObrasList.length > 0) setSelectedObraId(currentObrasList[0].id);
        }

        if (dbOperarios && dbOperarios.length > 0) {
          setOperarios(dbOperarios);
          setSelectedOperarioId(dbOperarios[0].id);
        } else {
          setOperarios(MOCK_OPERARIOS);
          setSelectedOperarioId(MOCK_OPERARIOS[0].id);
        }

        setUsingSimulatedData(false);
      } catch (err: any) {
        console.warn('Fallo al conectar con Supabase, usando datos simulados:', err.message);
        setErrorStatus(err.message);
        setUsingSimulatedData(true);
        
        const savedObras = localStorage.getItem('aj_obras_v2');
        let currentObrasList = MOCK_OBRAS;
        if (savedObras) {
          try { currentObrasList = JSON.parse(savedObras); } catch {}
        }
        setObras(currentObrasList);
        if (currentObrasList.length > 0) setSelectedObraId(currentObrasList[0].id);
        
        setOperarios(MOCK_OPERARIOS);
        setSelectedOperarioId(MOCK_OPERARIOS[0].id);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Save local reports list helper
  useEffect(() => {
    localStorage.setItem('aj_partes_hoy', JSON.stringify(partesHoy));
  }, [partesHoy]);

  // Pre-select operario if activeSession matches
  useEffect(() => {
    if (activeUser && operarios.length > 0) {
      const found = operarios.find(o => 
        o.email.toLowerCase() === activeUser.email.toLowerCase() ||
        o.nombre.toLowerCase() === activeUser.nombre.toLowerCase()
      );
      if (found) {
        setSelectedOperarioId(found.id);
      }
    }
  }, [operarios, activeUser]);

  // Fast hours controllers (designed for tough on-site conditions)
  const adjustHoras = (val: number) => {
    setHoras(prev => {
      const computed = Number((prev + val).toFixed(1));
      return Math.max(0.5, Math.min(24, computed));
    });
  };

  const handleQuickPhrase = (phrase: string) => {
    setDescripcion(prev => {
      if (!prev) return phrase;
      return prev.endsWith('.') || prev.endsWith('. ') 
        ? `${prev.trim()} ${phrase}` 
        : `${prev.trim()}. ${phrase}`;
    });
  };

  // Helper to trigger clock-in or clock-out
  const handleFichajeClick = async (tipo: 'ENTRADA' | 'SALIDA') => {
    setFormValidationErrors({});
    setGpsError(null);
    setGpsVerifiedDistance(null);
    setGpsStatusText('');
    setFichajeSuccess(null);

    if (!selectedObraId) {
      setFormValidationErrors({ obra: 'Por favor, selecciona una obra activa para fichar.' });
      return;
    }
    if (!selectedOperarioId) {
      setFormValidationErrors({ operario: 'Por favor, selecciona un operario para registrar el fichaje.' });
      return;
    }

    const currentObra = obras.find(o => o.id === selectedObraId);
    let distanceValue: number | undefined = undefined;
    let coordsValue: string | undefined = undefined;

    if (currentObra && currentObra.geovalla_activa) {
      const isEmployee = activeUser && (activeUser.rol === 'operario' || activeUser.rol === 'jefe_equipo' || !activeUser.rol);
      setGpsChecking(true);
      setGpsStatusText('Comprobando geolocalización para validar fichaje de ingreso...');

      try {
        const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Su dispositivo no soporta geolocalización o está bloqueada por permisos.'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 9000 }
          );
        });

        coordsValue = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
        const obraLat = currentObra.latitud || 41.385063;
        const obraLon = currentObra.longitud || 2.173403;
        const obraRadio = currentObra.radio || 150;

        const distance = calculateDistanceInMeters(coords.latitude, coords.longitude, obraLat, obraLon);
        distanceValue = distance;
        setGpsVerifiedDistance(distance);

        if (distance > obraRadio) {
          setGpsChecking(false);
          setGpsStatusText('Fichaje Rechazado por Geovalla');
          
          if (isEmployee) {
            const blockMsg = `⚠️ Error Geovalla: Has intentado fichar fuera del rango de la obra. Estás a ${Math.round(distance)}m (Distancia máxima permitida: ${obraRadio}m).`;
            setFormValidationErrors({ gps: blockMsg });
            return;
          } else {
            alert(`[Aviso de Administrador]: Estás fuera de la geovalla (${Math.round(distance)}m), pero por tu rango Administrador se te permite fichar.`);
          }
        } else {
          setGpsChecking(false);
          setGpsStatusText('Ubicación verificada mediante Geovalla GPS.');
        }
      } catch (err: any) {
        setGpsChecking(false);
        setGpsStatusText('');
        
        let finalGpsErr = 'No hemos podido verificar tu ubicación GPS.';
        if (err.code === 1) {
          finalGpsErr = 'Activa permisos de ubicación GPS en tu móvil para poder registrar el fichaje.';
        } else if (err.code === 3) {
          finalGpsErr = 'Tiempo de espera de GPS agotado. Sal al exterior y reinténtalo.';
        }

        if (isEmployee) {
          setFormValidationErrors({ gps: `⚠️ Validación Requerida: ${finalGpsErr}` });
          return;
        } else {
          alert(`[Aviso Administrativo]: Error GPS omitido por rol de administrador. Registrando fichaje...`);
        }
      }
    }

    setIsSubmitting(true);

    const newFichaje: Fichaje = {
      id: `fich-${Date.now()}`,
      operario_id: selectedOperarioId,
      obra_id: selectedObraId,
      tipo,
      fecha_hora: new Date().toISOString(),
      distancia_metros: distanceValue,
      coordenadas: coordsValue
    };

    // Save to local state immediately
    setFichajes(prev => [newFichaje, ...prev]);
    setFichajeSuccess(`¡Fichaje de ${tipo === 'ENTRADA' ? 'ENTRADA' : 'SALIDA'} registrado correctamente a las ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`);
    
    // Autodismiss
    setTimeout(() => setFichajeSuccess(null), 6000);

    // Try saving to Supabase if configured and table exists
    if (!usingSimulatedData) {
      try {
        const { error: insertErr } = await supabase
          .from('fichajes')
          .insert([newFichaje]);
        // If error or table not found, it won't crash because we saved it locally!
        if (insertErr) {
          console.warn('La tabla de fichajes podría no existir todavía en Supabase:', insertErr.message);
        }
      } catch (err: any) {
        console.warn('Fichaje guardado localmente (tabla no sinc aún):', err);
      }
    }

    setIsSubmitting(false);
    
    // Clear GPS states
    setTimeout(() => {
      setGpsVerifiedDistance(null);
      setGpsStatusText('');
    }, 4500);
  };

  const getFichadoHoyHours = (): number | null => {
    const todayStr = new Date().toISOString().split('T')[0];
    const userFichajes = fichajes.filter(f => 
      f.operario_id === selectedOperarioId && f.fecha_hora.startsWith(todayStr)
    );
    // Sort chronologically
    const sorted = [...userFichajes].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    
    // Calculate accumulated hours
    let totalMs = 0;
    let entryTime: number | null = null;
    
    for (const f of sorted) {
      if (f.tipo === 'ENTRADA') {
        entryTime = new Date(f.fecha_hora).getTime();
      } else if (f.tipo === 'SALIDA' && entryTime !== null) {
        totalMs += new Date(f.fecha_hora).getTime() - entryTime;
        entryTime = null;
      }
    }
    
    // If they are currently clocked in, let's also compute up to "now"
    if (entryTime !== null) {
      totalMs += new Date().getTime() - entryTime;
    }
    
    if (totalMs > 0) {
      const computed = totalMs / (1000 * 60 * 60);
      return Number(computed.toFixed(1)); // round to 1 decimal place
    }
    return null;
  };

  // Form Submission with Geovalla validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationErrors({});
    setGpsError(null);
    setGpsVerifiedDistance(null);
    setGpsStatusText('');

    // Client-side validations
    const errors: { [key: string]: string } = {};
    if (!selectedObraId) {
      errors.obra = 'Por favor, selecciona una obra activa.';
    }
    if (!selectedOperarioId) {
      errors.operario = 'Por favor, selecciona un operario.';
    }
    if (!fecha) {
      errors.fecha = 'Selecciona la fecha del trabajo.';
    }
    if (!horas || horas <= 0) {
      errors.horas = 'Las horas deben ser mayores que cero.';
    }
    if (!descripcion || descripcion.trim().length < 5) {
      errors.descripcion = 'Por favor, introduce una descripción detallada del trabajo (min. 5 caract.).';
    }

    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      const firstError = Object.keys(errors)[0];
      const element = document.getElementById(`field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const currentObra = obras.find(o => o.id === selectedObraId);
    let validationNote = '';

    // Conduct Geovalla Check if active
    if (currentObra && currentObra.geovalla_activa) {
      // Exclude Admin or CEO roles from hard block, but test them visually!
      const isEmployee = activeUser && (activeUser.rol === 'operario' || activeUser.rol === 'jefe_equipo' || !activeUser.rol);
      
      setGpsChecking(true);
      setGpsStatusText('Estableciendo conexión y capturando coordenadas GPS...');

      try {
        const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Tu navegador o dispositivo no soporta geolocalización o está bloqueado en el iframe.'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 9000 }
          );
        });

        const obraLat = currentObra.latitud || 41.385063;
        const obraLon = currentObra.longitud || 2.173403;
        const obraRadio = currentObra.radio || 150;

        const distance = calculateDistanceInMeters(coords.latitude, coords.longitude, obraLat, obraLon);
        setGpsVerifiedDistance(distance);

        if (distance > obraRadio) {
          setGpsChecking(false);
          setGpsStatusText('Fichaje Rechazado por Geovalla');
          
          if (isEmployee) {
            const blockMsg = `⚠️ Fichaje rechazado por Geovalla: Estás fuera de la obra, a ${Math.round(distance)}m de distancia. El radio máximo permitido es de ${obraRadio}m. Por favor, acércate a la obra para poder fichar.`;
            setFormValidationErrors({ gps: blockMsg });
            return;
          } else {
            // Admins/CEO are warned but allowed to submit for administrative purposes
            alert(`[Aviso Administrativo]: Estás a ${Math.round(distance)}m (fuera de la geovalla de ${obraRadio}m), pero como CEO/Admin se te permite registrar el parte.`);
            validationNote = `\n\n[ADMIN_BYPASS: Operario fichó fuera de Geovalla a una distancia de ${Math.round(distance)} metros]`;
          }
        } else {
          setGpsChecking(false);
          setGpsStatusText('¡Ubicación GPS Verificada con éxito!');
          validationNote = `\n\n[Fichaje verificado por Geovalla GPS - Operario localizado a ${Math.round(distance)} metros de la obra]`;
        }
      } catch (err: any) {
        setGpsChecking(false);
        setGpsStatusText('');
        
        let finalGpsErr = 'No hemos podido capturar tu ubicación para verificar el geovallado.';
        if (err.code === 1) { // PERMISSION_DENIED
          finalGpsErr = 'Permiso denegado por GPS. Por favor, activa la localización en tu dispositivo móvil o navegador para fichar.';
        } else if (err.code === 3) { // TIMEOUT
          finalGpsErr = 'Tiempo de espera agotado al conectar con satélite GPS. Por favor, vuelve a intentarlo en un espacio abierto.';
        }
        
        if (isEmployee) {
          setFormValidationErrors({ gps: `⚠️ Validación Requerida: ${finalGpsErr}` });
          return;
        } else {
          // Admin bypass for GPS timeouts
          alert(`[Aviso Administrativo]: Error de GPS (${err.message}). Como CEO/Admin se te permite registrar el parte sin validar.`);
          validationNote = `\n\n[ADMIN_BYPASS: GPS con error durante verificación, omitido por rol administrativo]`;
        }
      }
    }

    setIsSubmitting(true);

    const newParte: ParteTrabajo = {
      obra_id: selectedObraId,
      operario_id: selectedOperarioId,
      fecha,
      horas,
      descripcion: descripcion.trim() + validationNote,
      materiales_usados: materiales.trim() || undefined
    };

    if (usingSimulatedData) {
      // Simulate real delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const obraName = obras.find(o => o.id === selectedObraId)?.nombre || 'Obra Desconocida';
      const enrichedParte: ParteTrabajo = {
        ...newParte,
        id: `sim-${Date.now()}`,
        created_at: new Date().toISOString()
      };

      // Add to today's list
      setPartesHoy(prev => [enrichedParte, ...prev]);
      setSubmitSuccess(true);
      setIsSubmitting(false);

      // Reset main parts but keep operario and date for repetitive daily entries
      setDescripcion('');
      setMateriales('');
      setGpsVerifiedDistance(null);
      setGpsStatusText('');
      
      // Autodismiss success banner
      setTimeout(() => setSubmitSuccess(false), 5000);
    } else {
      try {
        const { error: insertErr } = await supabase
          .from('partes_trabajo')
          .insert([newParte]);

        if (insertErr) {
          throw new Error(insertErr.message);
        }

        // Add to viewable list of todays work
        setPartesHoy(prev => [{ ...newParte, id: `db-${Date.now()}`, created_at: new Date().toISOString() }, ...prev]);
        setSubmitSuccess(true);
        setDescripcion('');
        setMateriales('');
        
        setTimeout(() => setSubmitSuccess(false), 5000);
      } catch (err: any) {
        console.error('Error al insertar parte:', err);
        setFormValidationErrors({ submit: `Error en base de datos: ${err.message}` });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getObraName = (id: string) => {
    return obras.find(o => o.id === id)?.nombre || 'Obra Desconocida';
  };

  const getOperarioName = (id: string) => {
    return operarios.find(op => op.id === id)?.nombre || 'Operario';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12 px-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"></div>
          <ClipboardList className="absolute text-amber-500 w-5 h-5 animate-pulse" />
        </div>
        <p className="mt-4 font-mono text-sm text-gray-500 tracking-tight">
          Cargando base de datos de obras e instaladores...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 transition-all duration-300" id="parte-diario-pantalla">
      
      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden" id="card-parte-diario">
        <div className="bg-[#07474e] p-6 text-white relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-450 opacity-20 rounded-full translate-x-8 -translate-y-8"></div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">Portal de Jornada y Partes</h2>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-xs text-teal-100 font-mono tracking-wide uppercase truncate">A&J GRUP BCN • INSTALACIONES</p>
                <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  usingSimulatedData 
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${usingSimulatedData ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                  {usingSimulatedData ? 'LOCAL' : 'REMOTO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SUB-TABS SELECTOR FOR COHESIVE TIMELINE */}
        <div className="flex border-b border-gray-150 bg-[#f1f5f9] p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('fichaje');
              setFormValidationErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 text-xs font-mono font-bold uppercase transition-all rounded-xl cursor-pointer ${
              activeSubTab === 'fichaje'
                ? 'bg-white text-[#07474e] shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#07474e]" />
            1. Entrada / Salida
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('parte');
              setFormValidationErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 text-xs font-mono font-bold uppercase transition-all rounded-xl cursor-pointer ${
              activeSubTab === 'parte'
                ? 'bg-white text-[#07474e] shadow-xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#07474e]" />
            2. Parte Diario
          </button>

          {/* 3. Informe Semanal (accessible to CEO, Admin, and Jefe de Equipo) */}
          {(activeUser?.rol === 'ceo' || activeUser?.rol === 'admin' || activeUser?.rol === 'jefe_equipo') && (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('informe');
                setFormValidationErrors({});
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-1 text-xs font-mono font-bold uppercase transition-all rounded-xl cursor-pointer ${
                activeSubTab === 'informe'
                  ? 'bg-amber-100 text-[#07474e] shadow-xs border border-amber-200'
                  : 'text-gray-500 hover:text-[#07474e]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#07474e]" />
              3. Informe Semanal
            </button>
          )}
        </div>

        {activeSubTab === 'informe' ? (
          <div className="p-6 flex flex-col gap-5 bg-white animate-fadeIn">
            <WeeklyClockingReport currentUser={activeUser!} />
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (activeSubTab === 'parte') handleSubmit(e); }} className="p-6 flex flex-col md:grid md:grid-cols-12 md:gap-8 gap-5 items-start">
            {formValidationErrors.submit && (
              <div className="col-span-12 p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-center gap-2 w-full">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formValidationErrors.submit}</span>
              </div>
            )}

            {/* Columna Izquierda (Selectores de Control y Geovalla) */}
            <div className="col-span-12 md:col-span-5 flex flex-col gap-5 w-full">
              {/* 1. OPERATOR SELECTOR (Common to both: must know who is acting) */}
              <div className="flex flex-col gap-1.5" id="field-operario">
                <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#07474e]" />
                  Operario Responsable
                </label>
                <div className="relative">
                  <select
                    value={selectedOperarioId}
                    onChange={(e) => setSelectedOperarioId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm appearance-none outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-800"
                  >
                    {operarios.map((op) => {
                      const tradesStr = op.especialidades && op.especialidades.length > 0
                        ? ` - [${op.especialidades.map(e => e === 'paleta' ? 'Paleta' : e === 'pintor' ? 'Pintor' : e === 'electricista' ? 'Electricista' : e === 'fontanero' ? 'Fontanero' : e).join(', ')}]`
                        : '';
                      return (
                        <option key={op.id} value={op.id}>
                          {op.nombre} ({op.rol === 'operario' ? 'Operario' : 'Jefe de Equipo'}){tradesStr}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 font-light text-xs">
                    ▲▼
                  </div>
                </div>
                {formValidationErrors.operario && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    ⚠️ {formValidationErrors.operario}
                  </p>
                )}
              </div>

              {/* 2. ACTIVE WORKS (Common to both: determines geofencing and reported workspace) */}
              <div className="flex flex-col gap-1.5" id="field-obra">
                <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#07474e]" />
                  Obra Activa
                </label>
                <div className="relative">
                  <select
                    value={selectedObraId}
                    onChange={(e) => setSelectedObraId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm appearance-none outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-800"
                  >
                    <option value="">-- Selecciona la obra en curso --</option>
                    {obras.map((obra) => (
                      <option key={obra.id} value={obra.id}>
                        {obra.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 font-light text-xs">
                    ▲▼
                  </div>
                </div>
                {formValidationErrors.obra && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    ⚠️ {formValidationErrors.obra}
                  </p>
                )}

                {/* GEOVALLADO LIVE FEEDBACK WIDGET */}
                {(() => {
                  const selectedObra = obras.find(o => o.id === selectedObraId);
                  if (!selectedObra) return null;

                  if (selectedObra.geovalla_activa) {
                    return (
                      <div className="mt-2.5 p-3 rounded-2xl bg-teal-50/55 border border-teal-100 flex flex-col gap-2 animate-fadeIn">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#07474e] shrink-0" />
                            <span className="text-[11px] font-black font-mono uppercase tracking-wider text-[#07474e]">Geovalla Activa</span>
                          </div>
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-teal-100 text-[#07474e] border border-teal-200">
                            Rango: {selectedObra.radio || 150}m
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-gray-600 leading-relaxed">
                          📍 Ubicación: <strong>{selectedObra.direccion}</strong>. Para fichar, debes estar dentro del radio de obra.
                        </p>

                        {/* GPS checking state spinner */}
                        {gpsChecking && (
                          <div className="flex items-center gap-2 py-1.5 px-2 bg-white rounded-xl border border-teal-100 shadow-xs animate-pulse">
                            <div className="w-3 h-3 border-2 border-[#07474e] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-mono font-bold text-[#07474e]">{gpsStatusText}</span>
                          </div>
                        )}

                        {/* GPS verified state */}
                        {!gpsChecking && gpsVerifiedDistance !== null && (
                          <div className="flex flex-col gap-2">
                            <div className={`flex items-center gap-2 py-2 px-3 rounded-xl border shadow-xs ${
                              gpsVerifiedDistance <= (selectedObra.radio || 150)
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                              <Locate className="w-4 h-4 shrink-0" />
                              <div className="text-xs font-mono leading-tight">
                                <strong>Ubicación verificada:</strong> Estás a {Math.round(gpsVerifiedDistance)}m de la obra.
                                <div className="font-bold text-[10px] mt-0.5 uppercase tracking-wider">
                                  {gpsVerifiedDistance <= (selectedObra.radio || 150) 
                                    ? '✔️ UBICACIÓN EN RANGO' 
                                    : '❌ VERIFICACIÓN FALLIDA (Fuera del radio)'}
                                </div>
                              </div>
                            </div>

                            {gpsVerifiedDistance > (selectedObra.radio || 150) && (
                              <div className="p-3 bg-rose-50 border border-rose-250 rounded-xl text-xs text-rose-850 leading-relaxed font-semibold animate-fadeIn">
                                <span className="font-black text-rose-800 uppercase block font-mono text-[10px] mb-1">⚠️ Fuera del Límite de la Obra</span>
                                Estás intentando registrar asistencia fuera del radio geolocalizado de la obra (Rango permitido: {selectedObra.radio || 150}m). 
                                Acércate al recinto para validar tu fichaje de forma segura. Si estás dentro pero el satélite no actualiza, sal a campo libre unos instantes.
                              </div>
                            )}
                          </div>
                        )}

                        {/* GPS Blocking/validation Errors inside widget for high-visibility */}
                        {formValidationErrors.gps && (
                          <div className="p-2.5 bg-red-100 border border-red-200 text-red-900 rounded-xl text-[10px] leading-relaxed font-semibold">
                            {formValidationErrors.gps}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2.5 p-2 rounded-xl bg-gray-50 border border-gray-150 flex items-center gap-1.5 text-[10px] text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      <span>Fichaje libre habilitado (Sin Geovalla obligatoria en este proyecto).</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Columna Derecha (Fichaje o Parte Diario según pestaña) */}
            <div className="col-span-12 md:col-span-7 flex flex-col gap-5 w-full border-t border-slate-100 pt-5 md:border-t-0 md:pt-0">

          {/* ==================== SUB-TAB 1: FICHAJE DE ENTRADA Y SALIDA ==================== */}
          {activeSubTab === 'fichaje' && (
            activeUser?.rol === 'ceo' ? (
              <div className="flex flex-col gap-4 animate-fadeIn p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl text-center items-center py-8">
                <span className="text-3xl">👑</span>
                <h4 className="text-sm font-bold text-amber-900 font-mono uppercase tracking-widest leading-none">Asistencia Exenta</h4>
                <p className="text-xs text-gray-700 max-w-sm leading-relaxed mt-2.5">
                  Hola, <strong>{activeUser.nombre}</strong>. Por tu cargo directivo de <strong>CEO / Gerente de la Empresa</strong> en A&J Grup, estás exento de fichajes obligatorios por GPS de Obra.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('informe')}
                  className="mt-4 px-4 py-2.5 bg-[#07474e] hover:bg-[#0b4e56] text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer"
                >
                  Ver Informe Semanal de Operarios
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-fadeIn">
              
              {/* Digital Clock Display */}
              <div className="bg-[#f8fafc] border border-gray-150 rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] font-mono font-black text-gray-400 tracking-widest leading-none">HORA LOCAL EN DISPOSITIVO</span>
                <div className="text-3xl font-mono font-extrabold text-gray-800 tracking-tight">{liveTime}</div>
                <div className="text-[11px] text-gray-500 font-medium">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

              {/* Success Notification specific to Fichajes */}
              <AnimatePresence>
                {fichajeSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-md border border-emerald-500"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{fichajeSuccess}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Big tactile check-in / check-out button */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayFichajes = fichajes.filter(f => 
                  f.operario_id === selectedOperarioId && f.fecha_hora.startsWith(todayStr)
                );
                const sorted = [...todayFichajes].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
                const latest = sorted[sorted.length - 1];
                const isClockedIn = latest ? latest.tipo === 'ENTRADA' : false;

                return (
                  <div className="flex flex-col gap-4">
                    {/* Active work indicator banner */}
                    {isClockedIn && latest && (
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-950 flex flex-col gap-2 shadow-xs animate-fadeIn">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono font-bold text-[#0284c7]">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping"></span>
                            <span>¡Enhorabuena, fichaje completado!</span>
                          </div>
                          <span className="text-[10px] bg-sky-100 text-[#0284c7] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Jornada Activa</span>
                        </div>
                        <p className="text-gray-600 font-medium leading-relaxed">
                          Has registrado tu entrada correctamente a las <strong>{new Date(latest.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}h</strong> en la obra <strong>{getObraName(latest.obra_id)}</strong>. Que pases un excelente día de trabajo de parte de todo el equipo de A&J Grup. ¡Seguimos sumando juntos!
                        </p>
                      </div>
                    )}

                    {!isClockedIn ? (
                      <button
                        type="button"
                        disabled={isSubmitting || gpsChecking}
                        onClick={() => handleFichajeClick('ENTRADA')}
                        className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-gray-200 text-white font-extrabold rounded-2xl shadow-md transition-all duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-emerald-500"
                      >
                        <LogIn className="w-7 h-7 text-white animate-pulse" />
                        <span className="text-base tracking-wide uppercase font-sans">FICHAR ENTRADA</span>
                        <span className="text-[10px] opacity-80 font-mono tracking-wider">Registra inicio de jornada con GPS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting || gpsChecking}
                        onClick={() => handleFichajeClick('SALIDA')}
                        className="w-full py-5 px-6 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:bg-gray-200 text-white font-extrabold rounded-2xl shadow-md transition-all duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-rose-500"
                      >
                        <LogOut className="w-7 h-7 text-white" />
                        <span className="text-base tracking-wide uppercase font-sans">FICHAR SALIDA</span>
                        <span className="text-[10px] opacity-80 font-mono tracking-wider">Registra cierre de jornada hoy</span>
                      </button>
                    )}

                    {/* Timeline of daily clock-ins */}
                    <div className="mt-2 border-t border-gray-150 pt-4">
                      <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Fichajes de hoy ({sorted.length})
                      </h4>
                      {sorted.length === 0 ? (
                        <p className="text-xs text-gray-400 italic mt-1.5 pl-1">No hay entradas o salidas fichadas hoy todavía.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 mt-2">
                          {sorted.map((f, idx) => (
                            <div key={f.id || idx} className="flex items-center justify-between bg-gray-50 border border-gray-150 rounded-xl p-2.5 text-xs font-mono">
                              <span className="flex items-center gap-1.5 font-bold">
                                {f.tipo === 'ENTRADA' ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                ) : (
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                )}
                                {f.tipo === 'ENTRADA' ? 'ENTRADA' : 'SALIDA'}
                              </span>
                              <span className="text-gray-800 font-bold">
                                {new Date(f.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}h
                              </span>
                              <span className="text-[10px] text-gray-400 max-w-[120px] truncate">
                                {getObraName(f.obra_id)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>
            )
          )}

          {/* ==================== SUB-TAB 2: PARTE DIARIO DE TRABAJO ==================== */}
          {activeSubTab === 'parte' && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              
              {/* Autofill Hours Helper Widget */}
              {(() => {
                const clockedHours = getFichadoHoyHours();
                if (clockedHours === null || clockedHours <= 0) return null;

                return (
                  <div className="p-3 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#07474e] shrink-0 animate-pulse" />
                      <span className="text-xs text-gray-700 leading-tight">
                        Has fichado <strong>{clockedHours} h</strong> hoy en obra. ¿Cargar al parte?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHoras(clockedHours);
                      }}
                      className="shrink-0 text-[10px] font-mono font-bold bg-[#07474e] hover:bg-[#0b4e56] text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      COPIAR
                    </button>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                
                {/* Fecha */}
                <div className="flex flex-col gap-1.5" id="field-fecha">
                  <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#07474e]" />
                    Fecha del Trabajo
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium font-mono text-gray-800"
                  />
                  {formValidationErrors.fecha && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {formValidationErrors.fecha}
                    </p>
                  )}
                </div>

                {/* Horas */}
                <div className="flex flex-col gap-1.5" id="field-horas">
                  <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#07474e]" />
                    Horas Dedicadas
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustHoras(-0.5)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={horas}
                      onChange={(e) => setHoras(Math.max(0.5, Number(e.target.value)))}
                      className="w-full text-center py-1.5 bg-[#f8fafc] border border-gray-200 rounded-lg font-mono font-bold text-sm text-gray-850 outline-none focus:ring-2 focus:ring-[#07474e]/20"
                    />
                    <button
                      type="button"
                      onClick={() => adjustHoras(0.5)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Shortcut buttons */}
                  <div className="flex gap-1.5 mt-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setHoras(4)}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md font-mono border ${
                        horas === 4 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-200 hover:bg-gray-150'
                      }`}
                    >
                      4h
                    </button>
                    <button
                      type="button"
                      onClick={() => setHoras(8)}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md font-mono border ${
                        horas === 8 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-200 hover:bg-gray-150'
                      }`}
                    >
                      8h
                    </button>
                    <button
                      type="button"
                      onClick={() => setHoras(9.5)}
                      className={`px-1.5 py-0.5 text-[9px] rounded-md font-mono border ${
                        horas === 9.5 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-200 hover:bg-gray-150'
                      }`}
                    >
                      9.5h
                    </button>
                  </div>
                  {formValidationErrors.horas && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {formValidationErrors.horas}
                    </p>
                  )}
                </div>

              </div>

              {/* Tareas */}
              <div className="flex flex-col gap-1.5" id="field-descripcion">
                <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#07474e]" />
                  Tareas Realizadas (Fin de Jornada)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Instalación de tuberías, remates, cableado, desescombro..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-850 placeholder:text-gray-400"
                />
                {formValidationErrors.descripcion && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    ⚠️ {formValidationErrors.descripcion}
                  </p>
                )}

                {/* Quick entry phrases */}
                <div className="mt-1 flex flex-col gap-1">
                  <span className="text-[9px] font-mono font-medium text-gray-400 uppercase">Frases de Obra (Toca para añadir):</span>
                  <div className="flex flex-wrap gap-1 leading-none max-h-[80px] overflow-y-auto pr-1 pb-1">
                    {QUICK_TASK_PHRASES.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickPhrase(p)}
                        className="px-2 py-1 text-[9px] bg-[#f8fafc] hover:bg-[#07474e]/10 text-gray-600 hover:text-[#07474e] rounded-md text-left border border-gray-200 transition-colors cursor-pointer truncate max-w-full"
                      >
                        + {p.replace(/\.$/, '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Materiales */}
              <div className="flex flex-col gap-1.5" id="field-materiales">
                <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#07474e]" />
                    Materiales Consumidos
                  </span>
                  <span className="text-[10px] text-gray-400 normal-case italic">Opcional</span>
                </label>
                <input
                  type="text"
                  value={materiales}
                  onChange={(e) => setMateriales(e.target.value)}
                  placeholder="Ej: 3 Sacos Yeso, 5m cable cobre..."
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-800"
                />
              </div>

              {/* Submit Parte Button */}
              <div className="mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#07474e] hover:bg-[#0b4e56] active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer font-sans"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Registrando parte...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="tracking-wide uppercase font-sans">GUARDAR PARTE TRABAJO</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
          </div>
        </form>)}
      </div>

      {/* Success Notification Bar */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500 text-white rounded-2xl border border-emerald-600 shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
              <div>
                <p className="text-xs font-bold leading-none">¡Parte diario registrado!</p>
                <p className="text-[11px] opacity-90 mt-1 whitespace-nowrap">Los datos se han guardado de forma segura.</p>
              </div>
            </div>
            <button 
              onClick={() => setSubmitSuccess(false)}
              className="text-white hover:opacity-100 opacity-70 p-1 font-mono text-xs font-semibold leading-none cursor-pointer"
            >
              CERRAR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's submissions list (high loyalty & offline utility) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 font-mono uppercase tracking-wide">
            <ClipboardList className="w-4 h-4 text-[#07474e]" />
            Historial de Hoy ({partesHoy.length})
          </h3>
          {partesHoy.length > 0 && (
            <button
              onClick={() => {
                if (confirm('¿Vaciar el historial local de hoy?')) {
                  setPartesHoy([]);
                }
              }}
              className="text-[11px] font-mono font-medium text-gray-450 hover:text-red-600 transition-colors cursor-pointer"
            >
              Borrar Vista
            </button>
          )}
        </div>

        {partesHoy.length === 0 ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl">
            <p className="text-xs text-gray-400">No hay partes rellenados durante esta sesión hoy.</p>
            <p className="text-[11px] text-gray-450 mt-1 leading-normal">Los partes rellenados aparecerán aquí listados.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {partesHoy.map((parte) => (
              <motion.div
                key={parte.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-[#f8fafc] border border-gray-150 rounded-xl flex flex-col gap-2 relative hover:bg-gray-100/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-teal-50 text-[#07474e] text-[10px] font-bold rounded-md max-w-[190px] truncate">
                    💼 {getObraName(parte.obra_id)}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#f59e0b]" />
                    {parte.horas} h
                  </span>
                </div>
                
                <p className="text-xs text-gray-700 leading-normal line-clamp-2">
                  {parte.descripcion}
                </p>

                {parte.materiales_usados && (
                  <div className="text-[10px] text-gray-500 border-t border-gray-100 pt-1 flex items-center gap-1 truncate font-mono">
                    <span className="font-semibold text-[#f59e0b] bg-amber-50 px-1 rounded">MATS:</span>
                    <span className="truncate">{parte.materiales_usados}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-1.5 mt-0.5 font-mono">
                  <span className="flex items-center gap-1">
                    👨‍🔧 {getOperarioName(parte.operario_id)}
                  </span>
                  <span>
                    {parte.fecha}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
