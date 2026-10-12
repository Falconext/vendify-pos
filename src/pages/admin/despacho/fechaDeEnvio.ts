/**
 * La fecha de entrega programada, como se muestra en el panel y en el ticket.
 *
 * Pedido de COMERCIAL LINNA MODA: despachan por día de entrega y no tenían
 * dónde ver qué sale cada día. El dato ya existía —`EnvioDespacho.fechaEstimada`,
 * que el panel ya recibía— pero no se mostraba en ningún lado, y en el ticket
 * solo salía la fecha de emisión.
 *
 * Vive aparte de la pantalla porque la misma regla la usan la lista y el
 * comprobante impreso, y porque el manejo de la fecha tiene una trampa que
 * conviene tener probada (ver abajo).
 */

/** Lo mínimo que hace falta de una fila del panel. */
export interface FilaConEnvio {
    fechaEstimada?: string | Date | null;
    estadoDespacho?: string | null;
}

/**
 * Formatea la fecha SIN pasar por la zona horaria del navegador.
 *
 * `fechaEstimada` es un día, no un instante: viene como `2026-10-03T00:00:00Z`.
 * Si se construye un `Date` y se lee con `getDate()`, en Lima (UTC-5) eso es el
 * 2 de octubre a las 19:00 y la entrega aparece un día antes. Por eso se corta
 * el texto ISO en vez de interpretarlo.
 */
export const comoDiaLocal = (valor?: string | Date | null): string => {
    if (!valor) return '';
    const iso = valor instanceof Date ? valor.toISOString() : String(valor);
    const soloFecha = iso.slice(0, 10);
    const [a, m, d] = soloFecha.split('-');
    if (!a || !m || !d) return '';
    return `${d}/${m}/${a.slice(2)}`;
};

/**
 * Lo que se pinta en la celda.
 *
 * Una venta sin despacho —se la llevó el cliente— no tiene fecha de envío y no
 * debe mostrar una inventada: va un guion, igual que la columna Turno.
 */
export const fechaDeEnvio = (fila: FilaConEnvio): string => {
    if (String(fila?.estadoDespacho ?? '') === 'NO_APLICA') return '—';
    return comoDiaLocal(fila?.fechaEstimada) || '—';
};
