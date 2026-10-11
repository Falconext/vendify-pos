/**
 * El desglose de stock por talla.
 *
 * Los datos de este archivo son los de un producto real (Bota Alta Rondini,
 * 2 colores × 4 tallas, 77 unidades) para que las cuentas que se afirman acá
 * sean las mismas que el usuario ve en pantalla.
 */
import {
    etiquetaDeVariante,
    filasDeVariantes,
    nombresDeAtributos,
    sinStock,
    tieneVariantes,
    totalDeFilas,
} from '../stockPorVariante';

const variante = (
    id: number,
    codigo: string,
    Color: string,
    Talla: string,
    stock: number,
    stocks: { sedeId: number; stock: number }[] = [],
) => ({ id, codigo, estado: 'ACTIVO', valoresAtributos: { Color, Talla }, stock, stocks });

/** El modelo tal cual lo devuelve GET /productos. */
const BOTA = {
    id: 30017,
    descripcion: 'Bota Alta Rondini',
    stock: 77,
    opcionesAtributos: [
        { nombre: 'Color', valores: ['Negro', 'Rojo Oscuro'] },
        { nombre: 'Talla', valores: ['S', 'M', 'L', 'XL'] },
    ],
    variantes: [
        variante(30018, 'PR018-NEGR-S', 'Negro', 'S', 10, [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }]),
        variante(30019, 'PR018-NEGR-M', 'Negro', 'M', 10, [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }]),
        variante(30020, 'PR018-NEGR-L', 'Negro', 'L', 9, [{ sedeId: 1, stock: 9 }, { sedeId: 2, stock: 0 }]),
        variante(30021, 'PR018-NEGR-XL', 'Negro', 'XL', 10, [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }]),
        variante(30022, 'PR018-ROJO-S', 'Rojo Oscuro', 'S', 10, [{ sedeId: 1, stock: 4 }, { sedeId: 2, stock: 6 }]),
        variante(30023, 'PR018-ROJO-M', 'Rojo Oscuro', 'M', 10, [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }]),
        variante(30024, 'PR018-ROJO-L', 'Rojo Oscuro', 'L', 8, [{ sedeId: 1, stock: 8 }, { sedeId: 2, stock: 0 }]),
        variante(30025, 'PR018-ROJO-XL', 'Rojo Oscuro', 'XL', 10, [{ sedeId: 1, stock: 10 }, { sedeId: 2, stock: 0 }]),
    ],
};

describe('Qué productos se desglosan', () => {
    it('un modelo con tallas sí', () => {
        expect(tieneVariantes(BOTA)).toBe(true);
    });

    it('un producto suelto no ofrece desglose', () => {
        expect(tieneVariantes({ id: 1, stock: 5 })).toBe(false);
        expect(tieneVariantes({ id: 1, stock: 5, variantes: [] })).toBe(false);
    });

    it('un modelo cuyas variantes están todas desactivadas tampoco', () => {
        const apagado = { variantes: [{ ...variante(1, 'X', 'Negro', 'S', 3), estado: 'INACTIVO' }] };
        expect(tieneVariantes(apagado)).toBe(false);
    });
});

describe('El desglose cuadra con el total que muestra la lista', () => {
    it('las 8 combinaciones suman los 77 del badge', () => {
        // Si esto se rompe, el usuario ve un total y un desglose que no coinciden,
        // y deja de creerle a los dos.
        const filas = filasDeVariantes(BOTA);
        expect(filas).toHaveLength(8);
        expect(totalDeFilas(filas)).toBe(BOTA.stock);
    });

    it('una variante desactivada NO entra, igual que no entra en el total del padre', () => {
        const conApagada = {
            ...BOTA,
            variantes: [...BOTA.variantes, { ...variante(30099, 'PR018-VIEJA', 'Negro', 'XXL', 50), estado: 'INACTIVO' }],
        };
        const filas = filasDeVariantes(conApagada);
        expect(filas).toHaveLength(8);
        expect(totalDeFilas(filas)).toBe(77);
    });
});

describe('Columnas de atributos', () => {
    it('salen en el orden que configuró el usuario, no alfabético', () => {
        expect(nombresDeAtributos(BOTA)).toEqual(['Color', 'Talla']);
    });

    it('si el padre no trae las opciones, se deducen de las variantes', () => {
        const sinOpciones = { variantes: BOTA.variantes };
        expect(nombresDeAtributos(sinOpciones)).toEqual(['Color', 'Talla']);
    });

    it('un atributo que solo existe en una variante igual aparece', () => {
        const raro = {
            opcionesAtributos: [{ nombre: 'Color', valores: ['Negro'] }],
            variantes: [{ ...variante(1, 'A', 'Negro', 'S', 1), valoresAtributos: { Color: 'Negro', Material: 'Cuero' } }],
        };
        expect(nombresDeAtributos(raro)).toEqual(['Color', 'Material']);
    });

    it('la etiqueta respeta el orden de las columnas aunque el objeto venga al revés', () => {
        expect(etiquetaDeVariante({ Talla: 'M', Color: 'Negro' }, ['Color', 'Talla'])).toBe('Negro / M');
    });

    it('sin columnas conocidas no deja la fila en blanco', () => {
        expect(etiquetaDeVariante({ Talla: 'M' }, [])).toBe('M');
    });
});

describe('Filtrado por sede', () => {
    it('sin sede muestra el stock global de cada talla', () => {
        const filas = filasDeVariantes(BOTA);
        expect(filas.find((f) => f.sku === 'PR018-ROJO-S')?.stock).toBe(10);
    });

    it('con sede muestra SOLO lo de esa sede', () => {
        // La roja S tiene 4 en la sede 1 y 6 en la 2. Si acá saliera 10, una
        // vendedora de la sede 1 prometería 10 pares que no tiene.
        const filas = filasDeVariantes(BOTA, 1);
        expect(filas.find((f) => f.sku === 'PR018-ROJO-S')?.stock).toBe(4);
        expect(filasDeVariantes(BOTA, 2).find((f) => f.sku === 'PR018-ROJO-S')?.stock).toBe(6);
    });

    it('una talla sin fila en esa sede cuenta como cero, no como el global', () => {
        const filas = filasDeVariantes(BOTA, 99);
        expect(totalDeFilas(filas)).toBe(0);
    });

    it('el total por sede suma menos que el global cuando hay reparto', () => {
        expect(totalDeFilas(filasDeVariantes(BOTA, 1))).toBe(71);
        expect(totalDeFilas(filasDeVariantes(BOTA, 2))).toBe(6);
        expect(71 + 6).toBe(77);
    });
});

describe('Lo que la vendedora necesita saber de un vistazo', () => {
    it('cuenta cuántas tallas quedaron sin una sola unidad', () => {
        const filas = filasDeVariantes(BOTA, 2);
        expect(sinStock(filas)).toBe(7);
    });

    it('con todo el stock disponible no reporta faltantes', () => {
        expect(sinStock(filasDeVariantes(BOTA))).toBe(0);
    });
});

describe('Datos incompletos no rompen la pantalla', () => {
    it('una variante sin stocks por sede no explota', () => {
        const sinStocks = { variantes: [{ id: 1, codigo: 'A', estado: 'ACTIVO', valoresAtributos: { Talla: 'S' }, stock: 3 }] };
        expect(filasDeVariantes(sinStocks, 1)[0].stock).toBe(0);
        expect(filasDeVariantes(sinStocks)[0].stock).toBe(3);
    });

    it('un producto sin variantes devuelve lista vacía', () => {
        expect(filasDeVariantes({ id: 1 })).toEqual([]);
        expect(totalDeFilas([])).toBe(0);
    });

    it('valores con espacios de más se limpian', () => {
        const sucio = { variantes: [{ id: 1, codigo: ' A ', estado: 'ACTIVO', valoresAtributos: { Color: '  Negro ' }, stock: 1 }] };
        expect(filasDeVariantes(sucio)[0].etiqueta).toBe('Negro');
        expect(filasDeVariantes(sucio)[0].sku).toBe('A');
    });
});
