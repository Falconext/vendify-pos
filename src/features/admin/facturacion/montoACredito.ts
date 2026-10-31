import { aplicacionEfectiva, lineasDeEnvio } from './aplicacionMontoEnvio';

/**
 * Cuánto queda a crédito en el POS: lo que se emite menos el pago inicial.
 *
 * Lo que se emite incluye el envío cuando se le cobra al cliente: entra al
 * comprobante como una línea más (`lineasDeEnvio`). Antes el crédito se
 * calculaba sin esa línea y la cuota salía corta: con Shalom, la emisión
 * moría con "La suma de cuotas (S/ 125.00) debe ser igual al saldo a crédito
 * (S/ 243.00)" (demo ropa, 21-10).
 */
export function montoACredito(p: {
    /** Total de productos, ya con descuentos. */
    totalProductos: number;
    envioActivo: boolean;
    costoEnvio: unknown;
    aplicacionGuardada: string | null | undefined;
    esInformal: boolean;
    esPropio: boolean;
    /** Lo que el cliente paga ahora (0 si nada). */
    inicial: number;
}): { totalConEnvio: number; inicial: number; totalCredito: number } {
    const envio = lineasDeEnvio({
        envioActivo: p.envioActivo,
        costoEnvio: p.costoEnvio,
        aplicacion: aplicacionEfectiva(p.aplicacionGuardada, {
            esInformal: p.esInformal,
            esPropio: p.esPropio,
        }),
    }).reduce((suma, linea) => suma + Number(linea.nuevoValorUnitario || 0), 0);
    const totalConEnvio = Number((p.totalProductos + envio).toFixed(2));
    const inicial = p.inicial > 0 ? Math.min(p.inicial, totalConEnvio) : 0;
    return {
        totalConEnvio,
        inicial,
        totalCredito: Number(Math.max(0, totalConEnvio - inicial).toFixed(2)),
    };
}
