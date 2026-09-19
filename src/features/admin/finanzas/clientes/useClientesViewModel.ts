import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '@/utils/fetch';
import { AnalisisClientesResponse } from './ClientesModel';

/** Día · Mes · Rango · Histórico (todo lo registrado, para medir fidelidad real). */
export type Periodo = 'dia' | 'mes' | 'rango' | 'historico';

interface State {
    mesActual: number;
    anioActual: number;
    fechaInicio: string;
    fechaFin: string;
    dia: string;
    periodo: Periodo;
    data: AnalisisClientesResponse | null;
    isLoading: boolean;
    /** Mensaje si la última carga falló (se conserva la data previa). */
    error: string | null;
    busqueda: string;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
const sumarDias = (iso: string, n: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
};
/** Inicio del histórico: antes de esta fecha no hay ventas en el sistema. */
const INICIO_HISTORICO = '2020-01-01';

export function useClientesViewModel(sedeId?: number | null) {
    const now = new Date();
    const [state, setState] = useState<State>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        fechaInicio: monthStart(now),
        fechaFin: today(),
        dia: today(),
        periodo: 'mes',
        data: null,
        isLoading: false,
        error: null,
        busqueda: '',
    });

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const params = new URLSearchParams();
            if (state.periodo === 'dia') {
                params.set('fechaInicio', state.dia);
                params.set('fechaFin', state.dia);
            } else if (state.periodo === 'rango') {
                params.set('fechaInicio', state.fechaInicio);
                params.set('fechaFin', state.fechaFin);
            } else if (state.periodo === 'historico') {
                params.set('fechaInicio', INICIO_HISTORICO);
                params.set('fechaFin', today());
            } else {
                params.set('mes', String(state.mesActual));
                params.set('anio', String(state.anioActual));
            }
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<AnalisisClientesResponse>(`analisis-financiero/clientes?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } catch (e: any) {
            // No se borra la data anterior: se avisa y se puede reintentar.
            setState(prev => ({ ...prev, error: e?.response?.data?.message || e?.message || 'No se pudo cargar la información' }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.periodo, state.dia, state.fechaInicio, state.fechaFin, state.mesActual, state.anioActual, sedeId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const navegarMes = useCallback((delta: -1 | 1) => {
        setState(prev => {
            let mes = prev.mesActual + delta;
            let anio = prev.anioActual;
            if (mes < 1) { mes = 12; anio -= 1; }
            else if (mes > 12) { mes = 1; anio += 1; }
            return { ...prev, mesActual: mes, anioActual: anio };
        });
    }, []);

    const navegarDia = useCallback((delta: -1 | 1) => {
        setState(prev => {
            const siguiente = sumarDias(prev.dia, delta);
            return siguiente > today() ? prev : { ...prev, dia: siguiente };
        });
    }, []);

    const clientesFiltrados = useMemo(() => {
        const q = state.busqueda.trim().toLowerCase();
        const lista = state.data?.clientes ?? [];
        if (!q) return lista;
        return lista.filter(c =>
            c.nombre.toLowerCase().includes(q) ||
            (c.nroDoc ?? '').includes(q) ||
            c.ciudad.toLowerCase().includes(q),
        );
    }, [state.data, state.busqueda]);

    const esHoy = state.dia >= today();
    const isCurrentOrFuture =
        state.anioActual > now.getFullYear() ||
        (state.anioActual === now.getFullYear() && state.mesActual >= now.getMonth() + 1);

    return {
        ...state,
        esHoy,
        hoy: today(),
        isCurrentOrFuture,
        clientesFiltrados,
        navegarMes,
        navegarDia,
        refreshData: fetchData,
        setFechaInicio: (fechaInicio: string) => setState(prev => ({ ...prev, fechaInicio })),
        setFechaFin: (fechaFin: string) => setState(prev => ({ ...prev, fechaFin })),
        setDia: (dia: string) => setState(prev => ({ ...prev, dia })),
        setPeriodo: (periodo: Periodo) => setState(prev => ({ ...prev, periodo })),
        setBusqueda: (busqueda: string) => setState(prev => ({ ...prev, busqueda })),
    };
}
