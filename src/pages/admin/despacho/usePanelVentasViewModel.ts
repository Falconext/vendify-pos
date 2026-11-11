import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';
import type { MensajeEstadoPendiente } from './ModalMensajeEstado';
import { FECHA_INICIO_TODO, LIMITE_TODAS, periodoGuardado, rangoDePeriodo } from './filtrosDespacho';

const ETIQUETA_ESTADO: Record<string, string> = {
    PREPARANDO: 'Preparando',
    CONFIRMADO: 'Confirmado',
    EN_CAMINO: 'En camino',
    EN_AGENCIA: 'En agencia',
    EN_DESTINO: 'En destino',
    ENTREGADO: 'Entregado',
    DEVUELTO: 'Devuelto',
};

// Estados internos: no se le avisa al cliente, no se abre el mensaje.
const ESTADOS_SIN_AVISO = new Set(['PREPARANDO', 'CONFIRMADO']);

export type TipoVenta =
    | 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO'
    | 'TICKET' | 'NOTA_VENTA' | 'NOTA_PEDIDO' | 'RECIBO_HONORARIOS' | 'COMP_PAGO' | 'OTRO'
    | 'PEDIDO_TIENDA';

export type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL';
export type EstadoSunat = 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO' | 'NO_APLICA' | 'ANULADO';
export type EstadoDespacho = 'PREPARANDO' | 'CONFIRMADO' | 'EN_CAMINO' | 'EN_AGENCIA' | 'EN_DESTINO' | 'ENTREGADO' | 'DEVUELTO' | 'NO_APLICA';

export interface VentaPanelItem {
    id: number;
    tipo: TipoVenta;
    referencia: string;
    fecha: string;
    clienteDoc: string;
    clienteTelefono: string;
    clienteEmail: string;
    seriesGarantia: string[];
    cliente: string;
    total: number;
    estadoPago: EstadoPago;
    metodoPago: string;
    estadoSunat: EstadoSunat;
    estadoDespacho: EstadoDespacho;
    /** Va en el paquete de otra nota: su envío vive en esa nota (un solo despacho). */
    despachoEnComprobanteId?: number | null;
    envioAgrupadoEn?: string | null;
    repartidorId: number | null;
    repartidor: string;
    /** Color de la etiqueta del repartidor (#RRGGBB), si la empresa le puso uno. */
    repartidorColor?: string | null;
    tipoEnvio: string;
    agenciaDestino: string;
    /** Clave de retiro del courier: hay que dársela al cliente. */
    claveEnvio?: string | null;
    celularDest: string;
    nroPaquetes: number | null;
    turnoEnvio: string;
    vendedor: string;
    // Cobranza en campo: id del vendedor de campo atribuido (para preseleccionar al cobrar).
    vendedorCampoId?: number | null;
    // Cobros: a quién se dirigió el pago + comprobantes de pago subidos (registrar cobro).
    dirigidoA?: string;
    cobros?: { monto: number; medioPago: string; fecha: string | null; dirigidoA: string; comprobanteUrl: string | null }[];
    comprobantesPago?: string[];
    sede: string;
    comprobanteId: number | null;
    pedidoId: number | null;
    // Conversión informal → formal
    esConvertida: boolean;
    convertidaEn: string | null;
    origenReferencia: string | null;
    // Courier / Shalom
    courier: string;
    nroOrden: string;
    claveOrden: string;
    // Cobros inline
    saldo: number;
    estadoPagoRaw: string;
    formaPagoTipo: string;
    montoDetraccion: number;
    porcentajeDetraccion: number;
    cuotas: any;
    observaciones: string | null;
    // Productos vendidos
    productos: { nombre: string; cantidad: number; precioUnitario: number; unidad: string }[];
}

export type TabVentas = 'TODO' | 'VENTAS' | 'CON_DESPACHO' | 'POR_COBRAR';

const TIPOS_NO_VENTA = new Set(['NOTA_PEDIDO', 'COTIZACION', 'ORDEN_TRABAJO', 'OTRO']);

const tieneSaldoPendiente = (item: VentaPanelItem) => Number(item.saldo ?? 0) > 0.01;
const esDocumentoVisible = (item: VentaPanelItem) => item.tipo !== 'NOTA_CREDITO';
const esVentaFinal = (item: VentaPanelItem) => !item.esConvertida && !TIPOS_NO_VENTA.has(item.tipo);
const esCuentaPorCobrar = (item: VentaPanelItem) => esDocumentoVisible(item) && esVentaFinal(item) && tieneSaldoPendiente(item);

const DESPACHO_TO_PEDIDO: Record<string, { estadoEntrega: string; estadoEnvio: string }> = {
    PREPARANDO: { estadoEntrega: 'CONFIRMADO',           estadoEnvio: 'POR_COORDINAR' },
    CONFIRMADO: { estadoEntrega: 'CONFIRMADO',           estadoEnvio: 'POR_COORDINAR' },
    EN_CAMINO:  { estadoEntrega: 'EN_TRANSITO',          estadoEnvio: 'EN_REPARTO' },
    EN_AGENCIA: { estadoEntrega: 'EN_AGENCIA',           estadoEnvio: 'ENVIADO' },
    EN_DESTINO: { estadoEntrega: 'EN_TRANSITO',          estadoEnvio: 'EN_REPARTO' },
    ENTREGADO:  { estadoEntrega: 'ENTREGADO_COMPLETADO', estadoEnvio: 'ENTREGADO' },
    DEVUELTO:   { estadoEntrega: 'PENDIENTE',            estadoEnvio: 'INCIDENCIA' },
};

export interface RepartidorOpcion {
    id: number | null;
    nombre: string;
}

export function usePanelVentasViewModel() {
    const { auth, sedeActiva } = useAuthStore();
    const { alert } = useAlertStore();

    /**
     * Los filtros que llegan por la URL se leen en el estado INICIAL, no en un
     * efecto posterior.
     *
     * Se entra acá desde Repartidores → "Ver despachos", que navega con
     * `?fechaEnvio=…&repartidorId=…`. Aplicándolos después, la primera consulta
     * salía con "hoy" y la lista se cargaba dos veces: una con el día
     * equivocado —que el usuario llegaba a ver— y otra con el de la URL.
     */
    const [searchParams] = useSearchParams();
    const diaValido = (v: string | null) =>
        v && moment(v, 'YYYY-MM-DD', true).isValid() ? v : null;
    // Un enlace con fecha manda sobre el periodo que dejó elegido esta caja.
    const [rangoInicial] = useState(() => {
        const hoy = moment().format('YYYY-MM-DD');
        const dia = diaValido(searchParams.get('fecha'));
        if (dia) return { fecha: dia, fechaFin: '' };
        // Con "Sale el" no se mezcla el periodo: llega desde Repartidores por un día.
        if (diaValido(searchParams.get('fechaEnvio'))) return { fecha: hoy, fechaFin: '' };
        return rangoDePeriodo(periodoGuardado() ?? 'DIA', hoy);
    });
    const [fecha, setFecha] = useState(rangoInicial.fecha);
    // Fin del rango (opcional). Vacío = panel de un solo día (comportamiento original).
    const [fechaFin, setFechaFin] = useState(rangoInicial.fechaFin);
    const verTodas = fecha === FECHA_INICIO_TODO;
    const [truncado, setTruncado] = useState(false);
    // Día de ENTREGA programada: el negocio que despacha por día necesita ver
    // "qué sale el jueves". Cuando se usa, reemplaza al filtro por fecha de
    // emisión: un pedido que sale el jueves pudo tomarse el lunes y si no, no
    // aparecería.
    const [fechaEnvio, setFechaEnvio] = useState(
        () => diaValido(searchParams.get('fechaEnvio')) ?? '',
    );
    const [items, setItems] = useState<VentaPanelItem[]>([]);
    const [porCobrarGlobal, setPorCobrarGlobal] = useState({ total: 0, cantidad: 0 });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabVentas>('TODO');
    const [busqueda, setBusqueda] = useState('');
    const [filtroSerie, setFiltroSerie] = useState('');
    const [filtroDni, setFiltroDni] = useState('');
    const [filtroProducto, setFiltroProducto] = useState('');
    // Courier (SHALOM_PRO, PROPIOS…) y estado de entrega: filtros en el navegador.
    const [filtroCourier, setFiltroCourier] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroRepartidorId, setFiltroRepartidorId] = useState<number | null | undefined>(() => {
        const id = Number(searchParams.get('repartidorId'));
        return Number.isFinite(id) && id > 0 ? id : undefined;
    });
    const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | null>(null);
    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const canFilterByUsuario = isAdmin;
    const esPrincipalAdmin = isAdmin && Boolean(sedeActiva?.esPrincipal);

    // Alcance de la vista para el admin parado en la sede principal: por
    // defecto CONSOLIDADO (todas las sedes), que es como se comportó siempre.
    // `null` = todas; un id = solo esa sede. Antes no había forma de acotar y
    // el encabezado decía "Sede Principal" mientras la tabla y los KPIs
    // mostraban todas las sedes, que confundía a los usuarios.
    const [sedeVista, setSedeVista] = useState<number | null>(null);
    const { sedes, listarSedes } = useSedesStore();
    useEffect(() => {
        if (esPrincipalAdmin) void listarSedes();
    }, [esPrincipalAdmin, listarSedes]);
    const sedesOpciones = useMemo(
        () => sedes.map((s: any) => ({ id: s.id as number, nombre: s.nombre as string })),
        [sedes],
    );

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ fecha });
            // Rango: solo se envía si el usuario eligió una fecha final posterior
            if (fechaFin && fechaFin > fecha) params.set('fechaFin', fechaFin);
            if (fechaEnvio) params.set('fechaEnvio', fechaEnvio);
            if (fecha === FECHA_INICIO_TODO) params.set('limite', String(LIMITE_TODAS));
            // El admin en la sede principal ve todas por defecto, o solo una si
            // la eligió en el selector; el resto siempre ve la suya.
            if (esPrincipalAdmin) {
                if (sedeVista) params.set('sedeId', String(sedeVista));
            } else if (sedeActiva?.id) {
                params.set('sedeId', String(sedeActiva.id));
            }
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            // Reporte pesado: damos más margen que el timeout global de 12s
            const { data } = await apiClient.get<any>(`/ventas/panel?${params}`, { timeout: 30_000 });
            const raw = data?.data?.data ?? data?.data ?? [];
            setItems(Array.isArray(raw) ? raw : []);
            setTruncado(Boolean(data?.data?.truncado ?? data?.truncado));
            const resumenGlobal = data?.data?.resumen?.porCobrarGlobal ?? data?.resumen?.porCobrarGlobal;
            setPorCobrarGlobal({
                total: Number(resumenGlobal?.total ?? 0),
                cantidad: Number(resumenGlobal?.cantidad ?? 0),
            });
        } catch {
            alert('Error al cargar el panel de ventas', 'error');
        } finally {
            setLoading(false);
        }
    }, [fecha, fechaFin, fechaEnvio, sedeActiva?.id, esPrincipalAdmin, sedeVista, filtroUsuarioId, canFilterByUsuario, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const repartidoresOpciones = useMemo<RepartidorOpcion[]>(() => {
        const map = new Map<string, RepartidorOpcion>();
        items.forEach((i) => {
            if (i.estadoDespacho === 'NO_APLICA') return;
            const key = i.repartidorId != null ? String(i.repartidorId) : '__sin__';
            if (!map.has(key)) {
                map.set(key, {
                    id: i.repartidorId,
                    nombre: i.repartidorId != null ? i.repartidor : 'Sin asignar',
                });
            }
        });
        return Array.from(map.values());
    }, [items]);

    const filtrados = useMemo(() => {
        const search = busqueda.toLowerCase().trim();
        const serie = filtroSerie.trim().toUpperCase();
        const dni = filtroDni.trim();
        const producto = filtroProducto.trim().toLowerCase();
        let base = items.filter(esDocumentoVisible);

        if (tab === 'VENTAS') base = base.filter((i) => i.estadoDespacho === 'NO_APLICA' && esVentaFinal(i));
        else if (tab === 'CON_DESPACHO') base = base.filter((i) => i.estadoDespacho !== 'NO_APLICA');
        else if (tab === 'POR_COBRAR') base = base.filter(esCuentaPorCobrar);

        if (filtroCourier) base = base.filter((i) => i.estadoDespacho !== 'NO_APLICA' && i.courier === filtroCourier);
        if (filtroEstado) base = base.filter((i) => i.estadoDespacho === filtroEstado);

        if (filtroRepartidorId !== undefined) {
            base = base.filter((i) =>
                filtroRepartidorId === null
                    ? i.repartidorId == null
                    : i.repartidorId === filtroRepartidorId,
            );
        }

        if (serie) base = base.filter((i) => (i.seriesGarantia ?? []).some((s) => s.toUpperCase().includes(serie)));
        if (dni) base = base.filter((i) => (i.clienteDoc ?? '').includes(dni));
        if (producto) base = base.filter((i) => (i.productos ?? []).some((p) => (p.nombre ?? '').toLowerCase().includes(producto)));

        if (search) {
            base = base.filter(
                (i) =>
                    i.cliente.toLowerCase().includes(search) ||
                    i.referencia.toLowerCase().includes(search) ||
                    i.vendedor.toLowerCase().includes(search) ||
                    i.agenciaDestino.toLowerCase().includes(search) ||
                    i.celularDest.includes(search),
            );
        }

        return base;
    }, [items, tab, busqueda, filtroSerie, filtroDni, filtroProducto, filtroRepartidorId, filtroCourier, filtroEstado]);

    // El aviso al cliente se revisa y edita antes de salir: al cambiar el estado
    // se abre el mensaje armado en vez de mandarlo solo.
    const [mensajeEstado, setMensajeEstado] = useState<{
        item: VentaPanelItem;
        estado: string;
        pendiente: MensajeEstadoPendiente;
    } | null>(null);
    const [procesandoMensaje, setProcesandoMensaje] = useState(false);

    /**
     * Rótulos impresos → "Confirmado": así el próximo lote solo trae los pedidos
     * nuevos y nadie reimprime ni se confunde. Solo cambian los que seguían en
     * Preparando; no le avisa al cliente.
     *
     * Se pregunta antes: el diálogo de impresión no dice si se imprimió o se
     * canceló, y quien solo quería ver cómo sale el rótulo terminaba con sus
     * pedidos fuera de "Por preparar".
     */
    const [rotulosPorConfirmar, setRotulosPorConfirmar] = useState<number[]>([]);
    const preguntarRotulosImpresos = useCallback((comprobanteIds: number[]) => {
        const ids = new Set(comprobanteIds);
        setRotulosPorConfirmar(
            items
                .filter((i) => i.comprobanteId && ids.has(i.comprobanteId) && i.estadoDespacho === 'PREPARANDO')
                .map((i) => i.comprobanteId as number),
        );
    }, [items]);

    const marcarRotulosImpresos = useCallback(async (comprobanteIds: number[]) => {
        if (!comprobanteIds.length) return;
        try {
            const r = await apiClient.post('/envio-despacho/rotulos-impresos', { comprobanteIds });
            const n = Number((r.data?.data ?? r.data)?.confirmados ?? 0);
            if (!n) return;
            const ids = new Set(comprobanteIds);
            setItems((prev) =>
                prev.map((i) =>
                    i.comprobanteId && ids.has(i.comprobanteId) && i.estadoDespacho === 'PREPARANDO'
                        ? { ...i, estadoDespacho: 'CONFIRMADO' as EstadoDespacho }
                        : i,
                ),
            );
            alert(n === 1 ? '1 pedido pasó a Confirmado (rótulo impreso)' : `${n} pedidos pasaron a Confirmado (rótulo impreso)`, 'success');
        } catch {
            // Si falla, solo no se marcan: el rótulo ya salió impreso.
        }
    }, [alert]);

    const marcarEstadoLocal = useCallback((item: VentaPanelItem, nuevoEstado: string) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === item.id && i.tipo === item.tipo
                    ? { ...i, estadoDespacho: nuevoEstado as EstadoDespacho }
                    : i,
            ),
        );
    }, []);

    const actualizarEstado = useCallback(async (item: VentaPanelItem, nuevoEstado: string) => {
        if (item.comprobanteId && !ESTADOS_SIN_AVISO.has(nuevoEstado)) {
            try {
                const r = await apiClient.get(
                    `/envio-despacho/comprobante/${item.comprobanteId}/mensaje-estado`,
                    { params: { estado: nuevoEstado } },
                );
                const data = r.data?.data ?? r.data;
                if (data?.texto) {
                    setMensajeEstado({
                        item,
                        estado: nuevoEstado,
                        pendiente: {
                            referencia: item.referencia,
                            cliente: item.cliente,
                            estadoLabel: ETIQUETA_ESTADO[nuevoEstado] ?? nuevoEstado,
                            telefono: data.telefono ?? item.clienteTelefono ?? '',
                            texto: data.texto,
                        },
                    });
                    return;
                }
            } catch {
                // Sin vista previa sigue el cambio de siempre (con su aviso automático).
            }
        }
        try {
            if (item.comprobanteId) {
                await apiClient.put(`/envio-despacho/comprobante/${item.comprobanteId}`, { estado: nuevoEstado });
            } else if (item.pedidoId) {
                const mapped = DESPACHO_TO_PEDIDO[nuevoEstado];
                if (!mapped) return;
                await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, mapped);
            } else {
                return;
            }
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id && i.tipo === item.tipo
                        ? { ...i, estadoDespacho: nuevoEstado as EstadoDespacho }
                        : i,
                ),
            );
            alert('Estado actualizado', 'success');
        } catch {
            alert('Error al actualizar estado', 'error');
        }
    }, [alert]);

    /** Cierra el modal del mensaje: cambia el estado sin aviso automático y, si se pidió, manda el texto revisado. */
    const confirmarMensajeEstado = useCallback(async (enviar: boolean, telefono?: string, texto?: string) => {
        if (!mensajeEstado?.item.comprobanteId) return;
        const { item, estado } = mensajeEstado;
        setProcesandoMensaje(true);
        try {
            await apiClient.put(`/envio-despacho/comprobante/${item.comprobanteId}`, { estado, notificar: false });
            marcarEstadoLocal(item, estado);
        } catch {
            setProcesandoMensaje(false);
            alert('Error al actualizar estado', 'error');
            return;
        }
        if (!enviar) {
            setProcesandoMensaje(false);
            setMensajeEstado(null);
            alert('Estado actualizado (sin aviso al cliente)', 'success');
            return;
        }
        try {
            await apiClient.post(`/envio-despacho/comprobante/${item.comprobanteId}/mensaje`, { telefono, texto });
            alert('Estado actualizado y mensaje enviado al cliente', 'success');
        } catch (e: any) {
            alert(`Estado actualizado, pero el mensaje no salió: ${e?.response?.data?.message || 'error'}`, 'warning');
        } finally {
            setProcesandoMensaje(false);
            setMensajeEstado(null);
        }
    }, [mensajeEstado, marcarEstadoLocal, alert]);

    const itemsVisibles = useMemo(() => items.filter(esDocumentoVisible), [items]);
    const countTodo = itemsVisibles.length;
    const countVentas = useMemo(() => itemsVisibles.filter((i) => i.estadoDespacho === 'NO_APLICA' && esVentaFinal(i)).length, [itemsVisibles]);
    const countDespacho = useMemo(() => itemsVisibles.filter((i) => i.estadoDespacho !== 'NO_APLICA').length, [itemsVisibles]);
    const countPorCobrar = useMemo(() => itemsVisibles.filter(esCuentaPorCobrar).length, [itemsVisibles]);
    const ventasDiaFinales = useMemo(() => itemsVisibles.filter(esVentaFinal), [itemsVisibles]);
    const totalVentasDia = useMemo(() => ventasDiaFinales.reduce((s, i) => s + (i.total ?? 0), 0), [ventasDiaFinales]);
    const totalPorCobrarDia = useMemo(() => itemsVisibles.filter(esCuentaPorCobrar).reduce((s, i) => s + (i.saldo ?? 0), 0), [itemsVisibles]);
    // Excluye convertidas y documentos que no son ventas finales (como Notas de Pedido)
    const ventasFinales = useMemo(() => filtrados.filter((i) => !i.esConvertida && !TIPOS_NO_VENTA.has(i.tipo)), [filtrados]);
    const totalVentas = useMemo(() => ventasFinales.reduce((s, i) => s + (i.total ?? 0), 0), [ventasFinales]);
    const totalPorCobrar = useMemo(() => ventasFinales.reduce((s, i) => s + (i.saldo ?? 0), 0), [ventasFinales]);

    // Exporta el rango visible del panel en PDF o Excel (resumen para cierre de mes)
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
    const exportarResumen = useCallback(async (formato: 'pdf' | 'excel', columnas?: string) => {
        setExportando(formato);
        try {
            const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
            const params = new URLSearchParams({
                tipoComprobante: 'TODOS',
                fechaInicio: fecha,
                fechaFin: hasta,
                formato,
            });
            if (esPrincipalAdmin) {
                if (sedeVista) params.set('sedeId', String(sedeVista));
            } else if (sedeActiva?.id) {
                params.set('sedeId', String(sedeActiva.id));
            }
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            // Columnas visibles elegidas por el usuario (para que el Excel coincida con la tabla).
            if (columnas) params.set('columnas', columnas);
            const resp = await apiClient.get(`/comprobante/exportar-resumen?${params.toString()}`, {
                responseType: 'blob',
                timeout: 60_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `ventas_${fecha}_a_${hasta}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo exportar: verifica que existan ventas en el rango seleccionado', 'error');
        } finally {
            setExportando(null);
        }
    }, [fecha, fechaFin, fechaEnvio, sedeActiva?.id, esPrincipalAdmin, sedeVista, filtroUsuarioId, canFilterByUsuario, alert]);

    // ── Reparto propio / motorizado: resumen del rango (misma sede/fechas del
    // panel) y descarga del Excel con la plantilla de carga masiva del courier.
    const [repartoResumen, setRepartoResumen] = useState<any>(null);
    const [exportandoReparto, setExportandoReparto] = useState(false);
    const paramsReparto = useCallback(() => {
        const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
        const params = new URLSearchParams({ fecha });
        if (hasta !== fecha) params.set('fechaFin', hasta);
        if (esPrincipalAdmin) {
            if (sedeVista) params.set('sedeId', String(sedeVista));
        } else if (sedeActiva?.id) {
            params.set('sedeId', String(sedeActiva.id));
        }
        if (filtroRepartidorId) params.set('repartidorId', String(filtroRepartidorId));
        return { params, hasta };
    }, [fecha, fechaFin, esPrincipalAdmin, sedeVista, sedeActiva?.id, filtroRepartidorId]);

    useEffect(() => {
        let vivo = true;
        const { params } = paramsReparto();
        apiClient.get<any>(`/envio-despacho/reparto/resumen?${params.toString()}`)
            .then(({ data }) => {
                if (!vivo) return;
                const r = data?.data ?? data ?? null;
                setRepartoResumen(r && typeof r === 'object' && 'totales' in r ? r : null);
            })
            .catch(() => { if (vivo) setRepartoResumen(null); });
        return () => { vivo = false; };
    // Se refresca junto con el panel (mismos filtros) y tras guardar un despacho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramsReparto, items]);

    const exportarReparto = useCallback(async () => {
        if (exportandoReparto) return;
        // Sin pedidos de reparto propio en el rango no hay nada que mandar al motorizado.
        if (!repartoResumen || Number(repartoResumen.totales?.pedidos ?? 0) === 0) {
            alert('No hay pedidos de reparto propio en el rango y sede seleccionados', 'warning');
            return;
        }
        setExportandoReparto(true);
        try {
            const { params, hasta } = paramsReparto();
            const resp = await apiClient.get(`/envio-despacho/reparto/exportar?${params.toString()}`, { responseType: 'blob', timeout: 60_000 });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `reparto_${fecha}${hasta !== fecha ? `_a_${hasta}` : ''}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            const inc = Number(repartoResumen?.incompletos?.length ?? 0);
            alert(inc > 0 ? `Excel de reparto descargado. ${inc} pedido${inc !== 1 ? 's' : ''} con datos incompletos (ver columna CARGA).` : 'Excel de reparto descargado', inc > 0 ? 'warning' : 'success');
        } catch {
            alert('No se pudo exportar el reparto', 'error');
        } finally {
            setExportandoReparto(false);
        }
    }, [exportandoReparto, paramsReparto, fecha, repartoResumen, alert]);

    // Exporta el Excel AGREGADO POR PRODUCTO (Producto, Cantidad, Valor, Valor
    // con IGV) para el rango/sede del panel. Pedido de LUBRICANTES NORTHCORE.
    const [exportandoProducto, setExportandoProducto] = useState(false);
    const exportarPorProducto = useCallback(async () => {
        setExportandoProducto(true);
        try {
            const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
            const params = new URLSearchParams({ tipoComprobante: 'TODOS', fechaInicio: fecha, fechaFin: hasta });
            if (esPrincipalAdmin) {
                if (sedeVista) params.set('sedeId', String(sedeVista));
            } else if (sedeActiva?.id) {
                params.set('sedeId', String(sedeActiva.id));
            }
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            const resp = await apiClient.get(`/comprobante/exportar-por-producto?${params.toString()}`, {
                responseType: 'blob',
                timeout: 60_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `ventas_por_producto_${fecha}_a_${hasta}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo exportar por producto: verifica que existan ventas en el rango.', 'error');
        } finally {
            setExportandoProducto(false);
        }
    }, [fecha, fechaFin, sedeActiva?.id, esPrincipalAdmin, sedeVista, filtroUsuarioId, canFilterByUsuario, alert]);

    return {
        fecha, setFecha,
        fechaFin, setFechaFin,
        verTodas, truncado,
        fechaEnvio, setFechaEnvio,
        exportandoProducto, exportarPorProducto,
        exportando, exportarResumen,
        repartoResumen, exportandoReparto, exportarReparto,
        items, filtrados,
        marcarRotulosImpresos,
        rotulosPorConfirmar, setRotulosPorConfirmar, preguntarRotulosImpresos,
        mensajeEstado, setMensajeEstado, procesandoMensaje, confirmarMensajeEstado,
        loading,
        tab, setTab,
        busqueda, setBusqueda,
        filtroSerie, setFiltroSerie,
        filtroDni, setFiltroDni,
        filtroProducto, setFiltroProducto,
        filtroRepartidorId, setFiltroRepartidorId,
        filtroCourier, setFiltroCourier,
        filtroEstado, setFiltroEstado,
        filtroUsuarioId, setFiltroUsuarioId,
        canFilterByUsuario,
        esPrincipalAdmin,
        sedeVista, setSedeVista, sedesOpciones,
        repartidoresOpciones,
        countTodo, countVentas, countDespacho, countPorCobrar,
        totalVentasDia,
        totalPorCobrarDia,
        totalVentas,
        totalPorCobrar,
        porCobrarGlobal,
        actualizarEstado,
        cargar,
    };
}
