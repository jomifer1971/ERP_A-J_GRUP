-- ====================================================================
-- A&J GRUP BCN - CONFIGURACIÓN DE BASE DE DATOS COMPLETA EN SUPABASE
-- ====================================================================
-- Este script limpia e inicializa todo el esquema de persistencia remota.
-- 
-- ADVERTENCIA DE ERROR DE COLUMNA:
-- Si recibes el error "column 'especialidades' of relation 'usuarios' does not exist",
-- es porque la tabla 'usuarios' ya existía de ejecuciones previas incompletas.
--
-- Para solucionarlo limpiamente (OPCIÓN RECOMENDADA - BASE DE DATOS VACÍA):
-- Hemos incluido sentencias 'DROP TABLE ... CASCADE' al inicio de este script.
-- Al ejecutar el script completo, limpiará cualquier tabla rota anterior y creará todo
-- de forma consistente y en el orden correcto de dependencias.
--
-- O BIEN (OPCIÓN DE PARCHE CONSERVANDO DATOS EXISTENTES):
-- Ejecuta primero esta línea individual en tu editor de SQL de Supabase antes del INSERT:
-- ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS especialidades TEXT[];
-- ====================================================================

-- -------------------------------------------------------------
-- 0. INSTALAR EXTENSIONES (Opcional, útil para IDs únicos rápidos)
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. LIMPIAR ESQUEMA ANTERIOR (Evita conflictos "IF NOT EXISTS" con tablas desactualizadas)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS obras_documentos CASCADE;
DROP TABLE IF EXISTS justificantes CASCADE;
DROP TABLE IF EXISTS festivos CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS partes_trabajo CASCADE;
DROP TABLE IF EXISTS fichajes CASCADE;
DROP TABLE IF EXISTS obras CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;


-- -------------------------------------------------------------
-- 2. TABLA DE USUARIOS (Roles y Accesos de Personal)
-- -------------------------------------------------------------
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY, -- ej: 'u-1', o id de Autenticación
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('ceo', 'admin', 'jefe_equipo', 'operario')),
    validado BOOLEAN DEFAULT FALSE,
    especialidades TEXT[] DEFAULT '{}', -- Array de especialidades ['electricista', 'paleta', 'fontanero']
    jefe_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL, -- Relación jefe-subordinado
    telefono TEXT, -- Móvil de contacto directo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 3. TABLA DE OBRAS (Proyectos Activos)
-- -------------------------------------------------------------
CREATE TABLE obras (
    id TEXT PRIMARY KEY, -- ej: 'o-1'
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'FINALIZADA', 'PENDIENTE')),
    geovalla_activa BOOLEAN NOT NULL DEFAULT TRUE,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    radio DOUBLE PRECISION NOT NULL DEFAULT 150.0, -- Radio en metros
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 4. TABLA DE FICHAJES (Registro GPS de Entradas/Salidas)
-- -------------------------------------------------------------
CREATE TABLE fichajes (
    id TEXT PRIMARY KEY,
    operario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    distancia_metros DOUBLE PRECISION, -- Distancia calculada al punto de geovalla
    coordenadas TEXT, -- Formato 'lat,lon' para auditorías de fraude
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 5. TABLA DE PARTES DIARIOS DE TRABAJO (Horas y Resúmenes Diarios)
-- -------------------------------------------------------------
CREATE TABLE partes_trabajo (
    id TEXT PRIMARY KEY DEFAULT 'parte-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    operario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    horas NUMERIC(4,2) NOT NULL, -- ej: 8.5
    descripcion TEXT NOT NULL,
    materiales_usados TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 6. TABLA DE INVENTARIO Y ALMACENES (Stock Central y Virtuales en Obras)
-- -------------------------------------------------------------
-- Si obra_id es NULL, el material pertenece al Almacén Central de A&J GRUP.
-- Si obra_id tiene valor, representa el almacén virtual montado en esa obra específica.
CREATE TABLE inventario (
    id TEXT PRIMARY KEY, -- ej: 'i-1' o 'v-1'
    articulo TEXT NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unidad TEXT NOT NULL DEFAULT 'unidades', -- Corregida sintaxis NOT NULL DEFAULT
    obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 7. TABLA DE PLANIFICACIÓN DE TURNOS Y HORARIOS (PLANTILLAS)
-- -------------------------------------------------------------
CREATE TABLE turnos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    dias_laborables TEXT[] NOT NULL DEFAULT '{}',
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 8. TABLA DE DÍAS FESTIVOS (Nacionales o Autonómicos)
-- -------------------------------------------------------------
CREATE TABLE festivos (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 9. TABLA DE JUSTIFICANTES MÉDICOS (Bajas de Personal)
-- -------------------------------------------------------------
CREATE TABLE justificantes (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('baja_medica', 'cita_medica', 'asuntos_propios', 'otro')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    file_name TEXT,
    file_size TEXT,
    upload_date TEXT,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- -------------------------------------------------------------
-- 10. TABLA DE DOCUMENTOS Y PLANOS DE OBRA
-- -------------------------------------------------------------
CREATE TABLE obras_documentos (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Planos', 'Presupuesto', 'Contrato', 'Seguridad', 'Otro')),
    size TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    subido_por TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    aprobado BOOLEAN NOT NULL DEFAULT FALSE,
    aprobado_por TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    file_data TEXT, -- binario o string codificado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ====================================================================
-- SEED DE DATOS INICIALES (Configuración básica inicial de A&J GRUP BCN)
-- ====================================================================

-- 1. Insertar Usuarios
INSERT INTO usuarios (id, nombre, email, rol, validado, especialidades, telefono) VALUES
('u-1', 'Javier Domínguez', 'ceo@ajgrup.com', 'ceo', TRUE, ARRAY['electricista', 'fontanero'], '+34 601 234 567'),
('u-2', 'Admin Master', 'admin@ajgrup.com', 'admin', TRUE, ARRAY['electricista'], '+34 602 345 678'),
('u-3', 'Carlos Jefe', 'jefe@ajgrup.com', 'jefe_equipo', TRUE, ARRAY['paleta', 'fontanero'], '+34 603 456 789'),
('u-4', 'Juan Operario', 'juan@ajgrup.com', 'operario', TRUE, ARRAY['paleta'], '+34 604 567 890')
ON CONFLICT (id) DO NOTHING;

-- Asociar el superior jerárquico
UPDATE usuarios SET jefe_id = 'u-3' WHERE id = 'u-4';

-- 2. Insertar Obras Iniciales
INSERT INTO obras (id, nombre, direccion, estado, geovalla_activa, latitud, longitud, radio) VALUES
('o-1', 'Reforma Integral Duplex Mallorca', 'Carrer de Mallorca, 142, BCN', 'EN_CURSO', TRUE, 41.390035, 2.158145, 150),
('o-2', 'Instalación Climatización Oficinas Gràcia', 'Carrer de Verdi, 88, BCN', 'EN_CURSO', TRUE, 41.404285, 2.157143, 100),
('o-3', 'Instalación Eléctrica Nave Poblenou', 'Carrer de Pallars, 201, BCN', 'EN_CURSO', TRUE, 41.401138, 2.198357, 200),
('o-4', 'Pintura y Suelos Consultorio Médico', 'Gran Via de les Corts Catalanes, 560, BCN', 'EN_CURSO', TRUE, 41.383122, 2.161092, 150)
ON CONFLICT (id) DO NOTHING;

-- 3. Suministros predeterminados en Stock Almacén Central
INSERT INTO inventario (id, articulo, cantidad, unidad, obra_id) VALUES
('i-1', 'Saco Cemento Gris Portland 25kg', 120, 'sacos', NULL),
('i-2', 'Placa Pladur Knauf Standard 120x250', 85, 'placas', NULL),
('i-3', 'Pasta de Juntas Pladur Sacos 20kg', 32, 'sacos', NULL),
('i-4', 'Cable Cobre Libre Halógenos 1.5mm Verde/Amarillo 100m', 12, 'bobinas', NULL),
('i-5', 'Porcelánico Estepa Gris 60x60 (Caja 1.44m2)', 40, 'cajas', NULL),
('i-6', 'Tubo Multicapa Fontanería Aislado 20mm 50m', 8, 'rollos', NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Materiales asignados Inicialmente a Obras (Almacenes Virtuales)
INSERT INTO inventario (id, articulo, cantidad, unidad, obra_id) VALUES
('v-1', 'Placa Pladur Knauf Standard 120x250', 20, 'placas', 'o-1'),
('v-2', 'Saco Adhesivo Porcelánico C2TES1 25kg', 15, 'sacos', 'o-1'),
('v-3', 'Split Aire Acondicionado Fujitsu Inverter', 2, 'unidades', 'o-2')
ON CONFLICT (id) DO NOTHING;

-- 5. Plantillas de Turnos Iniciales
INSERT INTO turnos (id, nombre, hora_inicio, hora_fin, dias_laborables, descripcion) VALUES
('t-1', 'Turno Estándar de Obra (Partido)', '08:00', '17:00', ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], 'Jornada estándar con corte de 1h para comer.'),
('t-2', 'Turno Intensivo de Verano', '07:00', '15:00', ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], 'Evita las horas de extremo calor en cubiertas y fachadas.'),
('t-3', 'Turno Especial Sábados Urgentes', '08:00', '14:00', ARRAY['Sábado'], 'Turnos extraordinarios autorizados para cierres de local.')
ON CONFLICT (id) DO NOTHING;

-- 6. Días Festivos Iniciales de Calendario
INSERT INTO festivos (id, fecha, descripcion) VALUES
('f-1', '2026-01-01', 'Año Nuevo'),
('f-2', '2026-04-03', 'Viernes Santo'),
('f-3', '2026-05-01', 'Fiesta del Trabajo'),
('f-4', '2026-06-24', 'San Juan (Catalunya)'),
('f-5', '2026-09-11', 'Diada Nacional de Catalunya'),
('f-6', '2026-12-25', 'Navidad')
ON CONFLICT (id) DO NOTHING;
