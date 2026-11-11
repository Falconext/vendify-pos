import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModalCorregirMedioPago from '../ModalCorregirMedioPago';
import { get, patch } from '@/utils/fetch';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/utils/fetch', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: { getState: () => ({ alert: jest.fn() }) } }));
jest.mock('@/zustand/cuentasBancarias', () => ({
    useCuentasBancariasStore: () => ({
        listar: jest.fn(),
        cuentas: [
            { id: 1, banco: 'BBVA', numeroCuenta: '011-2222', activo: true },
            { id: 7, banco: 'BCP', numeroCuenta: '191-7046', activo: true, medioPagoVinculado: 'YAPE' },
        ],
    }),
}));

const pago = (o = {}) => ({ id: 5, monto: 98, fecha: '2026-11-03T18:14:00Z', medioPago: 'EFECTIVO', cuentaBancariaId: null, referencia: '', turnoCerrado: null, ...o });
const cargar = (data: any) => (get as jest.Mock).mockResolvedValue({ success: true, data: { numero: 'NV01-00000169', motivoBloqueo: null, pagos: [pago()], ...data } });
const elegir = (m: string) => fireEvent.click(document.querySelector(`[data-metodo=${m}]`)!);
const guardar = () => screen.getByTestId('corregir-guardar') as HTMLButtonElement;

beforeEach(() => jest.clearAllMocks());

describe('ModalCorregirMedioPago', () => {
    it('sin cambios no deja guardar', async () => {
        cargar({});
        render(<ModalCorregirMedioPago comprobanteId={9} onClose={jest.fn()} />);
        await screen.findByTestId('corregir-pago');
        expect(guardar().disabled).toBe(true);
    });

    it('manda solo método, cuenta y operación, y entrega la nota corregida', async () => {
        cargar({});
        const nota = { medioPago: 'YAPE' };
        (patch as jest.Mock).mockResolvedValue({ success: true, data: { nota } });
        const onCorregido = jest.fn();
        const onClose = jest.fn();
        render(<ModalCorregirMedioPago comprobanteId={9} onClose={onClose} onCorregido={onCorregido} />);
        await screen.findByTestId('corregir-pago');
        elegir('YAPE');
        fireEvent.click(guardar());
        await waitFor(() => expect(onCorregido).toHaveBeenCalledWith(nota));
        expect(patch).toHaveBeenCalledWith('comprobante/9/medio-pago', {
            lineas: [{ pagoId: 5, medioPago: 'YAPE', cuentaBancariaId: 7, referencia: '' }],
            confirmarCajaCerrada: false,
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('con el turno cerrado pide confirmar antes de guardar', async () => {
        cargar({ pagos: [pago({ turnoCerrado: { fechaCierre: '2026-11-03T23:00:00Z', usuario: 'Ana' } })] });
        render(<ModalCorregirMedioPago comprobanteId={9} onClose={jest.fn()} />);
        await screen.findByTestId('corregir-pago');
        elegir('PLIN');
        expect(screen.getByTestId('corregir-caja-cerrada').textContent).toContain('Ana');
        expect(guardar().disabled).toBe(true);
        fireEvent.click(screen.getByTestId('corregir-confirma-caja'));
        expect(guardar().disabled).toBe(false);
    });

    it('si el error se deshace volviendo al método original, no hay nada que guardar', async () => {
        cargar({ pagos: [pago({ medioPago: 'YAPE', cuentaBancariaId: 7, referencia: 'OP-1' })] });
        render(<ModalCorregirMedioPago comprobanteId={9} onClose={jest.fn()} />);
        await screen.findByTestId('corregir-pago');
        elegir('EFECTIVO');
        expect(guardar().disabled).toBe(false);
        elegir('YAPE');
        expect(guardar().disabled).toBe(true);
    });

    it('muestra por qué no se puede corregir', async () => {
        cargar({ motivoBloqueo: 'Esta nota ya se convirtió a B001-00000001.', pagos: [pago()] });
        render(<ModalCorregirMedioPago comprobanteId={9} onClose={jest.fn()} />);
        expect((await screen.findByTestId('corregir-bloqueo')).textContent).toContain('B001');
        expect(screen.queryByTestId('corregir-guardar')).toBeNull();
    });
});
