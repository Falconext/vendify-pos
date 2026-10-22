/**
 * Pago mixto de una compra al contado: la primera fila es "el resto", así las
 * partes siempre suman la factura.
 */
import { errorDePagoMixto, montoDelResto, pagosParaEnviar, parteVacia } from '../pagoMixto';

const p = (metodo: string, monto = '', extra = {}) => ({ ...parteVacia(metodo), monto, ...extra });

describe('pago mixto de una compra', () => {
  it('la primera fila paga lo que no cubren las demás', () => {
    expect(montoDelResto(500, [p('EFECTIVO'), p('YAPE', '200')])).toBe(300);
    expect(montoDelResto(500, [p('EFECTIVO'), p('YAPE', '120.50'), p('TARJETA', '79.5')])).toBe(300);
  });

  it('se envía cada parte con su método; la transferencia lleva cuenta y N° de operación', () => {
    expect(
      pagosParaEnviar(500, [p('EFECTIVO'), p('TRANSFERENCIA', '200', { cuentaBancariaId: 7, numeroOperacion: ' 0099 ' })]),
    ).toEqual([
      { metodo: 'EFECTIVO', monto: 300 },
      { metodo: 'TRANSFERENCIA', monto: 200, cuentaBancariaId: 7, referencia: '0099' },
    ]);
  });

  it('si lo otro cubre todo, el resto en cero no se envía', () => {
    expect(pagosParaEnviar(500, [p('EFECTIVO'), p('YAPE', '500')])).toEqual([{ metodo: 'YAPE', monto: 500 }]);
  });

  it('avisa si los otros métodos pasan el total o si no se escribió ninguno', () => {
    expect(errorDePagoMixto(500, [p('EFECTIVO'), p('YAPE', '600')])).toBe('Los otros métodos suman S/ 600.00 y la compra es de S/ 500.00.');
    expect(errorDePagoMixto(500, [p('EFECTIVO'), p('YAPE', '')])).toMatch(/Escribe cuánto/);
    expect(errorDePagoMixto(500, [p('EFECTIVO'), p('YAPE', '200')])).toBeNull();
  });
});
