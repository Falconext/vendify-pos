import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';
import { useAuthStore } from '@/zustand/auth';
import RotuloEtiqueta from './RotuloEtiqueta';
import RotuloEnvio100x150 from './RotuloEnvio100x150';
import { COURIER_LABEL, rotuloPageStyle, type RotuloFormato } from './rotuloFormato';
import RotuloTicket, { quienLleva, tieneDestino, type DatosRotulo } from './RotuloTicket';


export interface RotuloLoteItem {
    comprobanteId: number;
    referencia: string;
    courier: string;
    celular: string;
}

/**
 * Impresión en lote de rótulos (un rótulo por página, ticket 80mm) para todos
 * los despachos en "Preparando" de la vista actual, sin importar el courier.
 * Mismo bloque destinatario/destino que `RotuloPrint`, más la referencia de la
 * venta y el courier para que el empaquetador sepa qué paquete es cuál.
 * Se monta oculto y se dispara sola apenas `items` deja de estar vacío.
 */
export default function RotulosLotePrint({
    items,
    onDone,
    formato = 'TICKET',
    onImpresos,
}: {
    items: RotuloLoteItem[];
    onDone: () => void;
    /** Tras imprimir: el panel pregunta si pasarlos a Confirmado. */
    onImpresos?: (comprobanteIds: number[]) => void;
    /** Ticket 80 mm (una página por rótulo) o etiqueta adhesiva de 80×50 o 100×150 mm (una por rótulo). */
    formato?: RotuloFormato;
}) {
    const [datos, setDatos] = useState<Array<RotuloLoteItem & { rotulo: DatosRotulo | null }> | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    // Los que de verdad salieron en este lote (sin los omitidos por falta de destino).
    const impresosRef = useRef<number[]>([]);
    const { alert } = useAlertStore();
    const logo = useAuthStore((st) => (st.auth as any)?.empresa?.logo);

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: rotuloPageStyle(formato) ?? buildComprobantePrintPageStyle({ width: 80, height: 330 }),
        onAfterPrint: () => {
            if (onImpresos && impresosRef.current.length) onImpresos(impresosRef.current);
            impresosRef.current = [];
            onDone();
        },
    });

    useEffect(() => {
        if (!items.length) { setDatos(null); return; }
        let vivo = true;
        (async () => {
            const res = await Promise.all(items.map(async (it) => {
                try {
                    const r = await apiClient.get(`/shalom/rotulo/${it.comprobanteId}`);
                    return { ...it, rotulo: (r.data?.data ?? r.data) as DatosRotulo };
                } catch {
                    return { ...it, rotulo: null };
                }
            }));
            if (!vivo) return;
            const fallidos = res.filter((r) => !r.rotulo).length;
            // Sin ningún destino el rótulo no dice a dónde va: se omite. Antes
            // también se omitía el reparto en Lima (tiene dirección, no agencia
            // ni N° de orden) y se perdía la mitad de los rótulos.
            const sinDestino = res.filter((r) => r.rotulo && !tieneDestino(r.rotulo));
            const listos = res.filter((r) => r.rotulo && !sinDestino.includes(r));
            if (!listos.length) {
                alert(
                    fallidos === res.length
                        ? 'No se pudo obtener los datos de ningún rótulo'
                        : 'Ningún despacho en Preparando tiene destino (dirección o agencia) para imprimir',
                    'error',
                );
                onDone();
                return;
            }
            if (fallidos > 0) alert(`${fallidos} rótulo(s) no se pudieron cargar y se omitieron`, 'warning');
            if (sinDestino.length > 0) {
                alert(
                    `${sinDestino.length} despacho(s) sin destino omitido(s): ${sinDestino.map((r) => r.referencia).join(', ')}`,
                    'warning',
                );
            }
            impresosRef.current = listos.map((r) => r.comprobanteId);
            setDatos(listos);
        })();
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (!datos) return;
        const timer = window.setTimeout(() => { printFn(); setDatos(null); }, 80);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos]);

    if (formato === 'ETIQUETA_100X150') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {(datos ?? []).map((d, idx) => (
                        <RotuloEnvio100x150
                            key={d.comprobanteId}
                            saltoDePagina={idx < (datos?.length ?? 0) - 1}
                            logo={logo}
                            courier={(d.rotulo && quienLleva(d.rotulo)) || (COURIER_LABEL[d.courier] ?? d.courier)}
                            d={{ ...(d.rotulo as DatosRotulo), referencia: d.rotulo?.referencia || d.referencia, celular: d.celular || d.rotulo?.celular }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (formato === 'ETIQUETA_80X50') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {(datos ?? []).map((d, idx) => (
                        <RotuloEtiqueta
                            key={d.comprobanteId}
                            saltoDePagina={idx < (datos?.length ?? 0) - 1}
                            d={{
                                ...(d.rotulo ?? {}),
                                referencia: d.referencia,
                                courier: (d.rotulo && quienLleva(d.rotulo)) || (COURIER_LABEL[d.courier] ?? d.courier),
                                celular: d.celular || d.rotulo?.celular,
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="hidden">
            <div ref={componentRef}>
                {(datos ?? []).map((d, idx) => (
                    <RotuloTicket
                        key={d.comprobanteId}
                        saltoDePagina={idx < (datos?.length ?? 0) - 1}
                        d={{ ...(d.rotulo as DatosRotulo), referencia: d.rotulo?.referencia || d.referencia, celular: d.celular || d.rotulo?.celular }}
                    />
                ))}
            </div>
        </div>
    );
}
