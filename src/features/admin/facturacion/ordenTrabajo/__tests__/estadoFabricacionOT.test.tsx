import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EstadoFabricacionOT from '../EstadoFabricacionOT';

const patch = jest.fn();
const alert = jest.fn();
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/utils/fetch', () => ({ patch: (...a: any[]) => patch(...a) }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: { getState: () => ({ alert }) } }));

beforeEach(() => { patch.mockReset(); alert.mockReset(); });

it('una OT sin estado se muestra como Pendiente', () => {
    render(<EstadoFabricacionOT comprobanteId={5} estado={null} />);
    expect(screen.getByRole('button', { name: 'Fabricación: Pendiente' })).toBeInTheDocument();
});

it('elegir un estado lo guarda y avisa', async () => {
    patch.mockResolvedValue({ success: true });
    const onCambio = jest.fn();
    render(<EstadoFabricacionOT comprobanteId={5} estado="PENDIENTE" onCambio={onCambio} />);
    fireEvent.click(screen.getByRole('button', { name: /Fabricación/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /En fabricación/ }));
    await waitFor(() => expect(onCambio).toHaveBeenCalledWith('EN_PROCESO'));
    expect(patch).toHaveBeenCalledWith('comprobante/5/ot-estado', { estadoOT: 'EN_PROCESO' });
    expect(screen.getByRole('button', { name: 'Fabricación: En fabricación' })).toBeInTheDocument();
});

it('si el backend lo rechaza, queda como estaba y muestra el motivo', async () => {
    patch.mockResolvedValue({ success: false, error: 'No se puede marcar como entregado si hay saldo pendiente' });
    render(<EstadoFabricacionOT comprobanteId={5} estado="LISTO" />);
    fireEvent.click(screen.getByRole('button', { name: /Fabricación/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Entregado/ }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('No se puede marcar como entregado si hay saldo pendiente', 'error'));
    expect(screen.getByRole('button', { name: 'Fabricación: Listo para entregar' })).toBeInTheDocument();
});

it('anulada no se puede cambiar', () => {
    render(<EstadoFabricacionOT comprobanteId={5} estado="EN_PROCESO" bloqueado />);
    expect(screen.getByRole('button', { name: /Fabricación/ })).toBeDisabled();
});
