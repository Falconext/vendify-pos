import { aplicarVista, ProductoValorizado } from '../InventarioValorizadoModel';

const p = (id: number, descripcion: string, stock: number, extra: Partial<ProductoValorizado> = {}): ProductoValorizado => ({
    id, codigo: `C${id}`, descripcion, stock, costoPromedio: 1, costoDeBolsillo: 1.18,
    valorTotal: stock * 1.18, precioVenta: 2, valorVenta: stock * 2, gananciaPotencial: stock * 0.82,
    margenPotencial: 41, sinCosto: false, sinPrecio: false, unidadMedida: { codigo: 'NIU', nombre: 'Unidad' },
    ...extra,
});

const lista = [
    p(1, 'Polo rojo talla M', 10),
    p(2, 'Polo azul talla S', 0),
    p(3, 'Casaca negra', 4, { sinCosto: true }),
    p(4, 'Gorra', -2),
    p(5, 'Media', 30, { sinPrecio: true }),
];

describe('aplicarVista', () => {
    it('por defecto solo lo que tiene stock, de mayor a menor inversión', () => {
        expect(aplicarVista(lista, 'conStock', '', 'valorTotal', false).map((x) => x.id)).toEqual([5, 1, 3]);
    });
    it('busca por varias palabras en cualquier orden', () => {
        expect(aplicarVista(lista, 'todos', 'talla polo m', 'descripcion', true).map((x) => x.id)).toEqual([1]);
    });
    it('filtros de revisión', () => {
        expect(aplicarVista(lista, 'sinCosto', '', 'stock', false).map((x) => x.id)).toEqual([3]);
        expect(aplicarVista(lista, 'sinPrecio', '', 'stock', false).map((x) => x.id)).toEqual([5]);
        expect(aplicarVista(lista, 'negativo', '', 'stock', false).map((x) => x.id)).toEqual([4]);
    });
    it('ordena por nombre ascendente', () => {
        expect(aplicarVista(lista, 'todos', '', 'descripcion', true)[0].descripcion).toBe('Casaca negra');
    });
});
