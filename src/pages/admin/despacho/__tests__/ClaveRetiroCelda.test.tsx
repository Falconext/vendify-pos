import { act, fireEvent, render, screen } from '@testing-library/react';
import ClaveRetiroCelda from '../ClaveRetiroCelda';

const alertar = jest.fn();
jest.mock('@iconify/react', () => ({ Icon: ({ icon }: any) => <i data-icon={icon} /> }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: { getState: () => ({ alert: alertar }) } }));

const portapapeles = (writeText: jest.Mock) => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

describe('ClaveRetiroCelda', () => {
    beforeEach(() => jest.clearAllMocks());

    it('sin clave muestra un guion y no ofrece copiar', () => {
        render(<ClaveRetiroCelda clave="  " />);
        expect(screen.queryByTestId('panel-clave-retiro')).toBeNull();
        expect(screen.getByText('—')).toBeTruthy();
    });

    it('muestra la clave y al hacer clic la copia sin abrir la fila', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        portapapeles(writeText);
        const fila = jest.fn();
        render(<div onClick={fila}><ClaveRetiroCelda clave="1010" /></div>);
        const boton = screen.getByTestId('panel-clave-retiro');
        expect(boton.textContent).toContain('1010');
        await act(async () => { fireEvent.click(boton); });
        expect(writeText).toHaveBeenCalledWith('1010');
        expect(fila).not.toHaveBeenCalled();
        expect(boton.querySelector('i')?.getAttribute('data-icon')).toBe('solar:check-circle-bold');
    });

    it('si el navegador no deja copiar, avisa y la clave sigue a la vista', async () => {
        portapapeles(jest.fn().mockRejectedValue(new Error('denegado')));
        render(<ClaveRetiroCelda clave="1010" />);
        await act(async () => { fireEvent.click(screen.getByTestId('panel-clave-retiro')); });
        expect(alertar).toHaveBeenCalledWith('No se pudo copiar la clave', 'error');
        expect(screen.getByTestId('panel-clave-retiro').textContent).toContain('1010');
    });
});
