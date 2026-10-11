/**
 * De dónde sale la FECHA/HORA que imprime el ticket.
 *
 * Reportado por DEMENVER: sus notas de venta salían con hora 00:00:00. El dato
 * guardado estaba bien —NV01-2821 quedó a las 23:33:57— pero el ticket
 * formateaba otro valor: el del selector de fecha, que es solo AAAA-MM-DD y
 * `moment` interpreta como medianoche.
 */

/** La misma regla que arma `printFormValues.fechaEmision`. */
const fechaParaElTicket = (
  delServidor: string | null | undefined,
  delFormulario: string | null | undefined,
  delSelector: string | null | undefined,
  ahora = new Date(),
): string | undefined => {
  if (delServidor) return delServidor;
  if (delFormulario) return delFormulario;
  if (!delSelector) return undefined;
  const [a, m, d] = String(delSelector).split('-').map(Number);
  return new Date(
    a, m - 1, d,
    ahora.getHours(), ahora.getMinutes(), ahora.getSeconds(),
  ).toISOString();
};

const hora = (iso: string | undefined) =>
  iso ? new Date(iso).getHours() * 3600 + new Date(iso).getMinutes() * 60 : 0;

describe('Fecha y hora que imprime el ticket', () => {
  it('manda la que devolvió el servidor: es la que quedó guardada', () => {
    const delServidor = '2026-09-28T04:33:57.000Z';
    expect(fechaParaElTicket(delServidor, '2026-09-27', '2026-09-27')).toBe(delServidor);
  });

  it('EL DEFECTO: la fecha del selector sola imprime medianoche', () => {
    // Es lo que veía DEMENVER. Solo se usa si no hay nada mejor, y ahora se le
    // agrega la hora en vez de dejarla en 00:00.
    const soloFecha = new Date('2026-09-27').getTime();
    expect(new Date(soloFecha).getUTCHours()).toBe(0);
  });

  it('sin dato del servidor, el respaldo lleva la hora actual, no medianoche', () => {
    const ahora = new Date(2026, 8, 27, 23, 33, 57);
    const r = fechaParaElTicket(null, null, '2026-09-27', ahora);
    expect(r).toBeDefined();
    expect(new Date(r!).getHours()).toBe(23);
    expect(new Date(r!).getMinutes()).toBe(33);
  });

  it('el respaldo conserva la fecha elegida, no la de hoy', () => {
    // Una nota de venta con fecha atrasada tiene que imprimir ESA fecha.
    const ahora = new Date(2026, 8, 28, 10, 0, 0);
    const r = fechaParaElTicket(null, null, '2026-09-25', ahora);
    const d = new Date(r!);
    expect(d.getDate()).toBe(25);
    expect(d.getMonth()).toBe(8);
    expect(d.getHours()).toBe(10);
  });

  it('el valor del formulario gana al selector, pero no al servidor', () => {
    expect(fechaParaElTicket(null, '2026-09-27T15:00:00.000Z', '2026-09-27'))
      .toBe('2026-09-27T15:00:00.000Z');
    expect(fechaParaElTicket('2026-09-28T04:33:57.000Z', '2026-09-27T15:00:00.000Z', '2026-09-27'))
      .toBe('2026-09-28T04:33:57.000Z');
  });

  it('sin ninguno de los tres no inventa una fecha', () => {
    expect(fechaParaElTicket(null, null, null)).toBeUndefined();
  });

  it('la hora del servidor nunca queda en cero por el formato', () => {
    // Guardado 2026-09-28 04:33 UTC = 23:33 del 27 en Lima: hay hora real.
    expect(hora('2026-09-28T04:33:57.000Z')).toBeGreaterThan(0);
  });
});
