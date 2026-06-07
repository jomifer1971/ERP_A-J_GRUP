import React, { useState, useEffect, useRef } from 'react';
import { Obra, Usuario } from '../types';
import { 
  Briefcase, 
  MapPin, 
  Search, 
  UploadCloud, 
  FileText, 
  Layers, 
  Calculator, 
  Trash2, 
  Download, 
  CheckCircle, 
  Plus, 
  Clock, 
  ShieldAlert,
  FileCheck,
  Building,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Compass,
  Locate,
  Shield,
  ShieldCheck
} from 'lucide-react';

interface ObrasTabProps {
  user: Usuario;
  onRefreshObras?: () => void;
}

interface DocumentoObra {
  id: string;
  obraId: string;
  nombre: string;
  tipo: 'Planos' | 'Presupuesto' | 'Contrato' | 'Seguridad' | 'Otro';
  size: string;
  fecha: string;
  subidoPor: string;
  aprobado: boolean;
  aprobadoPor?: string;
  fileData?: string; // Data URL for downloading
}

// Catalan Municipal Seed Directory for immediate autocompletion with coordinates
const CATALAN_PRESET_STREETS = [
  { calle: 'Carrer del Consell de Cent, Barcelona', ciudad: 'Barcelona', lat: 41.388824, lon: 2.163212 },
  { calle: 'Avinguda Diagonal, 450, Barcelona', ciudad: 'Barcelona', lat: 41.396112, lon: 2.152438 },
  { calle: 'La Rambla, 120, Barcelona', ciudad: 'Barcelona', lat: 41.383182, lon: 2.171120 },
  { calle: 'Carrer de Girona, 32, Sabadell', ciudad: 'Sabadell', lat: 41.545892, lon: 2.110292 },
  { calle: 'Avinguda de Josep Tarradellas, L\'Hospitalet de Llobregat', ciudad: 'Hospitalet', lat: 41.361102, lon: 2.102381 },
  { calle: 'Carrer Major, 15, Lleida', ciudad: 'Lleida', lat: 41.614917, lon: 0.626883 },
  { calle: 'Rambla Nova, 85, Tarragona', ciudad: 'Tarragona', lat: 41.115854, lon: 1.250553 },
  { calle: 'Carrer de la Rutlla, 44, Girona', ciudad: 'Gironona', lat: 41.979313, lon: 2.821415 },
  { calle: 'Carrer de Sant Joan, Reus', ciudad: 'Reus', lat: 41.155551, lon: 1.107255 },
  { calle: 'Carrer de Guifré, Badalona', ciudad: 'Badalona', lat: 41.442654, lon: 2.241512 },
  { calle: 'Avinguda de Barcelona, Terrassa', ciudad: 'Terrassa', lat: 41.561541, lon: 2.019124 }
];

export default function ObrasTab({ user, onRefreshObras }: ObrasTabProps) {
  const isAdmin = user.rol === 'ceo' || user.rol === 'admin';

  // 1. Obras State
  const [obras, setObras] = useState<Obra[]>(() => {
    const saved = localStorage.getItem('aj_obras_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Obra[];
        return parsed.map((o: Obra) => {
          const updated = { ...o };
          if (updated.geovalla_activa === undefined) {
            updated.geovalla_activa = o.id === 'o-1' || o.id === 'o-2';
          }
          if (!updated.radio) {
            updated.radio = o.id === 'o-2' ? 100 : 150;
          }
          if (!updated.latitud || !updated.longitud) {
            if (o.id === 'o-1') {
              updated.latitud = 41.390035;
              updated.longitud = 2.158145;
            } else if (o.id === 'o-2') {
              updated.latitud = 41.404285;
              updated.longitud = 2.157143;
            } else if (o.id === 'o-3') {
              updated.latitud = 41.401138;
              updated.longitud = 2.198357;
            } else if (o.id === 'o-4') {
              updated.latitud = 41.383122;
              updated.longitud = 2.161092;
            } else {
              updated.latitud = 41.385063;
              updated.longitud = 2.173403;
            }
          }
          return updated;
        });
      } catch {
        return [];
      }
    }
    // Default initial seed with geovalla active and GPS positions
    const defaultObras: Obra[] = [
      { id: 'o-1', nombre: 'Reforma Integral Duplex Mallorca', direccion: 'Carrer de Mallorca, 142, BCN', estado: 'EN_CURSO', geovalla_activa: true, latitud: 41.390035, longitud: 2.158145, radio: 150 },
      { id: 'o-2', nombre: 'Instalación Climatización Oficinas Gràcia', direccion: 'Carrer de Verdi, 88, BCN', estado: 'EN_CURSO', geovalla_activa: true, latitud: 41.404285, longitud: 2.157143, radio: 100 },
      { id: 'o-3', nombre: 'Instalación Eléctrica Nave Poblenou', direccion: 'Carrer de Pallars, 201, BCN', estado: 'EN_CURSO', geovalla_activa: false, latitud: 41.401138, longitud: 2.198357, radio: 200 },
      { id: 'o-4', nombre: 'Pintura y Suelos Consultorio Médico', direccion: 'Gran Via de les Corts Catalanes, 560, BCN', estado: 'EN_CURSO', geovalla_activa: false, latitud: 41.383122, longitud: 2.161092, radio: 150 }
    ];
    localStorage.setItem('aj_obras_v2', JSON.stringify(defaultObras));
    return defaultObras;
  });

  // Selected Obra to inspect or add documents
  const [selectedObraId, setSelectedObraId] = useState<string>(obras[0]?.id || '');

  // 2. Catalan Street Autocomplete State
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ display_name: string; lat?: number; lon?: number }>>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lon?: number }>({});
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // 3. New Obra Form State
  const [newObraNombre, setNewObraNombre] = useState('');
  const [newObraEstado, setNewObraEstado] = useState<'EN_CURSO' | 'FINALIZADA' | 'PENDIENTE'>('EN_CURSO');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // 4. Document Manager State
  const [documentos, setDocumentos] = useState<DocumentoObra[]>(() => {
    const saved = localStorage.getItem('aj_obras_documentos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // Initial cool sample construction documents
    const initialDocs: DocumentoObra[] = [
      {
        id: 'doc-1',
        obraId: 'o-1',
        nombre: 'Plano_Distribucion_Tabiqueria_V2.pdf',
        tipo: 'Planos',
        size: '4.8 MB',
        fecha: '05/06/2026',
        subidoPor: 'CEO A&J',
        aprobado: true,
        aprobadoPor: 'CEO A&J'
      },
      {
        id: 'doc-2',
        obraId: 'o-1',
        nombre: 'Memoria_Presupuesto_Mallorca_Firmado.pdf',
        tipo: 'Presupuesto',
        size: '1.2 MB',
        fecha: '01/06/2026',
        subidoPor: 'Admin Central',
        aprobado: true,
        aprobadoPor: 'Admin Central'
      },
      {
        id: 'doc-3',
        obraId: 'o-2',
        nombre: 'Manual_Maquinas_Climatizacion_Kruger.pdf',
        tipo: 'Seguridad',
        size: '12.4 MB',
        fecha: '03/06/2026',
        subidoPor: 'Carlos Jefe',
        aprobado: false
      }
    ];
    localStorage.setItem('aj_obras_documentos', JSON.stringify(initialDocs));
    return initialDocs;
  });

  // Geovalla editor state local to selected obra
  const [editGeovallaActiva, setEditGeovallaActiva] = useState(false);
  const [editLat, setEditLat] = useState(41.385063);
  const [editLon, setEditLon] = useState(2.173403);
  const [editRadio, setEditRadio] = useState(150);
  const [geovallaSuccess, setGeovallaSuccess] = useState(false);
  const [geovallaGpsLoading, setGeovallaGpsLoading] = useState(false);

  // Sync geovalla values when selection changes
  useEffect(() => {
    const currentObra = obras.find(o => o.id === selectedObraId);
    if (currentObra) {
      setEditGeovallaActiva(!!currentObra.geovalla_activa);
      setEditLat(currentObra.latitud || 41.385063);
      setEditLon(currentObra.longitud || 2.173403);
      setEditRadio(currentObra.radio || 150);
    }
  }, [selectedObraId, obras]);

  const [docFilterType, setDocFilterType] = useState<string>('todos');
  const [uploadDocTipo, setUploadDocTipo] = useState<'Planos' | 'Presupuesto' | 'Contrato' | 'Seguridad' | 'Otro'>('Planos');
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5. Materials Calculator State (Proactive Tool)
  const [calcTipo, setCalcTipo] = useState<'yeso_pladur' | 'hormigon' | 'pintura'>('yeso_pladur');
  // Pladur calculator inputs
  const [pladurLargo, setPladurLargo] = useState<number>(10);
  const [pladurAlto, setPladurAlto] = useState<number>(2.5);
  // Hormigon calculator inputs
  const [hormigonLargo, setHormigonLargo] = useState<number>(5);
  const [hormigonAncho, setHormigonAncho] = useState<number>(4);
  const [hormigonEspesor, setHormigonEspesor] = useState<number>(0.15); // in meters
  // Pintura calculator inputs
  const [pinturaAncho, setPinturaAncho] = useState<number>(12);
  const [pinturaAlto, setPinturaAlto] = useState<number>(2.5);
  const [pinturaCapas, setPinturaCapas] = useState<number>(2);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('aj_obras_v2', JSON.stringify(obras));
    if (onRefreshObras) {
      onRefreshObras();
    }
  }, [obras]);

  useEffect(() => {
    localStorage.setItem('aj_obras_documentos', JSON.stringify(documentos));
  }, [documentos]);

  // Address lookup controller
  const handleAddressChange = async (val: string) => {
    setAddressQuery(val);
    if (!val.trim()) {
      setAddressSuggestions([]);
      return;
    }

    setShowAddressDropdown(true);

    // Apply quick filtered local presets for zero-latency response with coords
    const localFiltered = CATALAN_PRESET_STREETS.filter(s => 
      s.calle.toLowerCase().includes(val.toLowerCase()) || 
      s.ciudad.toLowerCase().includes(val.toLowerCase())
    ).map(s => ({ display_name: `${s.calle}, Catalunya`, lat: s.lat, lon: s.lon }));

    setAddressSuggestions(localFiltered);

    // Dynamic Live OpenStreetMap Lookup (highly optimized without blocks or keys)
    if (val.length > 3) {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ' Catalunya')}&format=json&addressdetails=1&countrycodes=es&limit=4`,
          { headers: { 'Accept-Language': 'ca,es' } }
        );
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData && remoteData.length > 0) {
            const formatted = remoteData.map((item: any) => ({
              display_name: item.display_name,
              lat: item.lat ? parseFloat(item.lat) : undefined,
              lon: item.lon ? parseFloat(item.lon) : undefined
            }));
            // Merge unique local and OSM predictions
            setAddressSuggestions(prev => {
              const merged = [...localFiltered];
              formatted.forEach((f: any) => {
                if (!merged.some(m => m.display_name.split(',')[0].trim() === f.display_name.split(',')[0].trim())) {
                  merged.push(f);
                }
              });
              return merged.slice(0, 7);
            });
          }
        }
      } catch (err) {
        console.warn('Nominatim limit reached or network error, displaying local Catalonia presets:', err);
      } finally {
        setIsSearchingAddress(false);
      }
    }
  };

  // Select predicted address with coordinates
  const selectAddress = (addr: string, lat?: number, lon?: number) => {
    // Simplify Catalan display coordinates from NOMINATIM for builders
    const cleaned = addr.replace(', Comunidad Autónoma de Cataluña / Catalunya, España', '').replace(', España', '');
    setAddressQuery(cleaned);
    setSelectedCoords({ lat, lon });
    setShowAddressDropdown(false);
  };

  // Submit new Obra
  const handleCreateObra = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!newObraNombre.trim()) {
      setFormError('Introduce un nombre descriptivo para la obra.');
      return;
    }
    if (!addressQuery.trim()) {
      setFormError('Asigna una calle de Cataluña mediante el buscador.');
      return;
    }

    const newObra: Obra = {
      id: `obra-${Date.now()}`,
      nombre: newObraNombre.trim(),
      direccion: addressQuery,
      estado: newObraEstado,
      geovalla_activa: false,
      latitud: selectedCoords.lat || 41.385063, // Fallback to Barcelona Centre Catalan coordinates
      longitud: selectedCoords.lon || 2.173403,
      radio: 150
    };

    setObras(prev => [newObra, ...prev]);
    setSelectedObraId(newObra.id);

    // Reset Form
    setNewObraNombre('');
    setAddressQuery('');
    setNewObraEstado('EN_CURSO');
    setSelectedCoords({});
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 4000);
  };

  // Modify Obra State
  const updateObraEstado = (id: string, newEst: 'EN_CURSO' | 'FINALIZADA' | 'PENDIENTE') => {
    setObras(prev => prev.map(o => o.id === id ? { ...o, estado: newEst } : o));
  };

  // Delete Obra (safe confirmation)
  const handleDeleteObra = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar esta obra? Se desasociarán sus partes de trabajo.')) {
      setObras(prev => prev.filter(o => o.id !== id));
      if (selectedObraId === id) {
        setSelectedObraId(obras[0]?.id || '');
      }
    }
  };

  // Save Geovalla configuration changes (only by CEO and Admin)
  const handleSaveGeovalla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId) return;
    
    setObras(prev => prev.map(o => o.id === selectedObraId ? {
      ...o,
      geovalla_activa: editGeovallaActiva,
      latitud: editLat,
      longitud: editLon,
      radio: editRadio
    } : o));
    
    setGeovallaSuccess(true);
    setTimeout(() => setGeovallaSuccess(false), 3000);
  };

  // Capture current browser GPS coords to set as center
  const handleCaptureCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización o el iframe no tiene los permisos necesarios.');
      return;
    }
    
    setGeovallaGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditLat(parseFloat(position.coords.latitude.toFixed(6)));
        setEditLon(parseFloat(position.coords.longitude.toFixed(6)));
        setGeovallaGpsLoading(false);
      },
      (error) => {
        setGeovallaGpsLoading(false);
        let errorMsg = 'No se pudo obtener tu ubicación.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso de geolocalización denegado. Permite el acceso GPS en la barra del navegador de tu teléfono o PC.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'La información del GPS no está disponible en este momento.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Tiempo de espera agotado al obtener el GPS.';
        }
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Document actions
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file import and convert to dataURL (base64) so it works real-time
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Size formatting
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = `${sizeInMB} MB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      const nuevoDoc: DocumentoObra = {
        id: `doc-${Date.now()}`,
        obraId: selectedObraId,
        nombre: file.name,
        tipo: uploadDocTipo,
        size: sizeStr,
        fecha: new Date().toLocaleDateString('es-ES'),
        subidoPor: user.nombre,
        aprobado: user.rol === 'ceo' || user.rol === 'admin', // Auto approve if admin uploaded
        aprobadoPor: (user.rol === 'ceo' || user.rol === 'admin') ? user.nombre : undefined,
        fileData: dataUrl
      };

      setDocumentos(prev => [nuevoDoc, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDoc(true);
  };

  const handleDragLeave = () => {
    setIsDraggingDoc(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDoc(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Approve Document
  const handleApproveDoc = (docId: string) => {
    setDocumentos(prev => prev.map(d => 
      d.id === docId ? { ...d, aprobado: true, aprobadoPor: user.nombre } : d
    ));
  };

  // Delete Document
  const handleDeleteDoc = (docId: string) => {
    if (confirm('¿Seguro que deseas eliminar este plano/documento de la obra?')) {
      setDocumentos(prev => prev.filter(d => d.id !== docId));
    }
  };

  // 6. Proactive calculation solver engines
  const computeMaterialEstimates = () => {
    if (calcTipo === 'yeso_pladur') {
      const area = pladurLargo * pladurAlto;
      // standard boards of 1.2 x 2.5 = 3m2
      const placas = Math.ceil(area / 3);
      const perfilesMetros = Math.ceil(area * 1.8); // approximate vertical studs + track
      const tornillos = placas * 30; // 30 units per pladur sheet approx.
      return {
        area: `${area.toFixed(1)} m²`,
        items: [
          { name: 'Placas de Pladur Estándar (1.2m x 2.5m)', qty: placas, unit: 'unidades' },
          { name: 'Perfilería de Acero Galvanizado (Montantes y Canales)', qty: perfilesMetros, unit: 'metros lineales' },
          { name: 'Tornillos Autoroscantes Pladur 25mm', qty: tornillos, unit: 'unidades' },
          { name: 'Pasta de Juntas Listas al Uso', qty: Math.ceil(area * 0.9), unit: 'kg' }
        ]
      };
    } else if (calcTipo === 'hormigon') {
      const cubicMeters = hormigonLargo * hormigonAncho * hormigonEspesor;
      // Cement recipe multiplier for standard building floor (approx. 350kg cement / m3)
      const cementKg = Math.ceil(cubicMeters * 350);
      const arenaTon = (cubicMeters * 0.8).toFixed(1);
      const gravaTon = (cubicMeters * 1.1).toFixed(1);
      return {
        area: `${cubicMeters.toFixed(2)} m³ de volumen`,
        items: [
          { name: 'Cemento Portand de Alta Resistencia (Sacos 25kg)', qty: Math.ceil(cementKg / 25), unit: 'sacos' },
          { name: 'Arena Fina Lavada para Mezcla', qty: arenaTon, unit: 'toneladas' },
          { name: 'Grava de Obra Gruesa Canto Rodado', qty: gravaTon, unit: 'toneladas' },
          { name: 'Agua de Amasado necesaria', qty: Math.ceil(cubicMeters * 180), unit: 'litros' }
        ]
      };
    } else {
      // Pintura
      const area = pinturaAncho * pinturaAlto;
      const totalArea = area * pinturaCapas;
      // Normal coverage is 12m2 per Liter
      const litros = Math.ceil(totalArea / 11);
      return {
        area: `${area.toFixed(1)} m² de pared (${pinturaCapas} manos)`,
        items: [
          { name: 'Pintura Plástica Profesional Mate de Alta Cubrición', qty: litros, unit: 'litros' },
          { name: 'Imprimación Selladora Fijadora de Superficies', qty: Math.ceil(area / 8), unit: 'litros' },
          { name: 'Cinta de Enmascarar con Papel de Protección (50m)', qty: Math.ceil(pinturaAncho / 15), unit: 'rollos' }
        ]
      };
    }
  };

  const currentObra = obras.find(o => o.id === selectedObraId);
  const currentDocs = documentos.filter(d => d.obraId === selectedObraId && (docFilterType === 'todos' || d.tipo === docFilterType));
  const calcOutput = computeMaterialEstimates();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6" id="obras-management-window">
      
      {/* LEFT AREA: active works control catalog */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* WORK CREATOR PANEL (Authorized only, operators blocked) */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 font-mono uppercase tracking-wide">
              <Briefcase className="w-4 h-4 text-[#07474e]" />
              Alta de Obra Nueva
            </h3>
            <span className="text-[10px] text-[#07474e] font-mono font-bold bg-teal-50 px-2 py-0.5 rounded-md">ADMINS</span>
          </div>

          {!isAdmin ? (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Acceso Limitado a Operarios
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Tus credenciales de <strong>{user.rol}</strong> te permiten ver el manual técnico, planos y adjuntar partes/fotografías, pero no crear o borrar obras oficiales de A&J GRUP.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateObra} className="flex flex-col gap-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-mono font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                  ¡OBRA REGISTRADA DE ALTA!
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Nombre del Proyecto</label>
                <input 
                  type="text"
                  placeholder="Ej: Reforma Dúplex Paseo de Gracia"
                  value={newObraNombre}
                  onChange={(e) => setNewObraNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#07474e]/20"
                />
              </div>

              {/* CATALAN STREETS AUTOCOMPLETE */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono flex items-center justify-between">
                  <span>Buscador de Calles de Catalunya</span>
                  {isSearchingAddress && <RefreshCw className="w-2.5 h-2.5 text-[#07474e] animate-spin" />}
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ej: Diagonal 450, Sabadell, Rambla..."
                    value={addressQuery}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => { if (addressQuery) setShowAddressDropdown(true); }}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#07474e]/20 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                </div>

                {/* Autocomplete Predictions Panel */}
                {showAddressDropdown && addressSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto overflow-hidden divide-y divide-gray-50">
                    {addressSuggestions.map((item, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => selectAddress(item.display_name, item.lat, item.lon)}
                        className="w-full text-left px-3 py-2 text-[11px] hover:bg-teal-50 transition-colors flex items-start gap-1 text-gray-700 font-medium"
                      >
                        <MapPin className="w-3 h-3 text-[#07474e] mt-0.5 shrink-0" />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-[#07474e] bg-teal-50/50 p-2 rounded-lg leading-relaxed mt-1">
                  💡 Autocompleta calles reales con el servidor corporativo directo. No inventes nombres si deseas mantener consistencia.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Fase Inicial</label>
                <select
                  value={newObraEstado}
                  onChange={(e: any) => setNewObraEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="EN_CURSO">🟢 EN CURSO (EJECUCIÓN)</option>
                  <option value="PENDIENTE">🟡 PLANIFICADA / PENDIENTE</option>
                  <option value="FINALIZADA">🔴 CONCLUIDA / ENTREGADA</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#07474e] hover:bg-[#0b4e56] text-white py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" /> Registrar Obra
              </button>
            </form>
          )}
        </div>

        {/* WORK SELECTOR / ACTIVE CARD DIRECTORY */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 font-mono uppercase tracking-wide">
            <Building className="w-4 h-4 text-[#07474e]" />
            Listado de Obras ({obras.length})
          </h3>
          
          <div className="flex flex-col gap-2.5 max-h-[290px] overflow-y-auto pr-1">
            {obras.map(o => (
              <div 
                key={o.id}
                onClick={() => setSelectedObraId(o.id)}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 relative ${
                  selectedObraId === o.id 
                    ? 'bg-teal-50/60 border-[#07474e] shadow-sm ring-1 ring-[#07474e]/30' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-xs truncate max-w-[200px]" style={{ color: selectedObraId === o.id ? '#07474e' : '#1e293b' }}>
                    {o.nombre}
                  </h4>
                  <span className={`text-[8px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded-md ${
                    o.estado === 'EN_CURSO' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : o.estado === 'PENDIENTE' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {o.estado.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-1.5 flex items-center gap-1 leading-normal">
                  <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="truncate">{o.direccion}</span>
                </p>

                {isAdmin && (
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200/50">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => updateObraEstado(o.id, 'EN_CURSO')}
                        className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${o.estado === 'EN_CURSO' ? 'bg-emerald-600 text-white' : 'bg-gray-150 text-gray-600 hover:bg-gray-200'}`}
                      >
                        En Curso
                      </button>
                      <button 
                        onClick={() => updateObraEstado(o.id, 'FINALIZADA')}
                        className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${o.estado === 'FINALIZADA' ? 'bg-indigo-600 text-white' : 'bg-gray-150 text-gray-600 hover:bg-gray-200'}`}
                      >
                        Finalizar
                      </button>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteObra(o.id); }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg"
                      title="Eliminar Obra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT AREA: Document manager and calculators */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* LARGE SECTION: Obra Info Card & Plan/Documents Library */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col gap-5">
          
          {currentObra ? (
            <div className="flex flex-col gap-4">
              
              {/* Profile header of selected Obra */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-gradient-to-r from-teal-50/40 to-cyan-50/20 rounded-2xl border border-teal-150">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-white border border-gray-200 text-[#07474e] rounded-xl flex items-center justify-center shadow-xs">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800 leading-tight">{currentObra.nombre}</h2>
                    <p className="text-[11px] text-[#07474e] font-mono mt-1 flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> {currentObra.direccion}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[10px] font-black font-mono tracking-wider px-2 py-1 rounded-lg ${
                    currentObra.estado === 'EN_CURSO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-150 text-gray-600'
                  }`}>
                    {currentObra.estado}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono mt-1">Carga de planos segura</span>
                </div>
              </div>

              {/* Geovalla de Seguridad Component */}
              <div id="geovalla_container" className="bg-[#f8fafc] rounded-2xl border border-gray-200/90 p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 border border-teal-100 rounded-lg text-[#07474e]">
                      <Shield className="w-4 h-4 text-[#07474e]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black font-mono uppercase tracking-wide text-gray-800">Geovalla de Seguridad GPS</h3>
                      <p className="text-[10px] text-gray-400">Control de fichajes por perímetro virtual (solo CEO/Admin).</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {currentObra.geovalla_activa ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black font-mono tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs uppercase">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Activa ({currentObra.radio}m)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black font-mono tracking-wide bg-gray-100 text-gray-500 border border-gray-200 uppercase">
                        Apagada / Sin Límite
                      </span>
                    )}
                  </div>
                </div>

                {/* Display Current Coordinates summary to people without role modifications */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white px-3 py-2 rounded-xl border border-gray-150">
                    <span className="text-[8px] font-bold text-gray-400 uppercase font-mono tracking-wider">Latitud Centro</span>
                    <p className="text-xs font-bold text-gray-700 font-mono mt-0.5">{currentObra.latitud?.toFixed(6) || 'N/A'}</p>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-gray-150">
                    <span className="text-[8px] font-bold text-gray-400 uppercase font-mono tracking-wider">Longitud Centro</span>
                    <p className="text-xs font-bold text-gray-700 font-mono mt-0.5">{currentObra.longitud?.toFixed(6) || 'N/A'}</p>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-gray-150">
                    <span className="text-[8px] font-bold text-gray-400 uppercase font-mono tracking-wider font-bold">Radio de Control</span>
                    <p className="text-xs font-bold text-gray-700 font-mono mt-0.5">{currentObra.radio || 150} metros</p>
                  </div>
                </div>

                {/* Editable Section ONLY for CEO/Admin */}
                {isAdmin ? (
                  <form onSubmit={handleSaveGeovalla} className="flex flex-col gap-3 mt-1.5 bg-white p-3 rounded-xl border border-[#e2e8f0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black font-mono text-[#07474e] uppercase">Modo de Modificación (Panel CEO & Admin)</span>
                      
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={editGeovallaActiva} 
                          onChange={(e) => setEditGeovallaActiva(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#07474e]"></div>
                        <span className="ml-2 text-[10px] font-bold font-mono text-gray-700 uppercase">
                          {editGeovallaActiva ? 'Valla Activada' : 'Valla Desactivada'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Latitud</label>
                        <input 
                          type="number" 
                          step="0.000001"
                          value={editLat}
                          onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Longitud</label>
                        <input 
                          type="number" 
                          step="0.000001"
                          value={editLon}
                          onChange={(e) => setEditLon(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase font-mono">Radio de Control (m)</label>
                        <select 
                          value={editRadio}
                          onChange={(e) => setEditRadio(parseInt(e.target.value) || 150)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold font-mono text-[#07474e]"
                        >
                          <option value="50">50m (Muy Estricto)</option>
                          <option value="100">100m (Estricto)</option>
                          <option value="150">150m (Recomendado)</option>
                          <option value="200">200m (Estándar)</option>
                          <option value="300">300m (Amplio)</option>
                          <option value="500">500m (Muy Amplio)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleCaptureCurrentGps}
                        disabled={geovallaGpsLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-150 bg-teal-50/50 hover:bg-teal-50 text-[10px] text-[#07474e] font-black font-mono transition-colors disabled:opacity-50"
                      >
                        <Locate className={`w-3.5 h-3.5 ${geovallaGpsLoading ? 'animate-spin text-teal-600' : ''}`} />
                        {geovallaGpsLoading ? 'CAPTURANDO GPS...' : '📍 FIJAR MI GPS ACTUAL'}
                      </button>

                      <div className="flex items-center gap-2 self-end">
                        {geovallaSuccess && (
                          <span className="text-[9px] font-black font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded-md animate-fade-in shrink-0">
                            ¡GUARDADO CORRECTO!
                          </span>
                        )}
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#07474e] hover:bg-[#07474e]/90 text-white text-[10px] font-black font-mono uppercase tracking-wider rounded-lg transition-all shadow-sm"
                        >
                          Guardar Geovalla
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl flex items-start gap-2 mt-1">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-[#0f172a] leading-relaxed">
                        🛡️ <strong>Saber más:</strong> Esta obra requiere estar físicamente dentro de su geovalla ({currentObra.radio} metros) para poder fichar tu parte de trabajo diario. Modificable solo por CEO y Administradores.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Repository & Tab Filters */}
              <div className="flex flex-col gap-4 mt-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black font-mono uppercase tracking-wide flex items-center gap-1.5 text-gray-800">
                      <FolderOpen className="w-4 h-4 text-[#07474e]" /> Archivos y Planos de Obra
                    </h3>
                    <p className="text-xs text-gray-500">Documentación de planos constructivos, presupuestos y licencias vigentes.</p>
                  </div>

                  <div className="flex items-center gap-1.5 self-start overflow-x-auto">
                    {['todos', 'Planos', 'Presupuesto', 'Contrato', 'Seguridad'].map(tipo => (
                      <button
                        key={tipo}
                        onClick={() => setDocFilterType(tipo)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg font-mono tracking-tight transition-colors whitespace-nowrap ${
                          docFilterType === tipo 
                            ? 'bg-[#07474e] text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tipo === 'todos' ? 'TODOS' : tipo.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Segment (Drag & Drop) */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${
                    isDraggingDoc 
                      ? 'border-[#07474e] bg-teal-50/40 scale-[0.99] shadow-inner' 
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50/90'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-[#07474e] animate-pulse" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-700">Arrastra archivos aquí o presiona para buscar</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">Soporta PDF planos, imágenes de obra, JPEG o presupuestos Excel hasta 20MB</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold text-gray-500">Categoría a subir:</span>
                    <select
                      value={uploadDocTipo}
                      onChange={(e: any) => setUploadDocTipo(e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold"
                    >
                      <option value="Planos">Planos Técnicos</option>
                      <option value="Presupuesto">Presupuestos / Control</option>
                      <option value="Contrato">Contratos de Obra</option>
                      <option value="Seguridad">Plan de Seguridad y RLS</option>
                      <option value="Otro">Otros Documentos</option>
                    </select>

                    <button 
                      type="button" 
                      onClick={triggerFileSelect} 
                      className="px-3 py-1 bg-gray-200 text-gray-800 text-[10px] rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                      Examinar
                    </button>
                  </div>

                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    accept=".pdf,image/*,.doc,.docx,.xlsx"
                  />
                </div>

                {/* File list */}
                <div className="flex flex-col gap-2 mt-2">
                  {currentDocs.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400 font-medium">No hay archivos guardados bajo la categoría "{docFilterType}" para esta obra.</p>
                    </div>
                  ) : (
                    currentDocs.map(doc => (
                      <div key={doc.id} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            doc.tipo === 'Planos' ? 'bg-blue-50 text-blue-600' :
                            doc.tipo === 'Presupuesto' ? 'bg-amber-50 text-amber-600' :
                            doc.tipo === 'Contrato' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate max-w-[250px] md:max-w-[400px] text-gray-800" title={doc.nombre}>
                              {doc.nombre}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-bold uppercase tracking-wider text-[9px] bg-white border px-1.5 py-0.5 rounded-md inline-block">{doc.tipo}</span>
                              <span>• {doc.size}</span>
                              <span>• Subido por: {doc.subidoPor}</span>
                              <span>• {doc.fecha}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {doc.aprobado ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black font-mono tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg">
                              <FileCheck className="w-3.5 h-3.5" /> APROBADO {doc.aprobadoPor && `POR ${doc.aprobadoPor.toUpperCase()}`}
                            </span>
                          ) : (
                            isAdmin ? (
                              <button
                                onClick={() => handleApproveDoc(doc.id)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black font-mono tracking-wide rounded-lg shadow-sm transition-colors uppercase"
                              >
                                Aprobar Plano
                              </button>
                            ) : (
                              <span className="text-[9px] font-mono bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-lg">
                                Pendiente Firma
                              </span>
                            )
                          )}

                          {doc.fileData ? (
                            <a 
                              href={doc.fileData} 
                              download={doc.nombre}
                              className="p-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg shadow-2xs shrink-0"
                              title="Descargar Archivo Real"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button 
                              onClick={() => {
                                // Create an elegant local dummy text file download if real raw data is not loaded yet
                                const element = document.createElement("a");
                                const fileContent = `A&J GRUP BCN\nDocumento: ${doc.nombre}\nFase: ${currentObra.nombre}\nPlano Técnico Corporativo de Obra Registrado de forma Segura.`;
                                const file = new Blob([fileContent], {type: 'text/plain'});
                                element.href = URL.createObjectURL(file);
                                element.download = doc.nombre;
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                              }}
                              className="p-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg shadow-2xs shrink-0 flex items-center justify-center"
                              title="Bajar Plano Seguro"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button 
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                            title="Eliminar Documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
              
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3">
              <Building className="w-12 h-12 text-teal-100 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-gray-700">Por favor, selecciona o crea una obra activa en la lista izquierda</p>
                <p className="text-xs text-gray-400">Verás todos sus planos y material específico.</p>
              </div>
            </div>
          )}

        </div>

        {/* PROACTIVE TOOL: Concrete & Drywall Construction Materials Estimator */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black font-mono uppercase tracking-wide flex items-center gap-2 text-gray-800">
                <Calculator className="w-4 h-4 text-[#07474e]" />
                Calculadora Profesional de Materiales para Obra
              </h3>
              <span className="text-[10px] bg-sky-50 text-sky-700 font-mono font-bold px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-500" /> PROACTIVO A&J
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Calcula cemento, placas de Pladur y sacos de yeso requeridos según las medidas del plano.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* Calculation parameters */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCalcTipo('yeso_pladur')}
                  className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    calcTipo === 'yeso_pladur' ? 'bg-[#07474e] text-white shadow-xs' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  TABIQUERÍA PLADUR
                </button>
                <button
                  type="button"
                  onClick={() => setCalcTipo('hormigon')}
                  className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    calcTipo === 'hormigon' ? 'bg-[#07474e] text-white shadow-xs' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  SOLERAS HORMIGÓN
                </button>
                <button
                  type="button"
                  onClick={() => setCalcTipo('pintura')}
                  className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    calcTipo === 'pintura' ? 'bg-[#07474e] text-white shadow-xs' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  PINTADO PAREDES
                </button>
              </div>

              {calcTipo === 'yeso_pladur' && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Largo Tabique (m)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="200"
                        value={pladurLargo} 
                        onChange={e => setPladurLargo(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Alto Tabique (m)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        max="10"
                        value={pladurAlto} 
                        onChange={e => setPladurAlto(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal italic">Calculado para placas estándar de cartón-yeso (1.2m x 2.5m = 3m²).</p>
                </div>
              )}

              {calcTipo === 'hormigon' && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Largo (m)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={hormigonLargo} 
                        onChange={e => setHormigonLargo(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Ancho (m)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={hormigonAncho} 
                        onChange={e => setHormigonAncho(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Grosor (m)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0.05" 
                        max="1"
                        value={hormigonEspesor} 
                        onChange={e => setHormigonEspesor(Math.max(0.01, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal italic">Cálculo de dosificación estándar H-200 (350 kg cemento por m³ de relleno).</p>
                </div>
              )}

              {calcTipo === 'pintura' && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Ancho total (m)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={pinturaAncho} 
                        onChange={e => setPinturaAncho(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Alto Pared (m)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        value={pinturaAlto} 
                        onChange={e => setPinturaAlto(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 font-mono uppercase">Manos/Capas</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        value={pinturaCapas} 
                        onChange={e => setPinturaCapas(Math.max(1, Number(e.target.value)))}
                        className="p-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal italic">Rendimiento estimado de pintura plástica profesional a 11-12m² por litro y capa.</p>
                </div>
              )}

            </div>

            {/* Calculations outputs visualizer */}
            <div className="md:col-span-7 bg-[#f8fafc] border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 relative">
              <div className="flex justify-between items-center bg-white border border-gray-150 px-3 py-1.5 rounded-lg shadow-2xs">
                <span className="text-[10px] text-gray-500 font-black uppercase font-mono tracking-wider">Volumen / Superficie estimada:</span>
                <span className="text-xs font-mono text-teal-800 font-extrabold">{calcOutput.area}</span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Materiales requeridos en obra:</span>
                
                <div className="flex flex-col gap-2">
                  {calcOutput.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white border border-gray-100 p-2 rounded-xl">
                      <span className="text-gray-600 font-medium">{item.name}</span>
                      <span className="font-mono font-black text-slate-800 shrink-0 select-all bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md text-[11px]">
                        {item.qty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {currentObra && (
                <div className="mt-1 pt-2 border-t border-gray-200/50 flex justify-between items-center">
                  <span className="text-[9px] text-gray-400 font-mono italic">¿Asociar estimación a esta obra activa?</span>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Se ha copiado el desglose al portapapeles. Puedes pegarlo en la descripción de las tareas de hoy para la obra: ${currentObra.nombre}`);
                      const summaryText = calcOutput.items.map(i => `- ${i.qty} ${i.unit} de ${i.name}`).join('\n');
                      navigator.clipboard.writeText(`Cálculos de materiales para ${currentObra.nombre} (${calcOutput.area}):\n${summaryText}`);
                    }}
                    className="text-[9px] font-black text-[#07474e] hover:text-[#0b4e56] font-mono tracking-wider uppercase border border-[#07474e]/30 px-2 py-1 rounded-md bg-white cursor-pointer active:scale-95"
                  >
                    Asociar &amp; Copiar Notas
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
