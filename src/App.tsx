/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ParteDiarioForm from './components/ParteDiarioForm';
import { 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Folder, 
  FileCode, 
  Cpu, 
  Database, 
  Terminal, 
  UserCheck, 
  Smartphone,
  ExternalLink,
  GitBranch,
  Settings
} from 'lucide-react';

export default function App() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<'preview' | 'schema'>('preview');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans flex flex-col antialiased">
      
      {/* 1. MASTER DESKTOP HEADER */}
      <header className="h-16 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e3a8a] text-white p-2.5 rounded-xl font-bold flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#1e3a8a]">A&J GRUP BCN</span>
              <span className="text-[#f59e0b] text-base font-bold">•</span>
              <span className="text-xs font-semibold text-[#64748b] font-mono tracking-wider uppercase">Management System</span>
            </div>
            <span className="text-[10px] text-gray-450 uppercase tracking-widest font-bold block max-md:hidden mt-0.5">Reformas e Instalaciones Integral</span>
          </div>
        </div>

        {/* User profile representation */}
        <div className="flex items-center gap-3">
          <div className="text-right max-sm:hidden">
            <div className="text-xs font-bold text-[#0f172a]">Javier Rodríguez</div>
            <div className="text-[10px] font-medium text-[#64748b] font-mono">Admin & Senior Dev</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f1f5f9] border-2 border-[#1e3a8a] overflow-hidden flex items-center justify-center font-bold text-sm text-[#1e3a8a] shadow-sm">
            JR
          </div>
        </div>
      </header>

      {/* 2. THREE-PANEL GEOMETRIC WORKSPACE CONTAINER */}
      <div className="flex-1 lg:grid lg:grid-cols-[280px_1fr_340px] min-h-[calc(100vh-64px)] bg-[#f1f5f9]">
        
        {/* ================= COLUMN 1: LEFT FILE SYSTEM & ENVIRONMENT DETAILS ================= */}
        <aside className="bg-white border-r border-[#e2e8f0] p-6 flex flex-col gap-6 max-lg:hidden">
          
          <div>
            <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#1e3a8a]" />
              Estructura de Archivos
            </h3>
            
            {/* Visual File Tree representation directly matching standard project layout */}
            <div className="font-mono text-xs text-[#64748b] space-y-1.5 leading-relaxed bg-[#f8fafc] p-4 rounded-2xl border border-[#e2e8f0]">
              <div className="text-[#1e3a8a] font-bold">src/</div>
              <div className="pl-3">├─ <span className="text-[#1e3a8a] font-bold">components/</span></div>
              <div className="pl-6 text-gray-700">└─ ParteDiarioForm.tsx</div>
              <div className="pl-3">├─ <span className="text-[#1e3a8a] font-bold">config/</span></div>
              <div className="pl-6 text-gray-700">└─ supabaseClient.ts</div>
              <div className="pl-3">├─ <span className="text-gray-700">types.ts</span></div>
              <div className="pl-3">├─ <span className="text-gray-700">App.tsx</span></div>
              <div className="pl-3">└─ <span className="text-gray-700">main.tsx</span></div>
              <div className="text-[#1e3a8a] font-bold mt-2">supabase/</div>
              <div className="pl-3 text-gray-700">└─ migrations/</div>
            </div>
          </div>

          {/* Mobile priority notification styled in Geometrical layout */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 text-amber-900 flex flex-col gap-2 shadow-sm">
            <span className="text-[10px] font-mono font-extrabold uppercase text-[#f59e0b] tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              Mobile-First Priority
            </span>
            <p className="text-xs leading-normal">
              Esta pantalla está exclusivamente optimizada para navegadores móviles. Los operarios rellenan los datos a pie de obra con máxima fluidez.
            </p>
          </div>

          {/* Quick Stats panel for administrative review */}
          <div className="mt-auto border-t border-[#e2e8f0] pt-4 flex flex-col gap-2 font-mono text-[11px] text-[#64748b]">
            <div className="flex justify-between items-center">
              <span>Database Sync:</span>
              <span className="text-emerald-600 font-bold uppercase">Activo</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Row Level Security:</span>
              <span className="text-[#1e3a8a] font-bold">RLS Enable</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Operario Mode:</span>
              <span className="bg-[#f1f5f9] px-1.5 py-0.5 rounded text-[10px]">v1.0-live</span>
            </div>
          </div>

        </aside>

        {/* ================= COLUMN 2: ACTIVE CENTER STREAM (PHONE EMULATOR SCREEN) ================= */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative">
          
          {/* Subtle decoration lines for geometric balance backdrop */}
          <div className="hidden lg:block absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-5 left-5 w-24 h-24 border border-[#1e3a8a]"></div>
            <div className="absolute bottom-5 right-5 w-48 h-48 border-r border-b border-[#1e3a8a]"></div>
            <div className="absolute top-20 right-10 w-12 h-12 rounded-full border border-amber-500"></div>
          </div>

          {/* Desktop simulator container or raw mobile content directly based on viewport */}
          <div className="w-full h-full flex flex-col items-center justify-center">
            
            {/* Desktop Simulator wrapper - only rendered as physical phone mock on wide screen, and raw container on mobile */}
            <div className="lg:my-4 transition-all duration-300 w-full max-w-md lg:w-[380px] lg:h-[780px] lg:bg-white lg:border-[12px] lg:border-[#0f172a] lg:rounded-[48px] lg:shadow-2xl lg:overflow-y-auto lg:relative flex flex-col">
              
              {/* Internal phone header details (time and status indicator) only on desktop screens */}
              <div className="hidden lg:flex justify-between items-center px-8 pt-6 pb-2 text-[10px] text-[#64748b] bg-white sticky top-0 z-30 font-mono font-semibold">
                <span>16:40 UTC</span>
                <div className="w-20 h-4 bg-[#0f172a] rounded-full absolute left-1/2 -translate-x-1/2 top-4"></div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>LTE / 5G</span>
                </div>
              </div>

              {/* The actual operational application container */}
              <div className="flex-1 bg-[#f8fafc] flex flex-col">
                
                {/* Mobile Welcome Frame Banner */}
                <div className="px-5 pt-6 pb-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-black text-[#f59e0b] uppercase tracking-widest leading-none">Portal de Obra</span>
                    <h2 className="text-lg font-extrabold text-[#0f172a] tracking-tight">Registro de Operarios</h2>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Registra de forma segura tus horas y materiales para el seguimiento inmediato en las oficinas centrales de <strong>A&J GRUP BCN</strong>.
                  </p>
                </div>

                {/* Main interactive form */}
                <div className="px-5 pb-8 flex-1">
                  <ParteDiarioForm />
                </div>

              </div>

            </div>

          </div>

        </main>


        {/* ================= COLUMN 3: RIGHT PANEL (SUPABASE CODE INTEGRATION DETAILS) ================= */}
        <section className="bg-[#0f172a] text-[#94a3b8] p-6 flex flex-col gap-6 border-l border-[#1e293b] max-lg:hidden">
          
          <div>
            <div className="inline-block bg-[#1e293b] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mb-2">
              Supabase Config
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">supabaseClient.ts</h3>
            
            <div className="bg-[#1e293b] text-[#e2e8f0] p-4 rounded-xl font-mono text-[11px] leading-relaxed relative overflow-hidden border border-[#1e3a8a]/20">
              <div className="text-gray-400">// Client Connection</div>
              <div className="mt-1"><span className="text-[#f59e0b]">import</span> {'{ createClient }'} <span className="text-[#f59e0b]">from</span> <span className="text-emerald-400">"@supabase/supabase-js"</span></div>
              <div className="mt-2 text-gray-400">// Dynamic env retrieval</div>
              <div><span className="text-[#f59e0b]">const</span> url = import.meta.env.VITE_SUPABASE_URL</div>
              <div><span className="text-[#f59e0b]">const</span> key = import.meta.env.VITE_SUPABASE_ANON_KEY</div>
              <div className="mt-2"><span className="text-[#f59e0b]">export const</span> supabase = createClient(url, key)</div>
            </div>
          </div>

          <div>
            <div className="inline-block bg-[#1e293b] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mb-2">
              Database Insertion
            </div>
            <h3 className="text-sm font-bold text-white mb-2 font-mono">Insert Daily Log Logics</h3>
            
            <div className="bg-[#1e293b] text-[#e2e8f0] p-4 rounded-xl font-mono text-[11.5px] leading-relaxed relative overflow-hidden text-left border border-[#1e3a8a]/20">
              <span className="text-[#f59e0b]">const</span> saveTask = <span className="text-[#f59e0b]">async</span> () =&gt; {'{'}
              <div className="pl-3"><span className="text-[#f59e0b]">const</span> {'{ error }'} = <span className="text-[#f59e0b]">await</span> supabase</div>
              <div className="pl-6">.from(<span className="text-emerald-400">'partes_trabajo'</span>)</div>
              <div className="pl-6">.insert([ {'{'}</div>
              <div className="pl-9 text-emerald-400">"obra_id" : current_id,</div>
              <div className="pl-9 text-emerald-400">"horas" : inputNumber,</div>
              <div className="pl-9 text-emerald-400">"descripcion" : textBody</div>
              <div className="pl-6"> {'}'} ])</div>
              <div>{'}'}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-white tracking-wider font-mono uppercase mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
              Esquema de Tablas
            </h4>
            <ul className="text-xs space-y-1.5 text-gray-400 font-mono">
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>• usuarios</span>
                <span className="text-gray-500 text-[10px]">RLS Activada</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>• obras</span>
                <span className="text-gray-500 text-[10px]">EN_CURSO Filter</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>• partes_trabajo</span>
                <span className="text-gray-500 text-[10px]">Auto Sinc</span>
              </li>
              <li className="flex justify-between pb-1">
                <span>• inventario</span>
                <span className="text-gray-500 text-[10px]">Opcional</span>
              </li>
            </ul>
          </div>

          {/* Vercel Status Tag */}
          <div className="mt-auto pt-4 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Vercel Build Status: Success
            </span>
            <span>4s build</span>
          </div>

        </section>

      </div>

      {/* 3. PERSISTENT MOBILE ACCENTS FOOTER */}
      <footer className="bg-white border-t border-[#e2e8f0] py-4 px-6 text-center text-xs font-mono tracking-wider text-[#64748b]">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <p>© {currentYear} A&J GRUP BCN</p>
          <div className="flex gap-4">
            <span className="text-[#1e3a8a] font-bold">REFORMAS INTEGRALES</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
