import { useCallback, useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { MetodosPagoResponse } from './MetodosPagoModel';
import { MetodosPagoReportPDF } from './MetodosPagoReportPDF';
import { usePeriodo } from '../shared/usePeriodo';

interface State {
    data: MetodosPagoResponse | null;
    isLoading: boolean;
    isGeneratingPDF: boolean;
    expandedMethod: string | null;
}

export function useMetodosPagoViewModel(sedeId?: number | null) {
    const { auth } = useAuthStore();
    // Día · Mes · Rango, igual que en las demás pestañas. El backend ya acepta
    // fechaInicio/fechaFin además de mes/anio, así que el día es un rango de un día.
    const periodo = usePeriodo('mes');
    const [state, setState] = useState<State>({
        data: null,
        isLoading: false,
        isGeneratingPDF: false,
        expandedMethod: null,
    });

    const empresa = useMemo(() => auth?.empresa
        ? { nombre: auth.empresa.razonSocial || auth.empresa.nombre, ruc: auth.empresa.ruc, direccion: auth.empresa.direccion }
        : null, [auth?.empresa]);

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const params = periodo.queryParams();
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<MetodosPagoResponse>(`analisis-financiero/metodos-pago?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo.key, sedeId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportPDF = useCallback(async () => {
        if (!state.data) return;
        setState(prev => ({ ...prev, isGeneratingPDF: true }));
        try {
            const blob = await pdf(
                React.createElement(MetodosPagoReportPDF, {
                    data: state.data,
                    empresa,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `metodos-pago-${state.data.periodo.label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setState(prev => ({ ...prev, isGeneratingPDF: false }));
        }
    }, [state.data, empresa]);

    return {
        ...state,
        periodo,
        empresa,
        refreshData: fetchData,
        handleExportPDF,
        toggleMethod: (metodo: string) => setState(prev => ({ ...prev, expandedMethod: prev.expandedMethod === metodo ? null : metodo })),
    };
}
