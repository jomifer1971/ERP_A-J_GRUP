/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Obra, InventarioItem } from '../types';
import { Warehouse, Briefcase, Cpu, FileText, ArrowRightLeft, Plus, Trash2, Camera, ShieldAlert, Sparkles, Check, CheckCircle2, Import } from 'lucide-react';

interface AlbaratTemplate {
  empresa: string;
  nroAlbaran: string;
  fecha: string;
  items: { articulo: string; cantidad: number; unidad: string }[];
}

const ALBARANES_TEMPLATES: AlbaratTemplate[] = [
  {
    empresa: 'BRICOMART BADALONA',
    nroAlbaran: 'ALB-2026-9921',
    fecha: '2026-06-07',
    items: [
      { articulo: 'Saco Cemento Gris Portland 25kg', cantidad: 30, unidad: 'sacos' },
      { articulo: 'Placa Pladur Knauf Standard 120x250', cantidad: 16, unidad: 'placas' },
      { articulo: 'Perfil Montante Acero Galvanizado 46mm', cantidad: 45, unidad: 'perfiles' },
      { articulo: 'Pasta de Juntas Pladur Sacos 20kg', cantidad: 5, unidad: 'sacos' }
    ]
  },
  {
    empresa: 'SALVADOR ESCODA S.A. (CLIMATIZACIÓN)',
    nroAlbaran: 'ALB-3829-BCN',
    fecha: '2026-06-05',
    items: [
      { articulo: 'Split Aire Acondicionado Fujitsu Inverter', cantidad: 4, unidad: 'unidades' },
      { articulo: 'Rollo Cobre Aislado Reforzado 3/8"', cantidad: 3, unidad: 'rollos' },
      { articulo: 'Soporte Escuadra Amortiguado Exterior', cantidad: 8, unidad: 'unidades' },
      { articulo: 'Canaleta PVC Blanca para Tuberías 2m', cantidad: 15, unidad: 'tiras' }
    ]
  },
  {
    empresa: 'MATERIALES ELÉCTRICOS GENERALES (PRO)',
    nroAlbaran: 'ALB-2026-3392',
    fecha: '2026-06-06',
    items: [
      { articulo: 'Cable Cobre Libre Halógenos 2.5mm Azul 100m', cantidad: 6, unidad: 'bobinas' },
      { articulo: 'Cable Cobre Libre Halógenos 2.5mm Marrón 100m', cantidad: 6, unidad: 'bobinas' },
      { articulo: 'Caja Mecanismos Universal Empotrar', cantidad: 80, unidad: 'unidades' },
      { articulo: 'Interruptor Conmutador Simon 82 Blanco', cantidad: 40, unidad: 'unidades' }
    ]
  }
];

export default function AlmacenesTab() {
  const [centralStock, setCentralStock] = useState<InventarioItem[]>([]);
  // Store virtual stock per obra. Key = obraId, Value = list of items
  const [virtualStocks, setVirtualStocks] = useState<{ [obraId: string]: InventarioItem[] }>({});

  const [obrasList, setObrasList] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<string>('');

  // Transfer forms fields
  const [transfOrigin, setTransfOrigin] = useState<'central' | 'virtual'>('central');
  const [transfDestObraId, setTransfDestObraId] = useState('');
  const [transfItemIndex, setTransfItemIndex] = useState<number>(0);
  const [transfCantidad, setTransfCantidad] = useState<number>(5);

  // Manual placement fields
  const [nuevoArticulo, setNuevoArticulo] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState(10);
  const [nuevaUnidad, setNuevaUnidad] = useState('unidades');

  // OCR state machine
  const [dragActive, setDragActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [scannedAlbaran, setScannedAlbaran] = useState<AlbaratTemplate | null>(null);
  const [ocrScannerText, setOcrScannerText] = useState('Esperando documento...');
  const [mockFileName, setMockFileName] = useState('');

  // Global notifications
  const [bannerSuccess, setBannerSuccess] = useState('');

  useEffect(() => {
    // 1. Load active works list in system
    const savedObras = localStorage.getItem('aj_obras_v2');
    let oList: Obra[] = [];
    if (savedObras) {
      try {
        oList = JSON.parse(savedObras);
        setObrasList(oList);
      } catch {}
    }
    if (oList.length > 0) {
      setSelectedObraId(oList[0].id);
      setTransfDestObraId(oList[0].id);
    }

    // 2. Load Central Warehouse stock
    const savedCentral = localStorage.getItem('aj_stock_central');
    if (savedCentral) {
      try { setCentralStock(JSON.parse(savedCentral)); } catch {}
    } else {
      const initialCentral: InventarioItem[] = [
        { id: 'i-1', articulo: 'Saco Cemento Gris Portland 25kg', cantidad: 120, unidad: 'sacos' },
        { id: 'i-2', articulo: 'Placa Pladur Knauf Standard 120x250', cantidad: 85, unidad: 'placas' },
        { id: 'i-3', articulo: 'Pasta de Juntas Pladur Sacos 20kg', cantidad: 32, unidad: 'sacos' },
        { id: 'i-4', articulo: 'Cable Cobre Libre Halógenos 1.5mm Verde/Amarillo 100m', cantidad: 12, unidad: 'bobinas' },
        { id: 'i-5', articulo: 'Porcelánico Estepa Gris 60x60 (Caja 1.44m2)', cantidad: 40, unidad: 'cajas' },
        { id: 'i-6', articulo: 'Tubo Multicapa Fontanería Aislado 20mm 50m', cantidad: 8, unidad: 'rollos' }
      ];
      setCentralStock(initialCentral);
      localStorage.setItem('aj_stock_central', JSON.stringify(initialCentral));
    }

    // 3. Load Virtual warehouses stocks
    const savedVirtual = localStorage.getItem('aj_stock_virtuales');
    if (savedVirtual) {
      try { setVirtualStocks(JSON.parse(savedVirtual)); } catch {}
    } else {
      const initialVirtuals: { [obraId: string]: InventarioItem[] } = {
        'o-1': [
          { id: 'v-1', articulo: 'Placa Pladur Knauf Standard 120x250', cantidad: 20, unidad: 'placas' },
          { id: 'v-2', articulo: 'Saco Adhesivo Porcelánico C2TES1 25kg', cantidad: 15, unidad: 'sacos' }
        ],
        'o-2': [
          { id: 'v-3', articulo: 'Split Aire Acondicionado Fujitsu Inverter', cantidad: 2, unidad: 'unidades' }
        ]
      };
      setVirtualStocks(initialVirtuals);
      localStorage.setItem('aj_stock_virtuales', JSON.stringify(initialVirtuals));
    }
  }, []);

  const saveCentralToStorage = (updated: InventarioItem[]) => {
    setCentralStock(updated);
    localStorage.setItem('aj_stock_central', JSON.stringify(updated));
  };

  const saveVirtualToStorage = (updated: { [obraId: string]: InventarioItem[] }) => {
    setVirtualStocks(updated);
    localStorage.setItem('aj_stock_virtuales', JSON.stringify(updated));
  };

  // Add Item to Central manually
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoArticulo.trim() || nuevaCantidad <= 0) return;

    const existingIndex = centralStock.findIndex(i => i.articulo.toLowerCase() === nuevoArticulo.trim().toLowerCase());
    if (existingIndex > -1) {
      const updated = [...centralStock];
      updated[existingIndex].cantidad += nuevaCantidad;
      saveCentralToStorage(updated);
    } else {
      const newItem: InventarioItem = {
        id: `i-${Date.now()}`,
        articulo: nuevoArticulo.trim(),
        cantidad: nuevaCantidad,
        unidad: nuevaUnidad
      };
      saveCentralToStorage([...centralStock, newItem]);
    }

    setNuevoArticulo('');
    setNuevaCantidad(10);
    triggerSuccessBanner('Material añadido manualmente al Almacén Central.');
  };

  // Delete manual index
  const handleDeleteCentralItem = (id: string) => {
    const updated = centralStock.filter(i => i.id !== id);
    saveCentralToStorage(updated);
  };

  // Trigger transfers Central <-> Virtual Obra
  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (transfOrigin === 'central') {
      // From central to Virtual Obra
      if (centralStock.length === 0) return;
      const originItem = centralStock[transfItemIndex];
      if (!originItem || originItem.cantidad < transfCantidad) {
        alert('❌ Error: El Almacén Central no posee suficiente stock de este material.');
        return;
      }

      // Deduct from Central
      const nextCentral = centralStock.map((it, idx) => {
        if (idx === transfItemIndex) {
          return { ...it, cantidad: it.cantidad - transfCantidad };
        }
        return it;
      }).filter(it => it.cantidad > 0);

      // Add to Virtual Obra
      const nextVirtuals = { ...virtualStocks };
      const currentList = nextVirtuals[transfDestObraId] || [];
      const vExistIdx = currentList.findIndex(vi => vi.articulo.toLowerCase() === originItem.articulo.toLowerCase());

      if (vExistIdx > -1) {
        currentList[vExistIdx].cantidad += transfCantidad;
      } else {
        currentList.push({
          id: `v-tr-${Date.now()}`,
          articulo: originItem.articulo,
          cantidad: transfCantidad,
          unidad: originItem.unidad
        });
      }
      nextVirtuals[transfDestObraId] = currentList;

      saveCentralToStorage(nextCentral);
      saveVirtualToStorage(nextVirtuals);
      triggerSuccessBanner(`✓ Transferencia completada: ${transfCantidad} ${originItem.unidad} movidos a obra virtual.`);
    } else {
      // From Virtual Obra to Central
      const activeOList = virtualStocks[selectedObraId] || [];
      if (activeOList.length === 0) return;
      const originItem = activeOList[transfItemIndex];
      if (!originItem || originItem.cantidad < transfCantidad) {
        alert('❌ Error: El almacén virtual de esta obra no posee suficiente stock de este material.');
        return;
      }

      // Deduct from Virtual Obra
      const nextVirtuals = { ...virtualStocks };
      nextVirtuals[selectedObraId] = activeOList.map((it, idx) => {
        if (idx === transfItemIndex) {
          return { ...it, cantidad: it.cantidad - transfCantidad };
        }
        return it;
      }).filter(it => it.cantidad > 0);

      // Add to Central
      const nextCentral = [...centralStock];
      const cExistIdx = nextCentral.findIndex(ci => ci.articulo.toLowerCase() === originItem.articulo.toLowerCase());
      if (cExistIdx > -1) {
        nextCentral[cExistIdx].cantidad += transfCantidad;
      } else {
        nextCentral.push({
          id: `i-tr-${Date.now()}`,
          articulo: originItem.articulo,
          cantidad: transfCantidad,
          unidad: originItem.unidad
        });
      }

      saveCentralToStorage(nextCentral);
      saveVirtualToStorage(nextVirtuals);
      triggerSuccessBanner(`✓ Retorno a central completado: ${transfCantidad} ${originItem.unidad} recuperados al almacén central.`);
    }
    setTransfCantidad(5);
    setTransfItemIndex(0);
  };

  // OCR Recognition flow simulator
  const handleOcrTemplateSelect = (template: AlbaratTemplate) => {
    setIsScanning(true);
    setOcrSuccess(false);
    setScannedAlbaran(null);
    setOcrScannerText('Estableciendo conexión con canal OCR inteligente...');
    setMockFileName(`Albaran_Scan_${template.empresa.substring(0,6).trim().toUpperCase()}_${Date.now().toString().substring(8)}.jpg`);

    // Staged timeout logs for amazing visual sensation
    setTimeout(() => {
      setOcrScannerText(`Detectando cabeceras de facturación... Encontrado: ${template.empresa}`);
    }, 1000);

    setTimeout(() => {
      setOcrScannerText(`Extrayendo desglose de materiales: ${template.items.length} artículos identificados.`);
    }, 2050);

    setTimeout(() => {
      setIsScanning(false);
      setOcrSuccess(true);
      setScannedAlbaran(template);
      setOcrScannerText('Reconocimiento OCR completado con precisión.');
    }, 3200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDropOcrFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Choose random template for mock scan when custom file dropped
      const randomT = ALBARANES_TEMPLATES[Math.floor(Math.random() * ALBARANES_TEMPLATES.length)];
      handleOcrTemplateSelect(randomT);
    }
  };

  const handleImportScannedItems = (targetWh: 'central' | string) => {
    if (!scannedAlbaran) return;

    if (targetWh === 'central') {
      const nextCentral = [...centralStock];
      scannedAlbaran.items.forEach(sItem => {
        const existIdx = nextCentral.findIndex(ci => ci.articulo.toLowerCase() === sItem.articulo.toLowerCase());
        if (existIdx > -1) {
          nextCentral[existIdx].cantidad += sItem.cantidad;
        } else {
          nextCentral.push({
            id: `i-ocr-${Date.now()}-${Math.random()}`,
            articulo: sItem.articulo,
            cantidad: sItem.cantidad,
            unidad: sItem.unidad
          });
        }
      });
      saveCentralToStorage(nextCentral);
      triggerSuccessBanner(`✓ Albarán importado con éxito: ${scannedAlbaran.items.length} materiales ingresados en Almacén Central.`);
    } else {
      const nextVirtuals = { ...virtualStocks };
      const currentList = nextVirtuals[targetWh] || [];
      
      scannedAlbaran.items.forEach(sItem => {
        const existIdx = currentList.findIndex(vi => vi.articulo.toLowerCase() === sItem.articulo.toLowerCase());
        if (existIdx > -1) {
          currentList[existIdx].cantidad += sItem.cantidad;
        } else {
          currentList.push({
            id: `v-ocr-${Date.now()}-${Math.random()}`,
            articulo: sItem.articulo,
            cantidad: sItem.cantidad,
            unidad: sItem.unidad
          });
        }
      });
      nextVirtuals[targetWh] = currentList;
      saveVirtualToStorage(nextVirtuals);
      
      const obraNombre = obrasList.find(o => o.id === targetWh)?.nombre || 'Obra';
      triggerSuccessBanner(`✓ Albarán importado con éxito: ${scannedAlbaran.items.length} materiales transferidos directamente a almacén virtual por obra.`);
    }

    setScannedAlbaran(null);
    setOcrSuccess(false);
    setMockFileName('');
  };

  const triggerSuccessBanner = (msg: string) => {
    setBannerSuccess(msg);
    setTimeout(() => setBannerSuccess(''), 5000);
  };

  const activeObraStockList = virtualStocks[selectedObraId] || [];

  return (
    <div id="almacenes_panel_tab" className="flex flex-col gap-6 w-full max-w-7xl mx-auto font-sans">
      
      {/* Banner Success */}
      {bannerSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-950 font-semibold rounded-2xl text-xs flex items-center gap-2 animate-pulse shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bannerSuccess}</span>
        </div>
      )}

      {/* Grid: 1. ALMACÉN CENTRAL & 2. ALMACÉN VIRTUAL POR OBRA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: ALMACÉN CENTRAL */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
            <div className="flex items-center gap-1.5 text-[#07474e]">
              <Warehouse className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-black font-mono uppercase tracking-wider">📦 ALMACÉN CENTRAL (Logística Central)</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-gray-500 font-bold">PRO</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Reserva general de materiales centralizados de <strong>A&J GRUP BCN</strong> listos para ser movilizados a los tajos de obra correspondientes.
          </p>

          {/* List layout of central items */}
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {centralStock.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10 font-mono">El almacén central está vacío.</p>
            ) : (
              centralStock.map(it => (
                <div key={it.id} className="flex items-center justify-between gap-3 bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold">
                  <span className="text-gray-850 truncate max-w-[250px]">{it.articulo}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#07474e] font-mono whitespace-nowrap bg-white border px-2 py-1 rounded shadow-3xs text-[11px]">
                      {it.cantidad} {it.unidad}
                    </span>
                    <button
                      onClick={() => handleDeleteCentralItem(it.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form to insert item to central manually */}
          <form onSubmit={handleAddManualItem} className="border-t border-gray-100 pt-3.5 mt-2 flex flex-col sm:flex-row gap-2.5 items-end">
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Nombre del Material</label>
              <input
                type="text"
                value={nuevoArticulo}
                onChange={e => setNuevoArticulo(e.target.value)}
                placeholder="Ej. Planchas Poliestireno 40mm"
                className="w-full px-2.5 py-1.5 bg-slate-50/20 border border-gray-250 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div className="w-full sm:w-24 flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Cantidad</label>
              <input
                type="number"
                value={nuevaCantidad}
                onChange={e => setNuevaCantidad(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50/20 border border-gray-250 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div className="w-full sm:w-28 flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Unidad</label>
              <select
                value={nuevaUnidad}
                onChange={e => setNuevaUnidad(e.target.value)}
                className="w-full px-2 py-2 bg-white border border-gray-250 rounded-xl text-xs font-bold text-[#07474e] font-mono"
              >
                <option value="unidades">unidades</option>
                <option value="sacos">sacos</option>
                <option value="placas">placas</option>
                <option value="bobinas">bobinas</option>
                <option value="cajas">cajas</option>
                <option value="m lineales">m lineales</option>
              </select>
            </div>

            <button
              type="submit"
              className="py-2 px-3 bg-[#07474e] hover:bg-[#0b4e56] text-white text-xs font-black rounded-xl transition-all shadow-3xs shrink-0 w-full sm:w-auto flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Card 2: ALMACÉN VIRTUAL POR OBRA */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
            <div className="flex items-center gap-1.5 text-indigo-700">
              <Briefcase className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-black font-mono uppercase tracking-wider">🏢 ALMACÉN VIRTUAL (Por Obra Activa)</h2>
            </div>
            
            {/* Obra chooser */}
            <select
              value={selectedObraId}
              onChange={e => setSelectedObraId(e.target.value)}
              className="px-2.5 py-1 border border-indigo-150 rounded-lg text-xs font-bold font-mono text-indigo-800 bg-white outline-none"
            >
              {obrasList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nombre.substring(0,25) + (o.nombre.length > 25 ? '...' : '')}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Stock virtual de material que ya ha sido transferido, acopiado o comprado para el proyecto físico seleccionado.
          </p>

          {/* List of items physical on selected site */}
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {activeObraStockList.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10 font-mono">Esta obra no posee materiales asignados digitalmente en este momento.</p>
            ) : (
              activeObraStockList.map(it => (
                <div key={it.id} className="flex items-center justify-between gap-3 bg-indigo-50/15 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold">
                  <span className="text-gray-800 font-medium">{it.articulo}</span>
                  <span className="font-bold text-indigo-800 font-mono whitespace-nowrap bg-white border border-indigo-150 px-2.5 py-1 rounded shadow-3xs text-[11px]">
                    {it.cantidad} {it.unidad}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Helpful context helper inside tab */}
          <div className="bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100 text-[10px] text-indigo-900 leading-normal font-medium mt-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></div>
            <span>Las existencias virtuales coinciden con la contabilidad e informes diarios de los jefes de obra.</span>
          </div>

        </div>

      </div>

      {/* Grid bottom row: 3. ACCIÓN DE TRANSFERENCIA DE MATERIALES & 4. LECTOR DE ALBARANES POR OCR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* Card 3: TRANSFERENCIA LOGÍSTICA DE STOCK (Grid span: 5) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-1.5 text-gray-700 border-b pb-3 border-gray-100">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-black font-mono uppercase tracking-wider">🔄 Movimientos de Materiales</h2>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Utiliza este módulo rápido para transferir existencias del almacén general central a un proyecto en marcha (o para reingresar sobrantes de obra).
          </p>

          <form onSubmit={handleTransfer} className="flex flex-col gap-4 bg-[#f8fafc] border rounded-2xl p-4 mt-2">
            
            {/* Origin direction select direction toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTransfOrigin('central')}
                className={`flex-1 py-2 rounded-xl text-center text-xs font-black font-mono uppercase tracking-wide border transition-all ${
                  transfOrigin === 'central'
                    ? 'bg-[#07474e] text-white border-[#07474e] shadow-xs'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                CENTRAL ➜ OBRA
              </button>
              
              <button
                type="button"
                onClick={() => setTransfOrigin('virtual')}
                className={`flex-1 py-2 rounded-xl text-center text-xs font-black font-mono uppercase tracking-wide border transition-all ${
                  transfOrigin === 'virtual'
                    ? 'bg-indigo-700 text-white border-indigo-750 shadow-xs'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                OBRA ➜ CENTRAL
              </button>
            </div>

            {/* Selector of item based on origin stock selection database */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Elegir Material a mover</label>
              <select
                value={transfItemIndex}
                onChange={e => setTransfItemIndex(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-bold text-gray-800"
              >
                {transfOrigin === 'central' ? (
                  centralStock.map((it, idx) => (
                    <option key={it.id} value={idx}>
                      {it.articulo} ({it.cantidad} {it.unidad} disponibles)
                    </option>
                  ))
                ) : (
                  activeObraStockList.map((it, idx) => (
                    <option key={it.id} value={idx}>
                      {it.articulo} ({it.cantidad} {it.unidad} en obra)
                    </option>
                  ))
                )}

                {(transfOrigin === 'central' ? centralStock : activeObraStockList).length === 0 && (
                  <option value={0}>No hay existencias para transferir</option>
                )}
              </select>
            </div>

            {/* Target work chooser if transferring from central */}
            {transfOrigin === 'central' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Obra Destinataria</label>
                <select
                  value={transfDestObraId}
                  onChange={e => setTransfDestObraId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-250 rounded-xl text-xs font-bold text-gray-800"
                >
                  {obrasList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">Cantidad a Transferir</label>
              <input
                type="number"
                value={transfCantidad}
                onChange={e => setTransfCantidad(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl transition-all shadow-sm ${
                transfOrigin === 'central' ? 'bg-[#07474e] hover:bg-[#0b4e56]' : 'bg-indigo-700 hover:bg-indigo-850'
              }`}
            >
              Confirmar Traspaso de Material
            </button>

          </form>

        </div>

        {/* Card 4: RECONOCIMIENTO DE ALBARANES POR OCR (Grid span: 7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-6 border border-gray-200/90 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div className="flex items-center gap-1.5 text-emerald-800">
              <Cpu className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="text-sm font-black font-mono uppercase tracking-wider">🧿 ESCÁNER OCR INTELIGENTE (Albaranes)</h2>
            </div>
            
            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-black text-emerald-800 font-mono uppercase">PROCESO IA</span>
          </div>

          <p className="text-xs text-gray-500 leading-normal">
            No pierdas tiempo picando facturas. Sube un albarán y deja que el sistema lo escanee para añadir el material al inventario de forma automática.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">
            
            {/* OCR upload and Scan templates chooser (column span: 5) */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">Pruébalo con Plantillas reales:</span>
              
              <div className="flex flex-col gap-2">
                {ALBARANES_TEMPLATES.map((tmpl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleOcrTemplateSelect(tmpl)}
                    disabled={isScanning}
                    className="flex flex-col items-start gap-1 p-3 bg-slate-50 border border-slate-200 hover:border-emerald-250 rounded-2xl text-left transition-all disabled:opacity-50"
                  >
                    <span className="text-[10px] font-black font-mono text-[#07474e] leading-snug">{tmpl.empresa}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{tmpl.nroAlbaran} • {tmpl.items.length} artículos</span>
                  </button>
                ))}
              </div>

              {/* Simulated Drag zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOcrFile}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                  dragActive ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200 hover:bg-slate-50'
                }`}
              >
                <Camera className="w-6 h-6 text-emerald-600/75 mb-1 animate-pulse" />
                <span className="text-[10px] text-gray-550 leading-relaxed">
                  <strong>Arrastra un ticket real</strong> para comprobar el OCR
                </span>
              </div>
            </div>

            {/* Lector feed monitor dashboard panel (column span: 7) */}
            <div className="md:col-span-7 bg-slate-900 text-slate-100 rounded-3xl p-4 font-mono select-none relative flex flex-col gap-4 overflow-hidden border border-slate-800">
              
              {/* Scan laser overlay line simulator */}
              {isScanning && (
                <div className="absolute left-0 w-full h-1.5 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce" style={{ top: '20%' }}></div>
              )}

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  Lector OCR Log: ON
                </span>
                <span className="text-[9px] text-slate-500">v2.4-stable</span>
              </div>

              {/* Console log dynamic output container */}
              <div className="flex-1 flex flex-col gap-1 text-[11px] leading-relaxed select-text font-mono text-slate-350 min-h-[140px]">
                <div className="text-slate-500">&gt; console.ready: OCR_CONTROLLER_INITIALIZED</div>
                
                {isScanning ? (
                  <div className="text-amber-400 animate-pulse mt-2">{`⚡ EXTRACCIÓN EN CURSO:\n  ${ocrScannerText}`}</div>
                ) : scannedAlbaran ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-emerald-400 font-extrabold">&gt; EXTRAÍDO CON ÉXITO: {scannedAlbaran.empresa}</span>
                    <span className="text-slate-400 text-[10px]">Albarán: {scannedAlbaran.nroAlbaran} • {scannedAlbaran.fecha}</span>
                    
                    <div className="border-t border-slate-800 pt-1.5 mt-1 flex flex-col gap-1 text-[10px]">
                      {scannedAlbaran.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span>{it.articulo}</span>
                          <span className="text-emerald-400 font-bold">{it.cantidad} {it.unidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 py-10 text-center text-[10px]">
                    Selecciona una plantilla de albarán o arrastra un archivo para iniciar la lectura. El motor de procesamiento extraerá el desglose en 3 segundos.
                  </div>
                )}
              </div>

              {/* Import trigger actions */}
              {ocrSuccess && scannedAlbaran && (
                <div className="border-t border-slate-800 pt-3 flex flex-col gap-2.5">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">¿Dónde deseas asentar este material?</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImportScannedItems('central')}
                      className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-650 text-slate-900 border-none font-black text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Import className="w-3 h-3" />
                      ALMACÉN CENTRAL
                    </button>
                    
                    <button
                      onClick={() => handleImportScannedItems(selectedObraId)}
                      className="flex-1 py-1.5 bg-[#004e56] hover:bg-[#0b5c65] text-white border-none font-black text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Warehouse className="w-3 h-3 text-emerald-400" />
                      ESTA OBRA EN CURSO
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
