/**
 * Un producto puede estar en varias categorías: la principal (`categoriaId`)
 * y las adicionales (`categoriasExtraIds`). Lo puro va aquí para probarlo sin
 * montar el modal.
 */
import type { ICategoriaResumen } from '@/interfaces/products';

/**
 * Lo que viaja al backend. `undefined` (backend anterior o producto que no las
 * trajo) no se envía y el backend no las toca; `[]` las quita todas. Se limpia
 * la principal y los repetidos, y nunca se manda el arreglo de objetos
 * `categoriasExtra` que viene del listado.
 */
export function payloadCategoriasExtra(form: {
    categoriaId?: string | number | null
    categoriasExtraIds?: number[]
}): { categoriasExtra: undefined; categoriasExtraIds?: number[] } {
    if (!Array.isArray(form.categoriasExtraIds)) return { categoriasExtra: undefined };
    const principal = Number(form.categoriaId) || null;
    const ids = [...new Set(form.categoriasExtraIds.map(Number))].filter(
        (id) => Number.isInteger(id) && id > 0 && id !== principal,
    );
    return { categoriasExtra: undefined, categoriasExtraIds: ids };
}

/** Texto del "+N" de la tabla: cuántas adicionales y cuáles (para el tooltip). */
export function resumenCategoriasExtra(
    categoriasExtra: ICategoriaResumen[] | undefined | null,
): { cantidad: number; nombres: string } | null {
    if (!Array.isArray(categoriasExtra) || categoriasExtra.length === 0) return null;
    return {
        cantidad: categoriasExtra.length,
        nombres: categoriasExtra.map((c) => c.nombre).join(', '),
    };
}
