import type { RotuloLoteItem } from './RotulosLotePrint';

/**
 * Un despacho de la lista que puede llevar rótulo, con el nombre del cliente
 * para que el empaquetador reconozca la fila en el selector.
 */
export type RotuloElegible = RotuloLoteItem & { cliente: string };

/**
 * `null` = no tocaron el selector todavía → se imprimen todos (el flujo de un
 * solo clic de siempre). Un Set (aunque esté vacío) = eligieron a mano.
 */
export type SeleccionRotulos = Set<number> | null;

const celularDe = (item: { celularDest?: string; clienteTelefono?: string }) => {
    const dest = item.celularDest;
    if (dest && dest !== '—') return dest;
    return item.clienteTelefono || '';
};

/**
 * Los despachos de la vista actual a los que les toca rótulo: en "Preparando"
 * y con comprobante. Respeta pestaña, búsqueda y filtros porque sale de la
 * lista ya filtrada; cualquier courier entra.
 */
export const elegiblesParaRotulo = (
    filtrados: {
        comprobanteId: number | null;
        referencia: string;
        cliente: string;
        courier: string;
        celularDest: string;
        clienteTelefono: string;
        estadoDespacho: string;
    }[],
): RotuloElegible[] =>
    (filtrados ?? [])
        .filter((i) => i.comprobanteId && i.estadoDespacho === 'PREPARANDO')
        .map((i) => ({
            comprobanteId: i.comprobanteId as number,
            referencia: i.referencia,
            cliente: i.cliente || '',
            courier: i.courier || '',
            celular: celularDe(i),
        }));

/** Si una fila cuenta como marcada hoy (sin selección, todas lo están). */
export const estaMarcado = (seleccion: SeleccionRotulos, comprobanteId: number) =>
    seleccion === null || seleccion.has(comprobanteId);

/**
 * Lo que realmente se manda a imprimir, en el orden de la tabla. Las filas que
 * ya no están en la lista (cambió un filtro con la selección hecha) se caen
 * solas: nunca se imprime algo que el usuario dejó de ver.
 */
export const rotulosAImprimir = (
    elegibles: RotuloElegible[],
    seleccion: SeleccionRotulos,
): RotuloElegible[] => {
    const lista = elegibles ?? [];
    if (seleccion === null) return lista;
    return lista.filter((i) => seleccion.has(i.comprobanteId));
};

/** Marca o desmarca una fila. Al tocar la primera, "todos" se materializa. */
export const alternarRotulo = (
    elegibles: RotuloElegible[],
    seleccion: SeleccionRotulos,
    comprobanteId: number,
): Set<number> => {
    const base = seleccion === null
        ? new Set((elegibles ?? []).map((i) => i.comprobanteId))
        : new Set(seleccion);
    if (base.has(comprobanteId)) base.delete(comprobanteId);
    else base.add(comprobanteId);
    return base;
};

/** Marcar todas / ninguna, según cómo esté la lista visible ahora. */
export const alternarTodos = (
    elegibles: RotuloElegible[],
    seleccion: SeleccionRotulos,
): Set<number> => {
    const lista = elegibles ?? [];
    const marcadas = rotulosAImprimir(lista, seleccion).length;
    if (lista.length > 0 && marcadas === lista.length) return new Set<number>();
    return new Set(lista.map((i) => i.comprobanteId));
};

/** Texto del botón: cuántos rótulos saldrían con lo que hay marcado. */
export const resumenSeleccion = (elegibles: RotuloElegible[], seleccion: SeleccionRotulos) => {
    const total = (elegibles ?? []).length;
    const marcados = rotulosAImprimir(elegibles, seleccion).length;
    return { total, marcados, todos: marcados === total && total > 0, vacio: marcados === 0 };
};
