import { lineasPagoConVuelto } from '../pagoConVuelto';

describe('lineasPagoConVuelto', () => {
    it('venta en efectivo con vuelto: pagó con = total + vuelto (NV01-9145 de DEMENVER)', () => {
        expect(lineasPagoConVuelto({ medioPago: 'EFECTIVO', mtoImpVenta: 2.9, vuelto: 0.1, paymentDetails: { mode: 'SIMPLE', amount: 3 } }))
            .toEqual(['Pagó con S/ 3.00 · vuelto S/ 0.10']);
        expect(lineasPagoConVuelto({ medioPago: 'EFECTIVO', mtoImpVenta: 2.9, vuelto: 2.1 }))
            .toEqual(['Pagó con S/ 5.00 · vuelto S/ 2.10']);
    });

    it('pago justo o sin vuelto: no muestra nada', () => {
        expect(lineasPagoConVuelto({ medioPago: 'EFECTIVO', mtoImpVenta: 8.9, vuelto: 0 })).toEqual([]);
        expect(lineasPagoConVuelto({ medioPago: 'YAPE', mtoImpVenta: 8.9 })).toEqual([]);
    });

    it('crédito y pago mixto no muestran esta línea', () => {
        expect(lineasPagoConVuelto({ medioPago: 'CREDITO', mtoImpVenta: 100, vuelto: 5 })).toEqual([]);
        expect(lineasPagoConVuelto({ medioPago: 'MIXTO', mtoImpVenta: 100, vuelto: 5 })).toEqual([]);
    });

    it('nota editada: lo pagado antes y lo de ahora, o la devolución', () => {
        expect(lineasPagoConVuelto({
            medioPago: 'EFECTIVO', mtoImpVenta: 22.5, vuelto: 2.9,
            paymentDetails: JSON.stringify({ mode: 'SIMPLE', pagoAnterior: 5.4, recibido: 20, devolucion: 0 }),
        })).toEqual(['Había pagado S/ 5.40', 'Luego pagó con S/ 20.00 · vuelto S/ 2.90']);
        expect(lineasPagoConVuelto({
            medioPago: 'EFECTIVO', mtoImpVenta: 2.5, vuelto: 0,
            paymentDetails: { mode: 'SIMPLE', pagoAnterior: 5.4, recibido: 0, devolucion: 2.9 },
        })).toEqual(['Se le devolvió S/ 2.90 (había pagado S/ 5.40)']);
    });

    it('respeta el símbolo de la moneda', () => {
        expect(lineasPagoConVuelto({ medioPago: 'EFECTIVO', mtoImpVenta: 10, vuelto: 10 }, 'US$')).toEqual(['Pagó con US$ 20.00 · vuelto US$ 10.00']);
    });
});
