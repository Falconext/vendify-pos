import {
    avisoMezcla,
    cantidadEnMezcla,
    configMezclaDe,
    precioPorCantidad,
    reprecioPorMezcla,
    seRepreciaPorMezcla,
} from '../mayoristaMezcla';

// Perfumes del caso real: S/ 25 la unidad, S/ 20 desde 6 y S/ 18 desde 12.
const ESCALAS = [
    { cantidadMinima: 6, precio: 20 },
    { cantidadMinima: 12, precio: 18 },
];
const perfume = (productoId: number, cantidad: number, extra: any = {}) => ({
    productoId,
    categoriaId: 1,
    cantidad,
    precioBase: 25,
    precioUnitario: 25,
    preciosMayorista: ESCALAS,
    ...extra,
});
const TODOS = { activo: true, categoriaIds: [] as number[] };

const aplicar = (lineas: any[], cfg = TODOS) => {
    const copia = lineas.map((l) => ({ ...l }));
    for (const c of reprecioPorMezcla(copia, cfg)) Object.assign(copia[c.index], c.patch);
    return copia;
};

describe('configuración de la empresa', () => {
    it('apagada o sin datos no mezcla', () => {
        expect(configMezclaDe(null).activo).toBe(false);
        expect(configMezclaDe({ mayoristaMezclaActivo: false, mayoristaMezclaCategoriaIds: [1] }).activo).toBe(false);
    });

    it('encendida toma las categorías y descarta basura', () => {
        expect(configMezclaDe({ mayoristaMezclaActivo: true, mayoristaMezclaCategoriaIds: [3, '4', 0, -1, 'x'] })).toEqual({
            activo: true,
            categoriaIds: [3, 4],
        });
        expect(configMezclaDe({ mayoristaMezclaActivo: true })).toEqual({ activo: true, categoriaIds: [] });
    });
});

describe('precio por cantidad (la escala de siempre)', () => {
    it('toma la escala más alta alcanzada', () => {
        expect(precioPorCantidad(25, ESCALAS, 5)).toBe(25);
        expect(precioPorCantidad(25, ESCALAS, 6)).toBe(20);
        expect(precioPorCantidad(25, ESCALAS, 13)).toBe(18);
    });

    it('una escala guardada como precio del lote se reparte por unidad', () => {
        expect(precioPorCantidad(25, [{ cantidadMinima: 6, precio: 120 }], 6)).toBe(20);
    });
});

describe('mezcla de productos distintos', () => {
    it('el caso del cliente: 2 + 2 + 2 perfumes distintos = precio de 6 en cada uno', () => {
        const r = aplicar([perfume(1, 2), perfume(2, 2), perfume(3, 2)]);
        expect(r.map((l) => l.precioUnitario)).toEqual([20, 20, 20]);
        expect(r[0].total).toBe('40.00');
    });

    it('sin llegar al mínimo, todos siguen a precio de lista', () => {
        const r = aplicar([perfume(1, 2), perfume(2, 2)]);
        expect(r.map((l) => l.precioUnitario)).toEqual([25, 25]);
        expect(reprecioPorMezcla([perfume(1, 2), perfume(2, 2)], TODOS)).toEqual([]);
    });

    it('cada producto toma SU propia escala', () => {
        const caro = perfume(2, 3, { precioBase: 40, precioUnitario: 40, preciosMayorista: [{ cantidadMinima: 6, precio: 35 }] });
        const r = aplicar([perfume(1, 3), caro]);
        expect(r[0].precioUnitario).toBe(20);
        expect(r[1].precioUnitario).toBe(35);
    });

    it('al quitar unidades y bajar del mínimo, vuelve al precio de lista', () => {
        const conMayor = aplicar([perfume(1, 3), perfume(2, 3)]);
        expect(conMayor[0].precioUnitario).toBe(20);
        conMayor[1].cantidad = 1;
        const r = aplicar(conMayor);
        expect(r.map((l) => l.precioUnitario)).toEqual([25, 25]);
    });

    it('sube a la siguiente escala con el total', () => {
        const r = aplicar([perfume(1, 6), perfume(2, 6)]);
        expect(r.map((l) => l.precioUnitario)).toEqual([18, 18]);
    });

    it('un producto sin escalas suma unidades pero no cambia de precio', () => {
        const estuche = { productoId: 9, categoriaId: 1, cantidad: 4, precioBase: 10, precioUnitario: 10 };
        const r = aplicar([perfume(1, 2), estuche]);
        expect(r[0].precioUnitario).toBe(20);
        expect(r[1].precioUnitario).toBe(10);
    });

    it('respeta el descuento de la línea en el total', () => {
        const r = aplicar([perfume(1, 3, { descuento: 10 }), perfume(2, 3)]);
        expect(r[0].precioUnitario).toBe(20);
        expect(r[0].total).toBe('54.00');
    });

    it('es idempotente: aplicado dos veces no cambia nada', () => {
        const una = aplicar([perfume(1, 3), perfume(2, 3)]);
        expect(reprecioPorMezcla(una, TODOS)).toEqual([]);
    });

    it('apagada no toca nada', () => {
        expect(reprecioPorMezcla([perfume(1, 3), perfume(2, 3)], { activo: false, categoriaIds: [] })).toEqual([]);
    });
});

describe('alcance por categoría', () => {
    const PERFUMES = { activo: true, categoriaIds: [1] };

    it('solo suman los productos de las categorías elegidas', () => {
        const cartera = perfume(5, 4, { categoriaId: 2 });
        const r = aplicar([perfume(1, 2), cartera], PERFUMES);
        expect(r[0].precioUnitario).toBe(25);
        expect(cantidadEnMezcla([perfume(1, 2), cartera], PERFUMES)).toBe(2);
    });

    it('cuenta la categoría adicional del producto', () => {
        const enExtra = perfume(5, 4, { categoriaId: 2, categoriasExtra: [{ id: 1, nombre: 'Perfumes' }] });
        expect(aplicar([perfume(1, 2), enExtra], PERFUMES).map((l) => l.precioUnitario)).toEqual([20, 20]);
    });
});

describe('lo que la mezcla no toca', () => {
    it('el precio escrito a mano manda, pero sus unidades suman', () => {
        const manual = perfume(2, 4, { precioUnitario: 22, precioManual: true });
        const r = aplicar([perfume(1, 2), manual]);
        expect(r[0].precioUnitario).toBe(20);
        expect(r[1].precioUnitario).toBe(22);
    });

    it('una escala elegida a mano tampoco se pisa', () => {
        expect(seRepreciaPorMezcla(perfume(1, 2, { _tierOverride: 6 }), TODOS)).toBe(false);
    });

    it('las líneas de un comprobante ya emitido conservan su precio', () => {
        expect(seRepreciaPorMezcla(perfume(1, 2, { precioDelDocumento: true }), TODOS)).toBe(false);
    });

    it('paquetes y presentaciones tienen su propio precio', () => {
        expect(seRepreciaPorMezcla(perfume(1, 6, { esPaquete: true, unidadesPorPaquete: 6 }), TODOS)).toBe(false);
        expect(seRepreciaPorMezcla(perfume(1, 6, { presentacionCodigo: 'CAJA12' }), TODOS)).toBe(false);
    });

    it('kits, ítems libres y regalos no suman', () => {
        const lineas = [
            perfume(1, 2),
            { productoId: 7, comboId: 3, cantidad: 4 },
            { productoId: 0, esItemLibre: true, cantidad: 4 },
            perfume(2, 4, { tipoAfectacionIGV: '21' }),
        ];
        expect(cantidadEnMezcla(lineas, TODOS)).toBe(2);
    });
});

describe('aviso en el carrito', () => {
    it('dice cuánto falta para la escala', () => {
        expect(avisoMezcla([perfume(1, 2), perfume(2, 2)], TODOS)).toEqual({
            total: 4,
            aplicado: false,
            siguiente: { cantidadMinima: 6, faltan: 2 },
        });
    });

    it('marca el precio por mayor aplicado y la próxima escala', () => {
        expect(avisoMezcla([perfume(1, 3), perfume(2, 4)], TODOS)).toEqual({
            total: 7,
            aplicado: true,
            siguiente: { cantidadMinima: 12, faltan: 5 },
        });
    });

    it('sin productos con escalas no avisa', () => {
        expect(avisoMezcla([{ productoId: 9, cantidad: 3, precioUnitario: 10 }], TODOS)).toBeNull();
        expect(avisoMezcla([perfume(1, 3)], { activo: false, categoriaIds: [] })).toBeNull();
    });
});
