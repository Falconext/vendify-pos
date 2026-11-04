/**
 * Revalidar el carrito contra una sede (`POST /public/store/:slug/carrito/disponibilidad`).
 *
 * Se usa al cambiar de sede (modo CLIENTE) y cuando el pedido vuelve con un 400
 * de stock: el comprador ve qué líneas no se pueden pedir en esa sede y la
 * tienda las quita o ajusta su cantidad antes de seguir.
 */
import axios from 'axios';
import { persistTiendaCart, tiendaCartKey } from '@/utils/tiendaCart';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export type MotivoNoDisponible = 'NO_EXISTE' | 'NO_VENDIBLE' | 'SIN_STOCK';

/** Línea del carrito tal como la guardan las plantillas (solo lo que se usa aquí). */
export interface LineaCarrito {
    id?: string | number;
    productoId?: number | string;
    varianteId?: number | string | null;
    presentacionCodigo?: string | null;
    comboId?: number | string | null;
    esCombo?: boolean;
    cantidad?: number | string;
    descripcion?: string;
    nombre?: string;
    [k: string]: unknown;
}

export interface ItemDisponibilidad {
    productoId?: number;
    varianteId?: number;
    presentacionCodigo?: string;
    comboId?: number;
    cantidad: number;
}

export interface ResultadoItem {
    productoId: number | null;
    varianteId: number | null;
    comboId: number | null;
    cantidad: number;
    stock: number;
    disponible: boolean;
    motivo: MotivoNoDisponible | null;
}

export interface RespuestaDisponibilidad {
    modo: string;
    sedeId: number | null;
    ventaSinStock: boolean;
    items: ResultadoItem[];
}

/** Qué le pasa a una línea que no se puede pedir en la sede. */
export interface AjusteLinea {
    indice: number;
    linea: LineaCarrito;
    nombre: string;
    motivo: MotivoNoDisponible;
    /** Cantidad a la que se baja; `0` = se quita. */
    nuevaCantidad: number;
}

const MAX_ITEMS = 100;

const entero = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const comboDe = (l: LineaCarrito): number | null =>
    entero(l.comboId) ?? (l.esCombo ? entero(String(l.id ?? '').replace(/^combo-/, '')) : null);

/**
 * El cuerpo de la consulta. Devuelve también el índice de cada ítem en el
 * carrito: las líneas que no se pueden consultar (sin id) no se mandan.
 */
export function itemsParaDisponibilidad(carrito: LineaCarrito[]): { items: ItemDisponibilidad[]; indices: number[] } {
    const items: ItemDisponibilidad[] = [];
    const indices: number[] = [];
    carrito.forEach((l, i) => {
        if (items.length >= MAX_ITEMS) return;
        const cantidad = Math.max(1, Math.floor(Number(l.cantidad) || 1));
        const comboId = comboDe(l);
        if (comboId) {
            items.push({ comboId, cantidad });
            indices.push(i);
            return;
        }
        const productoId = entero(l.productoId) ?? entero(l.id);
        if (!productoId) return;
        const varianteId = entero(l.varianteId);
        const presentacionCodigo = typeof l.presentacionCodigo === 'string' && l.presentacionCodigo ? l.presentacionCodigo : undefined;
        items.push({ productoId, cantidad, ...(varianteId ? { varianteId } : {}), ...(presentacionCodigo ? { presentacionCodigo } : {}) });
        indices.push(i);
    });
    return { items, indices };
}

export const nombreLinea = (l: LineaCarrito): string =>
    String(l.descripcion || l.nombre || 'Producto');

/**
 * Qué hacer con cada línea no disponible. Se ajusta la cantidad solo cuando es
 * seguro hacerlo (falta stock, la línea es la única de ese producto, sin
 * presentación —el stock llega en unidades base— y queda al menos 1); si no, se quita.
 */
export function calcularAjustes(carrito: LineaCarrito[], indices: number[], respuesta: RespuestaDisponibilidad): AjusteLinea[] {
    const lineasPorClave = new Map<string, number>();
    const clave = (l: LineaCarrito) => {
        const combo = comboDe(l);
        return combo ? `c${combo}` : `p${entero(l.productoId) ?? entero(l.id) ?? '?'}`;
    };
    carrito.forEach((l) => lineasPorClave.set(clave(l), (lineasPorClave.get(clave(l)) ?? 0) + 1));

    const ajustes: AjusteLinea[] = [];
    respuesta.items.forEach((r, k) => {
        if (r.disponible) return;
        const indice = indices[k];
        const linea = indice === undefined ? undefined : carrito[indice];
        if (!linea) return;
        const motivo: MotivoNoDisponible = r.motivo ?? 'SIN_STOCK';
        const tope = Math.floor(Number(r.stock) || 0);
        const ajustable = motivo === 'SIN_STOCK' && !linea.presentacionCodigo && lineasPorClave.get(clave(linea)) === 1 && tope >= 1;
        ajustes.push({ indice, linea, nombre: nombreLinea(linea), motivo, nuevaCantidad: ajustable ? Math.min(tope, Number(linea.cantidad) || 1) : 0 });
    });
    return ajustes;
}

/** El carrito con los ajustes aplicados (quitar o bajar cantidad). */
export function aplicarAjustes(carrito: LineaCarrito[], ajustes: AjusteLinea[]): LineaCarrito[] {
    const porIndice = new Map(ajustes.map((a) => [a.indice, a]));
    return carrito.flatMap((l, i) => {
        const a = porIndice.get(i);
        if (!a) return [l];
        return a.nuevaCantidad > 0 ? [{ ...l, cantidad: a.nuevaCantidad }] : [];
    });
}

export function leerCarrito(slug: string): LineaCarrito[] {
    try {
        const v = JSON.parse(localStorage.getItem(tiendaCartKey(slug)) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

export const guardarCarrito = (slug: string, carrito: LineaCarrito[]) => persistTiendaCart(slug, carrito);

function normalizarRespuesta(raw: unknown): RespuestaDisponibilidad {
    const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const items = (Array.isArray(d.items) ? d.items : []).map((x): ResultadoItem => {
        const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
        const motivo = o.motivo === 'NO_EXISTE' || o.motivo === 'NO_VENDIBLE' || o.motivo === 'SIN_STOCK' ? o.motivo : null;
        return {
            productoId: entero(o.productoId),
            varianteId: entero(o.varianteId),
            comboId: entero(o.comboId),
            cantidad: Number(o.cantidad) || 0,
            stock: Number(o.stock) || 0,
            disponible: o.disponible === true,
            motivo,
        };
    });
    return { modo: String(d.modo ?? ''), sedeId: entero(d.sedeId), ventaSinStock: d.ventaSinStock === true, items };
}

export interface RevisionCarrito {
    respuesta: RespuestaDisponibilidad;
    ajustes: AjusteLinea[];
    carrito: LineaCarrito[];
}

/**
 * Consulta la disponibilidad del carrito guardado en la sede. `null` si no hay
 * nada que consultar. Lanza el error de axios (el llamador decide).
 */
export async function revisarCarrito(slug: string, sedeId: number | null): Promise<RevisionCarrito | null> {
    const carrito = leerCarrito(slug);
    const { items, indices } = itemsParaDisponibilidad(carrito);
    if (!items.length) return null;
    const { data } = await axios.post(`${BASE_URL}/public/store/${encodeURIComponent(slug)}/carrito/disponibilidad`, {
        ...(sedeId ? { sedeId } : {}),
        items,
    });
    const respuesta = normalizarRespuesta((data as { data?: unknown })?.data ?? data);
    return { respuesta, ajustes: calcularAjustes(carrito, indices, respuesta), carrito };
}

export const textoMotivo = (motivo: MotivoNoDisponible, sede: string | null): string => {
    const en = sede ? ` en ${sede}` : '';
    if (motivo === 'NO_EXISTE') return 'Ya no está en la tienda';
    if (motivo === 'NO_VENDIBLE') return `No se vende${en}`;
    return `Sin stock suficiente${en}`;
};
