import { useCallback, useMemo, useState } from 'react';

/** Granularidad del filtro de período de Análisis Financiero. */
export type Periodo = 'dia' | 'mes' | 'rango';

export const MESES_FULL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Hoy en formato YYYY-MM-DD (fecha local, Lima). */
export const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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

/** Primer y último día (YYYY-MM-DD) de un mes/año. */
export const rangoDelMes = (mes: number, anio: number) => ({
    fechaInicio: `${anio}-${pad(mes)}-01`,
    fechaFin: `${anio}-${pad(mes)}-${pad(new Date(anio, mes, 0).getDate())}`,
});

/** "07/09/2026" a partir de YYYY-MM-DD, sin pasar por Date (evita el corrimiento de zona horaria). */
export const formatFechaCorta = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

export interface PeriodoState {
    periodo: Periodo;
    dia: string;
    mesActual: number;
    anioActual: number;
    fechaInicio: string;
    fechaFin: string;
}

/**
 * Estado del selector Día · Mes · Rango, común a las pestañas de Análisis
 * Financiero (mismo comportamiento que el que ya tenían Productos, Clientes y
 * Rentabilidad, sin volver a copiar la lógica en cada viewmodel).
 *
 * `rango` siempre resuelve a un par fechaInicio/fechaFin (para el día son
 * iguales; para el mes es 1º→último día), así los endpoints que solo aceptan
 * fechas también funcionan. `queryParams` arma lo que espera el backend de
 * analisis-financiero: `mes/anio` en modo mes, `fechaInicio/fechaFin` en el resto.
 */
export function usePeriodo(inicial: Periodo = 'mes') {
    const now = new Date();
    const [state, setState] = useState<PeriodoState>({
        periodo: inicial,
        dia: hoyISO(),
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        fechaInicio: rangoDelMes(now.getMonth() + 1, now.getFullYear()).fechaInicio,
        fechaFin: hoyISO(),
    });

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
            return siguiente > hoyISO() ? prev : { ...prev, dia: siguiente };
        });
    }, []);

    const hoy = hoyISO();
    const esHoy = state.dia >= hoy;
    const isCurrentOrFuture =
        state.anioActual > now.getFullYear() ||
        (state.anioActual === now.getFullYear() && state.mesActual >= now.getMonth() + 1);

    const rango = useMemo(() => {
        if (state.periodo === 'dia') return { fechaInicio: state.dia, fechaFin: state.dia };
        if (state.periodo === 'rango') return { fechaInicio: state.fechaInicio, fechaFin: state.fechaFin };
        return rangoDelMes(state.mesActual, state.anioActual);
    }, [state.periodo, state.dia, state.fechaInicio, state.fechaFin, state.mesActual, state.anioActual]);

    const label = useMemo(() => {
        if (state.periodo === 'dia') return formatFechaCorta(state.dia);
        if (state.periodo === 'rango') return `${formatFechaCorta(state.fechaInicio)} - ${formatFechaCorta(state.fechaFin)}`;
        return `${MESES_FULL[state.mesActual - 1]} ${state.anioActual}`;
    }, [state.periodo, state.dia, state.fechaInicio, state.fechaFin, state.mesActual, state.anioActual]);

    /** Query params tal como los espera el backend de analisis-financiero. */
    const queryParams = useCallback(() => {
        const params = new URLSearchParams();
        if (state.periodo === 'mes') {
            params.set('mes', String(state.mesActual));
            params.set('anio', String(state.anioActual));
        } else {
            params.set('fechaInicio', rango.fechaInicio);
            params.set('fechaFin', rango.fechaFin);
        }
        return params;
    }, [state.periodo, state.mesActual, state.anioActual, rango]);

    /** Clave estable para usar como dependencia de efectos de carga. */
    const key = `${state.periodo}|${rango.fechaInicio}|${rango.fechaFin}|${state.mesActual}|${state.anioActual}`;

    return {
        ...state,
        rango,
        label,
        key,
        hoy,
        esHoy,
        isCurrentOrFuture,
        navegarMes,
        navegarDia,
        queryParams,
        setPeriodo: (periodo: Periodo) => setState(prev => ({ ...prev, periodo })),
        setDia: (dia: string) => setState(prev => ({ ...prev, dia })),
        setFechaInicio: (fechaInicio: string) => setState(prev => ({ ...prev, fechaInicio })),
        setFechaFin: (fechaFin: string) => setState(prev => ({ ...prev, fechaFin })),
    };
}

export type PeriodoVM = ReturnType<typeof usePeriodo>;
