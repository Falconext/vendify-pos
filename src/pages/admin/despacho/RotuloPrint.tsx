import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { mensajeErrorShalom } from '@/services/shalom.service';
import { useAuthStore } from '@/zustand/auth';
import RotuloEtiqueta from './RotuloEtiqueta';
import RotuloEnvio100x150 from './RotuloEnvio100x150';
import { altoTicketMm, COURIER_LABEL, FUERA_DE_PANTALLA, rotuloPageStyle, type RotuloFormato } from './rotuloFormato';
import RotuloTicket, { quienLleva, type DatosRotulo } from './RotuloTicket';


/**
 * Rótulo propio (no el PDF con la marca de Shalom): solo el bloque de
 * destinatario/destino que el negocio necesita pegar en el paquete, con el
 * mismo formato de impresión (ticket 80mm) que el resto de comprobantes.
 * Se monta oculto y se dispara sola apenas `comprobanteId` cambia a un valor.
 */
export default function RotuloPrint({
    comprobanteId,
    onDone,
    formato = 'TICKET',
    onImpreso,
}: {
    comprobanteId: number | null;
    onDone: () => void;
    /** Tras imprimir: el panel pregunta si pasarlo a Confirmado. */
    onImpreso?: (comprobanteId: number) => void;
    /** Ticket 80 mm (alto variable) o etiqueta adhesiva de 80×50 o 100×150 mm. */
    formato?: RotuloFormato;
}) {
    const [datos, setDatos] = useState<DatosRotulo | null>(null);
    // Se fija tras pintar y medir; la impresión sale con este alto ya aplicado.
    const [pagina, setPagina] = useState<{ altoTicket: number | null } | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    const { alert } = useAlertStore();
    const logo = useAuthStore((st) => (st.auth as any)?.empresa?.logo);

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: rotuloPageStyle(formato, pagina?.altoTicket),
        onAfterPrint: () => {
            if (comprobanteId && onImpreso) onImpreso(comprobanteId);
            onDone();
        },
    });

    useEffect(() => {
        if (!comprobanteId) { setDatos(null); return; }
        let vivo = true;
        (async () => {
            try {
                const res = await apiClient.get(`/shalom/rotulo/${comprobanteId}`);
                if (vivo) setDatos(res.data?.data ?? res.data);
            } catch (e) {
                if (vivo) {
                    alert(mensajeErrorShalom(e, 'No se pudo obtener los datos del rótulo'), 'error');
                    onDone();
                }
            }
        })();
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comprobanteId]);

    useEffect(() => {
        if (!datos) return;
        // Un tick para que el div ya tenga el contenido pintado antes de imprimir.
        const timer = window.setTimeout(() => setPagina({ altoTicket: altoTicketMm(componentRef.current) }), 50);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos]);

    useEffect(() => {
        if (!pagina) return;
        printFn();
        setDatos(null);
        setPagina(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagina]);

    if (formato === 'ETIQUETA_100X150') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {datos && <RotuloEnvio100x150 d={datos} logo={logo} courier={quienLleva(datos)} />}
                </div>
            </div>
        );
    }

    if (formato === 'ETIQUETA_80X50') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {datos && <RotuloEtiqueta d={{ ...datos, referencia: datos.referencia, courier: quienLleva(datos) || (datos.transportista ? (COURIER_LABEL[datos.transportista] ?? datos.transportista) : undefined) }} />}
                </div>
            </div>
        );
    }

    return (
        <div aria-hidden style={FUERA_DE_PANTALLA}>
            <div ref={componentRef}>
                {datos && <RotuloTicket d={datos} />}
            </div>
        </div>
    );
}
