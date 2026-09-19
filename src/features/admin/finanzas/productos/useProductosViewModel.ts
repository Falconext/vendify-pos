import { useCallback, useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import {
    Metrica,
    Modo,
    ProductosVendidosResponse,
    buildSerieChart,
} from './ProductosModel';
import { ProductosReportPDF } from './ProductosReportPDF';

/** Granularidad del filtro de período. */
export type Periodo = 'dia' | 'mes' | 'rango';

interface State {
    mesActual: number;
    anioActual: number;
    fechaInicio: string;
    fechaFin: string;
    /** Día seleccionado cuando el período es 'dia' (YYYY-MM-DD). */
    dia: string;
    periodo: Periodo;
    data: ProductosVendidosResponse | null;
    isLoading: boolean;
    isGeneratingPDF: boolean;
    metrica: Metrica;
    modo: Modo;
    mostrarTop: boolean;
    busqueda: string;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

/**
 * Suma días a una fecha YYYY-MM-DD. Se opera en UTC a propósito: construir un
 * Date local desde "2026-09-07" lo interpreta como medianoche UTC y en Lima
 * (UTC-5) retrocedería un día al formatear.
 */
const sumarDias = (iso: string, n: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
};

export function useProductosViewModel(sedeId?: number | null) {
    const now = new Date();
    const { auth } = useAuthStore();
    const [state, setState] = useState<State>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        fechaInicio: monthStart(now),
        fechaFin: today(),
        dia: today(),
        periodo: 'mes',
        data: null,
        isLoading: false,
        isGeneratingPDF: false,
        metrica: 'ingreso',
        modo: 'acumulado',
        mostrarTop: false,
        busqueda: '',
    });

    const empresa = useMemo(() => auth?.empresa
        ? { nombre: auth.empresa.razonSocial || auth.empresa.nombre, ruc: auth.empresa.ruc, direccion: auth.empresa.direccion }
        : null, [auth?.empresa]);

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const params = new URLSearchParams();
            if (state.periodo === 'dia') {
                // Un día es un rango de un solo día: el backend ya soporta
                // fechaInicio/fechaFin, así que no hace falta endpoint nuevo.
                params.set('fechaInicio', state.dia);
                params.set('fechaFin', state.dia);
            } else if (state.periodo === 'rango') {
                params.set('fechaInicio', state.fechaInicio);
                params.set('fechaFin', state.fechaFin);
            } else {
                params.set('mes', String(state.mesActual));
                params.set('anio', String(state.anioActual));
            }
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<ProductosVendidosResponse>(`analisis-financiero/productos?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
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

    /** Mueve el día seleccionado. No deja pasar de hoy: no hay ventas futuras. */
    const navegarDia = useCallback((delta: -1 | 1) => {
        setState(prev => {
            const siguiente = sumarDias(prev.dia, delta);
            return siguiente > today() ? prev : { ...prev, dia: siguiente };
        });
    }, []);

    // El desglose por producto solo tiene sentido con la métrica de ingreso.
    const puedeMostrarTop = state.metrica === 'ingreso';
    const seriesTop = puedeMostrarTop && state.mostrarTop ? (state.data?.topProductos ?? []) : [];

    const chartData = useMemo(
        () => buildSerieChart(state.data?.serieDiaria ?? [], state.metrica, state.modo, seriesTop),
        [state.data, state.metrica, state.modo, seriesTop.join('|')],
    );

    const categories = useMemo(
        () => (seriesTop.length > 0 ? ['Total', ...seriesTop] : ['Total']),
        [seriesTop.join('|')],
    );

    const productosFiltrados = useMemo(() => {
        const q = state.busqueda.trim().toLowerCase();
        const lista = state.data?.productos ?? [];
        if (!q) return lista;
        return lista.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo ?? '').toLowerCase().includes(q) ||
            p.categoria.toLowerCase().includes(q),
        );
    }, [state.data, state.busqueda]);

    const handleExportPDF = useCallback(async () => {
        if (!state.data) return;
        setState(prev => ({ ...prev, isGeneratingPDF: true }));
        try {
            const blob = await pdf(
                React.createElement(ProductosReportPDF, {
                    data: state.data,
                    empresa,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ventas-por-producto-${state.data.periodo.label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setState(prev => ({ ...prev, isGeneratingPDF: false }));
        }
    }, [state.data, empresa]);

    const esHoy = state.dia >= today();

    const isCurrentOrFuture =
        state.anioActual > now.getFullYear() ||
        (state.anioActual === now.getFullYear() && state.mesActual >= now.getMonth() + 1);

    return {
        ...state,
        // Se mantiene derivado para no romper a quien ya leía este flag.
        usarRango: state.periodo === 'rango',
        esHoy,
        /** Tope del selector de fecha: no se piden ventas futuras. */
        hoy: today(),
        isCurrentOrFuture,
        empresa,
        chartData,
        categories,
        puedeMostrarTop,
        productosFiltrados,
        navegarMes,
        navegarDia,
        refreshData: fetchData,
        handleExportPDF,
        setFechaInicio: (fechaInicio: string) => setState(prev => ({ ...prev, fechaInicio })),
        setFechaFin: (fechaFin: string) => setState(prev => ({ ...prev, fechaFin })),
        setDia: (dia: string) => setState(prev => ({ ...prev, dia })),
        setPeriodo: (periodo: Periodo) => setState(prev => ({ ...prev, periodo })),
        setUsarRango: (usarRango: boolean) =>
            setState(prev => ({ ...prev, periodo: usarRango ? 'rango' : 'mes' })),
        setMetrica: (metrica: Metrica) => setState(prev => ({ ...prev, metrica })),
        setModo: (modo: Modo) => setState(prev => ({ ...prev, modo })),
        setBusqueda: (busqueda: string) => setState(prev => ({ ...prev, busqueda })),
        toggleTop: () => setState(prev => ({ ...prev, mostrarTop: !prev.mostrarTop })),
    };
}
