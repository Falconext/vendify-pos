import { mapDetalleToInvoiceProduct } from '@/features/admin/facturacion/utils/comprobanteProductMapper';
import { documentoCorto, resumirSeleccion, type NotaElegida } from './seleccionNotas';

/**
 * Varias notas de un cliente → una sola boleta o factura.
 *
 * Arma el mismo `notaDeVentaData` que manda "Convertir a boleta" para una
 * nota, pero con las líneas y el cobro de todas. El backend recibe
 * `origenComprobanteIds` y enlaza todas las notas al comprobante (así ninguna
 * se cuenta dos veces en los reportes).
 */

/** Por qué no se pueden facturar juntas (null = sí se puede). */
export function motivoNoFacturar(notas: NotaElegida[], tipo: 'BOLETA' | 'FACTURA'): string | null {
    if (notas.length < 2) return 'Elige al menos 2 notas (para una sola usa su menú ⋮)';
    const r = resumirSeleccion(notas);
    if (!r.mismoCliente) return 'Elige notas de un mismo cliente';
    if (!r.mismaMoneda) return 'Hay notas en soles y en dólares';
    const convertida = notas.find((n) => n.convertidoA);
    if (convertida) return `${documentoCorto(convertida.documento)} ya está en ${convertida.convertidoA}`;
    return null;
}

/**
 * Precio por unidad que reproduce el total guardado de la línea.
 *
 * Un six-pack vendido como 6 unidades queda guardado a S/ 8.33 (redondeado),
 * pero su total es 42.37 + IGV 7.63 = S/ 50.00. Rearmar la línea con 8.33 da
 * 49.98 y la boleta no cuadra con la nota. Con 4 decimales (8.3333) sí.
 * null = no hay datos para calcularlo o el redondeado ya cuadra.
 */
export function precioExactoDeLinea(det: any): number | null {
    const cantidad = Number(det?.cantidad);
    const valor = Number(det?.mtoValorVenta);
    const igv = Number(det?.igv ?? 0);
    const unitario = Number(det?.mtoPrecioUnitario);
    if (!(cantidad > 0) || !Number.isFinite(valor) || !(valor > 0) || !Number.isFinite(unitario)) return null;
    const total = Math.round((valor + (Number.isFinite(igv) ? igv : 0)) * 100) / 100;
    if (Math.abs(unitario * cantidad - total) < 0.005) return null;
    const exacto = Math.round((total / cantidad) * 10000) / 10000;
    // Solo corrige redondeos, no reprecia: si la diferencia es grande, algo más pasa.
    return Math.abs(exacto - unitario) < 0.01 ? exacto : null;
}

const clave = (d: any) =>
    [d.productoId, Number(d.precioUnitario).toFixed(4), d.unidad, d.unidadesPorPaquete ?? '', d.comboId ?? ''].join('|');

/**
 * Líneas de todas las notas. El mismo producto al mismo precio se suma en una
 * sola línea (2 + 3 yogures = 5); con series, lote, o precio distinto queda
 * aparte, porque sumarlas cambiaría lo que se vendió.
 */
export function lineasDeNotas(notas: NotaElegida[]): any[] {
    const lineas: any[] = [];
    const porClave = new Map<string, any>();
    for (const n of notas) {
        for (const det of n.origen?.detalles ?? []) {
            const m = mapDetalleToInvoiceProduct(det);
            const exacto = precioExactoDeLinea(det);
            if (exacto != null) m.precioUnitario = exacto;
            const unible = Number(m.productoId) > 0 && !m.numerosSerie && !det.loteId;
            const k = unible ? clave({ ...m, unidadesPorPaquete: det.unidadesPorPaquete, comboId: det.comboId }) : '';
            const previa = k ? porClave.get(k) : undefined;
            if (previa) {
                const suma = Math.round((Number(previa.cantidad) + Number(m.cantidad)) * 1000) / 1000;
                Object.assign(previa, { cantidad: suma, cantidadInicial: suma, cantidadOriginal: suma });
                continue;
            }
            const linea = { ...m };
            lineas.push(linea);
            if (k) porClave.set(k, linea);
        }
    }
    return lineas;
}

const mayus = (v: unknown) => String(v ?? '').toUpperCase();

/** ¿El cliente de las notas sirve para una factura (tiene RUC)? */
export const clienteConRuc = (notas: NotaElegida[]) => /^\d{11}$/.test(String(notas[0]?.nroDoc ?? ''));

/**
 * `notaDeVentaData` para el POS (ver useFacturacionViewModel, rama fromNotaDeVenta).
 * Para FACTURA con un cliente sin RUC (p. ej. "Clientes Varios") se manda sin
 * cliente, igual que "Convertir a factura" de una sola nota: el POS lo pide y
 * se escribe el RUC ahí.
 */
export function notaDeVentaDataConjunta(notas: NotaElegida[], tipo: 'BOLETA' | 'FACTURA' = 'BOLETA') {
    const ordenadas = [...notas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    const primera = ordenadas[0];
    const r = resumirSeleccion(ordenadas);
    const o = (n: NotaElegida) => n.origen ?? {};
    const todasCredito = ordenadas.every((n) => mayus(o(n).formaPagoTipo) === 'CREDITO');
    const medios = new Set(ordenadas.map((n) => mayus(o(n).medioPago)).filter(Boolean));
    const vendedores = new Set(ordenadas.map((n) => o(n).vendedorCampoId ?? null));
    const referencias = ordenadas.map((n) => documentoCorto(n.documento)).join(', ');
    const observaciones = [
        `Notas: ${referencias}`,
        ...ordenadas.map((n) => String(o(n).observaciones ?? '').trim()).filter(Boolean),
    ].join('\n');
    const descuento = ordenadas.reduce((s, n) => s + Number(o(n).mtoDescuentoGlobal || 0), 0);
    const vencimientos = ordenadas.map((n) => String(o(n).fechaVencimientoCredito ?? '')).filter(Boolean).sort();

    return {
        origenComprobanteId: primera.id,
        origenComprobanteIds: ordenadas.map((n) => n.id),
        origenReferencia: referencias,
        cliente: tipo === 'FACTURA' && !clienteConRuc(ordenadas) ? null : o(primera).cliente,
        clienteId: tipo === 'FACTURA' && !clienteConRuc(ordenadas) ? null : o(primera).clienteId,
        observaciones,
        // Cobro: la suma de lo pagado en todas. El pago mixto de cada nota no se
        // puede juntar en uno, así que va el medio común (o el de la primera).
        medioPago: medios.size === 1 ? o(primera).medioPago : o(primera).medioPago,
        paymentDetails: null,
        saldo: r.saldo,
        mtoImpVenta: r.total,
        estadoPago: r.saldo <= 0 ? 'COMPLETADO' : r.saldo < r.total ? 'PAGO_PARCIAL' : 'PENDIENTE_PAGO',
        mtoDescuentoGlobal: Math.round(descuento * 100) / 100 || undefined,
        // Se hereda el crédito solo si TODAS eran a crédito; las cuotas las
        // rehace el backend con el saldo real (cuotasParaElSaldo).
        formaPagoTipo: todasCredito ? o(primera).formaPagoTipo : 'Contado',
        fechaVencimientoCredito: todasCredito ? vencimientos[vencimientos.length - 1] : undefined,
        cuotas: null,
        tipoMoneda: o(primera).tipoMoneda,
        tipoCambio: o(primera).tipoCambio,
        vendedorCampoId: vendedores.size === 1 ? o(primera).vendedorCampoId : undefined,
        vendedorCampoNombre: vendedores.size === 1 ? o(primera).vendedorCampoNombre : undefined,
        productos: lineasDeNotas(ordenadas),
    };
}
