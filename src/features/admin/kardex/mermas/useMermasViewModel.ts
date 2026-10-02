import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { REPORTE_VACIO, type ReporteMermas } from './MermasModel';

/**
 * Arranca en el mes corriente: es el período en que un empresario mira sus
 * pérdidas, y el que se compara contra el mes anterior.
 */
export function useMermasViewModel() {
    const { sedeActiva } = useAuthStore();
    const [fechaInicio, setFechaInicio] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().endOf('month').format('YYYY-MM-DD'));
    const [data, setData] = useState<ReporteMermas>(REPORTE_VACIO);
    const [isLoading, setIsLoading] = useState(false);

    const consultar = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (fechaInicio) params.append('fechaInicio', fechaInicio);
            if (fechaFin) params.append('fechaFin', fechaFin);
            if (sedeActiva?.id) params.append('sedeId', String(sedeActiva.id));
            const resp: any = await get(`kardex/reporte-mermas?${params.toString()}`);
            setData(resp?.data ?? REPORTE_VACIO);
        } catch {
            setData(REPORTE_VACIO);
        } finally {
            setIsLoading(false);
        }
    }, [fechaInicio, fechaFin, sedeActiva?.id]);

    useEffect(() => { consultar(); }, [consultar]);

    /** El selector devuelve DD/MM/YYYY; el backend espera YYYY-MM-DD. */
    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        const iso = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (name === 'fechaInicio') setFechaInicio(iso);
        if (name === 'fechaFin') setFechaFin(iso);
    };

    const verMesActual = () => {
        setFechaInicio(moment().startOf('month').format('YYYY-MM-DD'));
        setFechaFin(moment().endOf('month').format('YYYY-MM-DD'));
    };

    const verMesAnterior = () => {
        const m = moment().subtract(1, 'month');
        setFechaInicio(m.clone().startOf('month').format('YYYY-MM-DD'));
        setFechaFin(m.clone().endOf('month').format('YYYY-MM-DD'));
    };

    return {
        fechaInicio, fechaFin, handleDate,
        verMesActual, verMesAnterior,
        data, isLoading, consultar,
        sedeNombre: sedeActiva?.nombre ?? '',
    };
}
