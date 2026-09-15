import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { CategoriasResponse } from './CategoriasModel';
import { CategoriasReportPDF } from './CategoriasReportPDF';
import { usePeriodo } from '../shared/usePeriodo';

interface State {
    data: CategoriasResponse | null;
    isLoading: boolean;
    expandedCat: string | null;
    isGeneratingPDF: boolean;
}

export function useCategoriasViewModel(sedeId?: number | null) {
    const { auth } = useAuthStore();
    // Día · Mes · Rango, igual que en las demás pestañas. El backend acepta
    // fechaInicio/fechaFin además de mes/anio.
    const periodo = usePeriodo('mes');
    const [state, setState] = useState<State>({
        data: null,
        isLoading: false,
        expandedCat: null,
        isGeneratingPDF: false,
    });

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const params = periodo.queryParams();
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<CategoriasResponse>(`analisis-financiero/categorias?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo.key, sedeId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleCat = useCallback((nombre: string) => {
        setState(prev => ({
            ...prev,
            expandedCat: prev.expandedCat === nombre ? null : nombre,
        }));
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (!state.data) return;
        setState(prev => ({ ...prev, isGeneratingPDF: true }));
        try {
            const empresa = auth?.empresa
                ? { nombre: auth.empresa.razonSocial || auth.empresa.nombre, ruc: auth.empresa.ruc, direccion: auth.empresa.direccion }
                : null;
            const blob = await pdf(
                React.createElement(CategoriasReportPDF, {
                    data: state.data,
                    empresa,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `categorias-${state.data.periodo.label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setState(prev => ({ ...prev, isGeneratingPDF: false }));
        }
    }, [state.data, auth?.empresa]);

    return {
        periodo,
        data: state.data,
        isLoading: state.isLoading,
        expandedCat: state.expandedCat,
        isGeneratingPDF: state.isGeneratingPDF,
        refreshData: fetchData,
        toggleCat,
        handleExportPDF,
    };
}
