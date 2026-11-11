import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';
import useAlertStore from '@/zustand/alert';
import {
    FiltroValorizado,
    InventarioValorizadoData,
    OrdenValorizado,
    POR_PAGINA,
    aplicarVista,
} from './InventarioValorizadoModel';

/** `0` = todas las sedes juntas; otro número = esa sede. */
const TODAS = 0;

export function useInventarioValorizadoViewModel() {
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const { alert } = useAlertStore();

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    // Quien tiene los costos ocultos no ve este reporte (el Excel también lo
    // bloquea). Vendify aún no tiene ese permiso: el campo llega vacío y todos lo ven.
    const puedeVerCostos = isAdmin || !(auth as { ocultarPrecioCosto?: boolean } | null)?.ocultarPrecioCosto;

    const [sedeElegida, setSedeElegida] = useState<number>(sedeActiva?.id ?? TODAS);
    const [data, setData] = useState<InventarioValorizadoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exportando, setExportando] = useState(false);
    const [filtro, setFiltro] = useState<FiltroValorizado>('conStock');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState<OrdenValorizado>('valorTotal');
    const [asc, setAsc] = useState(false);
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        if (isAdmin) listarSedes();
    }, [isAdmin]);

    const params = useMemo(() => {
        if (!isAdmin) return {};
        return sedeElegida === TODAS ? { todasLasSedes: 'true' } : { sedeId: String(sedeElegida) };
    }, [isAdmin, sedeElegida]);

    const cargar = useCallback(async () => {
        if (!puedeVerCostos) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const resp = await apiClient.get('/kardex/inventario-valorizado', { params, timeout: 60_000 });
            setData((resp.data?.data ?? resp.data) as InventarioValorizadoData);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'No se pudo cargar el inventario valorizado');
        } finally {
            setLoading(false);
        }
    }, [params, puedeVerCostos]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => setPagina(1), [filtro, busqueda, orden, asc, sedeElegida]);

    const exportar = async () => {
        setExportando(true);
        try {
            const resp = await apiClient.get('/kardex/inventario-valorizado/exportar', {
                params,
                responseType: 'blob',
                timeout: 120_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inventario_valorizado_${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo descargar el Excel del inventario', 'error');
        } finally {
            setExportando(false);
        }
    };

    const ordenarPor = (col: OrdenValorizado) => {
        if (col === orden) setAsc((v) => !v);
        else {
            setOrden(col);
            setAsc(col === 'descripcion');
        }
    };

    const filas = useMemo(
        () => aplicarVista(data?.productos ?? [], filtro, busqueda, orden, asc),
        [data, filtro, busqueda, orden, asc],
    );
    const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
    const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    const sedesOptions = [
        { id: TODAS, value: 'Todas las sedes' },
        ...sedes.map((s: any) => ({ id: s.id, value: s.nombre })),
    ];
    const sedeNombre =
        sedeElegida === TODAS
            ? 'Todas las sedes'
            : sedes.find((s: any) => s.id === sedeElegida)?.nombre ?? sedeActiva?.nombre ?? '';

    return {
        isAdmin,
        puedeVerCostos,
        puedeElegirSede: isAdmin && sedes.length > 1,
        sedeElegida,
        setSedeElegida: (id: any) => setSedeElegida(Number(id) || TODAS),
        sedesOptions,
        sedeNombre,
        data,
        loading,
        error,
        exportando,
        filtro,
        setFiltro,
        busqueda,
        setBusqueda,
        orden,
        asc,
        ordenarPor,
        filas,
        visibles,
        pagina,
        setPagina,
        totalPaginas,
        cargar,
        exportar,
    };
}
