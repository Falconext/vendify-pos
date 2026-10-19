/**
 * Qué afectación de IGV le corresponde por defecto a lo que el negocio crea.
 *
 * Pedido de FRUTA PURA, que opera bajo la **Ley de Amazonía (Ley 27037)**: sus
 * ventas van exoneradas. El sistema ya respetaba la afectación de cada
 * producto, pero el formulario arrancaba siempre en "Gravado", así que cada
 * producto nuevo nacía con IGV y había que acordarse de cambiarlo a mano. Un
 * olvido no se nota al guardar: se nota recién en la factura, con el IGV ya
 * cobrado al cliente.
 *
 * La empresa ya tiene el interruptor (`leyAmazonia`, Perfil → Impuestos). Acá
 * solo se usa para elegir el valor inicial. No fuerza nada: el usuario puede
 * cambiar la afectación de cualquier ítem, porque un negocio amazónico también
 * vende cosas gravadas.
 */

export const AFECTACION_GRAVADO = '10';
export const AFECTACION_EXONERADO = '20';

export const NOMBRE_AFECTACION: Record<string, string> = {
    '10': 'Gravado – Operación Onerosa',
    '20': 'Exonerado',
    '30': 'Inafecto',
    '40': 'Exportación',
};

/** Lo mínimo que hace falta saber de la empresa para decidir. */
export interface EmpresaConAfectacion {
    leyAmazonia?: boolean | null;
}

/**
 * La afectación con la que arranca un ítem nuevo.
 *
 * Sin empresa cargada devuelve gravado: es el comportamiento de siempre y el
 * que no sorprende. Equivocarse hacia gravado es un cobro de más que el cliente
 * reclama el mismo día; equivocarse hacia exonerado es un tributo no cobrado
 * que aparece meses después.
 */
export const afectacionPorDefecto = (
    empresa?: EmpresaConAfectacion | null,
): string => (empresa?.leyAmazonia ? AFECTACION_EXONERADO : AFECTACION_GRAVADO);

/** El texto que acompaña al código, para no dejarlos desalineados. */
export const nombreAfectacionPorDefecto = (
    empresa?: EmpresaConAfectacion | null,
): string => NOMBRE_AFECTACION[afectacionPorDefecto(empresa)];
