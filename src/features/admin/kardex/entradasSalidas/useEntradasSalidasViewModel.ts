import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import {
    CONTEXTO_VACIO,
    agregarALista,
    armarPayload,
    avisoDeFila,
    etiquetaVariante,
    problemasPorClave,
    stockEnSede,
    totalUnidades,
    varianteQueFalta,
    type ContextoInventario,
    type DetalleDocumento,
    type Linea,
    type LoteProducto,
    type ResumenDocumento,
    type TipoDocumento,
} from './EntradasSalidasModel';

type Vista = 'lista' | 'form' | 'listo';

const POR_PAGINA = 20;

export function useEntradasSalidasViewModel() {
    const { sedeActiva } = useAuthStore();
    const { alert } = useAlertStore();

    const [ctx, setCtx] = useState<ContextoInventario>(CONTEXTO_VACIO);
    const [vista, setVista] = useState<Vista>('lista');

    // ── Historial ──────────────────────────────────────────────
    const [filtroTipo, setFiltroTipo] = useState<'' | TipoDocumento>('');
    const [buscarDoc, setBuscarDoc] = useState('');
    const [pagina, setPagina] = useState(1);
    const [docs, setDocs] = useState<ResumenDocumento[]>([]);
    const [totalDocs, setTotalDocs] = useState(0);
    const [cargandoDocs, setCargandoDocs] = useState(false);
    const [detalle, setDetalle] = useState<DetalleDocumento | null>(null);

    // ── Documento en preparación ──────────────────────────────
    const [tipo, setTipo] = useState<TipoDocumento>('ENTRADA');
    const [motivo, setMotivo] = useState('');
    const [detalleTexto, setDetalleTexto] = useState('');
    const [lineas, setLineas] = useState<Linea[]>([]);
    const [problemas, setProblemas] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const [intentoGuardar, setIntentoGuardar] = useState(false);
    const [ultimaAgregada, setUltimaAgregada] = useState<string | null>(null);

    // ── Buscador ──────────────────────────────────────────────
    const [termino, setTermino] = useState('');
    const [resultados, setResultados] = useState<any[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [eligiendoVariante, setEligiendoVariante] = useState<any | null>(null);

    useEffect(() => {
        get<ContextoInventario>('inventario-documentos/contexto').then((r: any) => {
            if (r?.success && r.data) setCtx(r.data);
        });
    }, []);

    const cargarDocs = useCallback(async () => {
        setCargandoDocs(true);
        try {
            const params = new URLSearchParams({ page: String(pagina), limit: String(POR_PAGINA) });
            if (filtroTipo) params.append('tipo', filtroTipo);
            if (buscarDoc.trim()) params.append('buscar', buscarDoc.trim());
            if (sedeActiva?.id) params.append('sedeId', String(sedeActiva.id));
            const r: any = await get(`inventario-documentos?${params.toString()}`);
            setDocs(r?.data?.data ?? []);
            setTotalDocs(r?.data?.total ?? 0);
        } finally {
            setCargandoDocs(false);
        }
    }, [pagina, filtroTipo, buscarDoc, sedeActiva?.id]);

    useEffect(() => {
        if (vista !== 'lista') return;
        const t = setTimeout(cargarDocs, buscarDoc ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargarDocs, vista, buscarDoc]);

    const abrirDetalle = async (id: number) => {
        const r: any = await get(`inventario-documentos/${id}`);
        if (r?.success) setDetalle(r.data);
        else alert(r?.error || 'No se pudo abrir el documento', 'error');
    };

    // ── Armar el documento ────────────────────────────────────

    const nuevo = (t: TipoDocumento) => {
        setTipo(t);
        setMotivo('');
        setDetalleTexto('');
        setLineas([]);
        setProblemas({});
        setIntentoGuardar(false);
        setTermino('');
        setResultados([]);
        setDetalle(null);
        setVista('form');
    };

    useEffect(() => {
        if (vista !== 'form') return;
        const t = termino.trim();
        if (t.length < 2) {
            setResultados([]);
            return;
        }
        const timer = setTimeout(async () => {
            setBuscando(true);
            try {
                const { data } = await apiClient.get('/productos', {
                    params: { search: t, limit: 15, sedeId: sedeActiva?.id, incluirVariantes: true },
                });
                const payload = data?.data?.data ?? data?.data ?? data;
                const items = Array.isArray(payload) ? payload : payload?.productos ?? payload?.items ?? [];
                setResultados(items);
            } catch {
                setResultados([]);
            } finally {
                setBuscando(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [termino, vista, sedeActiva?.id]);

    const lotesDe = async (productoId: number): Promise<LoteProducto[]> => {
        if (!ctx.lotePermitido) return [];
        const r: any = await get(`productos/${productoId}/lotes`);
        const filas = Array.isArray(r?.data) ? r.data : [];
        return filas
            .map((l: any) => ({
                lote: l.lote,
                stockActual: Number(l.stockActual ?? 0),
                fechaVencimiento: String(l.fechaVencimiento ?? '').slice(0, 10),
                activo: !!l.activo,
            }))
            .sort((a: LoteProducto, b: LoteProducto) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    };

    const tieneVariantes = (p: any) => Array.isArray(p?.variantes) && p.variantes.length > 0;

    /**
     * Agrega a la lista. Un modelo con tallas no tiene stock propio: se abre el
     * selector para elegir cuál. `padre` da el nombre cuando se elige una
     * talla desde el selector (la variante a veces se llama igual que el modelo).
     */
    const agregar = async (p: any, padre?: any) => {
        if (tieneVariantes(p)) {
            setEligiendoVariante(p);
            return;
        }
        const lotes = await lotesDe(p.id);
        const nueva = {
            productoId: p.id,
            codigo: p.codigo ?? '',
            descripcion: padre?.descripcion ?? p.descripcion ?? '',
            variante: padre ? etiquetaVariante(p.valoresAtributos) : varianteQueFalta(p.descripcion ?? '', p.valoresAtributos),
            unidad: p.unidadMedida?.codigo ?? padre?.unidadMedida?.codigo ?? '',
            imagenUrl: p.imagenUrl ?? padre?.imagenUrl,
            stockSede: stockEnSede(p, sedeActiva?.id),
            cantidad: 1,
            costoUnitario: '',
            // En una salida de un producto con lotes, sin elegir sale del que vence primero.
            lote: '',
            vence: '',
            lotes,
        };
        // Con lector de barras llegan dos escaneos casi juntos: se suma sobre
        // la lista del momento, no sobre la que había al empezar.
        const keyNueva = `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setLineas((ls) => agregarALista(ls, nueva, keyNueva).lista);
        setUltimaAgregada(agregarALista(lineas, nueva, keyNueva).key);
        setEligiendoVariante(null);
        setTermino('');
        setResultados([]);
    };

    /** Enter en el buscador: el código exacto (lector de barras) entra directo. */
    const alPresionarEnter = () => {
        const t = termino.trim().toLowerCase();
        if (!t) return;
        const candidatos: { p: any; padre?: any }[] = [];
        for (const p of resultados) {
            candidatos.push({ p });
            for (const v of p.variantes ?? []) candidatos.push({ p: v, padre: p });
        }
        const exacto = candidatos.find(
            ({ p }) => String(p.codigo ?? '').toLowerCase() === t || String(p.codigoBarras ?? '').toLowerCase() === t,
        );
        if (exacto) return void agregar(exacto.p, exacto.padre);
        if (resultados.length === 1) return void agregar(resultados[0]);
    };

    const cambiarLinea = (key: string, cambios: Partial<Linea>) => {
        setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
        setProblemas((p) => {
            if (!p[key]) return p;
            const { [key]: _, ...resto } = p;
            return resto;
        });
    };

    const quitarLinea = (key: string) => setLineas((ls) => ls.filter((l) => l.key !== key));

    const avisos = useMemo(() => {
        const out: Record<string, string> = {};
        for (const l of lineas) {
            const a = problemas[l.key] ?? avisoDeFila(tipo, l, ctx);
            if (a) out[l.key] = a;
        }
        return out;
    }, [lineas, problemas, tipo, ctx]);

    const motivoEtiqueta = ctx.motivos[tipo].find((m) => m.codigo === motivo)?.etiqueta ?? '';
    const faltaDetalle = motivo === 'OTRO' && !detalleTexto.trim();
    const puedeGuardar = !!motivo && !faltaDetalle && lineas.length > 0 && Object.keys(avisos).length === 0 && !guardando;

    const guardar = async () => {
        setIntentoGuardar(true);
        if (!puedeGuardar) {
            if (!motivo) alert('Elige el motivo', 'warning');
            else if (faltaDetalle) alert('Con "Otro motivo" escribe en el detalle qué pasó', 'warning');
            else if (!lineas.length) alert('Agrega al menos un producto', 'warning');
            else alert('Revisa las filas marcadas en rojo', 'warning');
            return;
        }
        setGuardando(true);
        try {
            const { data } = await apiClient.post('/inventario-documentos', armarPayload(tipo, motivo, detalleTexto, lineas));
            const doc = data?.data as DetalleDocumento & { noAplicadas?: { linea: number; mensaje: string }[] };
            setDetalle(doc);
            setVista('listo');
            if (doc?.noAplicadas?.length) {
                alert(`Guardado como ${doc.numero}, pero ${doc.noAplicadas.length} fila(s) no se movieron: ${doc.noAplicadas[0].mensaje}`, 'warning');
            } else {
                alert(`${tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} ${doc.numero} registrada`, 'success');
            }
        } catch (e: any) {
            const resp = e?.response?.data;
            setProblemas(problemasPorClave(lineas, resp?.problemas));
            alert(resp?.message || 'No se pudo guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const volverALista = () => {
        setDetalle(null);
        setVista('lista');
    };

    return {
        ctx,
        vista,
        sedeActiva,
        // historial
        filtroTipo,
        setFiltroTipo: (t: '' | TipoDocumento) => { setFiltroTipo(t); setPagina(1); },
        buscarDoc,
        setBuscarDoc: (v: string) => { setBuscarDoc(v); setPagina(1); },
        pagina,
        setPagina,
        paginas: Math.max(1, Math.ceil(totalDocs / POR_PAGINA)),
        docs,
        totalDocs,
        cargandoDocs,
        detalle,
        abrirDetalle,
        cerrarDetalle: () => setDetalle(null),
        // documento
        tipo,
        nuevo,
        motivo,
        setMotivo,
        motivoEtiqueta,
        detalleTexto,
        setDetalleTexto,
        faltaDetalle,
        lineas,
        avisos,
        intentoGuardar,
        cambiarLinea,
        quitarLinea,
        limpiar: () => setLineas([]),
        totalUnidades: totalUnidades(lineas),
        puedeGuardar,
        guardando,
        guardar,
        volverALista,
        ultimaAgregada,
        // buscador
        termino,
        setTermino,
        resultados,
        buscando,
        agregar,
        alPresionarEnter,
        eligiendoVariante,
        cerrarVariantes: () => setEligiendoVariante(null),
    };
}

export type EntradasSalidasVM = ReturnType<typeof useEntradasSalidasViewModel>;
