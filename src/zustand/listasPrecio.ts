import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get, post, put, del } from '@/utils/fetch';
import useAlertStore from './alert';

export interface IListaPrecioItem {
  productoId: number;
  presentacionCodigo: string;
  precioUnitario: number;
  precioOferta?: number | null;
}

export interface IListaPrecio {
  id: number;
  nombre: string;
  activo: boolean;
  esPorDefecto: boolean;
  sedeIds: number[];
  usuarioIds: number[];
  totalItems?: number;
  items?: IListaPrecioItem[];
}

export interface IListaPrecioForm {
  nombre: string;
  activo?: boolean;
  esPorDefecto?: boolean;
  sedeIds?: number[];
  usuarioIds?: number[];
  items?: IListaPrecioItem[];
}

// Precios de un producto en una lista (panel de la ficha de producto).
export interface IListaConItemProducto {
  id: number;
  nombre: string;
  esPorDefecto: boolean;
  activo: boolean;
  items: { presentacionCodigo: string; precioUnitario: number; precioOferta: number | null }[];
}

interface IListasPrecioState {
  listas: IListaPrecio[];
  loading: boolean;
  listar: () => Promise<void>;
  obtener: (id: number) => Promise<IListaPrecio | null>;
  crear: (data: IListaPrecioForm) => Promise<void>;
  actualizar: (id: number, data: IListaPrecioForm) => Promise<void>;
  eliminar: (id: number) => Promise<void>;
  // Ficha de producto:
  itemsDeProducto: (productoId: number) => Promise<IListaConItemProducto[]>;
  guardarItemsDeProducto: (
    productoId: number,
    entradas: { listaPrecioId: number; presentacionCodigo?: string; precioUnitario: number; precioOferta?: number | null }[],
  ) => Promise<boolean>;
}

export const useListasPrecioStore = create<IListasPrecioState>()(
  devtools((set, get_) => ({
    listas: [],
    loading: false,

    listar: async () => {
      try {
        set({ loading: true });
        const resp: any = await get('lista-precio');
        if (resp.code === 1) set({ listas: resp.data || [] });
      } catch (e: any) {
        useAlertStore.getState().alert(e.message || 'Error al listar listas de precio', 'error');
      } finally {
        set({ loading: false });
      }
    },

    obtener: async (id) => {
      try {
        const resp: any = await get(`lista-precio/${id}`);
        return resp.code === 1 ? resp.data : null;
      } catch {
        return null;
      }
    },

    crear: async (data) => {
      try {
        set({ loading: true });
        const resp: any = await post('lista-precio', data);
        if (resp.code === 1) {
          await get_().listar();
          useAlertStore.getState().alert('Lista de precio creada', 'success');
        } else {
          throw new Error(resp.message || resp.error || 'Error al crear');
        }
      } catch (e: any) {
        useAlertStore.getState().alert(e.message || 'Error al crear lista de precio', 'error');
        throw e;
      } finally {
        set({ loading: false });
      }
    },

    actualizar: async (id, data) => {
      try {
        set({ loading: true });
        const resp: any = await put(`lista-precio/${id}`, data);
        if (resp.code === 1) {
          await get_().listar();
          useAlertStore.getState().alert('Lista de precio actualizada', 'success');
        } else {
          throw new Error(resp.message || resp.error || 'Error al actualizar');
        }
      } catch (e: any) {
        useAlertStore.getState().alert(e.message || 'Error al actualizar lista de precio', 'error');
        throw e;
      } finally {
        set({ loading: false });
      }
    },

    eliminar: async (id) => {
      try {
        set({ loading: true });
        const resp: any = await del(`lista-precio/${id}`);
        if (resp.code === 1) {
          await get_().listar();
          useAlertStore.getState().alert('Lista de precio eliminada', 'success');
        }
      } catch (e: any) {
        useAlertStore.getState().alert(e.message || 'Error al eliminar lista de precio', 'error');
      } finally {
        set({ loading: false });
      }
    },

    itemsDeProducto: async (productoId) => {
      try {
        const resp: any = await get(`lista-precio/producto/${productoId}`);
        return resp.code === 1 ? resp.data : [];
      } catch {
        return [];
      }
    },

    guardarItemsDeProducto: async (productoId, entradas) => {
      try {
        const resp: any = await put(`lista-precio/producto/${productoId}`, { entradas });
        if (resp.code === 1) {
          useAlertStore.getState().alert('Precios por lista guardados', 'success');
          return true;
        }
        throw new Error(resp.message || resp.error || 'Error al guardar');
      } catch (e: any) {
        useAlertStore.getState().alert(e.message || 'Error al guardar precios por lista', 'error');
        return false;
      }
    },
  })),
);
