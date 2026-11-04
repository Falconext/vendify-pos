/**
 * `vendible: false` (stock por sede) impide agregar al carrito, aunque la
 * tienda acepte pedidos de agotados.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import ComboCard from '../ComboCard';
import { recordarVentaSinStock, STOCK_NO_VENDIBLE } from '@/templates/shared/ventaSinStock';

const combo = (extra: Record<string, unknown>) => ({ id: 30, nombre: 'Combo', precioRegular: 20, precioCombo: 15, items: [], ...extra });

describe('ComboCard por sede', () => {
    it('no vendible en la sede: botón deshabilitado aunque la tienda venda sin stock', () => {
        recordarVentaSinStock({ tiendaVentaSinStock: true });
        const onAdd = jest.fn();
        render(<ComboCard combo={combo({ stockDisponible: STOCK_NO_VENDIBLE, vendible: false })} onAddToCart={onAdd} diseno={{}} />);
        const boton = screen.getByRole('button', { name: /agotado/i });
        expect(boton).toBeDisabled();
        fireEvent.click(boton);
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('agotado (0) se puede pedir solo si la tienda vende sin stock', () => {
        recordarVentaSinStock({ tiendaVentaSinStock: false });
        const { unmount } = render(<ComboCard combo={combo({ stockDisponible: 0, vendible: true })} onAddToCart={() => {}} diseno={{}} />);
        expect(screen.getByRole('button', { name: /agotado/i })).toBeDisabled();
        unmount();
        recordarVentaSinStock({ tiendaVentaSinStock: true });
        render(<ComboCard combo={combo({ stockDisponible: 0, vendible: true })} onAddToCart={() => {}} diseno={{}} />);
        expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeEnabled();
    });

    it('combo sin el dato (backend viejo) no se bloquea', () => {
        recordarVentaSinStock({ tiendaVentaSinStock: false });
        render(<ComboCard combo={combo({})} onAddToCart={() => {}} diseno={{}} />);
        expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeEnabled();
    });
});
