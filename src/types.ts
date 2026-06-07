/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'operario' | 'administrador' | 'encargado';
}

export interface Obra {
  id: string;
  nombre: string;
  direccion: string;
  estado: 'EN_CURSO' | 'FINALIZADA' | 'PENDIENTE';
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
