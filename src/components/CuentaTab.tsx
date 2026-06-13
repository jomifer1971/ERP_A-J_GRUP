/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario, ParteTrabajo } from '../types';
import { User, FileText, Upload, Calendar, CheckCircle2, ThumbsUp, AlertCircle, BarChart3, Clock, HelpCircle, BadgeAlert, Sparkles, Building, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

interface CuentaTabProps {
  user: Usuario;
}

interface JustificanteDoc {
  id: string;
  tipo: 'baja_medica' | 'cita_medica' | 'asuntos_propios' | 'otro';
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}

export default function CuentaTab({ user }: CuentaTabProps) {
  // Stats summary based on general localStorage records
  const [partes, setPartes] = useState<ParteTrabajo[]>([]);
  const [docs, setDocs] = useState<JustificanteDoc[]>([]);

  // Form fields
  const [tipo, setTipo] = useState<'baja_medica' | 'cita_medica' | 'asuntos_propios' | 'otro'>('baja_medica');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [motivo, setMotivo] = useState('');
  
  // Simulated File Upload fields
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');

  // Notification status
  const [success, setSuccess] = useState('');
  const [errorStatus, setErrorStatus] = useState('');

  useEffect(() => {
    // Collect stats from parts submitted by current operario
    const savedPartes = localStorage.getItem('aj_partes_hoy');
    if (savedPartes) {
      try {
        const decoded = JSON.parse(savedPartes) as ParteTrabajo[];
        // Filter those corresponding select-only to our active operario email or role
        const activeOperarioIdInSelect = 'op-1'; // fallback matcher or match by activeUser name
        const operarioPartes = decoded.filter(p => p.fecha !== ''); 
        setPartes(operarioPartes);
      } catch {}
    }

    // Hydrate doc justifications
    const loadDocs = async () => {
      let isLoadedFromSupabase = false;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('justificantes')
            .select('*')
            .eq('usuario_id', user.id);
          
          if (!error && data && data.length > 0) {
            const mapped: JustificanteDoc[] = data.map((doc: any) => ({
              id: doc.id,
              tipo: doc.tipo,
              fechaInicio: doc.fecha_inicio,
              fechaFin: doc.fecha_fin,
              motivo: doc.motivo,
              fileName: doc.file_name || 'justificante.pdf',
              fileSize: doc.file_size || '250 KB',
              uploadDate: doc.upload_date || '',
              estado: doc.estado
            }));
            setDocs(mapped);
            localStorage.setItem('aj_justificantes', JSON.stringify(mapped));
            isLoadedFromSupabase = true;
          }
        } catch (err) {
          console.warn('Fallo al cargar justificantes de Supabase:', err);
        }
      }

      if (!isLoadedFromSupabase) {
        const savedDocs = localStorage.getItem('aj_justificantes');
        if (savedDocs) {
          try {
            setDocs(JSON.parse(savedDocs));
          } catch {}
        } else {
          const defaultDocs: JustificanteDoc[] = [
            {
              id: 'doc-1',
              tipo: 'cita_medica',
              fechaInicio: '2026-06-03',
              fechaFin: '2026-06-03',
              motivo: 'Visita Dentista Seguridad Social - Barcelona Dental',
              fileName: 'Justificante_Dentista_030626.pdf',
              fileSize: '452 KB',
              uploadDate: '2026-06-03 14:22',
              estado: 'APROBADO'
            },
            {
              id: 'doc-2',
              tipo: 'baja_medica',
              fechaInicio: '2026-06-05',
              fechaFin: '2026-06-09',
              motivo: 'Recuperación tras esguince leve de tobillo',
              fileName: 'Informe_Baja_CAP_Mallorca.pdf',
              fileSize: '1.2 MB',
              uploadDate: '2026-06-05 09:12',
              estado: 'PENDIENTE'
            }
          ];
          setDocs(defaultDocs);
          localStorage.setItem('aj_justificantes', JSON.stringify(defaultDocs));
        }
      }
    };

    loadDocs();
  }, [user]);

  const saveDocsToLocalStorage = async (updated: JustificanteDoc[], deletedId?: string) => {
    setDocs(updated);
    localStorage.setItem('aj_justificantes', JSON.stringify(updated));

    if (isSupabaseConfigured && deletedId) {
      try {
        await supabase.from('justificantes').delete().eq('id', deletedId);
      } catch (err) {
        console.warn('Error al eliminar justificante en Supabase:', err);
      }
    }
  };

  // Drag handlings
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFileName(file.name);
    // Convert bytes to readable format
    const sizeInMb = file.size / (1024 * 1024);
    if (sizeInMb >= 1) {
      setSelectedFileSize(`${sizeInMb.toFixed(1)} MB`);
    } else {
      setSelectedFileSize(`${(file.size / 1024).toFixed(0)} KB`);
    }
  };

  const handleSubmitJustificante = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus('');
    setSuccess('');

    if (!selectedFileName) {
      setErrorStatus('⚠️ Sube una foto, captura o archivo PDF del justificante.');
      return;
    }

    if (!motivo.trim()) {
      setErrorStatus('⚠️ Describe brevemente la justificación médica o el motivo de la ausencia.');
      return;
    }

    const newDoc: JustificanteDoc = {
      id: `doc-${Date.now()}`,
      tipo,
      fechaInicio,
      fechaFin,
      motivo: motivo.trim(),
      fileName: selectedFileName,
      fileSize: selectedFileSize || '250 KB',
      uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      estado: 'PENDIENTE'
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('justificantes').upsert({
          id: newDoc.id,
          usuario_id: user.id,
          tipo: newDoc.tipo,
          fecha_inicio: newDoc.fechaInicio,
          fecha_fin: newDoc.fechaFin,
          motivo: newDoc.motivo,
          file_name: newDoc.fileName,
          file_size: newDoc.fileSize,
          upload_date: newDoc.uploadDate,
          estado: newDoc.estado
        });
      } catch (err: any) {
        console.warn('Fallo al subir justificante a Supabase:', err.message);
      }
    }

    const updated = [newDoc, ...docs];
    saveDocsToLocalStorage(updated);

    // Reset fields
    setMotivo('');
    setSelectedFileName('');
    setSelectedFileSize('');
    setSuccess('📨 ¡Justificante subido con éxito! El departamento de administración revisará la documentación.');
    setTimeout(() => setSuccess(''), 6000);
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('¿Quieres retirar esta justificación del sistema?')) {
      const updated = docs.filter(d => d.id !== id);
      saveDocsToLocalStorage(updated, id);
    }
  };

  // Calc metrics
  const totalHorasRegistradas = partes.reduce((acc, p) => acc + (p.horas || 0), 0) + 40; // Initial simulated base offset
  const totalReportesRealizados = partes.length + 5; 
  const mediaHorasDiarias = (totalHorasRegistradas / totalReportesRealizados).toFixed(1);

  // Labels decoder
  const translateDocType = (t: string) => {
    switch (t) {
      case 'baja_medica': return '🤒 BAJA MÉDICA TRABAJADOR';
      case 'cita_medica': return '🏥 CITA MÉDICA CAP';
      case 'asuntos_propios': return '🏖️ ASUNTOS PROPIOS / PERMISO';
      default: return '📄 OTRO REQUERIMIENTO';
    }
  };

  return (
    <div id="cuenta_statistics_tab" className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      {/* Tab Heading banner */}
      <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-850">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Estadísticas y Justificantes Médicos</h1>
              <p className="text-xs text-gray-400 font-mono tracking-wider mt-0.5 uppercase">Portal del Empleado • A&J Grup BCN</p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-[#f8fafc] border border-gray-150 rounded-2xl text-[11px] font-semibold text-gray-750 flex items-center gap-1.5 self-start md:self-auto shadow-3xs">
            <Building className="w-4 h-4 text-slate-700" />
            <span>Sede de operaciones: <strong>Barcelona Central</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Statistics summaries and Upload tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column - stats cards and files list. Grid span: 7 */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Dashboard mini-bento */}
          <div className="grid grid-cols-3 gap-4">
            
            <div className="bg-white px-4 py-5 rounded-2xl border border-gray-200/90 flex flex-col gap-2">
              <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest leading-none">Horas Totales</span>
              <div className="text-2xl font-black text-gray-950 flex items-baseline gap-1">
                {totalHorasRegistradas}
                <span className="text-xs text-gray-400 font-sans font-medium">horas</span>
              </div>
              <div className="text-[10px] text-teal-800 font-mono mt-1 font-bold">⏱️ Mes de Junio</div>
            </div>

            <div className="bg-white px-4 py-5 rounded-2xl border border-gray-200/90 flex flex-col gap-2">
              <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest leading-none">Fichajes</span>
              <div className="text-2xl font-black text-gray-950">
                {totalReportesRealizados}
              </div>
              <div className="text-[10px] text-slate-705 font-mono mt-1 font-bold">✔️ 100% Completados</div>
            </div>

            <div className="bg-white px-4 py-5 rounded-2xl border border-gray-200/90 flex flex-col gap-2">
              <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest leading-none">Media Jornada</span>
              <div className="text-2xl font-black text-gray-950 flex items-baseline gap-0.5">
                {mediaHorasDiarias}
                <span className="text-xs text-gray-400 font-sans font-medium">h/día</span>
              </div>
              <div className="text-[10px] text-indigo-700 font-mono mt-1 font-bold">📂 Convenio Obra</div>
            </div>

          </div>

          {/* List of justifying docs uploaded */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-black font-mono text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3 border-gray-100">
              <FileText className="w-4 h-4 text-slate-700" />
              Documentación Médica y Ausencias Modificadas
            </h3>

            <div className="flex flex-col gap-3">
              {docs.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-150 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                  <thumbsUp className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">No has cargado ningún justificante médico para este ejercicio.</p>
                </div>
              ) : (
                docs.map(doc => (
                  <div key={doc.id} className="border border-gray-200 p-4 rounded-2xl bg-slate-55 flex flex-col gap-3.5 hover:border-gray-300 transition-colors">
                    
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-[#f1f5f9] border border-gray-200 text-gray-700 rounded-md">
                          {translateDocType(doc.tipo)}
                        </span>
                        <p className="text-xs font-bold text-gray-800 leading-relaxed mt-2">{doc.motivo}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">
                          Periodo: <strong className="text-gray-600">{doc.fechaInicio}</strong> al <strong className="text-gray-600">{doc.fechaFin}</strong>
                        </p>
                      </div>

                      <span className={`text-[9px] font-black font-mono px-2.5 py-0.5 rounded-full border shadow-2xs ${
                        doc.estado === 'APROBADO' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                          : doc.estado === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-700 border-rose-150'
                          : 'bg-amber-50 text-amber-800 border-amber-150 animate-pulse'
                      }`}>
                        ⏳ {doc.estado}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100/80 pt-2.5 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-1.5 bg-gray-100 border text-gray-500 rounded text-[9px] font-black font-mono uppercase tracking-wider">
                          {doc.fileName.split('.').pop() || 'PDF'}
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 font-medium truncate max-w-[200px]" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">({doc.fileSize})</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 font-mono">{doc.uploadDate}</span>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar justificante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right column: form to upload new medical letter. Grid span: 5 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-black font-mono text-slate-800 uppercase tracking-wider">Enviar Justificación de Ausencia</h3>
              <p className="text-xs text-gray-400 mt-1">Registra aquí citas médicas o bajas para que administración cuadre las nóminas.</p>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-900 rounded-2xl text-[11px] leading-relaxed font-semibold flex items-start gap-1.5">
                <span>{success}</span>
              </div>
            )}

            {errorStatus && (
              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-900 rounded-2xl text-[11px] leading-relaxed font-semibold">
                {errorStatus}
              </div>
            )}

            <form onSubmit={handleSubmitJustificante} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Tipo de Documento</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-slate-400 bg-slate-50/20"
                >
                  <option value="baja_medica">🤒 BAJA MÉDICA (INCAPACIDAD TEMPORAL)</option>
                  <option value="cita_medica">🏥 CITA MÉDICA CAP / ESPECIALISTA</option>
                  <option value="asuntos_propios">🏖️ PERMISO / ASUNTOS PROPIOS</option>
                  <option value="otro">📄 OTRO JUSTIFICANTE COMPROMISO</option>
                </select>
              </div>

              {/* Attendance scope dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Desde el día</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Hasta el día</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Observaciones / Descripción CAP</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Detalla brevemente el motivo de tu ausencia o el specialist que te atiende..."
                  className="w-full px-3 py-2.5 border border-gray-250 rounded-xl text-xs text-gray-700 outline-none focus:border-slate-400 resize-none h-18"
                  required
                />
              </div>

              {/* Upload Files Drag Zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Justificante Adjunto</label>
                
                <input 
                  type="file" 
                  id="justificante-file-picker" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />

                <div 
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-slate-500 bg-slate-50' 
                      : selectedFileName 
                      ? 'border-emerald-250 bg-emerald-50/5' 
                      : 'border-gray-250 hover:bg-slate-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('justificante-file-picker')?.click()}
                >
                  <Upload className={`w-6 h-6 mb-1.5 ${selectedFileName ? 'text-emerald-600' : 'text-slate-400'}`} />
                  
                  {selectedFileName ? (
                    <div className="text-xs text-slate-800">
                      <p className="font-extrabold truncate max-w-[250px]">{selectedFileName}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">Tamaño: {selectedFileSize}</p>
                      <p className="text-[9px] font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 mt-2 rounded inline-block border border-emerald-150">✓ ARCHIVO CARGADO</p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 leading-normal">
                      <span className="font-extrabold text-slate-800 underline">Haz clic para subir</span> o arrastra tu archivo aquí
                      <p className="text-[9px] text-gray-400 font-mono mt-1">Formatos admitidos: PDF, JPG, PNG (máx. 4MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-sm mt-1"
              >
                Enviar a Revisión de Empresa
              </button>

            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
