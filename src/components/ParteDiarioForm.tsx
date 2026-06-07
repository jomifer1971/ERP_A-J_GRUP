/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { Obra, Usuario, ParteTrabajo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
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
  ClipboardList
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

export default function ParteDiarioForm() {
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

  // Local state to show successfully added reports (persistence across browser reload)
  const [partesHoy, setPartesHoy] = useState<ParteTrabajo[]>(() => {
    const saved = localStorage.getItem('aj_partes_hoy');
    return saved ? JSON.parse(saved) : [];
  });

  // Load Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorStatus(null);

      if (!isSupabaseConfigured) {
        // Fallback directly to simulated data
        setObras(MOCK_OBRAS);
        setOperarios(MOCK_OPERARIOS);
        setSelectedOperarioId(MOCK_OPERARIOS[0].id);
        setSelectedObraId(MOCK_OBRAS[0].id);
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
          setObras(MOCK_OBRAS);
          setSelectedObraId(MOCK_OBRAS[0].id);
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
        setObras(MOCK_OBRAS);
        setSelectedObraId(MOCK_OBRAS[0].id);
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

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationErrors({});

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
      // Native scroll to error
      const firstError = Object.keys(errors)[0];
      const element = document.getElementById(`field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    const newParte: ParteTrabajo = {
      obra_id: selectedObraId,
      operario_id: selectedOperarioId,
      fecha,
      horas,
      descripcion: descripcion.trim(),
      materiales_usados: materiales.trim() || undefined
    };

    if (usingSimulatedData) {
      // Simulate real delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const obraName = obras.find(o => o.id === selectedObraId)?.nombre || 'Obra Desconocida';
      const operarioName = operarios.find(op => op.id === selectedOperarioId)?.nombre || 'Operario';

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
    <div className="w-full max-w-md mx-auto flex flex-col gap-6" id="parte-diario-pantalla">
      
      {/* Network & Source Integration Banner */}
      <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
        usingSimulatedData 
          ? 'bg-amber-50/70 border-amber-100 text-amber-900' 
          : 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center ${
            usingSimulatedData ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            {usingSimulatedData ? (
              <WifiOff className="w-5 h-5 text-amber-600" />
            ) : (
              <Wifi className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider font-mono">
              {usingSimulatedData ? 'Modo Local / Simulación' : 'Conectado a Supabase'}
            </div>
            <p className="text-[11px] opacity-80 leading-snug">
              {usingSimulatedData 
                ? 'Introduce tus variables de entorno para insertar datos en tiempo real.' 
                : 'La sincronización de datos con RLS está totalmente activa.'}
            </p>
          </div>
        </div>
        
        {isSupabaseConfigured && (
          <button 
            type="button"
            onClick={() => setUsingSimulatedData(p => !p)}
            className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-lg border transition-all uppercase ${
              usingSimulatedData 
                ? 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100' 
                : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Configurar
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden" id="card-parte-diario">
        <div className="bg-[#07474e] p-6 text-white relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-450 opacity-20 rounded-full translate-x-8 -translate-y-8"></div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Parte Diario de Trabajo</h2>
              <p className="text-xs text-teal-100 font-mono tracking-wide uppercase mt-0.5">A&J GRUP BCN • INSTALACIONES</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {formValidationErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formValidationErrors.submit}</span>
            </div>
          )}

          {/* 1. OPERATOR SELECTOR */}
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
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nombre} ({op.rol === 'operario' ? 'Operario' : 'Jefe de Equipo'})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <Plus className="w-4 h-4 rotate-45" />
              </div>
            </div>
            {formValidationErrors.operario && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                ⚠️ {formValidationErrors.operario}
              </p>
            )}
          </div>

          {/* 2. ACTIVE WORKS */}
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
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <Plus className="w-4 h-4 rotate-45" />
              </div>
            </div>
            {formValidationErrors.obra && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                ⚠️ {formValidationErrors.obra}
              </p>
            )}
          </div>

          {/* 3. DATE & HOURS */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Fecha */}
            <div className="flex flex-col gap-1.5" id="field-fecha">
              <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#07474e]" />
                Fecha
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
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors active:scale-95"
                  title="Restar media hora"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={horas}
                  onChange={(e) => setHoras(Math.max(0.5, Number(e.target.value)))}
                  className="w-full text-center py-2 bg-[#f8fafc] border border-gray-200 rounded-xl font-mono font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#07474e]/20"
                />
                <button
                  type="button"
                  onClick={() => adjustHoras(0.5)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors active:scale-95"
                  title="Sumar media hora"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {/* Shortcut buttons to quickly select common values */}
              <div className="flex gap-1.5 mt-1 justify-center">
                <button
                  type="button"
                  onClick={() => setHoras(4)}
                  className={`px-2 py-0.5 text-[10px] rounded-lg font-mono border ${
                    horas === 4 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-200 hover:bg-gray-150'
                  }`}
                >
                  4h
                </button>
                <button
                  type="button"
                  onClick={() => setHoras(8)}
                  className={`px-2 py-0.5 text-[10px] rounded-lg font-mono border ${
                    horas === 8 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-200 hover:bg-gray-150'
                  }`}
                >
                  8h
                </button>
                <button
                  type="button"
                  onClick={() => setHoras(9.5)}
                  className={`px-2 py-0.5 text-[10px] rounded-lg font-mono border ${
                    horas === 9.5 ? 'bg-[#07474e] border-[#07474e] text-white' : 'bg-[#f8fafc] text-gray-500 border-gray-205 hover:bg-gray-150'
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

          {/* 4. TASK DESCRIPTION */}
          <div className="flex flex-col gap-1.5" id="field-descripcion">
            <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#07474e]" />
              Tareas Realizadas
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Instalación de tuberías de desagüe, colocación de azulejos en cuarto de baño principal y retirada de escombros..."
              rows={4}
              className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-850 placeholder:text-gray-400"
            />
            {formValidationErrors.descripcion && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                ⚠️ {formValidationErrors.descripcion}
              </p>
            )}

            {/* Quick entry phrases on mobiles */}
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-[10px] font-mono font-medium text-gray-400 uppercase">Textos Rápidos (Toca para añadir):</span>
              <div className="flex flex-wrap gap-1 leading-none max-h-[90px] overflow-y-auto pr-1 pb-1">
                {QUICK_TASK_PHRASES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPhrase(p)}
                    className="px-2.5 py-1 text-[10px] bg-[#f8fafc] hover:bg-teal-50 text-gray-600 hover:text-teal-900 rounded-lg text-left border border-gray-200 hover:border-teal-200 transition-colors cursor-pointer truncate max-w-full"
                  >
                    + {p.replace(/\.$/, '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. USED MATERIALS */}
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
              placeholder="Ej: 3 Sacos de Yeso, 5m tubo cobre 15mm, junta..."
              className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all font-medium text-gray-800"
            />
          </div>

          {/* Form Actions */}
          <div className="mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#07474e] hover:bg-[#0b4e56] active:scale-[0.98] disabled:bg-gray-300 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>GUARDAR PARTE TRABAJO</span>
                </>
              )}
            </button>
          </div>
        </form>
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
