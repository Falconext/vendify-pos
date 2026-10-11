/**
 * QA funcional de "stock en camino" atravesando los módulos que se tocan:
 * orden de compra → producto/variantes → inventario → POS → catálogo.
 *
 * Caso de KREZKA: hay una orden de compra con tallas que no están en el
 * almacén y las vendedoras necesitan saber si las pueden ofrecer.
 *
 * Usa las funciones reales de los dos lados: el agrupado del backend y los
 * textos del frontend.
 */
import { enCaminoDe, textoDeStock, situacionDeStock, detalleEnCamino } from '../stockEnCamino';
import { filasDeVariantes, tallasDisponibles, textoDeTallas, totalDeFilas } from '../stockPorVariante';

/** Modelo con tres tallas: 38 con stock, 39 y 40 agotadas. */
const modelo = (enCaminoPorVariante: Record<number, { enCamino: number; proxima?: string }> = {}) => ({
    id: 100,
    descripcion: 'ZAPATILLA URBAN 300',
    stock: 2,
    opcionesAtributos: [{ nombre: 'Talla', valores: ['38', '39', '40'] }],
    variantes: [
        { id: 101, codigo: 'URB-38', estado: 'ACTIVO', valoresAtributos: { Talla: '38' }, stock: 2, stocks: [], ...(enCaminoPorVariante[101] ? { enCamino: enCaminoPorVariante[101].enCamino, enCaminoProximaEntrega: enCaminoPorVariante[101].proxima ?? null } : {}) },
        { id: 102, codigo: 'URB-39', estado: 'ACTIVO', valoresAtributos: { Talla: '39' }, stock: 0, stocks: [], ...(enCaminoPorVariante[102] ? { enCamino: enCaminoPorVariante[102].enCamino, enCaminoProximaEntrega: enCaminoPorVariante[102].proxima ?? null } : {}) },
        { id: 103, codigo: 'URB-40', estado: 'ACTIVO', valoresAtributos: { Talla: '40' }, stock: 0, stocks: [], ...(enCaminoPorVariante[103] ? { enCamino: enCaminoPorVariante[103].enCamino, enCaminoProximaEntrega: enCaminoPorVariante[103].proxima ?? null } : {}) },
    ],
});

describe('1. Sin orden de compra abierta: todo sigue como antes', () => {
    const producto = modelo();

    it('el inventario no muestra nada en camino', () => {
        expect(enCaminoDe(producto)).toBe(0);
        expect(textoDeStock(producto, 2)).toBe('Stock: 2');
    });

    it('las tallas agotadas no aparecen en el catálogo', () => {
        expect(tallasDisponibles(producto).map((t) => t.talla)).toEqual(['38']);
        expect(textoDeTallas(producto)).toBe('38:2');
    });

    it('la talla sin stock ni reposición no se puede prometer', () => {
        const talla39 = filasDeVariantes(producto).find((f) => f.atributos.Talla === '39')!;
        expect(situacionDeStock(talla39, talla39.stock)).toBe('sin-stock');
    });
});

describe('2. Se emite la orden de compra: lo que llega del backend', () => {
    // El agrupado se prueba en el backend (stock-en-camino.spec.ts). Acá se
    // verifica que el frontend lea bien la forma que el API devuelve: el
    // `enCamino` viaja en la VARIANTE, no en el modelo padre.
    const producto = modelo({ 102: { enCamino: 3, proxima: '2026-10-20' }, 103: { enCamino: 2 } });

    it('cada talla trae lo suyo, no el total del modelo', () => {
        const porId = Object.fromEntries(filasDeVariantes(producto).map((f) => [f.id, f]));
        expect(porId[101].enCamino).toBe(0);
        expect(porId[102].enCamino).toBe(3);
        expect(porId[103].enCamino).toBe(2);
    });

    it('la fecha comprometida viaja con la talla', () => {
        const porId = Object.fromEntries(filasDeVariantes(producto).map((f) => [f.id, f]));
        expect(porId[102].enCaminoProximaEntrega).toBe('2026-10-20');
        expect(porId[103].enCaminoProximaEntrega).toBeNull();
    });
});

describe('3. Lo que ve la vendedora en el POS', () => {
    const producto = modelo({ 102: { enCamino: 3, proxima: '2026-10-20' }, 103: { enCamino: 2 } });

    it('la talla 39 pasa de "sin stock" a "por llegar"', () => {
        const t39 = filasDeVariantes(producto).find((f) => f.atributos.Talla === '39')!;
        expect(situacionDeStock(t39, t39.stock)).toBe('por-llegar');
    });

    it('el renglón dice cuánto hay y cuánto viene, sin mezclarlos', () => {
        const t39 = filasDeVariantes(producto).find((f) => f.atributos.Talla === '39')!;
        expect(textoDeStock(t39, t39.stock)).toBe('Stock: 0 · +3 en camino');
    });

    it('con fecha comprometida la dice; sin fecha, avisa que no la hay', () => {
        const filas = filasDeVariantes(producto);
        const t39 = filas.find((f) => f.atributos.Talla === '39')!;
        const t40 = filas.find((f) => f.atributos.Talla === '40')!;
        expect(detalleEnCamino(t39)).toContain('llegan el 20/10/2026');
        expect(detalleEnCamino(t40)).toContain('sin fecha confirmada');
    });
});

describe('4. El desglose por talla', () => {
    const producto = modelo({ 102: { enCamino: 3, proxima: '2026-10-20' }, 103: { enCamino: 2 } });

    it('las tallas agotadas pero pedidas ahora SÍ aparecen', () => {
        expect(tallasDisponibles(producto).map((t) => t.talla)).toEqual(['38', '39', '40']);
    });

    it('cada talla trae su propio en camino', () => {
        const porTalla = Object.fromEntries(tallasDisponibles(producto).map((t) => [t.talla, t]));
        expect(porTalla['38']).toMatchObject({ stock: 2, enCamino: 0 });
        expect(porTalla['39']).toMatchObject({ stock: 0, enCamino: 3 });
        expect(porTalla['40']).toMatchObject({ stock: 0, enCamino: 2 });
    });

    it('el texto compacto del catálogo separa lo que hay de lo que viene', () => {
        expect(textoDeTallas(producto)).toBe('38:2 · 39:0+3 · 40:0+2');
    });

    it('el total de stock NO incluye lo que viene en camino', () => {
        expect(totalDeFilas(filasDeVariantes(producto))).toBe(2);
    });
});

describe('5. Cuando la orden se recibe', () => {
    it('la mercadería pasa a stock y deja de estar en camino', () => {
        // El backend solo cuenta órdenes EMITIDAS: al recibirse pasa a RECIBIDA
        // y sale del cálculo. Acá se simula el estado después de la recepción.
        const recibido = modelo({ 102: { enCamino: 0 } });
        recibido.variantes[1].stock = 3;
        const t39 = filasDeVariantes(recibido).find((f) => f.atributos.Talla === '39')!;
        expect(t39.stock).toBe(3);
        expect(t39.enCamino).toBe(0);
        expect(situacionDeStock(t39, t39.stock)).toBe('disponible');
        expect(textoDeStock(t39, t39.stock)).toBe('Stock: 3');
    });
});

describe('6. Reglas que no se pueden violar en ningún módulo', () => {
    const producto = modelo({ 102: { enCamino: 3 }, 103: { enCamino: 2 } });

    it('el stock del modelo nunca crece por lo que viene en camino', () => {
        const filas = filasDeVariantes(producto);
        expect(totalDeFilas(filas)).toBe(2);
        expect(filas.reduce((s, f) => s + f.enCamino, 0)).toBe(5);
    });

    it('ningún texto suma stock + en camino en un solo número', () => {
        for (const fila of filasDeVariantes(producto)) {
            const texto = textoDeStock(fila, fila.stock);
            expect(texto).toContain(`Stock: ${fila.stock}`);
            if (fila.enCamino > 0) expect(texto).toContain(`+${fila.enCamino} en camino`);
        }
    });

    it('nunca se marca "disponible" una talla que no tiene stock', () => {
        for (const fila of filasDeVariantes(producto)) {
            if (fila.stock === 0) expect(situacionDeStock(fila, fila.stock)).not.toBe('disponible');
        }
    });

    it('las variantes desactivadas no traen en camino al desglose', () => {
        const conDesactivada = modelo({ 102: { enCamino: 3 } });
        (conDesactivada.variantes[1] as any).estado = 'INACTIVO';
        expect(tallasDisponibles(conDesactivada).map((t) => t.talla)).not.toContain('39');
    });
});

describe('7. El flujo cerrado: dos vendedoras, las mismas 3 unidades', () => {
    const { comprometidoDe, saldoPrometibleDe, situacionCompleta, avisoDeDisponibilidad } =
        require('../stockEnCamino');

    /** Talla 39: sin stock, 3 en camino, con lo ya prometido como parámetro. */
    const talla39 = (comprometido: number) => ({
        id: 102, stock: 0, enCamino: 3, comprometido,
        saldoPrometible: 0 + 3 - comprometido,
        enCaminoProximaEntrega: '2026-10-20',
    });

    it('nadie prometió nada: se pueden comprometer las 3', () => {
        const t = talla39(0);
        expect(saldoPrometibleDe(t)).toBe(3);
        expect(situacionCompleta(t)).toBe('por-llegar');
        expect(avisoDeDisponibilidad(t).texto).toContain('puedes comprometer 3');
    });

    it('la primera vendedora toma 2: a la segunda le queda 1', () => {
        const t = talla39(2);
        expect(saldoPrometibleDe(t)).toBe(1);
        expect(avisoDeDisponibilidad(t).texto).toContain('puedes comprometer 1');
        expect(avisoDeDisponibilidad(t).tono).toBe('aviso');
    });

    it('comprometidas las 3, la segunda ve que ya no hay nada que prometer', () => {
        const t = talla39(3);
        expect(saldoPrometibleDe(t)).toBe(0);
        expect(situacionCompleta(t)).toBe('comprometido');
        expect(avisoDeDisponibilidad(t).tono).toBe('alerta');
        expect(avisoDeDisponibilidad(t).texto).toMatch(/ya está comprometido/i);
    });

    it('si se prometió de más, lo dice con el número exacto', () => {
        const t = talla39(5);
        expect(saldoPrometibleDe(t)).toBe(-2);
        expect(avisoDeDisponibilidad(t).texto).toContain('Ya se prometieron 2 más');
        expect(avisoDeDisponibilidad(t).tono).toBe('alerta');
    });

    it('la fecha comprometida acompaña al saldo', () => {
        expect(avisoDeDisponibilidad(talla39(1)).texto).toContain('llegan el 20/10/2026');
    });

    it('con stock libre, el aviso habla de entregar ahora y no de prometer', () => {
        const conStock = { id: 101, stock: 5, enCamino: 0, comprometido: 2, saldoPrometible: 3 };
        expect(situacionCompleta(conStock)).toBe('disponible');
        expect(avisoDeDisponibilidad(conStock).texto).toBe('3 para entregar ahora');
    });

    it('si el backend es viejo y no manda saldoPrometible, se calcula igual', () => {
        const sinCampo = { id: 102, stock: 0, enCamino: 3, comprometido: 2 };
        expect(saldoPrometibleDe(sinCampo)).toBe(1);
    });

    it('un producto sin nada de esto se comporta como siempre', () => {
        expect(comprometidoDe({ id: 1, stock: 4 })).toBe(0);
        expect(situacionCompleta({ id: 1, stock: 4 })).toBe('disponible');
        expect(situacionCompleta({ id: 1, stock: 0 })).toBe('agotado');
    });
});

describe('8. Lo comprometido no puede romper lo que ya andaba', () => {
    const { situacionCompleta, saldoPrometibleDe } = require('../stockEnCamino');

    it('lo comprometido nunca agranda el stock entregable', () => {
        for (const comprometido of [0, 1, 5, 50]) {
            const item = { stock: 4, enCamino: 0, comprometido, saldoPrometible: 4 - comprometido };
            if (comprometido >= 4) expect(situacionCompleta(item)).not.toBe('disponible');
        }
    });

    it('vender contra lo que viene nunca marca "disponible"', () => {
        const item = { stock: 0, enCamino: 10, comprometido: 0, saldoPrometible: 10 };
        expect(situacionCompleta(item)).toBe('por-llegar');
        expect(situacionCompleta(item)).not.toBe('disponible');
    });

    it('el saldo prometible nunca supera stock + en camino', () => {
        for (const c of [0, 2, 7]) {
            const item = { stock: 3, enCamino: 4, comprometido: c, saldoPrometible: 3 + 4 - c };
            expect(saldoPrometibleDe(item)).toBeLessThanOrEqual(7);
        }
    });
});
