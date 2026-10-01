/**
 * Cuántos días hacia atrás se puede fechar un comprobante al emitirlo.
 *
 * Nace del pedido de IMPORTEMOS JUNTOS: Joshi atiende sola los sábados y
 * domingos, y recién el lunes carga sus ventas al sistema. La comisión de fin
 * de semana se calcula con la fecha del comprobante, así que si no puede
 * fecharlo el sábado cobra tarifa de día de semana —S/6 en vez de S/11—.
 *
 * El problema era que ella emite NOTAS DE VENTA, y ahí el campo de fecha
 * directamente no aparecía: el valor caía a 0 porque el tipo no era factura ni
 * boleta. No era una regla, era el caso por defecto.
 *
 * Los plazos de factura y boleta SÍ son de SUNAT y no se tocan: ampliarlos
 * dejaría a la empresa emitiendo fuera de plazo. Los informales, en cambio, no
 * son documentos de SUNAT —no se declaran ni se envían—, así que su límite es
 * nuestro. Se acota igual al rango de SUNAT por consistencia: una nota de venta
 * se convierte después en boleta, y no tiene sentido permitirle al informal un
 * margen que su documento formal no va a tener.
 */

/** Plazo de SUNAT para la factura electrónica. */
export const DIAS_FACTURA = 3;

/** Plazo de SUNAT para la boleta electrónica. */
export const DIAS_BOLETA = 5;

/**
 * Documentos internos del negocio, sin plazo de SUNAT. Se les da el mismo
 * margen que la boleta: alcanza de sobra para cargar el lunes lo del fin de
 * semana y no abre un hueco mayor que el del comprobante en que se convertirán.
 */
export const DIAS_INFORMAL = DIAS_BOLETA;

/** Los que no se declaran ante SUNAT. */
export const TIPOS_INFORMALES = ['NV', 'NP', 'TICKET', 'OT', 'CP', 'RH'];

/**
 * Días hacia atrás permitidos para este tipo de documento.
 *
 * La cotización devuelve 0 a propósito: no es una venta, no tiene fecha de
 * emisión que valga retroceder.
 */
export const diasEmisionRetroactiva = (tipoDoc?: string | null): number => {
    const tipo = String(tipoDoc ?? '').trim().toUpperCase();
    if (tipo === '01') return DIAS_FACTURA;
    if (tipo === '03') return DIAS_BOLETA;
    if (TIPOS_INFORMALES.includes(tipo)) return DIAS_INFORMAL;
    return 0;
};

/** ¿Se le puede cambiar la fecha a este documento? */
export const permiteFechaRetroactiva = (tipoDoc?: string | null): boolean =>
    diasEmisionRetroactiva(tipoDoc) > 0;

/** Fecha en formato YYYY-MM-DD, que es como la maneja el selector. */
const comoTexto = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** La fecha más antigua que admite este documento. */
export const fechaMinima = (tipoDoc?: string | null, hoy = new Date()): string => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - diasEmisionRetroactiva(tipoDoc));
    return comoTexto(d);
};

/**
 * ¿Esta fecha quedó fuera de plazo para este documento?
 *
 * Hace falta porque el tipo se puede cambiar DESPUÉS de elegir la fecha: una
 * nota de venta admite 5 días y la factura 3, así que al convertirla la fecha
 * vieja quedaría fuera del plazo de SUNAT sin que nadie lo note.
 */
export const fechaFueraDePlazo = (
    fechaElegida: string,
    tipoDoc?: string | null,
    hoy = new Date(),
): boolean =>
    fechaElegida < fechaMinima(tipoDoc, hoy) || fechaElegida > comoTexto(hoy);
