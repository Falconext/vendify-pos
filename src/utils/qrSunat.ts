import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR de SUNAT al pie del comprobante impreso (ticket / A4 / A5).
 *
 * Nada que ver con el QR de pago Yape/Plin (`qrPagos` del formato). Se activa
 * por empresa desde Perfil → Configuración (`mostrarQrSunat`) y su contenido
 * replica exactamente el del backend (`backend/src/comprobante/qr-sunat.util.ts`)
 * para que el comprobante impreso desde el web y el PDF del servidor lleven el
 * mismo QR:
 *   1. La URL del PDF del comprobante, si ya existe → el cliente lo ve online.
 *   2. Si todavía no hay PDF, la cadena normativa de SUNAT.
 */

/** Tipos de comprobante electrónico que llevan QR de SUNAT. */
const TIPOS_CON_QR_SUNAT = new Set(['01', '03', '07', '08']);

export const tipoDocLlevaQrSunat = (tipoDoc?: string | null): boolean =>
    TIPOS_CON_QR_SUNAT.has(String(tipoDoc ?? '').trim());

const dosDecimales = (v: unknown) => (Number(v) || 0).toFixed(2);

/** `dd/mm/aaaa` de la fecha de emisión. */
const formatearFecha = (fecha: unknown): string => {
    if (!fecha) return '';
    // Una fecha pelada 'YYYY-MM-DD' se reordena a mano: `new Date('2026-09-07')`
    // se interpreta en UTC y en Lima (UTC-5) retrocedería un día. Las fechas ISO
    // completas sí se convierten a hora local, igual que hace el backend.
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha).trim());
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const d = new Date(fecha as any);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Código SUNAT del documento del cliente (1 = DNI, 6 = RUC). El comprobante no
 * siempre trae el catálogo cargado, así que se deduce del número si hace falta.
 */
const codigoTipoDocCliente = (cliente: any): string => {
    const codigo = String(cliente?.tipoDocumento?.codigo ?? cliente?.tipoDocCodigo ?? '').trim();
    if (codigo) return codigo;
    const nro = String(cliente?.nroDoc ?? '').replace(/\D/g, '');
    if (nro.length === 11) return '6';
    if (nro.length === 8) return '1';
    return '0';
};

export interface DatosQrSunat {
    tipoDoc?: string | null;
    serie?: string | null;
    correlativo?: string | number | null;
    mtoIGV?: number | string | null;
    mtoImpVenta?: number | string | null;
    fechaEmision?: string | Date | null;
    s3PdfUrl?: string | null;
}

/**
 * Cadena normativa del QR de SUNAT:
 * `RUC|tipoDoc|serie|correlativo|IGV|total|fecha|tipoDocCliente|nroDocCliente|`
 */
export const construirCadenaQrSunat = (
    comp: DatosQrSunat,
    empresa: any,
    cliente: any,
): string =>
    [
        String(empresa?.ruc ?? empresa?.nroDoc ?? ''),
        String(comp?.tipoDoc ?? ''),
        String(comp?.serie ?? ''),
        String(comp?.correlativo ?? ''),
        dosDecimales(comp?.mtoIGV),
        dosDecimales(comp?.mtoImpVenta),
        formatearFecha(comp?.fechaEmision),
        codigoTipoDocCliente(cliente),
        String(cliente?.nroDoc ?? ''),
    ].join('|') + '|';

/** Contenido a codificar, o `null` si el documento no lleva QR de SUNAT. */
export const resolverContenidoQrSunat = (
    comp: DatosQrSunat,
    empresa: any,
    cliente: any,
): string | null => {
    if (!tipoDocLlevaQrSunat(comp?.tipoDoc)) return null;
    const pdfUrl = String(comp?.s3PdfUrl ?? '').trim();
    if (pdfUrl) return pdfUrl;
    return construirCadenaQrSunat(comp, empresa, cliente);
};

/**
 * Data URL del QR listo para imprimir, o `''` cuando la empresa no lo activó,
 * el documento no lo lleva o la generación falla. Nunca rompe la impresión.
 */
export const useQrSunat = (
    comp: DatosQrSunat | null | undefined,
    empresa: any,
    cliente: any,
): string => {
    const activo = empresa?.mostrarQrSunat === true;
    const contenido = activo && comp ? resolverContenidoQrSunat(comp, empresa, cliente) : null;
    const [dataUrl, setDataUrl] = useState('');

    useEffect(() => {
        let vivo = true;
        if (!contenido) { setDataUrl(''); return; }
        QRCode.toDataURL(contenido, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
            .then((url) => { if (vivo) setDataUrl(url); })
            .catch(() => { if (vivo) setDataUrl(''); });
        return () => { vivo = false; };
    }, [contenido]);

    return dataUrl;
};
