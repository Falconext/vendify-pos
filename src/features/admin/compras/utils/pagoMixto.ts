/**
 * Pago mixto de una compra al contado (22-10): "S/ 300 de la caja y S/ 200
 * por Yape". La primera fila es "el resto": su monto lo pone el sistema
 * (total − las demás), así las partes siempre suman la factura y solo se
 * escribe lo que va por los otros métodos.
 */

export interface ParteDePago {
  metodo: string;
  /** Texto del input: '' mientras no se escribe nada. */
  monto: string;
  cuentaBancariaId: number;
  numeroOperacion: string;
}

export interface PagoParaEnviar {
  metodo: string;
  monto: number;
  cuentaBancariaId?: number;
  referencia?: string;
}

const redondear = (n: number) => Math.round(n * 100) / 100;
const numero = (t: string) => Math.max(0, Number(String(t).replace(',', '.')) || 0);

export const parteVacia = (metodo: string): ParteDePago => ({
  metodo,
  monto: '',
  cuentaBancariaId: 0,
  numeroOperacion: '',
});

/** Lo que paga la primera fila: lo que no cubren las demás. */
export function montoDelResto(total: number, partes: ParteDePago[]): number {
  const otras = partes.slice(1).reduce((a, p) => a + numero(p.monto), 0);
  return redondear(total - otras);
}

/** Por qué no se puede guardar el pago, o null si está bien. */
export function errorDePagoMixto(total: number, partes: ParteDePago[]): string | null {
  const resto = montoDelResto(total, partes);
  if (resto < 0) {
    return `Los otros métodos suman S/ ${redondear(total - resto).toFixed(2)} y la compra es de S/ ${total.toFixed(2)}.`;
  }
  const otras = partes.slice(1).filter((p) => numero(p.monto) > 0);
  if (otras.length === 0) return 'Escribe cuánto se paga con el otro método, o quita el pago mixto.';
  return null;
}

/** Las partes como las recibe el servidor (sin filas en cero). */
export function pagosParaEnviar(total: number, partes: ParteDePago[]): PagoParaEnviar[] {
  return partes
    .map((p, i) => ({
      metodo: p.metodo,
      monto: i === 0 ? montoDelResto(total, partes) : redondear(numero(p.monto)),
      ...(p.metodo === 'TRANSFERENCIA' && p.cuentaBancariaId ? { cuentaBancariaId: p.cuentaBancariaId } : {}),
      ...(p.metodo === 'TRANSFERENCIA' && p.numeroOperacion.trim() ? { referencia: p.numeroOperacion.trim() } : {}),
    }))
    .filter((p) => p.monto > 0);
}
