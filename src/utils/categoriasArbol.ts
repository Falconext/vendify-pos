/**
 * Subcategorías (02-11): una categoría puede colgar de otra, un solo nivel
 * ("Peluches › Osos"). Estas funciones ordenan la lista para los selectores:
 * cada madre seguida de sus hijas, y la hija con el nombre de su madre.
 */
export interface CategoriaArbol {
    id?: number
    nombre: string
    padreId?: number | null
    padre?: { id: number; nombre: string } | null
}

export const SEPARADOR_CATEGORIA = ' › '

/** "Peluches › Osos" para una subcategoría; el nombre solo para una principal. */
export function etiquetaCategoria(c: CategoriaArbol, todas: CategoriaArbol[] = []): string {
    const madre = c.padre?.nombre ?? (c.padreId ? todas.find((t) => t.id === c.padreId)?.nombre : undefined)
    return madre ? `${madre}${SEPARADOR_CATEGORIA}${c.nombre}` : c.nombre
}

/** Madres en orden alfabético, cada una seguida de sus hijas. Una hija huérfana va como madre. */
export function ordenarCategorias<T extends CategoriaArbol>(lista: T[]): T[] {
    const ids = new Set(lista.map((c) => c.id))
    const esHija = (c: T) => Boolean(c.padreId && ids.has(c.padreId))
    const porNombre = (a: T, b: T) => a.nombre.localeCompare(b.nombre, 'es')
    const madres = lista.filter((c) => !esHija(c)).sort(porNombre)
    return madres.flatMap((m) => [m, ...lista.filter((h) => esHija(h) && h.padreId === m.id).sort(porNombre)])
}

/** Opciones { id, value } de un Select, ya ordenadas y con la madre en la etiqueta. */
export function opcionesCategorias(lista: CategoriaArbol[] | undefined) {
    const todas = lista ?? []
    return ordenarCategorias(todas).map((c) => ({ id: c.id, value: etiquetaCategoria(c, todas) }))
}

/** Las categorías que pueden ser madre de `categoriaId`: principales, sin ella misma. */
export function madresPosibles(lista: CategoriaArbol[] | undefined, categoriaId?: number) {
    return ordenarCategorias((lista ?? []).filter((c) => !c.padreId && c.id !== categoriaId))
}
