/**
 * El papel del arqueo, comparado contra el "corte de caja" que usan los
 * contadores (el de LILIANA, que trajo el cliente).
 *
 * Lo que de verdad hay que proteger es el SALDO EN EFECTIVO: es la única cifra
 * contra la que alguien cuenta el cajón. Si está mal, el faltante que reporte
 * va a ser inventado.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

import { ArqueoTurnoPrint, type DetalleTurno } from '../ArqueoTurnoPrint';

/** El turno del corte de Liliana: ingresos 104 (93 efectivo + 11 yape),
 *  egresos 42.80 (compras 40.80 + gastos 2.00), todo en efectivo. */
const detalle = (over: Partial<DetalleTurno> = {}): DetalleTurno => ({
    empresa: { razonSocial: 'NEGOCIO SAC', ruc: '20123456789' },
    sede: 'PRINCIPAL',
    turno: 'MAÑANA',
    apertura: { fecha: '2026-10-13T13:00:00Z', montoInicial: 0, usuario: 'LILIANA' },
    cierre: {
        fecha: '2026-10-13T17:09:24Z',
        usuario: 'LILIANA',
        montoEfectivo: 93, montoYape: 11, montoPlin: 0,
        montoTransferencia: 0, montoTarjeta: 0,
        montoFinal: 104, totalVentas: 104, diferencia: 0,
    },
    documentos: [
        { id: 1, documento: 'B001-1', tipoDoc: '03', cliente: 'VARIOS', medioPago: 'Efectivo', total: 93, fecha: '2026-10-13T14:00:00Z' },
        { id: 2, documento: 'B001-2', tipoDoc: '03', cliente: 'VARIOS', medioPago: 'Yape', total: 11, fecha: '2026-10-13T15:00:00Z' },
    ],
    egresos: [
        { id: 9, fecha: '2026-10-13T16:00:00Z', monto: 40.8, concepto: 'Pago de compra F001-3', esTransferencia: false, categoria: 'COMPRA', metodoPago: 'Efectivo' },
        { id: 10, fecha: '2026-10-13T16:30:00Z', monto: 2, concepto: 'Movilidad', esTransferencia: false, categoria: 'OTROS', metodoPago: 'Efectivo' },
    ],
    ...over,
});

const pintar = (d: DetalleTurno) => {
    const { container } = render(<ArqueoTurnoPrint detalle={d} />);
    return container.textContent || '';
};

/** El valor que acompaña a una etiqueta en el papel. */
const valorDe = (etiqueta: string) => {
    const el = screen.getByText(etiqueta);
    return el.parentElement?.textContent?.replace(etiqueta, '').trim();
};

describe('Arqueo del turno', () => {
    it('separa compras de gastos, como el corte del contador', () => {
        pintar(detalle());
        expect(valorDe('Compras pagadas de caja')).toBe('S/ 40.80');
        expect(valorDe('Gastos')).toBe('S/ 2.00');
    });

    it('el saldo en efectivo es fondo + ingresos efectivo − egresos efectivo', () => {
        // 0 + 93 − 42.80 = 50.20, el mismo número del corte de Liliana.
        pintar(detalle());
        expect(valorDe('Saldo que debe haber en efectivo')).toBe('S/ 50.20');
    });

    it('el fondo inicial entra al saldo: está en el cajón aunque no sea venta', () => {
        const d = detalle();
        d.apertura!.montoInicial = 100;
        pintar(d);
        expect(valorDe('Saldo que debe haber en efectivo')).toBe('S/ 150.20');
    });

    it('cuadre general: ingresos menos egresos', () => {
        pintar(detalle());
        expect(valorDe('Ingresos − Egresos')).toBe('S/ 61.20');
    });

    it('los ingresos se abren por medio de pago con lo que registró el sistema', () => {
        const txt = pintar(detalle());
        expect(txt).toContain('EFECTIVO');
        expect(txt).toContain('YAPE');
        expect(txt).toContain('S/ 93.00');
        expect(txt).toContain('S/ 11.00');
    });

    it('un medio sin equivalente en el cierre no inventa un cero', () => {
        // Mostrar "0.00" afirmaría que declaró cero; no se sabe.
        const d = detalle({
            documentos: [
                { id: 1, documento: 'B001-1', tipoDoc: '03', cliente: 'VARIOS', medioPago: 'Crédito', total: 50, fecha: '2026-10-13T14:00:00Z' },
            ],
        });
        const txt = pintar(d);
        expect(txt).toContain('—');
    });

    it('sin egresos el saldo en efectivo es el fondo más lo cobrado', () => {
        const d = detalle({ egresos: [] });
        pintar(d);
        expect(valorDe('Saldo que debe haber en efectivo')).toBe('S/ 93.00');
        expect(valorDe('Compras pagadas de caja')).toBe('S/ 0.00');
    });
});
