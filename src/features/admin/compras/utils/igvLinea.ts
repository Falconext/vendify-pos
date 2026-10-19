/**
 * IGV por línea en compras y órdenes de compra.
 *
 * Línea de un XML SUNAT que el proveedor emitió SIN IGV: tiene valor y su IGV
 * es 0 (exonerado, inafecto o proveedor que no lo cobra). Solo decide si el
 * dato viene: el XML lo trae por línea; la foto leída con IA no.
 */
export const lineaXmlSinIgv = (item: { igv?: unknown; subtotal?: unknown } | null | undefined): boolean =>
    item?.igv !== undefined && item?.igv !== null && Number(item.igv) === 0
    && Number(item?.subtotal) > 0;

/**
 * Precio unitario de una línea de orden al marcar/desmarcar "Precios con IGV
 * incluido" (factor 1.18 o 1/1.18). Así cada línea conserva su total: antes
 * solo cambiaba cómo se leían los precios y las demás líneas perdían su IGV.
 */
export const precioOrdenConFactorIgv = (precioUnitario: number, factor: number): number =>
    Number((Number(precioUnitario) * factor).toFixed(2));
