/**
 * Abono de una compra por transferencia: debe decir de qué cuenta sale. Sin esto
 * no bajaba de ninguna, y quien paga una parte desde una cuenta y otra desde otra
 * (IRBA: BCP PRINCIPAL + CUENTA LIBRE) no tenía cómo registrarlo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModalRegistrarPagoCompra from '../ModalRegistrarPagoCompra';

const registrarPagoCompra = jest.fn().mockResolvedValue({ success: true });

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Modal', () => ({ __esModule: true, default: ({ children, isOpenModal }: any) => (isOpenModal ? <div>{children}</div> : null) }));
jest.mock('@/components/Select', () => ({
    __esModule: true,
    default: ({ name, options, onChange }: any) => (
        <select aria-label={name} onChange={(e) => {
            const o = options[e.target.selectedIndex - 1];
            onChange(o.id ?? o.value, o.value);
        }}>
            <option value="">-</option>
            {options.map((o: any) => <option key={o.id ?? o.value} value={o.id ?? o.value}>{o.label ?? o.value}</option>)}
        </select>
    ),
}));
jest.mock('@/zustand/compras', () => ({ useComprasStore: () => ({ registrarPagoCompra, loading: false }) }));
jest.mock('@/zustand/cuentasBancarias', () => ({
    useCuentasBancariasStore: () => ({
        cuentas: [
            { id: 54, banco: 'BCP', alias: 'BCP PRINCIPAL', numeroCuenta: '3058', moneda: 'PEN', activo: true },
            { id: 56, banco: 'BCP', alias: 'CUENTA LIBRE', numeroCuenta: '3050', moneda: 'PEN', activo: true },
        ],
        listar: jest.fn(),
    }),
}));
jest.mock('@/services/tipoCambio.service', () => ({ tipoCambioService: { consultar: jest.fn() } }));

const compra = { id: 7, serie: 'T001', numero: '2877', saldo: 4153.04, moneda: 'PEN' };
const abrir = () => render(<ModalRegistrarPagoCompra isOpen compra={compra} onClose={() => {}} onSuccess={() => {}} />);
const monto = (v: string) => fireEvent.change(document.querySelector('input[type="number"]')!, { target: { value: v } });

beforeEach(() => registrarPagoCompra.mockClear());

it('por transferencia envía la cuenta elegida', async () => {
    abrir();
    monto('2500');
    fireEvent.change(screen.getByLabelText('medioPago'), { target: { value: 'TRANSFERENCIA' } });
    fireEvent.change(await screen.findByLabelText('cuentaBancaria'), { target: { value: '56' } });
    fireEvent.click(screen.getByText(/Confirmar Pago/i));
    await waitFor(() => expect(registrarPagoCompra).toHaveBeenCalled());
    expect(registrarPagoCompra.mock.calls[0][1]).toMatchObject({ monto: 2500, medioPago: 'TRANSFERENCIA', cuentaBancariaId: 56 });
});

it('por transferencia sin tocar la cuenta usa la primera activa', async () => {
    abrir();
    monto('100');
    fireEvent.change(screen.getByLabelText('medioPago'), { target: { value: 'TRANSFERENCIA' } });
    await screen.findByLabelText('cuentaBancaria');
    fireEvent.click(screen.getByText(/Confirmar Pago/i));
    await waitFor(() => expect(registrarPagoCompra).toHaveBeenCalled());
    expect(registrarPagoCompra.mock.calls[0][1]).toMatchObject({ cuentaBancariaId: 54 });
});

it('en efectivo no pide cuenta ni la envía', async () => {
    abrir();
    monto('100');
    expect(screen.queryByLabelText('cuentaBancaria')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Confirmar Pago/i));
    await waitFor(() => expect(registrarPagoCompra).toHaveBeenCalled());
    expect(registrarPagoCompra.mock.calls[0][1].cuentaBancariaId).toBeUndefined();
});
