export type ICategory = {
  id?: number
  nombre: string
  empresaId: string
  imagenUrl?: string
  /** Subcategoría: id y nombre de su categoría madre. */
  padreId?: number | null
  padre?: { id: number; nombre: string } | null
  _count?: {
    productos: number
  }
}

export type IFormCategories = {
  categoriaId?: number
  nombre: string
  imagenUrl?: string
  /** null = principal. */
  padreId?: number | null
}