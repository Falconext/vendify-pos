/**
 * Operaciones logísticas del Panel de Ventas: qué envíos entran en el picking,
 * el packing y las plantillas de courier, y cómo se arma cada documento.
 * Puro y sin React para poder probarlo.
 */
import type { VentaPanelItem } from './usePanelVentasViewModel';

export interface OperacionItem {
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    imagenUrl: string | null;
}

export interface OperacionEnvio {
    comprobanteId: number;
    referencia: string;
    fechaEmision: string;
    fechaEnvio: string;
    estado: string;
    courier: string;
    courierLabel: string;
    tipoEnvio: string;
    nombre: string;
    dni: string;
    telefono: string;
    agencia: string;
    distrito: string;
    direccion: string;
    coordenadas: string;
    montoCobrar: number;
    totalVenta: number;
    formaPago: string;
    tipoVenta: string;
    empaquetador: string;
    repartidor: string;
    observaciones: string;
    turno: string;
    nroPaquetes: number;
    tamano: string;
    revisarProducto: boolean;
    sede: string;
    faltan: string[];
    items: OperacionItem[];
}

export interface DetalleOperaciones {
    empresa: { nombre: string; logo: string | null };
    envios: OperacionEnvio[];
}

export type FormatoExport = 'SHALOM' | 'DINSIDES' | 'EVA' | 'GENERAL';
export type DocumentoLogistico = 'PICKING' | 'PACKING';
export type AlcanceOperaciones = 'POR_PREPARAR' | 'TODOS';

const EN_TRANSITO = new Set(['EN_CAMINO', 'EN_DESTINO']);

/**
 * Una fila del panel que es un envío propio: tiene despacho, no es una nota
 * convertida (su envío vive en el comprobante nuevo) ni va dentro del paquete
 * de otra nota, y no volvió.
 */
export function esEnvioOperable(i: VentaPanelItem): boolean {
    return (
        !!i.comprobanteId &&
        i.estadoDespacho !== 'NO_APLICA' &&
        i.estadoDespacho !== 'DEVUELTO' &&
        !i.esConvertida &&
        !i.despachoEnComprobanteId
    );
}

export function enviosDelAlcance(items: VentaPanelItem[], alcance: AlcanceOperaciones): VentaPanelItem[] {
    const envios = items.filter(esEnvioOperable);
    return alcance === 'POR_PREPARAR' ? envios.filter((i) => i.estadoDespacho === 'PREPARANDO' || i.estadoDespacho === 'CONFIRMADO') : envios;
}

export function kpisOperaciones(items: VentaPanelItem[]) {
    const envios = items.filter(esEnvioOperable);
    return {
        envios: envios.length,
        porPreparar: envios.filter((i) => i.estadoDespacho === 'PREPARANDO' || i.estadoDespacho === 'CONFIRMADO').length,
        enTransito: envios.filter((i) => EN_TRANSITO.has(i.estadoDespacho)).length,
        entregados: envios.filter((i) => i.estadoDespacho === 'ENTREGADO').length,
        porCobrar: envios
            .filter((i) => i.estadoDespacho !== 'ENTREGADO')
            .reduce((s, i) => s + Math.max(0, Number(i.saldo ?? 0)), 0),
    };
}

export interface LineaPicking {
    referencia: string;
    cliente: string;
    courier: string;
    cantidad: number;
}

export interface ProductoPicking {
    clave: string;
    codigo: string;
    descripcion: string;
    imagenUrl: string | null;
    total: number;
    lineas: LineaPicking[];
}

/** Lo que hay que sacar del almacén: cada producto una vez, con sus pedidos. */
export function consolidarPicking(envios: OperacionEnvio[]): ProductoPicking[] {
    const mapa = new Map<string, ProductoPicking>();
    for (const e of envios) {
        for (const it of e.items) {
            const clave = `${it.codigo}|${it.descripcion}`;
            const prod = mapa.get(clave) ?? {
                clave,
                codigo: it.codigo,
                descripcion: it.descripcion,
                imagenUrl: it.imagenUrl,
                total: 0,
                lineas: [],
            };
            prod.total += Number(it.cantidad || 0);
            const linea = prod.lineas.find((l) => l.referencia === e.referencia);
            if (linea) linea.cantidad += Number(it.cantidad || 0);
            else prod.lineas.push({ referencia: e.referencia, cliente: e.nombre, courier: e.courierLabel, cantidad: Number(it.cantidad || 0) });
            mapa.set(clave, prod);
        }
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total || a.descripcion.localeCompare(b.descripcion));
}

export const unidadesDe = (envios: OperacionEnvio[]) =>
    envios.reduce((s, e) => s + e.items.reduce((t, i) => t + Number(i.cantidad || 0), 0), 0);

/** Código del documento impreso: PK-291026-1342 (tipo, día, hora). */
export function codigoDocumento(tipo: DocumentoLogistico, ahora = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    const dia = `${p(ahora.getDate())}${p(ahora.getMonth() + 1)}${String(ahora.getFullYear()).slice(-2)}`;
    return `${tipo === 'PICKING' ? 'PK' : 'PA'}-${dia}-${p(ahora.getHours())}${p(ahora.getMinutes())}`;
}

export const cantidadTxt = (n: number) => (Number(n) % 1 === 0 ? String(Number(n)) : Number(n).toFixed(2));

/** Color de cada courier en los documentos (mismo en pantalla e impresión). */
export function tonoCourier(courier: string): { bg: string; text: string; dot: string } {
    const c = courier.toUpperCase();
    if (c.includes('SHALOM')) return { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' };
    if (c.includes('OLVA')) return { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' };
    if (c.includes('PROPIO')) return { bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' };
    return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' };
}

/** Lo que dice el destino en una línea: agencia, o distrito y dirección. */
export function destinoTxt(e: Pick<OperacionEnvio, 'agencia' | 'distrito' | 'direccion'>): string {
    if (e.agencia) return e.agencia;
    return [e.distrito, e.direccion].filter(Boolean).join(' · ') || 'Sin destino';
}

export const FORMATOS_EXPORT: { id: FormatoExport; titulo: string; detalle: string }[] = [
    { id: 'SHALOM', titulo: 'Shalom', detalle: 'Carga masiva de guías' },
    { id: 'DINSIDES', titulo: 'Dinsides', detalle: 'Plantilla del motorizado' },
    { id: 'EVA', titulo: 'Eva Courier', detalle: 'Formulario de pedidos' },
    { id: 'GENERAL', titulo: 'Excel general', detalle: 'Envíos, picking y resumen' },
];
