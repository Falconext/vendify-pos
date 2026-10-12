/**
 * La fila de Fecha de entrega · Condiciones de pago · Moneda.
 *
 * Reportado por el usuario: la etiqueta "Condiciones de pago (Ej: Crédito 30
 * días)" ocupaba dos renglones mientras las vecinas ocupaban uno, así que su
 * campo bajaba y los tres quedaban escalonados.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModalOrdenCompra } from '../OrdenesCompra';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@iconify/react/dist/iconify.js', () => ({ Icon: () => null }), { virtual: true });
jest.mock('@/utils/fetch', () => ({
    get: jest.fn().mockResolvedValue({ code: 1, data: {} }),
    post: jest.fn(), put: jest.fn(), patch: jest.fn(),
}));
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));

const pintar = () =>
    render(<ModalOrdenCompra orden={null} onClose={jest.fn()} onSaved={jest.fn()} />);

describe('La etiqueta no ocupa dos renglones', () => {
    it('dice solo "Condiciones de pago"', () => {
        pintar();
        expect(screen.getByText('Condiciones de pago')).toBeInTheDocument();
    });

    it('ya NO lleva el ejemplo en la etiqueta', () => {
        pintar();
        // Era lo que la partía en dos renglones.
        expect(screen.queryByText(/Condiciones de pago \(Ej/i)).not.toBeInTheDocument();
    });

    it('el ejemplo vive adentro del campo, como placeholder', () => {
        pintar();
        expect(screen.getByPlaceholderText('Ej: Crédito 30 días')).toBeInTheDocument();
    });
});

describe('Y si alguna etiqueta volviera a ocupar dos renglones', () => {
    it('la fila alinea los tres campos por abajo', () => {
        // `items-end` es lo que arregla la causa, no solo este caso.
        pintar();
        // El modal va por portal a document.body, no al contenedor del render.
        const fila = document.body.querySelector('.sm\\:grid-cols-3');
        expect(fila).toBeTruthy();
        expect(fila?.className).toContain('items-end');
    });

    it('los tres campos siguen en la misma fila', () => {
        pintar();
        expect(screen.getByText('Condiciones de pago')).toBeInTheDocument();
        expect(screen.getByText(/Moneda/i)).toBeInTheDocument();
        expect(screen.getByText(/Fecha de entrega/i)).toBeInTheDocument();
    });
});
