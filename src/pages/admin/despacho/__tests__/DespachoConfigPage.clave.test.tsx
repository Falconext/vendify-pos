/**
 * Interruptor "Enviar la clave de retiro al cliente" (Helou Shop, 06-11): quien
 * trabaja contra entrega da la clave cuando le pagan.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

let guardado: Record<string, unknown> = {};
const mockPut = jest.fn((_url: string, _body: any) => Promise.resolve({ data: {} }));
jest.mock('@/utils/fetch', () => ({
    get: () => Promise.resolve({ data: guardado }),
    put: (u: string, b: any) => mockPut(u, b),
}));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
const mockAlert = jest.fn();
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: mockAlert }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));

import DespachoConfigPage from '../DespachoConfigPage';

const interruptor = () => screen.getByLabelText('Enviar la clave de retiro al cliente');

describe('clave de retiro en los avisos', () => {
    beforeEach(() => { mockPut.mockClear(); mockAlert.mockClear(); });

    it('sin valor guardado queda prendida y se puede apagar y guardar', async () => {
        guardado = {};
        render(<DespachoConfigPage />);
        await waitFor(() => expect(interruptor()).toHaveAttribute('aria-checked', 'true'));
        fireEvent.click(interruptor());
        fireEvent.click(screen.getByText('Guardar cambios'));
        await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Configuración guardada', 'success'));
        expect(mockPut.mock.calls[0][1].claveEnAvisos).toBe(false);
    });

    it('respeta la opción guardada apagada', async () => {
        guardado = { claveEnAvisos: false };
        render(<DespachoConfigPage />);
        await waitFor(() => expect(interruptor()).toHaveAttribute('aria-checked', 'false'));
    });
});
