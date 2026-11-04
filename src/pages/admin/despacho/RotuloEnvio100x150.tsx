import type { CSSProperties, ReactNode } from 'react';
import { code128B } from '@/utils/code128';
import type { DatosRotulo } from './RotuloTicket';

/**
 * Rótulo de envío de 100×150 mm, el tamaño estándar de las impresoras de
 * etiquetas para courier. Pensado para térmica: solo negro puro (el gris sale
 * punteado) y lo que importa en el reparto se lee de lejos. De arriba abajo:
 * quién manda y quién lleva, a quién va, a dónde, qué se cobra o qué clave se
 * pide, el contenido para alistar y el código de la nota.
 *
 * Alto fijo: lo que varía (nombres largos, muchos productos) se achica o se
 * resume, para que nunca salte a una segunda etiqueta.
 */

/** Filas de contenido que entran sin apretar el pie. */
const MAX_PRODUCTOS = 6;
/** 3 puntos a 203 dpi: el ancho de barra que una pistola lee sin problema. */
const MM_POR_MODULO = 0.375;
const ANCHO_MAX_BARRAS_MM = 90;

/** Las barras negras del rótulo se perderían al imprimir sin esto. */
const conFondo: CSSProperties = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

const tamanoNombre = (n: string) => (n.length > 44 ? '4.8mm' : n.length > 26 ? '5.8mm' : '7.4mm');
const tamanoDestino = (t: string) => (t.length > 140 ? '3.1mm' : t.length > 70 ? '3.8mm' : t.length > 36 ? '4.6mm' : '5.8mm');

/** Corta por línea entera: en un rótulo, media línea de dirección no se lee. */
const lineas = (n: number): CSSProperties => ({
    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: n, overflow: 'hidden', overflowWrap: 'anywhere',
});

/** "Clientes varios" lleva un documento de relleno: en el paquete no dice nada. */
const documentoReal = (doc?: string | null) => {
    const t = String(doc ?? '').trim();
    return t && !/^(0+|10{7})$/.test(t) ? t : '';
};

const fechaCorta = (iso?: string | null) => {
    if (!iso) return '';
    const f = new Date(iso);
    return isNaN(f.getTime()) ? '' : f.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cantidadTexto = (n: number) => String(Number(n.toFixed(3)));

/** El logo de la empresa viene como URL o base64 (ver comprobanteImprimir). */
export const logoSrc = (logo?: string | null) => {
    const t = String(logo ?? '').trim();
    if (!t) return undefined;
    if (t.startsWith('data:') || /^https?:\/\//i.test(t) || t.startsWith('/')) return t;
    return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
};

function Titulo({ children }: { children: ReactNode }) {
    return <div style={{ fontSize: '2.6mm', fontWeight: 800, letterSpacing: '0.35mm', textTransform: 'uppercase' }}>{children}</div>;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div style={{ flex: 1, minWidth: 0, border: '0.4mm solid #000', borderRadius: '1.2mm', padding: '1mm 2mm' }}>
            <div style={{ fontSize: '2.4mm', fontWeight: 700, letterSpacing: '0.25mm', textTransform: 'uppercase' }}>{etiqueta}</div>
            <div style={{ fontSize: '5mm', fontWeight: 800, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{valor}</div>
        </div>
    );
}

function Barras({ texto }: { texto: string }) {
    const anchos = code128B(texto);
    if (!anchos) return null;
    const total = anchos.reduce((a, b) => a + b, 0);
    let x = 0;
    return (
        <svg
            viewBox={`0 0 ${total} 30`}
            preserveAspectRatio="none"
            shapeRendering="crispEdges"
            style={{ display: 'block', margin: '0 auto', width: `${Math.min(total * MM_POR_MODULO, ANCHO_MAX_BARRAS_MM)}mm`, height: '13mm' }}
            aria-label={`Código ${texto}`}
            data-testid="rotulo-100x150-barras"
        >
            {anchos.map((w, i) => {
                const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={30} fill="#000" /> : null;
                x += w;
                return r;
            })}
        </svg>
    );
}

export default function RotuloEnvio100x150({ d, courier, logo, saltoDePagina }: {
    d: DatosRotulo;
    /** Quién lleva el paquete: repartidor o courier. */
    courier?: string;
    /** Logo de la empresa (URL o base64). */
    logo?: string | null;
    saltoDePagina?: boolean;
}) {
    const nombre = d.nombreDestinatario || '-';
    const enAgencia = d.destino === 'AGENCIA';
    const lugar = enAgencia ? (d.agenciaNombre || d.direccion || '-') : (d.direccion || d.agenciaNombre || '-');
    const productos = d.productos ?? [];
    const visibles = productos.length > MAX_PRODUCTOS ? productos.slice(0, MAX_PRODUCTOS - 1) : productos;
    const ocultos = productos.length - visibles.length;
    const unidades = productos.reduce((a, p) => a + (Number(p.cantidad) || 0), 0);
    const referencia = d.referencia ? d.referencia.replace(/-0+(\d)/, '-$1') : '';
    const fecha = fechaCorta(d.fecha);
    const src = logoSrc(logo);
    const dni = documentoReal(d.dniDestinatario);

    return (
        <div
            data-testid="rotulo-100x150"
            style={{
                width: '100mm',
                height: '150mm',
                padding: '4mm',
                boxSizing: 'border-box',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '2.4mm',
                fontFamily: "'Inter', Arial, Helvetica, sans-serif",
                color: '#000',
                background: '#fff',
                lineHeight: 1.2,
                pageBreakAfter: saltoDePagina ? 'always' : 'auto',
            }}
        >
            {/* Quién manda / quién lleva */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3mm', paddingBottom: '2.4mm', borderBottom: '0.7mm solid #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.4mm', minWidth: 0 }}>
                    {src && <img src={src} alt="" style={{ maxHeight: '12mm', maxWidth: '22mm', objectFit: 'contain', filter: 'grayscale(1) contrast(1.4)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                        <Titulo>Remitente</Titulo>
                        <div data-testid="rotulo-100x150-empresa" style={{ fontSize: '3.8mm', fontWeight: 800, lineHeight: 1.15, ...lineas(2) }}>{d.empresaNombre || ''}</div>
                    </div>
                </div>
                {courier && (
                    <div data-testid="rotulo-100x150-courier" style={{ ...conFondo, background: '#000', color: '#fff', borderRadius: '1.2mm', padding: '1.6mm 3mm', fontSize: '3.8mm', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', maxWidth: '40mm', flexShrink: 0 }}>
                        {courier}
                    </div>
                )}
            </div>

            {/* A quién va */}
            <div>
                <Titulo>Entregar a</Titulo>
                <div data-testid="rotulo-100x150-nombre" style={{ fontSize: tamanoNombre(nombre), fontWeight: 800, lineHeight: 1.1, marginTop: '0.6mm', ...lineas(3) }}>{nombre}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 5mm', marginTop: '1mm', fontSize: '4.2mm', fontWeight: 700 }}>
                    {dni && <span>DNI {dni}</span>}
                    {d.celular && <span>CEL {d.celular}</span>}
                </div>
            </div>

            {/* A dónde */}
            <div style={{ border: '0.7mm solid #000', borderRadius: '2mm', padding: '2.4mm 3mm' }}>
                <Titulo>{enAgencia ? 'Agencia de destino' : 'Dirección de entrega'}</Titulo>
                <div data-testid="rotulo-100x150-destino" style={{ fontSize: tamanoDestino(lugar), fontWeight: 800, lineHeight: 1.12, marginTop: '0.6mm', ...lineas(7) }}>{lugar}</div>
                {enAgencia
                    ? d.ubicacion && <div style={{ fontSize: '3.4mm', fontWeight: 700, marginTop: '0.8mm' }}>{d.ubicacion}</div>
                    : d.distrito && <div style={{ fontSize: '4.2mm', fontWeight: 800, marginTop: '0.8mm', textTransform: 'uppercase' }}>{d.distrito}</div>}

                {enAgencia && (d.nroOrden || d.claveEnvio) && (
                    <div style={{ display: 'flex', gap: '2mm', marginTop: '2mm' }} data-testid="rotulo-100x150-orden">
                        {d.nroOrden && <Dato etiqueta="N° de orden" valor={d.nroOrden} />}
                        {d.claveEnvio && <Dato etiqueta="Clave de retiro" valor={d.claveEnvio} />}
                    </div>
                )}

                {!enAgencia && d.porCobrar != null && (
                    d.porCobrar > 0 ? (
                        <div data-testid="rotulo-100x150-cobrar" style={{ ...conFondo, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm', background: '#000', color: '#fff', borderRadius: '1.2mm', padding: '1.4mm 3mm', marginTop: '2mm' }}>
                            <span style={{ fontSize: '3.2mm', fontWeight: 800, letterSpacing: '0.25mm' }}>POR COBRAR</span>
                            <span style={{ fontSize: '6.4mm', fontWeight: 800, whiteSpace: 'nowrap' }}>{soles(d.porCobrar)}</span>
                        </div>
                    ) : (
                        <div data-testid="rotulo-100x150-cobrar" style={{ border: '0.4mm solid #000', borderRadius: '1.2mm', padding: '1.2mm 3mm', marginTop: '2mm', fontSize: '4mm', fontWeight: 800, textAlign: 'center', letterSpacing: '0.3mm' }}>
                            PAGADO · NO COBRAR
                        </div>
                    )
                )}
            </div>

            {/* Qué lleva */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} data-testid="rotulo-100x150-productos">
                {productos.length > 0 && (
                    <>
                        <Titulo>Contenido · {productos.length} {productos.length === 1 ? 'producto' : 'productos'} · {cantidadTexto(unidades)} {unidades === 1 ? 'unidad' : 'unidades'}</Titulo>
                        <div style={{ marginTop: '0.8mm' }}>
                            {visibles.map((p, i) => (
                                <div key={i} style={{ display: 'flex', gap: '2mm', fontSize: '3.1mm', lineHeight: 1.3, borderTop: i ? '0.2mm solid #000' : undefined, padding: '0.5mm 0' }}>
                                    <span style={{ fontWeight: 800, minWidth: '7mm', flexShrink: 0 }}>{cantidadTexto(Number(p.cantidad) || 0)} x</span>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descripcion}</span>
                                </div>
                            ))}
                            {ocultos > 0 && (
                                <div style={{ fontSize: '3.1mm', fontWeight: 800, borderTop: '0.2mm solid #000', padding: '0.5mm 0' }}>+ {ocultos} {ocultos === 1 ? 'producto más' : 'productos más'}</div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* La nota, para escanearla */}
            <div style={{ borderTop: '0.7mm solid #000', paddingTop: '2.4mm' }}>
                {referencia && <Barras texto={referencia} />}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2mm', marginTop: '1mm' }}>
                    <span data-testid="rotulo-100x150-referencia" style={{ fontSize: '4.4mm', fontWeight: 800 }}>{referencia}</span>
                    {fecha && <span data-testid="rotulo-100x150-fecha" style={{ fontSize: '3.2mm', fontWeight: 600 }}>{fecha}</span>}
                </div>
            </div>
        </div>
    );
}
