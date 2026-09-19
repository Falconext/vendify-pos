// Análisis de clientes y envíos (pestaña "Clientes y envíos" del Análisis
// Financiero): ciudades que más compran, ranking de clientes, cliente más fiel
// y ranking de repartidores/couriers. Espejo de AnalisisClientesResponse del
// backend (analisis-financiero.service.ts).

export interface ClienteRanking {
    clienteId: number | null;
    nombre: string;
    nroDoc: string | null;
    ciudad: string;
    compras: number;
    ingreso: number;
    ticketPromedio: number;
    primeraCompra: string | null;
    ultimaCompra: string | null;
    mesesActivos: number;
    diasDesdeUltima: number | null;
}

export interface CiudadRanking {
    ciudad: string;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    compras: number;
    clientes: number;
    ingreso: number;
    participacion: number;
}

export interface RepartidorRanking {
    repartidorId: number | null;
    nombre: string;
    tipo: string | null;
    envios: number;
    entregados: number;
    devueltos: number;
    tasaEntrega: number;
    costoEnvio: number;
    ingreso: number;
}

export interface CourierRanking {
    courier: string;
    envios: number;
    entregados: number;
    enTransito: number;
    devueltos: number;
    tasaEntrega: number;
    costoEnvio: number;
}

export interface AnalisisClientesResponse {
    periodo: { mes: number; anio: number; fechaInicio: string | null; fechaFin: string | null; label: string };
    resumen: {
        ingresoTotal: number;
        documentos: number;
        clientesDistintos: number;
        clientesRecurrentes: number;
        ticketPromedio: number;
        ciudadesDistintas: number;
        envios: number;
        enviosEntregados: number;
    };
    ciudades: CiudadRanking[];
    clientes: ClienteRanking[];
    clienteMasFiel: ClienteRanking | null;
    repartidores: RepartidorRanking[];
    couriers: CourierRanking[];
}

export const TIPO_REPARTIDOR_LABEL: Record<string, string> = {
    PROPIO: 'Repartidor propio',
    EVENTUAL: 'Repartidor eventual',
    COURIER: 'Courier',
};

export function formatFechaHora(iso?: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
