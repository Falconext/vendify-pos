/**
 * Revalidar el carrito contra una sede (`carrito/disponibilidad`).
 */
import axios from 'axios';
import {
    aplicarAjustes,
    calcularAjustes,
    itemsParaDisponibilidad,
    leerCarrito,
    revisarCarrito,
    textoMotivo,
    type LineaCarrito,
    type RespuestaDisponibilidad,
} from '../carritoSede';
import { tiendaCartKey } from '@/utils/tiendaCart';

const CARRITO: LineaCarrito[] = [
    { id: 7, productoId: 7, cantidad: 5, descripcion: 'Polo' },
    { id: '7-70', productoId: 7, varianteId: 70, presentacionCodigo: 'ROLLO-12', cantidad: 2, descripcion: 'Tela rollo' },
    { id: 'combo-30', esCombo: true, comboId: 30, cantidad: 1, descripcion: 'Combo' },
    { id: 'raro', cantidad: 1, descripcion: 'Sin id' },
    { id: 9, productoId: 9, cantidad: 4, descripcion: 'Taza' },
];

const respuesta = (items: Partial<RespuestaDisponibilidad['items'][number]>[]): RespuestaDisponibilidad => ({
    modo: 'CLIENTE',
    sedeId: 2,
    ventaSinStock: false,
    items: items.map((i) => ({ productoId: null, varianteId: null, comboId: null, cantidad: 1, stock: 0, disponible: true, motivo: null, ...i })),
});

describe('itemsParaDisponibilidad', () => {
    it('arma producto, variante, presentación y combo; salta lo que no se puede consultar', () => {
        const { items, indices } = itemsParaDisponibilidad(CARRITO);
        expect(items).toEqual([
            { productoId: 7, cantidad: 5 },
            { productoId: 7, varianteId: 70, presentacionCodigo: 'ROLLO-12', cantidad: 2 },
            { comboId: 30, cantidad: 1 },
            { productoId: 9, cantidad: 4 },
        ]);
        expect(indices).toEqual([0, 1, 2, 4]);
    });

    it('combo guardado solo con id "combo-N"', () => {
        expect(itemsParaDisponibilidad([{ id: 'combo-5', esCombo: true, cantidad: 2 }]).items).toEqual([{ comboId: 5, cantidad: 2 }]);
    });

    it('nunca manda más de 100 ítems ni cantidades inválidas', () => {
        const muchos = Array.from({ length: 130 }, (_, i) => ({ productoId: i + 1, cantidad: 0 }));
        const { items } = itemsParaDisponibilidad(muchos);
        expect(items).toHaveLength(100);
        expect(items[0].cantidad).toBe(1);
    });
});

describe('calcularAjustes / aplicarAjustes', () => {
    const { indices } = itemsParaDisponibilidad(CARRITO);

    it('falta stock en una línea única sin presentación → se baja la cantidad', () => {
        const r = respuesta([{}, {}, {}, { productoId: 9, disponible: false, motivo: 'SIN_STOCK', stock: 2 }]);
        const ajustes = calcularAjustes(CARRITO, indices, r);
        expect(ajustes).toEqual([expect.objectContaining({ indice: 4, nuevaCantidad: 2, motivo: 'SIN_STOCK' })]);
        const nuevo = aplicarAjustes(CARRITO, ajustes);
        expect(nuevo[4].cantidad).toBe(2);
        expect(nuevo).toHaveLength(CARRITO.length);
    });

    it('no vendible, inexistente o producto repartido en varias líneas → se quita', () => {
        const r = respuesta([
            { productoId: 7, disponible: false, motivo: 'SIN_STOCK', stock: 3 }, // 2 líneas del mismo producto
            {},
            { comboId: 30, disponible: false, motivo: 'NO_VENDIBLE' },
            { productoId: 9, disponible: false, motivo: 'NO_EXISTE' },
        ]);
        const ajustes = calcularAjustes(CARRITO, indices, r);
        expect(ajustes.map((a) => [a.indice, a.nuevaCantidad])).toEqual([[0, 0], [2, 0], [4, 0]]);
        expect(aplicarAjustes(CARRITO, ajustes).map((l) => l.id)).toEqual(['7-70', 'raro']);
    });

    it('presentación sin stock → se quita (el stock llega en unidades base)', () => {
        const r = respuesta([{}, { disponible: false, motivo: 'SIN_STOCK', stock: 30 }, {}, {}]);
        expect(calcularAjustes(CARRITO, indices, r)[0]).toMatchObject({ indice: 1, nuevaCantidad: 0 });
    });

    it('todo disponible → nada que ajustar', () => {
        expect(calcularAjustes(CARRITO, indices, respuesta([{}, {}, {}, {}]))).toEqual([]);
    });
});

describe('revisarCarrito', () => {
    afterEach(() => jest.restoreAllMocks());

    it('manda el carrito guardado con la sede y entiende el sobre {code,data}', async () => {
        localStorage.setItem(tiendaCartKey('krezka'), JSON.stringify([{ id: 9, productoId: 9, cantidad: 4, descripcion: 'Taza' }]));
        const post = jest.spyOn(axios, 'post').mockResolvedValue({
            data: { code: 1, data: { modo: 'CLIENTE', sedeId: 2, ventaSinStock: false, items: [{ productoId: 9, cantidad: 4, stock: 1, disponible: false, motivo: 'SIN_STOCK' }] } },
        });
        const rev = await revisarCarrito('krezka', 2);
        expect(post).toHaveBeenCalledWith(expect.stringContaining('/public/store/krezka/carrito/disponibilidad'), { sedeId: 2, items: [{ productoId: 9, cantidad: 4 }] });
        expect(rev?.ajustes).toEqual([expect.objectContaining({ indice: 0, nuevaCantidad: 1 })]);
    });

    it('carrito vacío o corrupto: no consulta', async () => {
        const post = jest.spyOn(axios, 'post');
        localStorage.setItem(tiendaCartKey('krezka'), '{roto');
        expect(leerCarrito('krezka')).toEqual([]);
        expect(await revisarCarrito('krezka', 2)).toBeNull();
        expect(post).not.toHaveBeenCalled();
    });
});

it('textoMotivo', () => {
    expect(textoMotivo('NO_VENDIBLE', 'Norte')).toBe('No se vende en Norte');
    expect(textoMotivo('SIN_STOCK', null)).toBe('Sin stock suficiente');
    expect(textoMotivo('NO_EXISTE', 'Norte')).toBe('Ya no está en la tienda');
});
