/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'ceo' | 'admin' | 'jefe_equipo' | 'operario';
  validado: boolean;
  especialidades?: string[];
  jefeId?: string;
}

export interface Obra {
  id: string;
  nombre: string;
  direccion: string;
  estado: 'EN_CURSO' | 'FINALIZADA' | 'PENDIENTE';
  geovalla_activa?: boolean;
  latitud?: number;
  longitud?: number;
  radio?: number; // Radio in meters
}

export interface InventarioItem {
  id: string;
  articulo: string;
  cantidad: number;
  unidad: string;
}

export interface ParteTrabajo {
  id?: string;
  obra_id: string;
  operario_id: string;
  fecha: string;
  horas: number;
  descripcion: string;
  materiales_usados?: string;
  created_at?: string;
}

export interface Fichaje {
  id?: string;
  operario_id: string;
  obra_id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  fecha_hora: string;
  distancia_metros?: number;
  coordenadas?: string;
}

