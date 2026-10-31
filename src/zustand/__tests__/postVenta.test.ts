jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../../utils/fetch', () => ({ get: jest.fn(), patch: jest.fn(), post: jest.fn() }));
jest.mock('@/features/admin/facturacion/utils/comprobanteProductMapper', () => ({ mapDetalleToInvoiceProduct: jest.fn() }));
import apiClient from '@/utils/apiClient';
import { postVenta } from '../invoices';

const enProceso = { response: { status: 409, data: { code: 0, message: 'Una solicitud con esta Idempotency-Key sigue en proceso. Reintenta en unos segundos.' } } };

describe('postVenta (ventas duplicadas DEMENVER)', () => {
    beforeEach(() => { jest.useFakeTimers(); (apiClient.post as jest.Mock).mockReset(); });
    afterEach(() => jest.useRealTimers());

    it('manda el código y, si la misma venta sigue en proceso, espera y recibe la primera', async () => {
        (apiClient.post as jest.Mock)
            .mockRejectedValueOnce(enProceso)
            .mockResolvedValueOnce({ data: { code: 1, data: { id: 4713, serie: 'NV01' } } });
        const p = postVenta('/comprobante/informal', { a: 1 }, 'clave-1');
        await jest.advanceTimersByTimeAsync(1600);
        const r = await p;
        expect(r).toMatchObject({ success: true, data: { id: 4713 } });
        expect((apiClient.post as jest.Mock).mock.calls[0][2].headers['Idempotency-Key']).toBe('clave-1');
        expect(apiClient.post).toHaveBeenCalledTimes(2);
    });

    it('sin respuesta del servidor lo marca para reusar el código', async () => {
        (apiClient.post as jest.Mock).mockRejectedValueOnce({ message: 'timeout of 40000ms exceeded' });
        const r = await postVenta('/comprobante/boleta', {}, 'clave-2');
        expect(r).toMatchObject({ success: false, sinRespuesta: true });
    });

    it('un error del servidor no se reintenta', async () => {
        (apiClient.post as jest.Mock).mockRejectedValueOnce({ response: { status: 400, data: { message: 'Stock insuficiente' } } });
        const r = await postVenta('/comprobante/informal', {}, 'clave-3');
        expect(r).toMatchObject({ success: false, error: 'Stock insuficiente', sinRespuesta: false });
        expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
});
