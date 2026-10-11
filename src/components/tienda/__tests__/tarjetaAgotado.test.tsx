/**
 * Render real de una tarjeta de producto con stock 0.
 *
 * El reclamo del empresario fue literal: marcó "Acepto pedidos de productos
 * agotados", lo guardó, y sus productos seguían saliendo "Agotado". Por eso
 * esta prueba no mira el código: pinta la tarjeta y lee lo que ve el cliente.
 */
import { render, screen } from '@testing-library/react';
import ProductCardCatalog from '../ProductCardCatalog';
import { recordarVentaSinStock } from '@/templates/shared/ventaSinStock';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/tienda/ProductCardActions', () => () => null);

const SIN_STOCK = {
  id: 1,
  descripcion: 'Collar de oro',
  precioUnitario: 120,
  imagenUrl: '/x.jpg',
  stock: 0,
};

const pintar = (producto = SIN_STOCK) =>
  render(<ProductCardCatalog producto={producto as any} slug="eco" cp="#000" />);

/** El botón de agregar al carrito de la tarjeta. */
const botonAgregar = () => document.querySelector('button[disabled]');

describe('Tienda normal · el stock frena la compra', () => {
  beforeEach(() => { recordarVentaSinStock({ tiendaVentaSinStock: false }); });

  it('un producto sin stock se muestra agotado', () => {
    pintar();
    expect(screen.getAllByText(/agotado/i).length).toBeGreaterThan(0);
  });

  it('y no se puede agregar al carrito', () => {
    pintar();
    expect(botonAgregar()).not.toBeNull();
  });
});

describe('Tienda por encargo · el stock ya no frena', () => {
  beforeEach(() => { recordarVentaSinStock({ tiendaVentaSinStock: true }); });

  it('el mismo producto sin stock NO dice agotado', () => {
    pintar();
    expect(screen.queryByText(/agotado/i)).toBeNull();
  });

  it('y se puede agregar al carrito', () => {
    pintar();
    expect(botonAgregar()).toBeNull();
  });

  it('un producto con stock sigue comprándose igual', () => {
    pintar({ ...SIN_STOCK, stock: 5 });
    expect(screen.queryByText(/agotado/i)).toBeNull();
    expect(botonAgregar()).toBeNull();
  });
});
