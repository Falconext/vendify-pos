import type { ReactNode } from 'react';
import {
    cantidadTxt,
    consolidarPicking,
    destinoTxt,
    tonoCourier,
    unidadesDe,
    type DetalleOperaciones,
    type DocumentoLogistico,
    type OperacionEnvio,
} from './operacionesLogisticas';

/**
 * Picking y packing en A4. Se ven igual en pantalla (vista previa, con las
 * casillas marcables en una tablet) y en papel: colores en hex con
 * print-color-adjust para que la impresora no los borre.
 */

const TINTA = '#0F172A';
const SUAVE = '#64748B';
const LINEA = '#E2E8F0';

interface Comun {
    detalle: DetalleOperaciones;
    codigo: string;
    generado: Date;
    titulo: string;
    marcados: Set<string>;
    onMarcar?: (clave: string) => void;
}

function Casilla({ marcada, onClick }: { marcada: boolean; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={marcada}
            style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: `1.6px solid ${marcada ? '#10B981' : '#94A3B8'}`,
                background: marcada ? '#10B981' : '#fff',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 900,
                lineHeight: 1,
                cursor: onClick ? 'pointer' : 'default',
                flexShrink: 0,
            }}
        >
            {marcada ? '✓' : ''}
        </button>
    );
}

function Miniatura({ src, texto, size = 40 }: { src: string | null; texto: string; size?: number }) {
    const iniciales = texto
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
    return src ? (
        <img
            src={src}
            alt=""
            style={{ width: size, height: size, objectFit: 'cover', borderRadius: 10, border: `1px solid ${LINEA}`, flexShrink: 0 }}
        />
    ) : (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: 10,
                background: 'linear-gradient(135deg,#EDE9FE,#E0F2FE)',
                color: '#5B21B6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.32,
                fontWeight: 800,
                flexShrink: 0,
            }}
        >
            {iniciales || '•'}
        </div>
    );
}

function Pill({ children, bg, color }: { children: ReactNode; bg: string; color: string }) {
    return (
        <span
            style={{
                background: bg,
                color,
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 999,
                letterSpacing: 0.2,
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
}

function CourierPill({ courier }: { courier: string }) {
    const t = tonoCourier(courier);
    return (
        <span
            style={{
                background: t.bg,
                color: t.text,
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 9px 3px 7px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot }} />
            {courier}
        </span>
    );
}

function Encabezado({ detalle, codigo, generado, titulo, acento, subtitulo }: Omit<Comun, 'marcados' | 'onMarcar'> & { acento: string; subtitulo: string }) {
    const fecha = generado.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    const hora = generado.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {detalle.empresa.logo ? (
                    <img src={detalle.empresa.logo} alt="" style={{ height: 44, maxWidth: 120, objectFit: 'contain' }} />
                ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: acento, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>
                        {detalle.empresa.nombre.slice(0, 1)}
                    </div>
                )}
                <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TINTA }}>{detalle.empresa.nombre}</div>
                    <div style={{ fontSize: 11, color: SUAVE }}>{subtitulo}</div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-block', background: acento, color: '#fff', fontWeight: 900, letterSpacing: 2, fontSize: 13, padding: '5px 12px', borderRadius: 8 }}>
                    {titulo}
                </div>
                <div style={{ fontSize: 11, color: SUAVE, marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{codigo}</div>
                <div style={{ fontSize: 11, color: SUAVE }}>
                    {fecha} · {hora}
                </div>
            </div>
        </div>
    );
}

function Resumen({ datos, acento }: { datos: { valor: string | number; label: string }[]; acento: string }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${datos.length}, 1fr)`, gap: 10, marginBottom: 18 }}>
            {datos.map((d) => (
                <div key={d.label} style={{ border: `1px solid ${LINEA}`, borderRadius: 12, padding: '10px 12px', background: '#F8FAFC' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: acento, lineHeight: 1.1 }}>{d.valor}</div>
                    <div style={{ fontSize: 10, color: SUAVE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>{d.label}</div>
                </div>
            ))}
        </div>
    );
}

function Firmas({ etiquetas }: { etiquetas: string[] }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${etiquetas.length}, 1fr)`, gap: 24, marginTop: 28, breakInside: 'avoid' }}>
            {etiquetas.map((e) => (
                <div key={e}>
                    <div style={{ borderTop: `1.2px solid ${TINTA}`, height: 1, marginTop: 26 }} />
                    <div style={{ fontSize: 10, color: SUAVE, marginTop: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{e}</div>
                </div>
            ))}
        </div>
    );
}

const papel: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    padding: '14mm 13mm',
    background: '#fff',
    color: TINTA,
    fontFamily: 'Inter, "Plus Jakarta Sans", system-ui, sans-serif',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    boxSizing: 'border-box',
};

/** Picking: cada producto una vez, cuánto sacar y para qué pedido. */
export function PickingDocumento(props: Comun) {
    const { detalle, marcados, onMarcar } = props;
    const productos = consolidarPicking(detalle.envios);
    const acento = '#7C3AED';
    return (
        <div style={papel}>
            <Encabezado {...props} acento={acento} subtitulo="Recolección de productos en almacén" />
            <Resumen
                acento={acento}
                datos={[
                    { valor: detalle.envios.length, label: 'Pedidos' },
                    { valor: productos.length, label: 'Productos' },
                    { valor: cantidadTxt(unidadesDe(detalle.envios)), label: 'Unidades a sacar' },
                    { valor: `${productos.filter((p) => marcados.has(`P:${p.clave}`)).length}/${productos.length}`, label: 'Recogidos' },
                ]}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {productos.map((p) => {
                    const clave = `P:${p.clave}`;
                    const listo = marcados.has(clave);
                    return (
                        <div
                            key={p.clave}
                            style={{ border: `1px solid ${listo ? '#A7F3D0' : LINEA}`, borderRadius: 14, overflow: 'hidden', breakInside: 'avoid', background: listo ? '#F0FDF4' : '#fff' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                                <Casilla marcada={listo} onClick={onMarcar ? () => onMarcar(clave) : undefined} />
                                <Miniatura src={p.imagenUrl} texto={p.descripcion} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, textDecoration: listo ? 'line-through' : 'none' }}>{p.descripcion}</div>
                                    <div style={{ fontSize: 10.5, color: SUAVE, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                                        {p.codigo ? `SKU ${p.codigo}` : 'Sin código'} · {p.lineas.length} pedido{p.lineas.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', background: acento, color: '#fff', borderRadius: 12, padding: '6px 12px', minWidth: 54 }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{cantidadTxt(p.total)}</div>
                                    <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.8, opacity: 0.85 }}>SACAR</div>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                <tbody>
                                    {p.lineas.map((l) => {
                                        const cl = `L:${p.clave}:${l.referencia}`;
                                        const ok = marcados.has(cl);
                                        return (
                                            <tr key={l.referencia} style={{ borderTop: `1px solid ${LINEA}` }}>
                                                <td style={{ padding: '6px 12px', width: 26 }}>
                                                    <Casilla marcada={ok} onClick={onMarcar ? () => onMarcar(cl) : undefined} />
                                                </td>
                                                <td style={{ padding: '6px 4px', fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', width: 120 }}>{l.referencia}</td>
                                                <td style={{ padding: '6px 4px', color: '#334155' }}>{l.cliente || '—'}</td>
                                                <td style={{ padding: '6px 4px', width: 110 }}>
                                                    <CourierPill courier={l.courier} />
                                                </td>
                                                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 900, width: 50 }}>× {cantidadTxt(l.cantidad)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
            <Firmas etiquetas={['Preparado por', 'Verificado por', 'Hora de cierre']} />
        </div>
    );
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: SUAVE, textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TINTA, marginTop: 1, wordBreak: 'break-word' }}>{children}</div>
        </div>
    );
}

function TarjetaPacking({ e, indice, total, marcados, onMarcar }: { e: OperacionEnvio; indice: number; total: number; marcados: Set<string>; onMarcar?: (c: string) => void }) {
    const t = tonoCourier(e.courierLabel);
    const listo = marcados.has(`E:${e.referencia}`);
    const cobra = e.montoCobrar > 0;
    return (
        <div style={{ border: `1px solid ${listo ? '#A7F3D0' : LINEA}`, borderRadius: 16, overflow: 'hidden', breakInside: 'avoid', marginBottom: 12, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: t.bg, borderBottom: `1px solid ${LINEA}` }}>
                <Casilla marcada={listo} onClick={onMarcar ? () => onMarcar(`E:${e.referencia}`) : undefined} />
                <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'ui-monospace, Menlo, monospace', color: TINTA }}>{e.referencia}</div>
                <CourierPill courier={e.courierLabel} />
                {e.nroPaquetes > 1 && <Pill bg="#E0E7FF" color="#3730A3">{e.nroPaquetes} bultos</Pill>}
                {e.revisarProducto && <Pill bg="#FEF3C7" color="#92400E">Revisa antes de pagar</Pill>}
                <div style={{ marginLeft: 'auto', fontSize: 10, color: SUAVE, fontWeight: 800 }}>
                    {indice} / {total}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 0.9fr', gap: 14, padding: '12px 14px' }}>
                <div style={{ display: 'grid', gap: 7 }}>
                    <Dato label="Recibe">{e.nombre || '—'}</Dato>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <Dato label="DNI">{e.dni || '—'}</Dato>
                        <Dato label="Celular">{e.telefono || '—'}</Dato>
                    </div>
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                    <Dato label={e.agencia ? 'Agencia destino' : 'Entrega en'}>{destinoTxt(e)}</Dato>
                    {(e.turno || e.repartidor) && (
                        <Dato label="Ruta">{[e.repartidor, e.turno].filter(Boolean).join(' · ')}</Dato>
                    )}
                </div>
                <div
                    style={{
                        borderRadius: 12,
                        padding: '8px 10px',
                        textAlign: 'center',
                        background: cobra ? '#FFFBEB' : '#ECFDF5',
                        border: `1px solid ${cobra ? '#FDE68A' : '#A7F3D0'}`,
                        alignSelf: 'start',
                    }}
                >
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.8, color: cobra ? '#92400E' : '#047857' }}>{cobra ? 'COBRAR' : 'PAGADO'}</div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: cobra ? '#B45309' : '#059669' }}>
                        {cobra ? `S/ ${e.montoCobrar.toFixed(2)}` : '✓'}
                    </div>
                    {cobra && e.formaPago && <div style={{ fontSize: 9.5, color: '#92400E', fontWeight: 700 }}>{e.formaPago}</div>}
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <tbody>
                    {e.items.map((it, i) => {
                        const cl = `I:${e.referencia}:${i}`;
                        const ok = marcados.has(cl);
                        return (
                            <tr key={cl} style={{ borderTop: `1px solid ${LINEA}` }}>
                                <td style={{ padding: '6px 14px', width: 26 }}>
                                    <Casilla marcada={ok} onClick={onMarcar ? () => onMarcar(cl) : undefined} />
                                </td>
                                <td style={{ padding: '6px 4px', width: 36 }}>
                                    <Miniatura src={it.imagenUrl} texto={it.descripcion} size={28} />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                    <div style={{ fontWeight: 700, textDecoration: ok ? 'line-through' : 'none' }}>{it.descripcion}</div>
                                    {it.codigo && <div style={{ fontSize: 9.5, color: SUAVE, fontFamily: 'ui-monospace, Menlo, monospace' }}>SKU {it.codigo}</div>}
                                </td>
                                <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 900, fontSize: 13, width: 60 }}>× {cantidadTxt(it.cantidad)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px', borderTop: `1px dashed ${LINEA}`, background: '#F8FAFC', fontSize: 10.5 }}>
                <span style={{ color: SUAVE, fontWeight: 700 }}>
                    Empaquetó: <span style={{ color: TINTA }}>{e.empaquetador || '________________'}</span>
                </span>
                {e.observaciones && (
                    <span style={{ color: '#7C2D12', fontWeight: 700 }}>
                        📝 {e.observaciones}
                    </span>
                )}
                {e.faltan.length > 0 && (
                    <span style={{ marginLeft: 'auto' }}>
                        <Pill bg="#FEE2E2" color="#B91C1C">Falta: {e.faltan.join(', ')}</Pill>
                    </span>
                )}
            </div>
        </div>
    );
}

/** Packing: una tarjeta por pedido, con a quién va, cómo y qué lleva. */
export function PackingDocumento(props: Comun) {
    const { detalle, marcados, onMarcar } = props;
    const acento = '#0284C7';
    const cobrar = detalle.envios.reduce((s, e) => s + e.montoCobrar, 0);
    return (
        <div style={papel}>
            <Encabezado {...props} acento={acento} subtitulo="Armado de paquetes por pedido" />
            <Resumen
                acento={acento}
                datos={[
                    { valor: detalle.envios.length, label: 'Paquetes' },
                    { valor: cantidadTxt(unidadesDe(detalle.envios)), label: 'Unidades' },
                    { valor: `S/ ${cobrar.toFixed(2)}`, label: 'Por cobrar' },
                    { valor: `${detalle.envios.filter((e) => marcados.has(`E:${e.referencia}`)).length}/${detalle.envios.length}`, label: 'Cerrados' },
                ]}
            />
            {detalle.envios.map((e, i) => (
                <TarjetaPacking key={e.comprobanteId} e={e} indice={i + 1} total={detalle.envios.length} marcados={marcados} onMarcar={onMarcar} />
            ))}
            <Firmas etiquetas={['Empaquetado por', 'Entregado al courier', 'Hora de salida']} />
        </div>
    );
}

export function DocumentoLogisticoVista(props: Comun & { tipo: DocumentoLogistico }) {
    return props.tipo === 'PICKING' ? <PickingDocumento {...props} /> : <PackingDocumento {...props} />;
}
