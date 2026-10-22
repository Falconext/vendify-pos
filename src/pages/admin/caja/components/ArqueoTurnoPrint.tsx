/**
 * El papel del arqueo de un turno.
 *
 * Lo pidió el empresario para saber qué hizo cada cajera en su turno: a qué
 * hora abrió y cerró, cuánto declaró en cada medio de pago, qué comprobantes
 * emitió y cuánto sumó el turno.
 *
 * Los montos del cierre son los que quedaron GRABADOS ese día, no un recálculo
 * de hoy: el arqueo es lo que la persona declaró y lo que el sistema esperaba
 * en ese momento. Si después se anuló una venta, el papel tiene que seguir
 * diciendo lo que se firmó.
 *
 * Por eso el detalle de documentos se muestra aparte, como respaldo: cuando no
 * cuadra con el total grabado, esa discrepancia es justamente la información
 * que el dueño está buscando.
 */
import React from 'react';
import moment from 'moment';

const fmt = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const fechaHora = (v: string | Date | null | undefined) =>
    v ? moment(v).format('DD/MM/YYYY HH:mm') : '—';

const TIPO_DOC_LABEL: Record<string, string> = {
    '01': 'Factura',
    '03': 'Boleta',
    '07': 'N. Crédito',
    '08': 'N. Débito',
    NV: 'Nota de venta',
    TICKET: 'Ticket',
    RH: 'Recibo hon.',
    CP: 'Comp. pago',
    NP: 'Nota pedido',
    OT: 'Orden trabajo',
};

export interface DetalleTurno {
    empresa?: { razonSocial?: string; nombreComercial?: string; ruc?: string } | null;
    sede?: string | null;
    turno?: string | null;
    apertura?: {
        fecha: string;
        montoInicial: number;
        usuario?: string | null;
        observaciones?: string | null;
    } | null;
    cierre: {
        fecha: string;
        fechaCierre?: string | null;
        usuario?: string | null;
        montoEfectivo: number;
        montoYape: number;
        montoPlin: number;
        montoTransferencia: number;
        montoTarjeta: number;
        montoFinal: number;
        totalVentas: number;
        diferencia: number;
        observaciones?: string | null;
    };
    documentos: {
        id: number;
        documento: string;
        tipoDoc: string;
        cliente: string;
        medioPago: string;
        total: number;
        fecha: string;
    }[];
    /**
     * Plata que entró al cajón sin ser venta (ingresos de caja y
     * transferencias recibidas de otra sede). Siempre efectivo. Opcional:
     * los servidores anteriores al 21-10 no lo mandan.
     */
    ingresos?: {
        id: number;
        fecha: string;
        monto: number;
        concepto: string;
        esTransferencia: boolean;
    }[];
    egresos: {
        id: number;
        fecha: string;
        monto: number;
        concepto: string;
        esTransferencia: boolean;
        /** 'COMPRA' = pago de una compra; el resto son gastos. */
        categoria?: string | null;
        metodoPago?: string | null;
    }[];
}

/**
 * Lo que la persona declaró para ese medio de pago.
 *
 * El cierre guarda un campo por medio; el sistema agrupa por el texto de
 * `medioPago` del comprobante, que no siempre coincide (ej. "Yape" vs
 * "YAPE"). Se emparejan por nombre y lo que no calza queda en blanco en vez
 * de mostrarse como cero, que sería afirmar algo que no se sabe.
 */
const declaradoDe = (
    medio: string,
    cierre: DetalleTurno['cierre'],
): string => {
    const m = medio.toUpperCase();
    if (/EFECTIVO/.test(m)) return fmt(cierre.montoEfectivo);
    if (/YAPE/.test(m)) return fmt(cierre.montoYape);
    if (/PLIN/.test(m)) return fmt(cierre.montoPlin);
    if (/TARJETA|VISA|MASTER/.test(m)) return fmt(cierre.montoTarjeta);
    if (/TRANSFER|DEPOSITO|DEPÓSITO/.test(m)) return fmt(cierre.montoTransferencia);
    return '—';
};

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) => (
    <div className="flex justify-between border-b border-gray-200 py-1">
        <span className="text-gray-600">{etiqueta}</span>
        <span className="font-semibold">{valor}</span>
    </div>
);

export const ArqueoTurnoPrint = React.forwardRef<HTMLDivElement, { detalle: DetalleTurno }>(
    ({ detalle }, ref) => {
        const { empresa, sede, turno, apertura, cierre, documentos, egresos } = detalle;
        const totalDocumentos = documentos.reduce((s, d) => s + Number(d.total || 0), 0);
        const totalEgresos = egresos.reduce((s, e) => s + Number(e.monto || 0), 0);
        const ingresos = detalle.ingresos ?? [];
        const totalIngresosCaja = ingresos.reduce((s, e) => s + Number(e.monto || 0), 0);

        // ── Lo que el SISTEMA registró, agrupado como lo pide el contador ────
        // El corte de caja que usan separa compras de gastos y abre cada lado
        // por medio de pago. Todo sale de lo que ya trae el detalle del turno.
        const porMedio = (filas: { medio: string; monto: number }[]) => {
            const mapa = new Map<string, number>();
            for (const f of filas) {
                const k = (f.medio || 'SIN MEDIO').toUpperCase();
                mapa.set(k, (mapa.get(k) ?? 0) + Number(f.monto || 0));
            }
            return [...mapa.entries()]
                .map(([medio, monto]) => ({ medio, monto }))
                .sort((a, b) => b.monto - a.monto);
        };

        const ingresosPorMedio = porMedio(
            documentos.map((d) => ({ medio: d.medioPago, monto: d.total })),
        );
        const egresosPorMedio = porMedio(
            egresos.map((e) => ({ medio: e.metodoPago || 'EFECTIVO', monto: e.monto })),
        );

        const esCompra = (e: { categoria?: string | null }) =>
            String(e.categoria ?? '').toUpperCase() === 'COMPRA';
        const totalCompras = egresos.filter(esCompra).reduce((s, e) => s + Number(e.monto || 0), 0);
        const totalGastos = totalEgresos - totalCompras;

        const esEfectivo = (m: string) => /EFECTIVO/i.test(m);
        const ingresoEfectivo = ingresosPorMedio
            .filter((x) => esEfectivo(x.medio))
            .reduce((s, x) => s + x.monto, 0);
        const egresoEfectivo = egresosPorMedio
            .filter((x) => esEfectivo(x.medio))
            .reduce((s, x) => s + x.monto, 0);

        // El saldo que de verdad se cuenta: lo que debería haber en el cajón.
        // Incluye el fondo inicial, que no es una venta pero está físicamente.
        const fondoInicial = Number(apertura?.montoInicial ?? 0);
        const saldoEfectivo = fondoInicial + ingresoEfectivo + totalIngresosCaja - egresoEfectivo;
        const saldo = totalDocumentos + totalIngresosCaja - totalEgresos;
        // Diferencia positiva = sobró plata en el cajón; negativa = faltó. Se
        // dice con palabras porque un "-12.00" solo no lo interpreta nadie.
        const dif = Number(cierre.diferencia || 0);

        return (
            <div ref={ref} className="bg-white text-black" style={{ colorScheme: 'light' }}>
                <div className="mx-auto p-8 text-[12px]" style={{ width: '210mm' }}>
                    <div className="mb-4 border-b-2 border-black pb-3">
                        <h1 className="text-xl font-extrabold uppercase">Arqueo de caja</h1>
                        <p className="text-sm font-bold">
                            {empresa?.nombreComercial || empresa?.razonSocial || ''}
                        </p>
                        {empresa?.ruc && <p className="text-gray-600">RUC: {empresa.ruc}</p>}
                        <p className="text-gray-600">
                            {sede ? `Sede: ${sede}` : ''} {turno ? `· Turno: ${turno}` : ''}
                        </p>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-6">
                        <div>
                            <h2 className="mb-1 font-extrabold uppercase">Apertura</h2>
                            <Fila etiqueta="Fecha y hora" valor={fechaHora(apertura?.fecha)} />
                            <Fila etiqueta="Abrió" valor={apertura?.usuario ?? '—'} />
                            <Fila etiqueta="Fondo inicial" valor={fmt(apertura?.montoInicial ?? 0)} />
                        </div>
                        <div>
                            <h2 className="mb-1 font-extrabold uppercase">Cierre</h2>
                            <Fila etiqueta="Fecha y hora" valor={fechaHora(cierre.fechaCierre || cierre.fecha)} />
                            <Fila etiqueta="Cerró" valor={cierre.usuario ?? '—'} />
                            <Fila etiqueta="Ventas del turno" valor={fmt(cierre.totalVentas)} />
                        </div>
                    </div>

                    {/* Lo que registró el sistema, al lado de lo que declaró la
                        persona: la diferencia entre ambas columnas es el arqueo. */}
                    <h2 className="mb-1 font-extrabold uppercase">Ingresos del turno</h2>
                    <table className="mb-4 w-full border-collapse">
                        <thead>
                            <tr className="border-y border-black text-left">
                                <th className="py-1">Medio de pago</th>
                                <th className="py-1 text-right">Según el sistema</th>
                                <th className="py-1 text-right">Declarado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ingresosPorMedio.map((x) => (
                                <tr key={x.medio} className="border-b border-gray-200">
                                    <td className="py-1">{x.medio}</td>
                                    <td className="py-1 text-right">{fmt(x.monto)}</td>
                                    <td className="py-1 text-right">{declaradoDe(x.medio, cierre)}</td>
                                </tr>
                            ))}
                            {ingresosPorMedio.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-2 text-center text-gray-500">
                                        Sin ingresos en el turno
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-black font-extrabold">
                                <td className="py-1">Total ingresos</td>
                                <td className="py-1 text-right">{fmt(totalDocumentos)}</td>
                                <td className="py-1 text-right">{fmt(cierre.montoFinal)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <h2 className="mb-1 font-extrabold uppercase">Egresos del turno</h2>
                    <div className="mb-2">
                        <Fila etiqueta="Compras pagadas de caja" valor={fmt(totalCompras)} />
                        <Fila etiqueta="Gastos" valor={fmt(totalGastos)} />
                        <div className="flex justify-between border-b-2 border-black py-1.5 font-extrabold">
                            <span>Total egresos</span>
                            <span>{fmt(totalEgresos)}</span>
                        </div>
                    </div>
                    {egresosPorMedio.length > 0 && (
                        <div className="mb-4">
                            {egresosPorMedio.map((x) => (
                                <Fila key={x.medio} etiqueta={`Egresos en ${x.medio}`} valor={fmt(x.monto)} />
                            ))}
                        </div>
                    )}

                    <h2 className="mb-1 font-extrabold uppercase">Cuadre de caja</h2>
                    <div className="mb-4">
                        <Fila etiqueta="Ingresos − Egresos" valor={fmt(saldo)} />
                        <Fila etiqueta="Fondo inicial" valor={fmt(fondoInicial)} />
                        <Fila etiqueta="Ingresos en efectivo" valor={fmt(ingresoEfectivo)} />
                        {totalIngresosCaja > 0 && (
                            <Fila etiqueta="Entradas de caja (no ventas)" valor={fmt(totalIngresosCaja)} />
                        )}
                        <Fila etiqueta="Egresos en efectivo" valor={`− ${fmt(egresoEfectivo)}`} />
                        {/* La única cifra contra la que se cuenta el cajón. */}
                        <div className="flex justify-between border-y-2 border-black py-2 text-[14px] font-extrabold">
                            <span>Saldo que debe haber en efectivo</span>
                            <span>{fmt(saldoEfectivo)}</span>
                        </div>
                    </div>

                    <h2 className="mb-1 font-extrabold uppercase">Declarado por medio de pago</h2>
                    <div className="mb-4">
                        <Fila etiqueta="Efectivo" valor={fmt(cierre.montoEfectivo)} />
                        <Fila etiqueta="Yape" valor={fmt(cierre.montoYape)} />
                        <Fila etiqueta="Plin" valor={fmt(cierre.montoPlin)} />
                        <Fila etiqueta="Tarjeta" valor={fmt(cierre.montoTarjeta)} />
                        <Fila etiqueta="Transferencia" valor={fmt(cierre.montoTransferencia)} />
                        <div className="flex justify-between border-b-2 border-black py-1.5 text-[14px] font-extrabold">
                            <span>Total declarado</span>
                            <span>{fmt(cierre.montoFinal)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 font-bold">
                            <span>Diferencia contra lo esperado</span>
                            <span>
                                {fmt(Math.abs(dif))}{' '}
                                {dif === 0 ? '(cuadra)' : dif > 0 ? '(sobrante)' : '(faltante)'}
                            </span>
                        </div>
                    </div>

                    <h2 className="mb-1 font-extrabold uppercase">
                        Comprobantes del turno ({documentos.length})
                    </h2>
                    <table className="mb-4 w-full border-collapse">
                        <thead>
                            <tr className="border-y border-black text-left">
                                <th className="py-1">Hora</th>
                                <th className="py-1">Documento</th>
                                <th className="py-1">Tipo</th>
                                <th className="py-1">Cliente</th>
                                <th className="py-1">Medio</th>
                                <th className="py-1 text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documentos.map((d) => (
                                <tr key={d.id} className="border-b border-gray-200">
                                    <td className="py-1">{moment(d.fecha).format('HH:mm')}</td>
                                    <td className="py-1 font-semibold">{d.documento}</td>
                                    <td className="py-1">{TIPO_DOC_LABEL[d.tipoDoc] ?? d.tipoDoc}</td>
                                    <td className="py-1">{d.cliente}</td>
                                    <td className="py-1">{d.medioPago || '—'}</td>
                                    <td className="py-1 text-right">{fmt(d.total)}</td>
                                </tr>
                            ))}
                            {documentos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-2 text-center text-gray-500">
                                        No se emitieron comprobantes en este turno
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {documentos.length > 0 && (
                            <tfoot>
                                <tr className="border-t border-black font-extrabold">
                                    <td className="py-1" colSpan={5}>
                                        Total de comprobantes
                                    </td>
                                    <td className="py-1 text-right">{fmt(totalDocumentos)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {ingresos.length > 0 && (
                        <>
                            <h2 className="mb-1 font-extrabold uppercase">
                                Entradas de caja ({ingresos.length})
                            </h2>
                            <table className="mb-4 w-full border-collapse">
                                <thead>
                                    <tr className="border-y border-black text-left">
                                        <th className="py-1">Hora</th>
                                        <th className="py-1">Concepto</th>
                                        <th className="py-1 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingresos.map((e) => (
                                        <tr key={e.id} className="border-b border-gray-200">
                                            <td className="py-1">{moment(e.fecha).format('HH:mm')}</td>
                                            <td className="py-1">
                                                {e.concepto || '—'}
                                                {e.esTransferencia ? ' (transferencia entre cajas)' : ''}
                                            </td>
                                            <td className="py-1 text-right">{fmt(e.monto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-black font-extrabold">
                                        <td className="py-1" colSpan={2}>
                                            Total de entradas
                                        </td>
                                        <td className="py-1 text-right">{fmt(totalIngresosCaja)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </>
                    )}

                    {egresos.length > 0 && (
                        <>
                            <h2 className="mb-1 font-extrabold uppercase">
                                Salidas de caja ({egresos.length})
                            </h2>
                            <table className="mb-4 w-full border-collapse">
                                <thead>
                                    <tr className="border-y border-black text-left">
                                        <th className="py-1">Hora</th>
                                        <th className="py-1">Concepto</th>
                                        <th className="py-1 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {egresos.map((e) => (
                                        <tr key={e.id} className="border-b border-gray-200">
                                            <td className="py-1">{moment(e.fecha).format('HH:mm')}</td>
                                            <td className="py-1">
                                                {e.concepto || '—'}
                                                {e.esTransferencia ? ' (transferencia entre cajas)' : ''}
                                            </td>
                                            <td className="py-1 text-right">{fmt(e.monto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-black font-extrabold">
                                        <td className="py-1" colSpan={2}>
                                            Total de salidas
                                        </td>
                                        <td className="py-1 text-right">{fmt(totalEgresos)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </>
                    )}

                    {(cierre.observaciones || apertura?.observaciones) && (
                        <div className="mb-6">
                            <h2 className="mb-1 font-extrabold uppercase">Observaciones</h2>
                            {apertura?.observaciones && (
                                <p className="text-gray-700">Apertura: {apertura.observaciones}</p>
                            )}
                            {cierre.observaciones && (
                                <p className="text-gray-700">Cierre: {cierre.observaciones}</p>
                            )}
                        </div>
                    )}

                    <div className="mt-10 grid grid-cols-2 gap-16 text-center">
                        <div className="border-t border-black pt-1">
                            {apertura?.usuario ?? 'Cajero(a)'}
                        </div>
                        <div className="border-t border-black pt-1">Revisado por</div>
                    </div>
                </div>
            </div>
        );
    },
);

ArqueoTurnoPrint.displayName = 'ArqueoTurnoPrint';
export default ArqueoTurnoPrint;
