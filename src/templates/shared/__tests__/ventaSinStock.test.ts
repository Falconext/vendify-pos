/**
 * "Acepto pedidos de productos agotados".
 *
 * El caso que lo motivó: el empresario marcó la casilla, la guardó, y sus
 * productos seguían saliendo "Agotado" en la tienda. El ajuste llegaba al
 * backend —el pedido se habría aceptado— pero las plantillas pintaban
 * "Agotado" por su cuenta, sin mirarlo nunca.
 */
import { recordarVentaSinStock, aceptaVentaSinStock, sinStock } from '../ventaSinStock';

describe('Tienda normal (no acepta pedidos agotados)', () => {
  beforeEach(() => { recordarVentaSinStock({ tiendaVentaSinStock: false }); });

  it('sin stock se muestra agotado', () => {
    expect( sinStock(0)).toBe(true);
    expect( sinStock(-3)).toBe(true);
  });

  it('con stock no se muestra agotado', () => {
    expect( sinStock(1)).toBe(false);
    expect( sinStock(50)).toBe(false);
  });

  it('una presentación que consume varias unidades necesita esas unidades', () => {
    // Un rollo de 12 m no se puede vender si solo quedan 5 m.
    expect( sinStock(5, 12)).toBe(true);
    expect( sinStock(12, 12)).toBe(false);
  });
});

describe('Tienda por encargo (acepta pedidos agotados)', () => {
  beforeEach(() => { recordarVentaSinStock({ tiendaVentaSinStock: true }); });

  it('nunca se muestra agotado, aunque el stock sea cero o negativo', () => {
    expect( sinStock(0)).toBe(false);
    expect( sinStock(-10)).toBe(false);
  });

  it('tampoco frena una presentación grande', () => {
    expect( sinStock(0, 12)).toBe(false);
  });

  it('la tienda queda marcada como que acepta', () => {
    expect(aceptaVentaSinStock()).toBe(true);
  });
});

describe('Bordes', () => {
  it('una tienda sin el campo se comporta como tienda normal', () => {
    recordarVentaSinStock({});
    expect(aceptaVentaSinStock()).toBe(false);
    expect( sinStock(0)).toBe(true);
  });

  it('aguanta una tienda nula', () => {
    recordarVentaSinStock(null);
    expect(aceptaVentaSinStock()).toBe(false);
  });

  it('devuelve la misma tienda para poder envolver setTienda', () => {
    const store = { id: 7, tiendaVentaSinStock: true };
    expect(recordarVentaSinStock(store)).toBe(store);
  });

  it('un stock indefinido se trata como cero', () => {
    recordarVentaSinStock({ tiendaVentaSinStock: false });
    expect( sinStock(undefined)).toBe(true);
    expect( sinStock(null)).toBe(true);
  });
});
