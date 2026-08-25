import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios, { AxiosError } from 'axios';
import apiClient from '@/utils/apiClient';

export const CATEGORIAS_GASTO = [
  'Alquiler',
  'Servicios básicos',
  'Planilla',
  'Transporte',
  'Mantenimiento',
  'Material de oficina',
  'Publicidad',
  'Otros',
] as const;

export type CategoriaGasto = typeof CATEGORIAS_GASTO[number];

export interface RegistrarEgresoData {
  monto: number;
  categoriaGasto: string;
  descripcionGasto?: string;
  metodoPago?: string;
}

export interface TransferenciaCajaData {
  sedeDestinoId: number;
  monto: number;
  observaciones?: string;
}

export interface MarcarDepositadosData {
  cierreIds: number[];
  cuentaBancariaId: number;
  fecha?: string;
  numeroOperacion?: string;
}

export interface AperturaCaja {
  montoInicial: number;
  observaciones?: string;
  turno?: string;
}

export interface CierreCaja {
  montoEfectivo: number;
  montoYape: number;
  montoPlin: number;
  montoTransferencia: number;
  montoTarjeta: number;
  observaciones?: string;
}

export interface MovimientoCaja {
  id: number;
  usuarioId: number;
  empresaId: number;
  tipoMovimiento: 'APERTURA' | 'CIERRE' | 'INGRESO' | 'EGRESO';
  fecha: string;
  monto?: number;
  categoriaGasto?: string;
  descripcionGasto?: string;
  metodoPago?: string;
  montoInicial?: number;
  montoFinal?: number;
  montoEfectivo?: number;
  montoYape?: number;
  montoPlin?: number;
  montoTransferencia?: number;
  montoTarjeta?: number;
  observaciones?: string;
  estado: string;
  fechaCierre?: string;
  totalVentas?: number;
  totalIngresos?: number;
  diferencia?: number;
  turno?: string;
  esTransferencia?: boolean;
  // Aprobación de gastos: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null (sin flujo)
  estadoAprobacion?: string | null;
  sedeContraparteId?: number;
  sedeContraparte?: { nombre: string };
  depositado?: boolean;
  cuentaBancariaId?: number;
  cuentaBancaria?: { banco: string; numeroCuenta: string; alias?: string | null };
  fechaDeposito?: string;
  numeroOperacionDeposito?: string;
  depositadoPor?: { nombre: string; email: string };
  sede?: { nombre: string };
  usuario?: {
    nombre: string;
    email: string;
  };
}

export interface EstadoCaja {
  estado: 'CERRADA' | 'ABIERTA' | 'PENDIENTE_CIERRE';
  totalEgresos?: number;
  totalTransferenciasEnviadas?: number;
  totalTransferenciasRecibidas?: number;
  movimiento?: MovimientoCaja;
  ventasDelDia: {
    totalIngresos: number;
    mediosPago: {
      EFECTIVO: number;
      YAPE: number;
      PLIN: number;
      TRANSFERENCIA: number;
      TARJETA: number;
    };
    totalComprobantesInformales: number;
    totalComprobantesFormales: number;
    totalPagos: number;
  };
  fecha: string;
}

export interface ArqueoCaja {
  ventasDelPeriodo: {
    totalIngresos: number;
    mediosPago: {
      EFECTIVO: number;
      YAPE: number;
      PLIN: number;
      TRANSFERENCIA: number;
      TARJETA: number;
    };
    totalComprobantesInformales: number;
    totalComprobantesFormales: number;
    totalPagos: number;
  };
  movimientosCaja: MovimientoCaja[];
  resumenCaja: {
    totalAperturas: number;
    totalCierres: number;
    montoInicialTotal: number;
    montoFinalTotal: number;
    diferenciasTotal: number;
    resumenPorTurno?: Array<{
      turno: string;
      aperturas: number;
      cierres: number;
      montoInicialTotal: number;
      montoFinalTotal: number;
      diferenciasTotal: number;
    }>;
  };
  fechaInicio: string;
  fechaFin: string;
}

interface CajaState {
  // Estado
  loading: boolean;
  error: string | null;
  estadoCaja: EstadoCaja | null;
  historialCaja: MovimientoCaja[];
  arqueoCaja: ArqueoCaja | null;
  cierresPendientesDeposito: MovimientoCaja[];
  totalPendienteDeposito: number;
  // Yape/Plin de los cierres pendientes: ya abonado automáticamente en la
  // cuenta bancaria vinculada (no requiere depósito manual).
  autoAbonado: {
    totalYape: number;
    totalPlin: number;
    cuentaYape: { id: number; banco: string; numeroCuenta: string; alias?: string | null } | null;
    cuentaPlin: { id: number; banco: string; numeroCuenta: string; alias?: string | null } | null;
  } | null;
  depositosRealizados: MovimientoCaja[];

  // Paginación
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Filtros
  filters: {
    fechaInicio: string;
    fechaFin: string;
    sedeId?: number | null;
  };

  // Acciones
  abrirCaja: (data: AperturaCaja) => Promise<{ success: boolean; message: string }>;
  cerrarCaja: (data: CierreCaja) => Promise<{ success: boolean; message: string }>;
  registrarEgreso: (data: RegistrarEgresoData) => Promise<{ success: boolean; message: string }>;
  transferirCaja: (data: TransferenciaCajaData) => Promise<{ success: boolean; message: string }>;
  obtenerCierresPendientesDeposito: (sedeId?: number) => Promise<void>;
  obtenerDepositosRealizados: (sedeId?: number, fechaInicio?: string, fechaFin?: string) => Promise<void>;
  marcarCierresDepositados: (data: MarcarDepositadosData) => Promise<{ success: boolean; message: string }>;
  desmarcarDeposito: (cierreId: number) => Promise<{ success: boolean; message: string }>;
  editarEgreso: (id: number, data: Partial<RegistrarEgresoData>) => Promise<{ success: boolean; message: string }>;
  eliminarEgreso: (id: number) => Promise<{ success: boolean; message: string }>;
  aprobarEgreso: (id: number) => Promise<{ success: boolean; message: string }>;
  rechazarEgreso: (id: number) => Promise<{ success: boolean; message: string }>;
  obtenerEstadoCaja: () => Promise<void>;
  obtenerHistorialCaja: (page?: number, limit?: number) => Promise<void>;
  obtenerArqueoCaja: (fechaInicio?: string, fechaFin?: string) => Promise<void>;
  exportarArqueo: (fechaInicio?: string, fechaFin?: string) => Promise<void>;
  setFilters: (filters: Partial<CajaState['filters']>) => void;
  clearFilters: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Usamos apiClient con baseURL y token via interceptores

export const useCajaStore = create<CajaState>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      loading: false,
      error: null,
      estadoCaja: null,
      historialCaja: [],
      arqueoCaja: null,
      cierresPendientesDeposito: [],
      totalPendienteDeposito: 0,
      autoAbonado: null,
      depositosRealizados: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      },
      filters: {
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        sedeId: null,
      },

      // Acciones
      abrirCaja: async (data: AperturaCaja) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post(
            `caja/abrir`,
            data
          );
          const resp: any = response.data;
          if (resp?.code === 1) {
            // Actualizar estado de caja después de abrir
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Caja abierta' };
          }
          
          set({ loading: false, error: 'Error al abrir caja' });
          return { success: false, message: 'Error al abrir caja' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al abrir caja';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      cerrarCaja: async (data: CierreCaja) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post(
            `caja/cerrar`,
            data
          );
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Caja cerrada' };
          }

          set({ loading: false, error: 'Error al cerrar caja' });
          return { success: false, message: 'Error al cerrar caja' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al cerrar caja';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      registrarEgreso: async (data: RegistrarEgresoData) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post('caja/egreso', data);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Gasto registrado' };
          }
          set({ loading: false, error: 'Error al registrar gasto' });
          return { success: false, message: resp?.message || 'Error al registrar gasto' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al registrar gasto';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      transferirCaja: async (data: TransferenciaCajaData) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post('caja/transferir', data);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Transferencia registrada' };
          }
          set({ loading: false, error: 'Error al transferir' });
          return { success: false, message: resp?.message || 'Error al transferir' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al transferir';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      obtenerCierresPendientesDeposito: async (sedeId?: number) => {
        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (sedeId) params.append('sedeId', sedeId.toString());
          const response = await apiClient.get(`caja/depositos/pendientes?${params}`);
          const resp: any = response.data;
          set({
            cierresPendientesDeposito: resp?.data?.cierres || [],
            totalPendienteDeposito: resp?.data?.totalPendiente || 0,
            autoAbonado: resp?.data?.autoAbonado || null,
            loading: false,
          });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al obtener cierres pendientes';
          set({ loading: false, error: errorMessage });
        }
      },

      obtenerDepositosRealizados: async (sedeId?: number, fechaInicio?: string, fechaFin?: string) => {
        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (sedeId) params.append('sedeId', sedeId.toString());
          if (fechaInicio) params.append('fechaInicio', fechaInicio);
          if (fechaFin) params.append('fechaFin', fechaFin);
          const response = await apiClient.get(`caja/depositos/realizados?${params}`);
          const resp: any = response.data;
          set({ depositosRealizados: resp?.data?.cierres || [], loading: false });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al obtener depósitos realizados';
          set({ loading: false, error: errorMessage });
        }
      },

      marcarCierresDepositados: async (data: MarcarDepositadosData) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post('caja/depositos', data);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerCierresPendientesDeposito();
            set({ loading: false });
            return { success: true, message: resp.message || 'Depósito registrado' };
          }
          set({ loading: false, error: 'Error al registrar el depósito' });
          return { success: false, message: resp?.message || 'Error al registrar el depósito' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al registrar el depósito';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      desmarcarDeposito: async (cierreId: number) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.delete(`caja/depositos/${cierreId}`);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await Promise.all([
              get().obtenerCierresPendientesDeposito(),
              get().obtenerDepositosRealizados(),
            ]);
            set({ loading: false });
            return { success: true, message: resp.message || 'Depósito revertido' };
          }
          set({ loading: false, error: 'Error al revertir el depósito' });
          return { success: false, message: resp?.message || 'Error al revertir el depósito' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al revertir el depósito';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      editarEgreso: async (id: number, data: Partial<RegistrarEgresoData>) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.patch(`caja/egreso/${id}`, data);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Gasto actualizado' };
          }
          set({ loading: false, error: 'Error al actualizar gasto' });
          return { success: false, message: resp?.message || 'Error al actualizar gasto' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al actualizar gasto';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      // Aprobación de gastos (maker-checker): solo ADMIN_EMPRESA (guard backend).
      aprobarEgreso: async (id: number) => {
        try {
          const response = await apiClient.patch(`caja/egreso/${id}/aprobar`);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            return { success: true, message: resp.message || 'Gasto aprobado' };
          }
          return { success: false, message: resp?.message || 'Error al aprobar gasto' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          return { success: false, message: axiosError.response?.data?.message || 'Error al aprobar gasto' };
        }
      },

      rechazarEgreso: async (id: number) => {
        try {
          const response = await apiClient.patch(`caja/egreso/${id}/rechazar`);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            return { success: true, message: resp.message || 'Gasto rechazado' };
          }
          return { success: false, message: resp?.message || 'Error al rechazar gasto' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          return { success: false, message: axiosError.response?.data?.message || 'Error al rechazar gasto' };
        }
      },

      eliminarEgreso: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.delete(`caja/egreso/${id}`);
          const resp: any = response.data;
          if (resp?.code === 1) {
            await get().obtenerEstadoCaja();
            set({ loading: false });
            return { success: true, message: resp.message || 'Gasto eliminado' };
          }
          set({ loading: false, error: 'Error al eliminar gasto' });
          return { success: false, message: resp?.message || 'Error al eliminar gasto' };
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al eliminar gasto';
          set({ loading: false, error: errorMessage });
          return { success: false, message: errorMessage };
        }
      },

      obtenerEstadoCaja: async () => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.get(
            `caja/estado`
          );
          const resp: any = response.data;
          set({ 
            estadoCaja: resp?.data,
            loading: false 
          });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al obtener estado de caja';
          set({ loading: false, error: errorMessage });
        }
      },

      obtenerHistorialCaja: async (page = 1, limit = 50) => {
        set({ loading: true, error: null });
        try {
          const { fechaInicio, fechaFin, sedeId } = get().filters;

          const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
          });

          if (fechaInicio) params.append('fechaInicio', fechaInicio);
          if (fechaFin) params.append('fechaFin', fechaFin);
          if (sedeId) params.append('sedeId', sedeId.toString());

          const response = await apiClient.get(
            `caja/historial?${params}`
          );
          const resp: any = response.data;

          set({
            historialCaja: resp?.data?.movimientos || [],
            pagination: resp?.data?.pagination || { total: 0, page, limit, totalPages: 0 },
            loading: false,
          });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al obtener historial de caja';
          set({ loading: false, error: errorMessage });
        }
      },

      obtenerArqueoCaja: async (fechaInicio?: string, fechaFin?: string) => {
        set({ loading: true, error: null });
        try {
          const filters = get().filters;

          const params = new URLSearchParams();
          if (fechaInicio || filters.fechaInicio) {
            params.append('fechaInicio', fechaInicio || filters.fechaInicio);
          }
          if (fechaFin || filters.fechaFin) {
            params.append('fechaFin', fechaFin || filters.fechaFin);
          }
          if (filters.sedeId) params.append('sedeId', filters.sedeId.toString());

          const response = await apiClient.get(
            `caja/arqueo?${params}`
          );
          const resp: any = response.data;

          set({
            arqueoCaja: resp?.data,
            loading: false,
          });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al obtener arqueo de caja';
          set({ loading: false, error: errorMessage });
        }
      },

      exportarArqueo: async (fechaInicio?: string, fechaFin?: string) => {
        set({ loading: true, error: null });
        try {
          const filters = get().filters;
          
          const params = new URLSearchParams();
          if (fechaInicio || filters.fechaInicio) {
            params.append('fechaInicio', fechaInicio || filters.fechaInicio);
          }
          if (fechaFin || filters.fechaFin) {
            params.append('fechaFin', fechaFin || filters.fechaFin);
          }

          const response = await apiClient.get(
            `caja/arqueo-exportar?${params}`,
            {
              responseType: 'blob',
            }
          );

          // Crear y descargar el archivo
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          const fecha = fechaInicio || filters.fechaInicio;
          const fechaFinal = fechaFin || filters.fechaFin;
          link.download = `arqueo-caja-${fecha}_a_${fechaFinal}.xlsx`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          set({ loading: false });
        } catch (error) {
          const axiosError = error as AxiosError<any>;
          const errorMessage = axiosError.response?.data?.message || 'Error al exportar arqueo';
          set({ loading: false, error: errorMessage });
        }
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      clearFilters: () => {
        const today = new Date().toISOString().split('T')[0];
        set({
          filters: {
            fechaInicio: today,
            fechaFin: today,
            sedeId: null,
          },
        });
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'caja-store',
    }
  )
);