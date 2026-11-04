import moment from 'moment';
import { COURIER_LABEL } from './rotuloFormato';

/**
 * Filtros rápidos del panel de ventas, como los tenía en su
 * sistema anterior: por courier, por periodo (día / semana / mes) y por estado
 * de entrega (los mismos de la columna Despacho).
 */

export type Periodo = 'DIA' | 'SEMANA' | 'MES';

/** Rango del periodo que contiene `hoy` (semana de lunes a hoy, mes del 1 a hoy). */
export function rangoDePeriodo(periodo: Periodo, hoy: string): { fecha: string; fechaFin: string } {
    const h = moment(hoy, 'YYYY-MM-DD');
    if (periodo === 'DIA') return { fecha: h.format('YYYY-MM-DD'), fechaFin: '' };
    const inicio = periodo === 'SEMANA' ? h.clone().isoWeekday(1) : h.clone().startOf('month');
    return { fecha: inicio.format('YYYY-MM-DD'), fechaFin: h.format('YYYY-MM-DD') };
}

/** Cuál periodo describe el rango actual (para resaltar el botón), o null. */
export function periodoActivo(fecha: string, fechaFin: string, hoy: string): Periodo | null {
    for (const p of ['DIA', 'SEMANA', 'MES'] as Periodo[]) {
        const r = rangoDePeriodo(p, hoy);
        if (r.fecha === fecha && (r.fechaFin || '') === (fechaFin || '')) return p;
    }
    return null;
}

/** Couriers que aparecen en la lista, con su nombre legible. */
export function opcionesCourier(items: { courier?: string | null; estadoDespacho?: string }[]) {
    const vistos = new Set<string>();
    for (const i of items) {
        const c = (i.courier ?? '').trim();
        if (c && c !== '—' && i.estadoDespacho !== 'NO_APLICA') vistos.add(c);
    }
    return [...vistos].sort().map((c) => ({ value: c, label: COURIER_LABEL[c] ?? c }));
}

/**
 * Etiqueta de color del repartidor: el color que le puso la empresa, o uno
 * fijo según su nombre (el mismo repartidor siempre del mismo color).
 */
const PALETA = ['#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777', '#2563eb', '#ca8a04', '#0d9488', '#dc2626', '#4f46e5'];
export function colorDeRepartidor(nombre: string, color?: string | null): string {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    let h = 0;
    for (const ch of nombre.toUpperCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETA[h % PALETA.length];
}

/** Color fijo de cada courier en la columna Repartidor. */
const COLOR_COURIER: Record<string, string> = {
    SHALOM_PRO: '#dc2626',
    SHALOM_COD: '#dc2626',
    OLVA: '#ca8a04',
};

/**
 * Quién lleva el pedido, para la columna Repartidor: el
 * repartidor si tiene uno; si va por Shalom u Olva, el courier (antes salía
 * "No aplica"). Lo mismo que ya imprime el rótulo. null = sin envío.
 */
export function quienLlevaEnLista(item: {
    estadoDespacho?: string;
    repartidorId?: number | null;
    repartidor?: string | null;
    repartidorColor?: string | null;
    courier?: string | null;
}): { texto: string; color: string | null } | null {
    if (item.estadoDespacho === 'NO_APLICA') return null;
    if (item.repartidorId != null && item.repartidor) {
        return { texto: item.repartidor, color: colorDeRepartidor(item.repartidor, item.repartidorColor) };
    }
    const c = (item.courier ?? '').trim();
    if (c && c !== 'PROPIOS' && c !== '—') {
        return { texto: COURIER_LABEL[c] ?? c, color: COLOR_COURIER[c] ?? colorDeRepartidor(c) };
    }
    return { texto: 'Sin asignar', color: null };
}
