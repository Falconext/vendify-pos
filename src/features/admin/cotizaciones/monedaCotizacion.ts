/**
 * Con qué moneda abre el punto de venta al convertir una cotización.
 *
 * Reportado por INPRA, que cotiza en dólares la mayor parte del tiempo: al
 * convertir una cotización en dólares a factura, el POS arrancaba en soles.
 * Los precios que se cargan son los de la cotización —guardados en dólares—,
 * así que la factura salía con los MISMOS números en la moneda equivocada: una
 * cotización de $1,140 se facturaba como S/1,140. Con el tipo de cambio en
 * 3.362, eso es cobrar S/2,693 de menos en un solo documento.
 *
 * La regla no es "cuál campo es más verdadero", sino **que la factura diga lo
 * mismo que el cliente ya vio en su cotización**. El PDF de la cotización
 * decide con `cotizMoneda` (`comprobante.service.ts`: `cotizEsUSD`), así que
 * acá se replica esa misma comparación, letra por letra.
 *
 * Eso importa porque `cotizMoneda` no siempre guarda un código limpio: en
 * producción hay 6 cotizaciones con etiquetas de pantalla como "SOLES (S/)" y
 * "DÓLARES (US$)". El PDF las imprimió en soles —ninguna es exactamente
 * "USD"—, y acá dan soles también. Puede no ser lo que el usuario quiso, pero
 * es lo que su cliente recibió, y la factura tiene que coincidir con eso.
 */

export type Moneda = 'PEN' | 'USD';

/**
 * La moneda de una cotización, igual que la calcula su PDF.
 *
 * Sin `cotizMoneda` se asume soles, no `tipoMoneda`: el PDF también asume
 * soles en ese caso, y apartarse de él volvería a separar el papel del
 * comprobante. Además equivocarse hacia soles no infla un importe; hacia
 * dólares lo multiplica por el tipo de cambio.
 */
export const monedaDeCotizacion = (cotizacion: any): Moneda =>
    String(cotizacion?.cotizMoneda || 'PEN').trim().toUpperCase() === 'USD'
        ? 'USD'
        : 'PEN';
