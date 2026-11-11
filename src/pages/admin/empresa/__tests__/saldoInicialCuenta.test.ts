import { fechaSaldoParaCampo, payloadSaldoInicial } from '../CuentasBancariasConfig';

describe('saldo inicial en el formulario de cuenta', () => {
    it('envía monto y fecha', () => {
        expect(payloadSaldoInicial('1500.50', '2026-11-01', false)).toEqual({ saldoInicial: 1500.5, saldoInicialFecha: '2026-11-01' });
    });

    it('cero es un saldo inicial válido', () => {
        expect(payloadSaldoInicial('0', '2026-11-01', true)).toEqual({ saldoInicial: 0, saldoInicialFecha: '2026-11-01' });
    });

    it('vacío en cuenta nueva no envía nada', () => {
        expect(payloadSaldoInicial('', '2026-11-01', false)).toEqual({});
    });

    it('vacío al editar lo quita', () => {
        expect(payloadSaldoInicial('', '2026-11-01', true)).toEqual({ saldoInicial: null });
    });

    it('muestra la fecha guardada como el día en Lima', () => {
        expect(fechaSaldoParaCampo('2026-11-01T05:00:00.000Z')).toBe('2026-11-01');
        expect(fechaSaldoParaCampo(null)).toBe('');
    });
});
