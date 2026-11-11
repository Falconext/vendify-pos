import { lineasCobroCredito } from '../pagoMixto';

describe('lineasCobroCredito', () => {
    it('crédito pagado por transferencia: muestra el medio real, no el EFECTIVO por defecto (IRBA NV01-44)', () => {
        expect(lineasCobroCredito({
            medioPago: 'EFECTIVO', mtoImpVenta: 969, saldo: 0,
            pagos: [{ monto: 969, medioPago: 'TRANSFERENCIA', referencia: '1861686' }],
        })).toEqual(['Transferencia S/ 969.00 · op. 1861686']);
    });

    it('a medio cobrar agrega lo que falta', () => {
        expect(lineasCobroCredito({ mtoImpVenta: 200, pagos: [{ monto: 50, medioPago: 'YAPE' }] }))
            .toEqual(['Yape S/ 50.00', 'Por cobrar S/ 150.00']);
    });

    it('sin cobros', () => {
        expect(lineasCobroCredito({ mtoImpVenta: 0, pagos: [] })).toEqual(['Sin cobros registrados']);
        expect(lineasCobroCredito({ mtoImpVenta: 80, saldo: 80 })).toEqual(['Por cobrar S/ 80.00']);
    });
});
