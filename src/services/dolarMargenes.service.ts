import api from '@/utils/apiClient';

/** Dólar y márgenes: mismo contrato que backend `compras/costo-reposicion.ts`. */
export type EstadoReposicion = 'riesgo' | 'margen-bajo' | 'bajo' | 'ok';

export interface ConfigDolarMargenes {
    umbralPct: number;
    margenObjetivoPct: number;
    colchonTc: number;
}

export interface FilaReposicion {
    productoId: number;
    codigo: string;
    descripcion: string;
    moneda: string;
    stock: number;
    gravado: boolean;
    costoUsd: number;
    tcCompra: number;
    fechaCompra: string;
    documentoCompra: string;
    costoCompraSoles: number;
    costoReposicionSoles: number;
    variacionTcPct: number;
    precioActualSoles: number;
    margenCompraPct: number | null;
    margenReposicionPct: number | null;
    precioSugerido: number;
    precioSugeridoSoles: number;
    /** Sobre qué costo se sugirió: el de reponer, o el pagado si queda stock más caro. */
    sugeridoSobre: 'reposicion' | 'compra';
    estado: EstadoReposicion;
}

export interface DolarMargenes {
    tcHoy: number;
    tcFecha: string;
    config: ConfigDolarMargenes;
    resumen: { total: number; riesgo: number; margenBajo: number; bajo: number };
    filas: FilaReposicion[];
}

export interface PrecioProducto {
    productoId: number;
    precio: number;
}

const BASE = '/compras/dolar-margenes';
const data = <T,>(r: any): T => r.data?.data ?? r.data;

export const dolarMargenesService = {
    listar: async () => data<DolarMargenes>(await api.get(BASE)),
    deProducto: async (productoId: number) =>
        data<{ tcHoy: number; tcFecha: string; config: ConfigDolarMargenes; fila: FilaReposicion } | null>(
            await api.get(`${BASE}/producto/${productoId}`),
        ),
    guardarConfig: async (config: Partial<ConfigDolarMargenes>) =>
        data<ConfigDolarMargenes>(await api.put(`${BASE}/config`, config)),
    aplicarPrecios: async (items: PrecioProducto[]) =>
        data<{ actualizados: number; anteriores: PrecioProducto[] }>(await api.post(`${BASE}/aplicar-precios`, { items })),
};

export const RUTA_DOLAR_MARGENES = '/administrador/compras/dolar-margenes';
