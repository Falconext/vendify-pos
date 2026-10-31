/**
 * La nota tal como se convierte cuando ya salió un formal con parte de sus
 * productos: solo las líneas que faltan, su total y lo cobrado que todavía no
 * se aplicó. El backend lo calcula (`porConvertir` del listado) con la misma
 * regla con que valida la conversión, así que el POS no tiene que adivinar.
 *
 * Sin descuento global ni pago mixto de la nota: los dos eran del total
 * original y aplicados al saldo darían montos que no corresponden.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * El total como lo va a calcular el POS: precio unitario × cantidad. El de
 * las líneas guardadas puede diferir en centavos por redondeo, y entonces una
 * nota ya pagada mostraba un vuelto de S/ 0.05 al cobrar el saldo.
 */
export const totalDelSaldo = (item: any): number =>
    r2((item?.porConvertir?.detalles || []).reduce(
        (a: number, d: any) => a + Number(d?.mtoPrecioUnitario || 0) * Number(d?.cantidad || 0),
        0,
    ));

export function notaPorSaldo<T extends Record<string, any>>(item: T): T {
    const pc = item?.porConvertir;
    if (!pc) return item;
    const total = totalDelSaldo(item);
    // Nota cobrada entera (el backend manda yaCobrado = total): el saldo también.
    const pagada = Number(pc.yaCobrado || 0) >= Number(pc.total || 0) - 0.01;
    const saldo = pagada ? 0 : r2(Math.max(0, total - Number(pc.yaCobrado || 0)));
    return {
        ...item,
        detalles: pc.detalles || [],
        mtoImpVenta: total,
        saldo,
        estadoPago: saldo <= 0 ? 'COMPLETADO' : saldo < total ? 'PAGO_PARCIAL' : 'PENDIENTE_PAGO',
        mtoDescuentoGlobal: 0,
        paymentDetails: null,
    };
}
