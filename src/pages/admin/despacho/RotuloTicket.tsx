import { code128B } from '@/utils/code128';
import { COURIER_LABEL } from './rotuloFormato';

/**
 * Lo que el backend devuelve para el rótulo (GET /shalom/rotulo/:id).
 */
export interface DatosRotulo {
    nroOrden: string | null;
    claveOrden: string | null;
    nombreDestinatario: string;
    dniDestinatario: string;
    ubicacion: string;
    agenciaNombre: string;
    direccion: string;
    claveEnvio?: string | null;
    celular?: string;
    transportista?: string | null;
    referencia?: string;
    empresaNombre?: string;
    repartidor?: string | null;
    /** LOCAL = reparto en Lima (dirección); AGENCIA = Shalom/Olva (agencia de destino). */
    destino?: 'LOCAL' | 'AGENCIA';
    distrito?: string;
    /** Solo en LOCAL: lo que el courier debe cobrar. null en agencia. */
    porCobrar?: number | null;
    productos?: { descripcion: string; cantidad: number }[];
    fecha?: string | null;
}

/** Quién lleva el paquete: el repartidor (INDRIVE…) o, si no hay, el courier. */
export const quienLleva = (d: Pick<DatosRotulo, 'repartidor' | 'transportista'>) =>
    d.repartidor?.trim() || (d.transportista ? (COURIER_LABEL[d.transportista] ?? d.transportista) : '');

/** ¿Tiene a dónde ir? Sin esto el rótulo no sirve y se omite del lote. */
export const tieneDestino = (d: DatosRotulo) =>
    Boolean(d.nroOrden || d.agenciaNombre || d.direccion || d.distrito || d.ubicacion);

const fechaCorta = (iso?: string | null) => {
    if (!iso) return '';
    const f = new Date(iso);
    return isNaN(f.getTime()) ? '' : f.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Barras({ texto }: { texto: string }) {
    const anchos = code128B(texto);
    if (!anchos) return null;
    const total = anchos.reduce((a, b) => a + b, 0);
    let x = 0;
    return (
        <svg viewBox={`0 0 ${total} 30`} preserveAspectRatio="none" style={{ width: '34mm', height: '8mm' }} aria-label={`Código ${texto}`} data-testid="rotulo-barras">
            {anchos.map((w, i) => {
                const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={30} fill="#000" /> : null;
                x += w;
                return r;
            })}
        </svg>
    );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
    return (
        <tr>
            <td style={{ whiteSpace: 'nowrap', paddingRight: '2mm', verticalAlign: 'top' }}>{etiqueta}</td>
            <td style={{ verticalAlign: 'top' }}>: {valor || 'N/A'}</td>
        </tr>
    );
}

/**
 * Rótulo de despacho en ticket de 80 mm: de quién es el
 * paquete y quién lo lleva arriba; a quién va; en Lima cuánto cobrar (el
 * courier lo exige) y en agencia el destino sin monto; el detalle para
 * alistar el pedido; y la nota, su código de barras y la fecha al pie.
 */
export default function RotuloTicket({ d, saltoDePagina }: { d: DatosRotulo; saltoDePagina?: boolean }) {
    const productos = d.productos ?? [];
    // Dos columnas cuando son varios: el rótulo no se vuelve una tira.
    const mitad = productos.length > 3 ? Math.ceil(productos.length / 2) : productos.length;
    const columnas = [productos.slice(0, mitad), productos.slice(mitad)].filter((c) => c.length);
    const enAgencia = d.destino === 'AGENCIA';
    const destino = [d.ubicacion, d.agenciaNombre].filter(Boolean).join(' / ') || d.direccion;
    return (
        <div
            data-testid="rotulo-ticket"
            style={{
                width: '80mm',
                padding: '3mm',
                boxSizing: 'border-box',
                fontFamily: "'Inter', Arial, sans-serif",
                fontSize: '2.9mm',
                color: '#000',
                lineHeight: 1.25,
                pageBreakAfter: saltoDePagina ? 'always' : 'auto',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm', fontWeight: 800, fontSize: '3.4mm' }}>
                <span data-testid="rotulo-empresa">{d.empresaNombre || ''}</span>
                <span data-testid="rotulo-quien-lleva" style={{ textAlign: 'right' }}>{quienLleva(d)}</span>
            </div>

            <table style={{ width: '100%', marginTop: '2mm', borderCollapse: 'collapse' }}>
                <tbody>
                    <Fila etiqueta="Recibe" valor={<strong>{d.nombreDestinatario}</strong>} />
                    <Fila etiqueta="DNI" valor={d.dniDestinatario} />
                    <Fila etiqueta="Celular" valor={d.celular} />
                    {enAgencia ? (
                        <>
                            <Fila etiqueta="Destino" valor={destino} />
                            {d.nroOrden && <Fila etiqueta="N° orden" valor={d.nroOrden} />}
                            {d.claveEnvio && <Fila etiqueta="Clave" valor={d.claveEnvio} />}
                        </>
                    ) : (
                        <>
                            <Fila etiqueta="Dirección" valor={d.direccion} />
                            <Fila etiqueta="Distrito" valor={d.distrito} />
                            {d.porCobrar != null && (
                                <tr data-testid="rotulo-por-cobrar">
                                    <td style={{ paddingRight: '2mm', fontWeight: 800, whiteSpace: 'nowrap' }}>Por cobrar</td>
                                    <td style={{ fontWeight: 800 }}>: {d.porCobrar > 0 ? soles(d.porCobrar) : 'Pagado'}</td>
                                </tr>
                            )}
                        </>
                    )}
                </tbody>
            </table>

            {productos.length > 0 && (
                <div style={{ display: 'flex', gap: '1.5mm', marginTop: '2mm' }} data-testid="rotulo-productos">
                    {columnas.map((col, ci) => (
                        <table key={ci} style={{ flex: 1, borderCollapse: 'collapse', fontSize: '2.5mm' }}>
                            <thead>
                                <tr style={{ background: '#d9d9d9' }}>
                                    <th style={{ textAlign: 'left', padding: '0.4mm 1mm', width: '4mm' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '0.4mm 1mm' }}>Producto</th>
                                    <th style={{ textAlign: 'right', padding: '0.4mm 1mm' }}>Cant.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {col.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '0.4mm 1mm', verticalAlign: 'top' }}>{ci * mitad + i + 1}</td>
                                        <td style={{ padding: '0.4mm 1mm', verticalAlign: 'top' }}>{p.descripcion}</td>
                                        <td style={{ padding: '0.4mm 1mm', textAlign: 'right', verticalAlign: 'top' }}>{p.cantidad}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2mm', marginTop: '3mm' }}>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{d.referencia ? d.referencia.replace(/-0+(\d)/, '-$1') : ''}</span>
                {d.referencia && <Barras texto={d.referencia.replace(/-0+(\d)/, '-$1')} />}
                <span data-testid="rotulo-fecha" style={{ whiteSpace: 'nowrap', fontSize: '2.5mm' }}>{fechaCorta(d.fecha) ? `Fecha: ${fechaCorta(d.fecha)}` : ''}</span>
            </div>
        </div>
    );
}
