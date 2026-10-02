/**
 * Con qué moneda abre el punto de venta al convertir una cotización.
 *
 * Reportado por INPRA, que cotiza en dólares la mayor parte del tiempo: al
 * convertir una cotización en dólares a factura, el POS arrancaba en soles.
 * Los precios que se cargan son los de la cotización —que están guardados en
 * dólares—, así que la factura salía con los MISMOS números pero en soles:
 * una cotización de $1,140 se facturaba como S/1,140. Con el tipo de cambio en
 * 3.362, eso es cobrar S/2,693 de menos en un solo documento.
 *
 * La causa era simple: los conversores pasaban cliente, productos y
 * observaciones, pero no la moneda. El POS ya sabía aplicarla —el camino de
 * edición sí la mandaba—, solo que nadie se la daba.
 */

export type Moneda = 'PEN' | 'USD';

/**
 * La moneda de una cotización.
 *
 * Se mira `cotizMoneda` primero porque es el campo propio de la cotización, y
 * `tipoMoneda` como respaldo para las que se guardaron antes de que existiera.
 * Ante la duda, soles: es la moneda por defecto del sistema y equivocarse hacia
 * allá no infla un importe.
 */
export const monedaDeCotizacion = (cotizacion: any): Moneda => {
    const valor = String(
        cotizacion?.cotizMoneda ?? cotizacion?.tipoMoneda ?? '',
    ).trim().toUpperCase();
    return valor === 'USD' ? 'USD' : 'PEN';
};
