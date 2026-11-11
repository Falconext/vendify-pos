import type { ReactNode } from 'react';
import { code128B } from '@/utils/code128';
import { cantidadTexto, conFondo, documentoReal, fechaCorta, lineas, logoSrc, soles } from './RotuloEnvio100x150';
import type { DatosRotulo } from './RotuloTicket';

/**
 * El diseño del rótulo de 100×150 mm llevado a 80 mm de ancho (pedido de
 * HELOUSHOP, 05-11), para etiqueteras que no llegan a ese tamaño. Es un formato
 * aparte: quien ya imprime el ticket de siempre no ve ningún cambio. El alto
 * sigue al contenido, así que aquí nada se corta salvo la lista de productos.
 */

const MAX_PRODUCTOS = 5;

const tamanoNombre = (n: string) => (n.length > 44 ? '3.8mm' : n.length > 26 ? '4.5mm' : '5.6mm');
const tamanoDestino = (t: string) => (t.length > 70 ? '3.2mm' : t.length > 36 ? '3.8mm' : '4.8mm');

function Titulo({ children }: { children: ReactNode }) {
    return <div style={{ fontSize: '2.2mm', fontWeight: 800, letterSpacing: '0.25mm', textTransform: 'uppercase' }}>{children}</div>;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div style={{ flex: 1, minWidth: 0, border: '0.3mm solid #000', borderRadius: '1mm', padding: '0.6mm 1.6mm' }}>
            <div style={{ fontSize: '2.1mm', fontWeight: 700, letterSpacing: '0.2mm', textTransform: 'uppercase' }}>{etiqueta}</div>
            <div style={{ fontSize: '4mm', fontWeight: 800, lineHeight: 1.12, overflowWrap: 'anywhere' }}>{valor}</div>
        </div>
    );
}

function Barras({ texto }: { texto: string }) {
    const anchos = code128B(texto);
    if (!anchos) return null;
    const total = anchos.reduce((a, b) => a + b, 0);
    let x = 0;
    return (
        <svg viewBox={`0 0 ${total} 30`} preserveAspectRatio="none" shapeRendering="crispEdges" style={{ display: 'block', width: '38mm', height: '8mm', flexShrink: 0 }} aria-label={`Código ${texto}`}>
            {anchos.map((w, i) => {
                const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={30} fill="#000" /> : null;
                x += w;
                return r;
            })}
        </svg>
    );
}

export default function RotuloTicketEnvio({ d, courier, logo, saltoDePagina }: {
    d: DatosRotulo;
    courier?: string;
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
            data-testid="rotulo-ticket-envio"
            style={{
                width: '80mm',
                padding: '2.5mm 3mm',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5mm',
                fontFamily: "'Inter', Arial, Helvetica, sans-serif",
                color: '#000',
                background: '#fff',
                lineHeight: 1.18,
                pageBreakAfter: saltoDePagina ? 'always' : 'auto',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm', paddingBottom: '1.5mm', borderBottom: '0.5mm solid #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.6mm', minWidth: 0 }}>
                    {src && <img src={src} alt="" data-testid="rotulo-ticket-envio-logo" style={{ maxHeight: '9mm', maxWidth: '14mm', objectFit: 'contain', filter: 'grayscale(1) contrast(1.4)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                        <Titulo>Remitente</Titulo>
                        <div data-testid="rotulo-ticket-envio-empresa" style={{ fontSize: '3mm', fontWeight: 800, lineHeight: 1.12, ...lineas(2) }}>{d.empresaNombre || ''}</div>
                    </div>
                </div>
                {courier && (
                    <div data-testid="rotulo-ticket-envio-courier" style={{ ...conFondo, background: '#000', color: '#fff', borderRadius: '1mm', padding: '1mm 2mm', fontSize: '3mm', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', maxWidth: '30mm', flexShrink: 0 }}>
                        {courier}
                    </div>
                )}
            </div>

            <div>
                <Titulo>Entregar a</Titulo>
                <div data-testid="rotulo-ticket-envio-nombre" style={{ fontSize: tamanoNombre(nombre), fontWeight: 800, lineHeight: 1.08, marginTop: '0.3mm', overflowWrap: 'anywhere' }}>{nombre}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4mm', marginTop: '0.6mm', fontSize: '3.4mm', fontWeight: 700 }}>
                    {dni && <span>DNI {dni}</span>}
                    {d.celular && <span>CEL {d.celular}</span>}
                </div>
            </div>

            <div style={{ border: '0.5mm solid #000', borderRadius: '1.5mm', padding: '1.4mm 2mm' }}>
                <Titulo>{enAgencia ? 'Agencia de destino' : 'Dirección de entrega'}</Titulo>
                <div data-testid="rotulo-ticket-envio-destino" style={{ fontSize: tamanoDestino(lugar), fontWeight: 800, lineHeight: 1.1, marginTop: '0.3mm', overflowWrap: 'anywhere' }}>{lugar}</div>
                {enAgencia
                    ? d.ubicacion && <div style={{ fontSize: '2.8mm', fontWeight: 700, marginTop: '0.4mm' }}>{d.ubicacion}</div>
                    : d.distrito && <div style={{ fontSize: '3.4mm', fontWeight: 800, marginTop: '0.4mm', textTransform: 'uppercase' }}>{d.distrito}</div>}

                {enAgencia && (d.nroOrden || d.claveEnvio) && (
                    <div style={{ display: 'flex', gap: '1.5mm', marginTop: '1.2mm' }} data-testid="rotulo-ticket-envio-orden">
                        {d.nroOrden && <Dato etiqueta="N° de orden" valor={d.nroOrden} />}
                        {d.claveEnvio && <Dato etiqueta="Clave de retiro" valor={d.claveEnvio} />}
                    </div>
                )}

                {!enAgencia && d.porCobrar != null && (
                    d.porCobrar > 0 ? (
                        <div data-testid="rotulo-ticket-envio-cobrar" style={{ ...conFondo, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm', background: '#000', color: '#fff', borderRadius: '1mm', padding: '0.8mm 2mm', marginTop: '1.2mm' }}>
                            <span style={{ fontSize: '2.6mm', fontWeight: 800 }}>POR COBRAR</span>
                            <span style={{ fontSize: '5mm', fontWeight: 800, whiteSpace: 'nowrap' }}>{soles(d.porCobrar)}</span>
                        </div>
                    ) : (
                        <div data-testid="rotulo-ticket-envio-cobrar" style={{ border: '0.3mm solid #000', borderRadius: '1mm', padding: '0.7mm 2mm', marginTop: '1.2mm', fontSize: '3.2mm', fontWeight: 800, textAlign: 'center' }}>
                            PAGADO · NO COBRAR
                        </div>
                    )
                )}
            </div>

            {productos.length > 0 && (
                <div data-testid="rotulo-ticket-envio-productos">
                    <Titulo>Contenido · {productos.length} {productos.length === 1 ? 'producto' : 'productos'} · {cantidadTexto(unidades)} {unidades === 1 ? 'unidad' : 'unidades'}</Titulo>
                    {visibles.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1.5mm', fontSize: '2.6mm', lineHeight: 1.25, borderTop: i ? '0.15mm solid #000' : undefined, padding: '0.3mm 0' }}>
                            <span style={{ fontWeight: 800, minWidth: '5.5mm', flexShrink: 0 }}>{cantidadTexto(Number(p.cantidad) || 0)} x</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descripcion}</span>
                        </div>
                    ))}
                    {ocultos > 0 && (
                        <div style={{ fontSize: '2.6mm', fontWeight: 800, borderTop: '0.15mm solid #000', padding: '0.3mm 0' }}>+ {ocultos} {ocultos === 1 ? 'producto más' : 'productos más'}</div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm', borderTop: '0.5mm solid #000', paddingTop: '1.4mm' }}>
                <span data-testid="rotulo-ticket-envio-referencia" style={{ fontSize: '3.2mm', fontWeight: 800, whiteSpace: 'nowrap' }}>{referencia}</span>
                {referencia && <Barras texto={referencia} />}
                {fecha && <span style={{ fontSize: '2.4mm', fontWeight: 600, whiteSpace: 'nowrap' }}>{fecha}</span>}
            </div>
        </div>
    );
}
