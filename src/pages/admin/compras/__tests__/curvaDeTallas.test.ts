/**
 * La curva de tallas de la orden de compra.
 *
 * Pedido de COMERCIAL LINNA MODA: al proveedor se le pide por talla, no por
 * modelo. Lo que más importa acá es que la curva produzca las MISMAS líneas
 * que si se agregaran una por una, para que el PDF al proveedor y la recepción
 * de mercadería no tengan que saber que existió una grilla.
 */
import {
    curvaDeModelo,
    lineasDeCurva,
    sePideEnCurva,
    totalDeCurva,
} from '../curvaDeTallas';

const v = (id: number, talla: string, stock: number, costo?: number) => ({
    id, codigo: `VER-${talla}`, estado: 'ACTIVO',
    valoresAtributos: { Color: 'Rosa', Talla: talla }, stock, stocks: [],
    ...(costo === undefined ? {} : { costoPromedio: costo }),
});

/** Verona rosa, 4 tallas. */
const VERONA = {
    id: 1, descripcion: 'VERONA ROSA', codigo: 'VR', tipoAfectacionIGV: '10',
    costoPromedio: 46.61,
    opcionesAtributos: [
        { nombre: 'Color', valores: ['Rosa'] },
        { nombre: 'Talla', valores: ['35', '36', '37', '38'] },
    ],
    variantes: [v(11, '35', 0), v(12, '36', 2), v(13, '37', 1), v(14, '38', 0)],
};

describe('Cuándo se abre la curva', () => {
    it('un modelo con varias tallas se pide en curva', () => {
        expect(sePideEnCurva(VERONA)).toBe(true);
    });

    it('un producto suelto NO abre grilla', () => {
        expect(sePideEnCurva({ id: 9, descripcion: 'CAJA', variantes: [] })).toBe(false);
    });

    it('un modelo de UNA sola talla tampoco: sería una grilla de una casilla', () => {
        expect(sePideEnCurva({ ...VERONA, variantes: [v(11, '36', 1)] })).toBe(false);
    });

    it('las tallas desactivadas no cuentan para abrirla', () => {
        const casi = { ...VERONA, variantes: [v(11, '36', 1), { ...v(12, '37', 1), estado: 'INACTIVO' }] };
        expect(sePideEnCurva(casi)).toBe(false);
    });
});

describe('Cómo se arma la curva', () => {
    it('trae todas las tallas, incluso las que están en cero', () => {
        // A diferencia del catálogo: acá justamente se compra lo que falta.
        expect(curvaDeModelo(VERONA).map((c) => c.talla)).toEqual(['35', '36', '37', '38']);
    });

    it('en orden numérico, no alfabético', () => {
        const conNueve = { ...VERONA, variantes: [v(11, '40', 0), v(12, '9', 0), v(13, '36', 0)] };
        expect(curvaDeModelo(conNueve).map((c) => c.talla)).toEqual(['9', '36', '40']);
    });

    it('muestra el stock actual de cada talla, para saber qué reponer', () => {
        const curva = curvaDeModelo(VERONA);
        expect(curva.find((c) => c.talla === '36')?.stockActual).toBe(2);
        expect(curva.find((c) => c.talla === '35')?.stockActual).toBe(0);
    });

    it('hereda el costo del modelo cuando la talla no tiene propio', () => {
        expect(curvaDeModelo(VERONA)[0].costo).toBe(46.61);
    });

    it('pero el costo propio de una talla manda sobre el del modelo', () => {
        const especial = { ...VERONA, variantes: [v(11, '35', 0, 52), v(12, '36', 0)] };
        const curva = curvaDeModelo(especial);
        expect(curva.find((c) => c.talla === '35')?.costo).toBe(52);
        expect(curva.find((c) => c.talla === '36')?.costo).toBe(46.61);
    });
});

describe('Las líneas que llegan a la orden', () => {
    it('una línea por talla pedida, con el productoId de la VARIANTE', () => {
        const lineas = lineasDeCurva(VERONA, { 11: 2, 12: 3, 13: 0, 14: '' });
        expect(lineas).toHaveLength(2);
        expect(lineas.map((l) => l.productoId)).toEqual([11, 12]);
        expect(lineas.map((l) => l.cantidad)).toEqual([2, 3]);
    });

    it('la descripción dice modelo y talla: el proveedor lee ese papel', () => {
        const [linea] = lineasDeCurva(VERONA, { 12: 1 });
        expect(linea.descripcion).toBe('VERONA ROSA - Rosa / 36');
    });

    it('las tallas sin cantidad no ensucian la orden', () => {
        expect(lineasDeCurva(VERONA, { 11: 0, 12: 0, 13: 0, 14: 0 })).toEqual([]);
    });

    it('una cantidad negativa se descarta, no resta del total', () => {
        expect(lineasDeCurva(VERONA, { 11: -5, 12: 2 })).toHaveLength(1);
    });

    it('arrastra el costo de cada talla', () => {
        const [l35, l36] = lineasDeCurva({ ...VERONA, variantes: [v(11, '35', 0, 52), v(12, '36', 0)] }, { 11: 1, 12: 1 });
        expect(l35.precioUnitario).toBe(52);
        expect(l36.precioUnitario).toBe(46.61);
    });

    it('permite corregir el costo a mano por talla', () => {
        const [linea] = lineasDeCurva(VERONA, { 12: 1 }, { 12: '60' });
        expect(linea.precioUnitario).toBe(60);
    });

    it('un costo en blanco no borra el del catálogo', () => {
        const [linea] = lineasDeCurva(VERONA, { 12: 1 }, { 12: '' });
        expect(linea.precioUnitario).toBe(46.61);
    });

    it('hereda la afectación IGV del modelo', () => {
        expect(lineasDeCurva(VERONA, { 12: 1 })[0].gravado).toBe(true);
        const exonerado = { ...VERONA, tipoAfectacionIGV: '20' };
        expect(lineasDeCurva(exonerado, { 12: 1 })[0].gravado).toBe(false);
    });
});

describe('El total mientras se carga', () => {
    it('suma los pares pedidos', () => {
        expect(totalDeCurva({ 11: 2, 12: 3, 13: 1 })).toBe(6);
    });

    it('ignora vacíos y negativos', () => {
        expect(totalDeCurva({ 11: '', 12: -3, 13: 2 })).toBe(2);
    });

    it('una curva vacía suma cero', () => {
        expect(totalDeCurva({})).toBe(0);
    });
});
