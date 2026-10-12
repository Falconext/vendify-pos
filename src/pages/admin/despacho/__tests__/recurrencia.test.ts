/**
 * La etiqueta de cliente recurrente en el Panel de Ventas.
 *
 * Muestra el NÚMERO de compra y no un sí/no: "3ª compra" le dice al vendedor
 * mucho más que "recurrente" — sabe si tiene delante a alguien que vuelve
 * seguido o a uno que compró dos veces en un año.
 */

/** La misma regla que PanelVentasView. */
const recurrencia = (compras: number | undefined) => {
  const n = Number(compras ?? 0);
  if (!Number.isFinite(n) || n <= 0) return { texto: '—', clase: 'text-gray-400' };
  if (n === 1) return { texto: 'Nuevo', clase: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (n <= 3) return { texto: `${n}ª compra`, clase: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { texto: `${n} compras`, clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

describe('Etiqueta de cliente recurrente', () => {
  it('la primera compra dice "Nuevo"', () => {
    expect(recurrencia(1).texto).toBe('Nuevo');
  });

  it('de la segunda a la tercera muestra cuál va', () => {
    expect(recurrencia(2).texto).toBe('2ª compra');
    expect(recurrencia(3).texto).toBe('3ª compra');
  });

  it('a partir de la cuarta muestra el total acumulado', () => {
    expect(recurrencia(4).texto).toBe('4 compras');
    expect(recurrencia(17).texto).toBe('17 compras');
  });

  it('sin cliente identificado no inventa nada', () => {
    // "Clientes Varios" no tiene historia que contar.
    expect(recurrencia(0).texto).toBe('—');
    expect(recurrencia(undefined).texto).toBe('—');
  });

  it('un cliente fiel se distingue de uno nuevo a simple vista', () => {
    // El color es la mitad del valor de la columna: se lee de un vistazo.
    expect(recurrencia(1).clase).not.toBe(recurrencia(10).clase);
    expect(recurrencia(10).clase).toContain('emerald');
  });

  it('un dato raro no rompe la fila', () => {
    expect(recurrencia(-3).texto).toBe('—');
    expect(recurrencia(NaN as any).texto).toBe('—');
  });
});
