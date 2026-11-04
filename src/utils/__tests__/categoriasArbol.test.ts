import { etiquetaCategoria, madresPosibles, opcionesCategorias, ordenarCategorias } from '../categoriasArbol'

const cats = [
    { id: 3, nombre: 'Vehículos' },
    { id: 1, nombre: 'Peluches' },
    { id: 4, nombre: 'Unicornios', padreId: 1 },
    { id: 2, nombre: 'Osos', padreId: 1, padre: { id: 1, nombre: 'Peluches' } },
    { id: 9, nombre: 'Huérfana', padreId: 77 },
]

describe('subcategorías en los selectores', () => {
    it('cada madre seguida de sus hijas, en orden alfabético', () => {
        expect(ordenarCategorias(cats).map(c => c.nombre)).toEqual(['Huérfana', 'Peluches', 'Osos', 'Unicornios', 'Vehículos'])
    })

    it('la hija lleva el nombre de su madre', () => {
        expect(etiquetaCategoria(cats[3])).toBe('Peluches › Osos')
        expect(etiquetaCategoria(cats[2], cats)).toBe('Peluches › Unicornios')
        expect(etiquetaCategoria(cats[0], cats)).toBe('Vehículos')
    })

    it('las opciones del Select conservan el id', () => {
        expect(opcionesCategorias(cats)).toContainEqual({ id: 2, value: 'Peluches › Osos' })
    })

    it('solo una principal puede ser madre, y nunca de sí misma', () => {
        expect(madresPosibles(cats, 1).map(c => c.id)).toEqual([3])
    })
})
