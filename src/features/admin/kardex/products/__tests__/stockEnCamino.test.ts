import {
    enCaminoDe,
    proximaEntregaDe,
    fechaCorta,
    textoDeStock,
    detalleEnCamino,
    situacionDeStock,
} from '../stockEnCamino';

/**
 * Pedido de KREZKA: "las vendedoras preguntan si pueden ir reservando las
 * tallas que aún no ingresan porque están pendientes de ingreso".
 */
describe('stock en camino — lo que ve el vendedor', () => {
    const conEnCamino = (enCamino: number, proxima: string | null = null) => ({
        id: 1, descripcion: 'ZAPATILLA MOD 300', stock: 0, enCamino, enCaminoProximaEntrega: proxima,
    });

    describe('enCaminoDe', () => {
        it('lee lo que manda el backend', () => {
            expect(enCaminoDe(conEnCamino(6))).toBe(6);
        });

        it('un producto sin órdenes abiertas es 0, nunca undefined ni NaN', () => {
            expect(enCaminoDe({ id: 1 })).toBe(0);
            expect(enCaminoDe(null)).toBe(0);
            expect(enCaminoDe({ enCamino: 'abc' })).toBe(0);
            expect(enCaminoDe({ enCamino: -3 })).toBe(0);
        });
    });

    describe('textoDeStock', () => {
        it('talla agotada con reposición pedida: se ve que viene', () => {
            expect(textoDeStock(conEnCamino(6), 0)).toBe('Stock: 0 · +6 en camino');
        });

        it('con stock y además reposición, muestra las dos cosas separadas', () => {
            expect(textoDeStock(conEnCamino(6), 3)).toBe('Stock: 3 · +6 en camino');
        });

        it('sin nada en camino, el texto no cambia respecto de antes', () => {
            expect(textoDeStock(conEnCamino(0), 3)).toBe('Stock: 3');
            expect(textoDeStock({ id: 1 }, 0)).toBe('Stock: 0');
        });

        it('nunca suma lo que viene al stock disponible', () => {
            const texto = textoDeStock(conEnCamino(6), 3);
            expect(texto).toContain('Stock: 3');
            expect(texto).not.toContain('Stock: 9');
        });
    });

    describe('detalleEnCamino', () => {
        it('dice cuántas vienen y cuándo, si hay fecha comprometida', () => {
            expect(detalleEnCamino(conEnCamino(6, '2026-10-20')))
                .toBe('6 unidades pedidas al proveedor, llegan el 20/10/2026');
        });

        it('sin fecha comprometida lo dice, no la inventa', () => {
            expect(detalleEnCamino(conEnCamino(6))).toBe('6 unidades pedidas al proveedor, sin fecha confirmada');
        });

        it('una sola unidad va en singular', () => {
            expect(detalleEnCamino(conEnCamino(1))).toContain('1 unidad pedida');
        });

        it('sin nada en camino no hay texto', () => {
            expect(detalleEnCamino(conEnCamino(0))).toBe('');
        });
    });

    describe('proximaEntregaDe y fechaCorta', () => {
        it('la fecha se muestra como la lee un peruano', () => {
            expect(fechaCorta('2026-10-20')).toBe('20/10/2026');
        });

        it('sin fecha no devuelve basura', () => {
            expect(proximaEntregaDe({ enCaminoProximaEntrega: '' })).toBeNull();
            expect(proximaEntregaDe({})).toBeNull();
            expect(fechaCorta(null)).toBe('');
            expect(fechaCorta('cualquier cosa')).toBe('');
        });
    });

    describe('situacionDeStock — qué puede hacer la vendedora', () => {
        it('hay en el almacén: se vende', () => {
            expect(situacionDeStock(conEnCamino(0), 5)).toBe('disponible');
        });

        it('no hay pero viene: se toma como Nota de Pedido', () => {
            expect(situacionDeStock(conEnCamino(6), 0)).toBe('por-llegar');
        });

        it('no hay ni viene: no se promete nada', () => {
            expect(situacionDeStock(conEnCamino(0), 0)).toBe('sin-stock');
        });

        it('el stock manda sobre lo que viene: si hay, es disponible', () => {
            expect(situacionDeStock(conEnCamino(6), 2)).toBe('disponible');
        });
    });
});
