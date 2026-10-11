/**
 * La columna "Fecha de envío" del panel de ventas.
 *
 * Espeja a `backend/src/comprobante/dia-de-envio.ts`: si la pantalla y el ticket
 * formatean distinto, dirían días distintos sobre el mismo pedido.
 */
import { comoDiaLocal, fechaDeEnvio } from '../fechaDeEnvio';

describe('La fecha no se corre un día', () => {
    it('EL RIESGO: medianoche UTC se muestra como ese mismo día', () => {
        // En Lima (UTC-5) un Date de esa medianoche es el 2 a las 19:00.
        expect(comoDiaLocal('2026-10-03T00:00:00.000Z')).toBe('03/10/26');
    });

    it('vale igual si llega como Date', () => {
        expect(comoDiaLocal(new Date('2026-10-03T00:00:00.000Z'))).toBe('03/10/26');
    });

    it('el primer día del mes no retrocede', () => {
        expect(comoDiaLocal('2026-11-01T00:00:00.000Z')).toBe('01/11/26');
    });
});

describe('Qué muestra la celda', () => {
    it('una venta con despacho muestra su día', () => {
        expect(fechaDeEnvio({ fechaEstimada: '2026-10-05T00:00:00.000Z', estadoDespacho: 'PREPARANDO' }))
            .toBe('05/10/26');
    });

    it('una venta que el cliente se llevó muestra guion, no una fecha inventada', () => {
        expect(fechaDeEnvio({ fechaEstimada: '2026-10-05T00:00:00.000Z', estadoDespacho: 'NO_APLICA' }))
            .toBe('—');
    });

    it('con despacho pero sin fecha programada, guion', () => {
        expect(fechaDeEnvio({ fechaEstimada: null, estadoDespacho: 'PREPARANDO' })).toBe('—');
    });

    it('una fila vacía no rompe la tabla', () => {
        expect(fechaDeEnvio({})).toBe('—');
    });
});
