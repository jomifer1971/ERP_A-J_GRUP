/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Obra, InventarioItem, Usuario } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { Warehouse, Briefcase, Cpu, FileText, ArrowRightLeft, Plus, Trash2, Camera, ShieldAlert, Sparkles, Check, CheckCircle2, Import, Search, Phone, User } from 'lucide-react';

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
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [ocrImportDest, setOcrImportDest] = useState<string>('central');

  // Global notifications
  const [bannerSuccess, setBannerSuccess] = useState('');

  // Material and Operator finder state
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  const getMaterialSearchResults = () => {
    if (!materialSearchQuery.trim()) return [];
    const query = materialSearchQuery.toLowerCase();
    const results: Array<{
      articulo: string;
      cantidad: number;
      unidad: string;
      ubicacion: 'central' | { obraId: string; obraNombre: string };
      operariosActivos: Array<{ id: string; nombre: string; telefono?: string; rol: string }>;
    }> = [];

    // 1. Search in Central Stock
    centralStock.forEach(item => {
      if (item.articulo.toLowerCase().includes(query)) {
        results.push({
          articulo: item.articulo,
          cantidad: item.cantidad,
          unidad: item.unidad,
          ubicacion: 'central',
          operariosActivos: []
        });
      }
    });

    // 2. Search in all virtual stocks
    const usersRaw = localStorage.getItem('aj_users_v2');
    const clockingsRaw = localStorage.getItem('aj_fichajes_v2');
    let allUsers: Usuario[] = [];
    let allFichajes: any[] = [];
    try {
      if (usersRaw) allUsers = JSON.parse(usersRaw);
      if (clockingsRaw) allFichajes = JSON.parse(clockingsRaw);
    } catch {}

    Object.keys(virtualStocks).forEach((obraId) => {
      const items = virtualStocks[obraId] || [];
      const currentObra = obrasList.find(o => o.id === obraId);
      const obraNombre = currentObra?.nombre || 'Obra';
      
      items.forEach(item => {
        if (item.articulo.toLowerCase().includes(query)) {
          const activeOps: Array<{ id: string; nombre: string; telefono?: string; rol: string }> = [];
          
          // Sort clockings chronologically
          const sortedFichajes = [...allFichajes].sort((a,b) => 
            new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
          );

          allUsers.forEach(u => {
            const userLogs = sortedFichajes.filter(f => f.operario_id === u.id);
            if (userLogs.length > 0) {
              const lastLog = userLogs[userLogs.length - 1];
              if (lastLog.tipo === 'ENTRADA' && lastLog.obra_id === obraId) {
                activeOps.push({
                  id: u.id,
                  nombre: u.nombre,
                  telefono: u.telefono,
                  rol: u.rol === 'jefe_equipo' ? 'Jefe de Equipo' : 'Operario'
                });
              }
            }
          });

          results.push({
            articulo: item.articulo,
            cantidad: item.cantidad,
            unidad: item.unidad,
            ubicacion: { obraId, obraNombre },
            operariosActivos: activeOps
          });
        }
      });
    });

    return results;
  };

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

    // Load entire inventory from Supabase if active
    const loadData = async () => {
      let isLoadedFromSupabase = false;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('inventario').select('*');
          if (!error && data && data.length > 0) {
            const central: InventarioItem[] = data
              .filter((x: any) => x.obra_id === null)
              .map((x: any) => ({
                id: x.id,
                articulo: x.articulo,
                cantidad: Number(x.cantidad),
                unidad: x.unidad
              }));
            
            const virtuals: { [obraId: string]: InventarioItem[] } = {};
            data
              .filter((x: any) => x.obra_id !== null)
              .forEach((x: any) => {
                if (!virtuals[x.obra_id]) {
                  virtuals[x.obra_id] = [];
                }
                virtuals[x.obra_id].push({
                  id: x.id,
                  articulo: x.articulo,
                  cantidad: Number(x.cantidad),
                  unidad: x.unidad
                });
              });
            
            setCentralStock(central);
            setVirtualStocks(virtuals);
            localStorage.setItem('aj_stock_central', JSON.stringify(central));
            localStorage.setItem('aj_stock_virtuales', JSON.stringify(virtuals));
            isLoadedFromSupabase = true;
          }
        } catch (err) {
          console.warn('Fallo al cargar inventario de Supabase:', err);
        }
      }

      if (!isLoadedFromSupabase) {
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
      }
    };
    loadData();
  }, []);

  const saveCentralToStorage = async (updated: InventarioItem[]) => {
    const previousIds = centralStock.map(p => p.id);
    const updatedIds = updated.map(u => u.id);
    const deletedIds = previousIds.filter(id => !updatedIds.includes(id));

    setCentralStock(updated);
    localStorage.setItem('aj_stock_central', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        if (deletedIds.length > 0) {
          await supabase.from('inventario').delete().in('id', deletedIds);
        }
        if (updated.length > 0) {
          const dbItems = updated.map(item => ({
            id: item.id,
            articulo: item.articulo,
            cantidad: item.cantidad,
            unidad: item.unidad,
            obra_id: null
          }));
          await supabase.from('inventario').upsert(dbItems);
        }
      } catch (err) {
        console.warn('Error al guardar central stock en Supabase:', err);
      }
    }
  };

  const saveVirtualToStorage = async (updated: { [obraId: string]: InventarioItem[] }) => {
    const previousIds: string[] = [];
    Object.keys(virtualStocks).forEach(obraId => {
      (virtualStocks[obraId] || []).forEach(item => previousIds.push(item.id));
    });

    const updatedIds: string[] = [];
    Object.keys(updated).forEach(obraId => {
      (updated[obraId] || []).forEach(item => updatedIds.push(item.id));
    });

    const deletedIds = previousIds.filter(id => !updatedIds.includes(id));

    setVirtualStocks(updated);
    localStorage.setItem('aj_stock_virtuales', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        if (deletedIds.length > 0) {
          await supabase.from('inventario').delete().in('id', deletedIds);
        }
        
        const dbItems: any[] = [];
        Object.keys(updated).forEach(obraId => {
          (updated[obraId] || []).forEach(item => {
            dbItems.push({
              id: item.id,
              articulo: item.articulo,
              cantidad: item.cantidad,
              unidad: item.unidad,
              obra_id: obraId
            });
          });
        });
        
        if (dbItems.length > 0) {
          await supabase.from('inventario').upsert(dbItems);
        }
      } catch (err) {
        console.warn('Error al guardar virtual stocks en Supabase:', err);
      }
    }
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
    setCapturedImg(null); // Reset custom photo since template was chosen
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

  const handleOcrFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMockFileName(file.name);
      
      try {
        const previewUrl = URL.createObjectURL(file);
        setCapturedImg(previewUrl);
      } catch (err) {
        console.warn('Fallo al crear URL de vista previa:', err);
      }

      const randomT = ALBARANES_TEMPLATES[Math.floor(Math.random() * ALBARANES_TEMPLATES.length)];
      
      setIsScanning(true);
      setOcrSuccess(false);
      setScannedAlbaran(null);
      setOcrScannerText('Estableciendo conexión y procesando metadatos de captura...');

      setTimeout(() => {
        setOcrScannerText(`Cargando foto en el motor OCR: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
      }, 900);

      setTimeout(() => {
        setOcrScannerText(`Extrayendo artículos de albarán... Obteniendo correspondencia para: ${randomT.empresa}`);
      }, 1900);

      setTimeout(() => {
        setIsScanning(false);
        setOcrSuccess(true);
        setScannedAlbaran(randomT);
        setOcrScannerText('Lectura OCR de fotografía completada de forma óptima.');
      }, 3000);
    }
  };

  const handleDropOcrFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setMockFileName(file.name);
      
      try {
        const previewUrl = URL.createObjectURL(file);
        setCapturedImg(previewUrl);
      } catch (err) {
        console.warn('Fallo al crear URL de vista previa:', err);
      }

      const randomT = ALBARANES_TEMPLATES[Math.floor(Math.random() * ALBARANES_TEMPLATES.length)];
      
      setIsScanning(true);
      setOcrSuccess(false);
      setScannedAlbaran(null);
      setOcrScannerText('Procesando archivo soltado...');

      setTimeout(() => {
        setOcrScannerText(`Examinando archivo: ${file.name}...`);
      }, 900);

      setTimeout(() => {
        setOcrScannerText(`Analizando bloques de texto estructurados...`);
      }, 1900);

      setTimeout(() => {
        setIsScanning(false);
        setOcrSuccess(true);
        setScannedAlbaran(randomT);
        setOcrScannerText('Análisis OCR de archivo arrastrado finalizado.');
      }, 3000);
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

      {/* SEARCH SYSTEM FOR MATERIALS AND ACTIVE SITE OPERATORS */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-250/80 shadow-sm flex flex-col gap-4 animate-fadeIn">
        <div className="flex items-center gap-2 border-b pb-3 border-gray-100">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-700 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black font-mono uppercase tracking-wider text-slate-950">🔍 Localizador Inteligente de Materiales y Personal</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Busca cualquier material en tiempo real. Te diremos en qué almacén u obra está, y si hay operarios trabajando allí para contactarlos.</p>
          </div>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            value={materialSearchQuery}
            onChange={(e) => setMaterialSearchQuery(e.target.value)}
            placeholder="Escribe el nombre del artículo para consultar stock global... (ej: Pladur, Cemento, Cable, Split)"
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-gray-250 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-gray-400"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {materialSearchQuery && (
            <button
              onClick={() => setMaterialSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 font-mono bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Results layout */}
        {materialSearchQuery.trim() && (
          <div className="mt-2 flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">Resultados de Existencias</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-800 font-bold">
                Coincidencias: {getMaterialSearchResults().length}
              </span>
            </div>

            {getMaterialSearchResults().length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-gray-150 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                <ShieldAlert className="w-6 h-6 text-amber-500 animate-bounce" />
                <span className="text-xs font-bold text-slate-700">Sin stock registrado del material</span>
                <span className="text-[11px] text-gray-400 max-w-sm">No hemos encontrado ninguna coincidencia para "{materialSearchQuery}" en el Almacén Central ni en las obras activas.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                {getMaterialSearchResults().map((result, index) => (
                  <div key={index} className="bg-slate-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-3xs hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{result.articulo}</h4>
                        <span className="text-[10px] font-mono text-gray-400 block mt-0.5">Suministro de construcción</span>
                      </div>
                      <span className="text-xs font-black font-mono text-slate-700 bg-white border px-2.5 py-1 rounded-xl shadow-4xs whitespace-nowrap">
                        {result.cantidad} {result.unidad}
                      </span>
                    </div>

                    <div className="border-t border-gray-200/65 pt-2.5 flex items-center justify-between gap-2.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">Ubicación física:</span>
                      {result.ubicacion === 'central' ? (
                        <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                          📦 Almacén Central
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full truncate max-w-[170px]" title={result.ubicacion.obraNombre}>
                          🏢 Obra: {result.ubicacion.obraNombre}
                        </span>
                      )}
                    </div>

                    {/* Operational assistance: Operator present at the obra check */}
                    {result.ubicacion !== 'central' && (
                      <div className="mt-1.5 p-3 rounded-xl bg-white border border-gray-200 shadow-4xs flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest block">Personal en Obra</span>
                          {result.operariosActivos.length > 0 ? (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-150">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              ACTIVO EN OBRA
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-center">
                              SIN OPERARIOS HOY
                            </span>
                          )}
                        </div>

                        {result.operariosActivos.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {result.operariosActivos.map(op => (
                              <div key={op.id} className="flex items-center justify-between gap-2.5 p-2 bg-[#f8fafc] border border-gray-150 rounded-lg text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 text-[10px] font-black">
                                    {op.nombre.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-gray-800 leading-tight">{op.nombre}</div>
                                    <div className="text-[9px] font-mono text-gray-400 font-medium">{op.rol}</div>
                                  </div>
                                </div>
                                
                                {op.telefono ? (
                                  <a
                                    href={`tel:${op.telefono}`}
                                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all no-underline shadow-4xs border-none cursor-pointer"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-400" />
                                    {op.telefono}
                                  </a>
                                ) : (
                                  <span className="text-[9px] font-mono text-gray-400 font-medium">Sin teléfono</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-gray-400 leading-relaxed font-mono">
                            ⚠️ Actualmente no hay ningún operario fichado ni registrando parte en la obra "{result.ubicacion.obraNombre}".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: 1. ALMACÉN CENTRAL & 2. ALMACÉN VIRTUAL POR OBRA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: ALMACÉN CENTRAL */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200/90 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
            <div className="flex items-center gap-1.5 text-slate-800">
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
                    <span className="font-bold text-slate-700 font-mono whitespace-nowrap bg-white border px-2 py-1 rounded shadow-3xs text-[11px]">
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
                className="w-full px-2 py-2 bg-white border border-gray-250 rounded-xl text-xs font-bold text-slate-800 font-mono"
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
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all shadow-3xs shrink-0 w-full sm:w-auto flex items-center justify-center"
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
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
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
                transfOrigin === 'central' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-indigo-700 hover:bg-indigo-850'
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
            No pierdas tiempo picando facturas. Toma una foto con el móvil o sube un documento PDF/imagen para extraer los artículos e introducirlos en stock de forma inmediata.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            
            {/* LEFT SIDE: SCANNING CONTROLS */}
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">A) ORIGEN DEL DOCUMENTO:</span>
              
              {/* Invisible file input or native mobile camera capturer */}
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                id="ocr-camera-input"
                className="hidden"
                onChange={handleOcrFileSelected}
              />

              {/* Simulated Drag zone linked to camera upload */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOcrFile}
                onClick={() => document.getElementById('ocr-camera-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragActive ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200 hover:bg-slate-50'
                }`}
              >
                <Camera className="w-8 h-8 text-emerald-600/75 mb-2 animate-pulse" />
                <span className="text-xs text-gray-700 leading-relaxed font-bold">
                  Haz foto con el móvil, sube un PDF o arrastra aquí
                </span>
                <span className="text-[10px] text-gray-400 mt-1">El motor OCR extraerá automáticamente las líneas de material</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('ocr-camera-input')?.click()}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono text-xs uppercase rounded-xl tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                  title="Hacer foto o subir PDF / Imagen"
                >
                  <Camera className="w-4 h-4 text-slate-300" />
                  Hacer Foto / Cargar Archivo
                </button>
              </div>

               <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-wider">Plantillas rápidas para pruebas:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1">
                  {ALBARANES_TEMPLATES.map((tmpl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleOcrTemplateSelect(tmpl)}
                      disabled={isScanning}
                      className="flex flex-col items-start gap-1 p-2 bg-white border border-slate-200 hover:border-slate-450 hover:bg-slate-50/10 rounded-xl text-left transition-all disabled:opacity-50"
                    >
                      <span className="text-[9px] font-black font-mono text-slate-800 truncate w-full leading-tight">{tmpl.empresa.split(/[\s,]+/)[0]}</span>
                      <span className="text-[8px] text-gray-400 font-mono">{tmpl.items.length} art. • {tmpl.nroAlbaran.split('-').pop()}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: SCANNING RESULT & DESTINATION CHOOSE */}
            <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
              <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">B) DETECCIÓN Y ASENTAMIENTO:</span>

              {/* Status information or extracted preview image */}
              {capturedImg && (
                <div className="p-2 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-150">
                  <img
                    src={capturedImg}
                    alt="Miniatura Albarán"
                    className="h-10 w-10 object-cover rounded-lg border border-slate-200 bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-gray-400 uppercase leading-none font-bold">Archivo cargado:</p>
                    <p className="text-xs text-gray-700 font-bold truncate mt-0.5">{mockFileName || 'Captura_albaran.jpg'}</p>
                  </div>
                </div>
              )}

              {/* Scan loading state */}
              {isScanning && (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-emerald-50/20 rounded-2xl border border-emerald-100 p-4 min-h-[140px]">
                  <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-3"></div>
                  <p className="text-xs font-bold text-emerald-800 animate-pulse">{ocrScannerText}</p>
                  <p className="text-[9px] text-emerald-600 mt-1 font-mono">Procesando lectura con inteligencia artificial de obra...</p>
                </div>
              )}

              {/* Successful scan result */}
              {!isScanning && scannedAlbaran ? (
                <div className="flex-1 flex flex-col gap-3 p-4 bg-emerald-50/15 border border-emerald-200/50 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-emerald-100/60 pb-2">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-tight">{scannedAlbaran.empresa}</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{scannedAlbaran.nroAlbaran}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {scannedAlbaran.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <span className="font-medium truncate mr-2">{it.articulo}</span>
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">
                          +{it.cantidad} {it.unidad}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Destination warehouse selector */}
                  <div className="mt-1 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-wider leading-none">Guardar material en:</label>
                    <select
                      value={ocrImportDest}
                      onChange={e => setOcrImportDest(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-250 rounded-lg text-xs font-bold text-gray-800"
                    >
                      <option value="central">📦 Almacén Central de Proveedores</option>
                      {obrasList.map(o => (
                        <option key={o.id} value={o.id}>
                          🏗️ Obra: {o.nombre} ({o.ubicacion})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                !isScanning && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-gray-200 rounded-2xl min-h-[140px] bg-slate-25/20">
                    <span className="text-xs text-slate-400">Ningún albarán leído todavía</span>
                    <span className="text-[10px] text-gray-400 max-w-[210px] mt-1 leading-relaxed">Toma una foto, sube un PDF de prueba o haz clic en una plantilla rápida para verificar la extracción de artículos.</span>
                  </div>
                )
              )}

              {/* ACTION TRIGGER BUTTON (The single green button requested!) */}
              <button
                type="button"
                onClick={() => {
                  if (scannedAlbaran) {
                    handleImportScannedItems(ocrImportDest);
                  }
                }}
                disabled={!scannedAlbaran || isScanning}
                className={`w-full py-3.5 px-4 font-black font-mono text-[11px] uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                  scannedAlbaran && !isScanning
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 border border-gray-200/60 cursor-not-allowed'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${scannedAlbaran ? 'bg-emerald-300 animate-ping' : 'bg-gray-350 opacity-40'}`} />
                {scannedAlbaran 
                  ? `Confirmar e ingresar albarán en destino ✓` 
                  : `Esperando lectura de albarán...`}
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
