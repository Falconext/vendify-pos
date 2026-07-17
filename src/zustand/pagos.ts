import { create } from 'zustand';
import { get, post, del } from '../utils/fetch';
import { IPago, IPagosFilters, IRegistroPago } from '../interfaces/pagos';
import { devtools } from 'zustand/middleware';
import useAlertStore from './alert';

export interface ICuentaPorCobrar {
  id: number;
  serie: string;
  correlativo: number;
  tipoDoc: string;
  fechaEmision: string;
  mtoImpVenta: number;
  saldo: number;
  estadoPago: string;
  formaPagoTipo?: string;
  fechaVencimientoCredito?: string | null;
  cliente: {
    nombre: string;
    nroDoc: string;
  };
}

export interface IPagosState {
  pagos: IPago[];
  totalPagos: number;
  pagoDetalle: IPago | null;
  loading: boolean;
  // Cuentas por Cobrar
  cuentasPorCobrar: ICuentaPorCobrar[];
  totalCuentasPorCobrar: number;
  loadingCuentas: boolean;
  // Métodos existentes
  getAllPagos: (params: IPagosFilters) => Promise<{ success: boolean; error?: string }>;
  getPagoDetalleByComprobante: (comprobanteId: number) => Promise<{ success: boolean; error?: string }>;
  registrarPago: (data: IRegistroPago) => Promise<{ success: boolean; error?: string }>;
  eliminarPago: (pagoId: number) => Promise<{ success: boolean; error?: string }>;
  resetPagos: () => void;
  // Nuevos métodos para Cuentas por Cobrar
  getCuentasPorCobrar: (params: any) => Promise<{ success: boolean; error?: string }>;
  registrarPagoComprobante: (comprobanteId: number, data: { monto: number; medioPago: string; observacion?: string; referencia?: string; cuentaBancariaId?: number }) => Promise<{ success: boolean; pago?: any; nuevoSaldo?: number; nuevoEstado?: string; error?: string }>;
  getHistorialPagos: (comprobanteId: number) => Promise<{ success: boolean; pagos?: any[]; totalPagado?: number; error?: string }>;
}

export const usePagosStore = create<IPagosState>()(
  devtools(
    (set, _get) => ({
      pagos: [],
      totalPagos: 0,
      pagoDetalle: null,
      loading: false,
      // Cuentas por Cobrar
      cuentasPorCobrar: [],
      totalCuentasPorCobrar: 0,
      loadingCuentas: false,

      getAllPagos: async (params: IPagosFilters) => {
        try {
          set({ loading: true });
          const filteredParams = Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== '')
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

          const query = new URLSearchParams(filteredParams as any).toString();
          const resp: any = await get(`pago/listar?${query}`);
          if (resp.code === 1) {
            set({
              pagos: resp.data,
              loading: false
            });
            return { success: true };
          } else {
            set({ pagos: [], loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al obtener los pagos', 'error');
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loading: false });
          useAlertStore.getState().alert(error.message || 'Error al obtener los pagos', 'error');
          return { success: false, error: error.message };
        }
      },

      getPagoDetalleByComprobante: async (comprobanteId: number) => {
        try {
          set({ loading: true });
          const resp: any = await get(`pago/comprobante/${comprobanteId}`);

          if (resp.code === 1) {
            set({
              pagoDetalle: resp.data,
              loading: false
            });
            return { success: true };
          } else {
            set({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al obtener el pago', 'error');
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loading: false });
          useAlertStore.getState().alert(error.message || 'Error al obtener el pago', 'error');
          return { success: false, error: error.message };
        }
      },

      registrarPago: async (data: IRegistroPago) => {
        try {
          set({ loading: true });
          const resp: any = await post('/pago/registrar', data);

          if (resp.code === 1) {
            set((state) => ({
              pagos: [resp.data, ...state.pagos],
              totalPagos: state.totalPagos + 1,
              loading: false
            }));
            useAlertStore.getState().alert('Pago registrado exitosamente', 'success');
            return { success: true };
          } else {
            set({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al registrar el pago', 'error');
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loading: false });
          useAlertStore.getState().alert(error.message || 'Error al registrar el pago', 'error');
          return { success: false, error: error.message };
        }
      },

      eliminarPago: async (pagoId: number) => {
        try {
          set({ loading: true });
          const resp: any = await del(`pago/${pagoId}/reversar`);

          if (resp.code === 1) {
            set((state) => ({
              pagos: state.pagos.filter((pago) => pago.id !== pagoId),
              totalPagos: state.totalPagos - 1,
              loading: false
            }));
            useAlertStore.getState().alert('Pago eliminado exitosamente', 'success');
            return { success: true };
          } else {
            set({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al eliminar el pago', 'error');
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loading: false });
          useAlertStore.getState().alert(error.message || 'Error al eliminar el pago', 'error');
          return { success: false, error: error.message };
        }
      },

      // Obtener Cuentas por Cobrar (comprobantes con saldo pendiente)
      getCuentasPorCobrar: async (params: any) => {
        try {
          set({ loadingCuentas: true });
          // Agregar tipoComprobante=INFORMAL siempre
          const queryParams = {
            tipoComprobante: 'TODOS',
            ...params,
          };
          const filteredParams = Object.entries(queryParams)
            .filter(([_, value]) => value !== undefined && value !== '')
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

          const query = new URLSearchParams(filteredParams as any).toString();
          const resp: any = await get(`comprobante/listar?${query}`);

          if (resp.code === 1) {
            const comprobantes = resp.data?.comprobantes || resp.data || [];

            // Filtrar solo los que tienen saldo > 0, no están anulados y no son NP (pedidos preliminares)
            const pendientes = comprobantes.filter((c: any) =>
              (c.saldo ?? 0) > 0 &&
              c.estadoPago !== 'COMPLETADO' &&
              c.estadoPago !== 'ANULADO' &&
              c.estadoEnvioSunat !== 'ANULADO' &&
              c.tipoDoc !== 'NP'
            );
            set({
              cuentasPorCobrar: pendientes,
              totalCuentasPorCobrar: pendientes.length,
              loadingCuentas: false
            });
            return { success: true };
          } else {
            set({ cuentasPorCobrar: [], loadingCuentas: false });
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loadingCuentas: false });
          return { success: false, error: error.message };
        }
      },

      // Registrar pago a un comprobante específico
      registrarPagoComprobante: async (comprobanteId: number, data) => {
        try {
          set({ loading: true });
          const resp: any = await post(`pago/comprobante/${comprobanteId}/registrar`, data);

          if (resp.code === 1) {
            const nuevoSaldo = resp.data?.comprobanteActualizado?.saldo ?? 0;
            const nuevoEstado = resp.data?.comprobanteActualizado?.estadoPago ?? 'PAGO_PARCIAL';

            // Actualizar la cuenta por cobrar en el estado
            set((state) => ({
              cuentasPorCobrar: state.cuentasPorCobrar.map((c) =>
                c.id === comprobanteId
                  ? { ...c, saldo: nuevoSaldo, estadoPago: nuevoEstado }
                  : c
              ).filter((c) => (c.saldo ?? 0) > 0), // Remover si saldo es 0 o undefined
              loading: false
            }));
            useAlertStore.getState().alert('Pago registrado exitosamente', 'success');
            return { success: true, pago: resp.data?.pago, nuevoSaldo, nuevoEstado };
          } else {
            set({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al registrar el pago', 'error');
            return { success: false, error: resp.error };
          }
        } catch (error: any) {
          set({ loading: false });
          useAlertStore.getState().alert(error.message || 'Error al registrar el pago', 'error');
          return { success: false, error: error.message };
        }
      },

      getHistorialPagos: async (comprobanteId: number) => {
        try {
          const resp: any = await get(`pago/comprobante/${comprobanteId}/historial`);
          
          let pagos = [];
          let totalPagado = 0;
          
          if (resp?.data?.pagos) {
             pagos = resp.data.pagos;
             totalPagado = resp.data.totalPagado || 0;
          } else if (resp?.pagos) {
             pagos = resp.pagos;
             totalPagado = resp.totalPagado || 0;
          } else if (Array.isArray(resp?.data)) {
             pagos = resp.data;
             totalPagado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
          } else if (Array.isArray(resp)) {
             pagos = resp;
             totalPagado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
          } else {
             console.error("Respuesta inesperada en getHistorialPagos:", resp);
             return { success: false, error: 'Respuesta inválida del servidor' };
          }
          
          return {
            success: true,
            pagos: pagos,
            totalPagado: totalPagado
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      resetPagos: () => {
        set({
          pagos: [],
          totalPagos: 0,
          pagoDetalle: null,
          loading: false,
          cuentasPorCobrar: [],
          totalCuentasPorCobrar: 0,
          loadingCuentas: false
        });
      }
    })
  )
);
