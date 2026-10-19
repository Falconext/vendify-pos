import { lineaXmlSinIgv, precioOrdenConFactorIgv } from '../igvLinea';

describe('lineaXmlSinIgv', () => {
    it('línea con valor e IGV 0 en el XML → sin IGV', () => {
        expect(lineaXmlSinIgv({ igv: 0, subtotal: 50 })).toBe(true);
    });
    it('línea con IGV → gravada', () => {
        expect(lineaXmlSinIgv({ igv: 18, subtotal: 100 })).toBe(false);
    });
    it('bonificación (valor 0) no decide', () => {
        expect(lineaXmlSinIgv({ igv: 0, subtotal: 0 })).toBe(false);
    });
    it('foto IA sin IGV por línea no decide', () => {
        expect(lineaXmlSinIgv({ subtotal: 50 })).toBe(false);
        expect(lineaXmlSinIgv(null)).toBe(false);
    });
});

describe('precioOrdenConFactorIgv', () => {
    it('ida y vuelta vuelve al mismo precio', () => {
        const con = precioOrdenConFactorIgv(7.33, 1.18);
        expect(con).toBe(8.65);
        expect(precioOrdenConFactorIgv(con, 1 / 1.18)).toBe(7.33);
    });
    it('100 con IGV → 84.75 neto', () => {
        expect(precioOrdenConFactorIgv(100, 1 / 1.18)).toBe(84.75);
    });
});
