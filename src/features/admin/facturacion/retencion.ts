/**
 * Retención del 3% de IGV en el punto de venta.
 *
 * Espejo de `backend/src/comprobante/retencion.ts`: el POS decide y calcula, el
 * backend guarda. Si se toca una regla acá, se toca allá.
 *
 * Lo que cambió respecto de antes: la marca de "agente de retención" vive en el
 * CLIENTE, no en la empresa. El que retiene es el que compra, y una misma
 * empresa le factura a agentes y a clientes comunes el mismo día — con el
 * interruptor por empresa se le retenía a todos por igual.
 */

/** Operaciones de S/700 o menos no se retienen (R.S. 037-2002, art. 3). */
export const UMBRAL_RETENCION = 700;

export const PORCENTAJE_RETENCION = 3;

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export interface ContextoRetencion {
    /** Solo la factura da derecho a crédito fiscal; la boleta no se retiene. */
    esFactura: boolean;
    /** Importe total de la operación, con IGV: es la base de la retención. */
    total: number;
    clienteEsAgenteRetencion?: boolean | null;
    /** Legado: interruptor por empresa, aplicaba a TODAS las facturas. */
    empresaEsAgenteRetencion?: boolean | null;
    /** Detracción y retención se excluyen entre sí. */
    tieneDetraccion?: boolean | null;
}

/**
 * ¿Corresponde retener?
 *
 * El umbral es ESTRICTO: en exactamente S/700 no se retiene, porque la norma
 * exonera las operaciones "iguales o menores" a ese importe.
 */
export const aplicaRetencion = (ctx: ContextoRetencion): boolean => {
    if (ctx.tieneDetraccion) return false;
    if (!ctx.esFactura) return false;
    if (!(Number(ctx.total) > UMBRAL_RETENCION)) return false;
    return Boolean(ctx.clienteEsAgenteRetencion || ctx.empresaEsAgenteRetencion);
};

/** El 3% sobre el total CON IGV, que es la base que exige SUNAT. */
export const calcularRetencion = (
    total: number,
    porcentaje: number = PORCENTAJE_RETENCION,
): number => round2((Number(total) || 0) * (Number(porcentaje) || 0) / 100);

/** Lo que el cliente termina depositando. El total de la factura no baja. */
export const importeNetoACobrar = (total: number, retenido: number): number =>
    round2((Number(total) || 0) - (Number(retenido) || 0));
