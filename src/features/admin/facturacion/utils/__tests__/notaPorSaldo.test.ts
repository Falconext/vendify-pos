import { notaPorSaldo, totalDelSaldo } from '../notaPorSaldo';

const nota = (porConvertir: any) => ({
    id: 1,
    mtoImpVenta: 755.8,
    saldo: 0,
    estadoPago: 'COMPLETADO',
    mtoDescuentoGlobal: 10,
    paymentDetails: { mode: 'MIXTO' },
    detalles: [{ descripcion: 'todo' }],
    porConvertir,
});

// IRBA: NV01-1 de S/755.80 ya pasó 3 productos a factura; faltan 2 por S/337.
const saldoIrba = {
    total: 337,
    yaCobrado: 337,
    detalles: [
        { productoId: 32293, descripcion: 'COMPLEJO B 50 SOBRES X 12 GR', cantidad: 2, mtoPrecioUnitario: 42.5 },
        { productoId: 32273, descripcion: 'TRUENO PLUS 50 ML', cantidad: 24, mtoPrecioUnitario: 10.5 },
    ],
};

describe('notaPorSaldo', () => {
    it('lleva solo las líneas que faltan, pagadas, sin descuento ni pago mixto del total original', () => {
        const n: any = notaPorSaldo(nota(saldoIrba));
        expect(n.detalles.map((d: any) => d.descripcion)).toEqual(['COMPLEJO B 50 SOBRES X 12 GR', 'TRUENO PLUS 50 ML']);
        expect(n.mtoImpVenta).toBe(337);
        expect(n.saldo).toBe(0);
        expect(n.estadoPago).toBe('COMPLETADO');
        expect(n.mtoDescuentoGlobal).toBe(0);
        expect(n.paymentDetails).toBeNull();
    });

    it('nota pagada: no queda vuelto aunque el total de líneas difiera en centavos', () => {
        const n: any = notaPorSaldo(nota({
            total: 2623.73,
            yaCobrado: 2623.73,
            detalles: [
                { descripcion: 'Fresco', cantidad: 24, mtoPrecioUnitario: 16.1 },
                { descripcion: 'Toma todo', cantidad: 24, mtoPrecioUnitario: 93.22 },
            ],
        }));
        expect(n.mtoImpVenta).toBe(2623.68);
        expect(n.saldo).toBe(0);
    });

    it('nota cobrada a medias: queda por cobrar lo que no cubre lo ya pagado', () => {
        const n: any = notaPorSaldo(nota({ ...saldoIrba, yaCobrado: 100 }));
        expect(n.saldo).toBe(237);
        expect(n.estadoPago).toBe('PAGO_PARCIAL');
    });

    it('sin porConvertir la nota pasa igual', () => {
        const original = nota(null);
        expect(notaPorSaldo(original)).toBe(original);
        expect(totalDelSaldo(original)).toBe(0);
    });
});
