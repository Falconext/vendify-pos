import { mensajeErrorShalom, shalomService } from '@/services/shalom.service';

const SHALOM_COURIERS = new Set(['SHALOM_PRO', 'SHALOM_COD']);

export type ResultadoGuiaShalom =
    | { estado: 'generada'; nroOrden: string | null }
    | { estado: 'error'; mensaje: string }
    | null;

/**
 * Registra la guía en Shalom al cerrar la venta, solo si la empresa activó la
 * generación automática y tiene la cuenta conectada (`null` si no aplica).
 * Se consulta el estado en este momento para no pedir /shalom/instancia en
 * cada venta que no usa Shalom. Nunca lanza: la venta ya está hecha.
 */
export async function generarGuiaShalomAuto(comprobanteId: number, transportista?: string | null): Promise<ResultadoGuiaShalom> {
    if (!transportista || !SHALOM_COURIERS.has(transportista)) return null;
    try {
        const instancia = await shalomService.getInstancia();
        if (!instancia?.habilitadoPorPlan || !instancia.conectada || !instancia.autoGuiaActivo) return null;
        const guia = await shalomService.crearGuia(comprobanteId);
        return { estado: 'generada', nroOrden: guia?.nroOrden ?? null };
    } catch (error: unknown) {
        return { estado: 'error', mensaje: mensajeErrorShalom(error, 'error desconocido') };
    }
}
