import { useState, useEffect, useCallback } from 'react';
import { get, post, patch, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import {
    PnlResponse,
    EvolucionPoint,
    GastoOperativo,
    GastoFormData,
    IngresoManual,
    IngresoFormData,
} from './RentabilidadModel';

export type PeriodoRentabilidad = 'dia' | 'mes' | 'rango';

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

/** Suma días a YYYY-MM-DD en UTC, para que en Lima (UTC-5) no retroceda un día. */
const sumarDias = (iso: string, n: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
};

// ─── State shape ─────────────────────────────────────────────────────────────

interface RentabilidadState {
    mesActual: number;
    anioActual: number;
    /** Día · Mes · Rango. El mes es el comportamiento histórico del P&L. */
    periodo: PeriodoRentabilidad;
    /** Día seleccionado cuando periodo = 'dia' (YYYY-MM-DD). */
    dia: string;
    fechaInicio: string;
    fechaFin: string;
    pnl: PnlResponse | null;
    evolucion: EvolucionPoint[];
    gastos: GastoOperativo[];
    ingresos: IngresoManual[];
    valorInventario: number | null;
    isLoading: boolean;
    isModalOpen: boolean;
    gastoEditando: GastoOperativo | null;
    isSaving: boolean;
    isIngresoModalOpen: boolean;
    ingresoEditando: IngresoManual | null;
    isSavingIngreso: boolean;
}

// ─── ViewModel ────────────────────────────────────────────────────────────────

/**
 * @param sedeId sede por la que filtrar; `null`/undefined = todas las sedes.
 *   OJO: los gastos operativos, ingresos manuales y campañas se registran a
 *   nivel empresa (no tienen sedeId en la BD), así que esas cifras NO se filtran
 *   — la vista lo advierte cuando hay una sede seleccionada.
 */
export function useRentabilidadViewModel(sedeId?: number | null) {
    const { alert } = useAlertStore();

    const now = new Date();
    const [state, setState] = useState<RentabilidadState>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        periodo: 'mes',
        dia: today(),
        fechaInicio: monthStart(now),
        fechaFin: today(),
        pnl: null,
        evolucion: [],
        gastos: [],
        ingresos: [],
        valorInventario: null,
        isLoading: false,
        isModalOpen: false,
        gastoEditando: null,
        isSaving: false,
        isIngresoModalOpen: false,
        ingresoEditando: null,
        isSavingIngreso: false,
    });

    // ─── Derived ──────────────────────────────────────────────────────────────

    const now2 = new Date();
    const currentMonth = now2.getMonth() + 1;
    const currentYear = now2.getFullYear();
    const isCurrentOrFuture =
        state.anioActual > currentYear ||
        (state.anioActual === currentYear && state.mesActual >= currentMonth);

    // ─── Período efectivo ─────────────────────────────────────────────────────
    // Rango de fechas que se pide al backend según el selector. El día se pide
    // como rango de un solo día (fechaInicio = fechaFin), sin endpoint nuevo.
    const { periodo, dia, fechaInicio, fechaFin, mesActual, anioActual } = state;
    const rango = periodo === 'dia'
        ? { fi: dia, ff: dia }
        : periodo === 'rango'
            ? { fi: fechaInicio, ff: fechaFin }
            : {
                fi: `${anioActual}-${String(mesActual).padStart(2, '0')}-01`,
                ff: new Date(Date.UTC(anioActual, mesActual, 0)).toISOString().slice(0, 10),
            };
    // Mes al que pertenece el período (el del inicio): la lista de gastos
    // operativos sigue siendo mensual.
    const mesDePeriodo = periodo === 'mes'
        ? { mes: mesActual, anio: anioActual }
        : { mes: Number(rango.fi.slice(5, 7)), anio: Number(rango.fi.slice(0, 4)) };
    const pnlQuery = periodo === 'mes'
        ? `mes=${mesActual}&anio=${anioActual}`
        : `fechaInicio=${rango.fi}&fechaFin=${rango.ff}`;
    const rangoValido = periodo !== 'rango' || (fechaInicio !== '' && fechaFin !== '' && fechaInicio <= fechaFin);

    // ─── Fetchers ─────────────────────────────────────────────────────────────

    const qSede = sedeId ? `&sedeId=${sedeId}` : '';

    const fetchPnl = useCallback(async () => {
        const resp = await get<PnlResponse>(`analisis-financiero/pnl?${pnlQuery}${qSede}`);
        if (resp.data) {
            setState(prev => ({ ...prev, pnl: resp.data! }));
        }
    }, [pnlQuery, qSede]);

    const fetchGastos = useCallback(async () => {
        const resp = await get<GastoOperativo[]>(`analisis-financiero/gastos?mes=${mesDePeriodo.mes}&anio=${mesDePeriodo.anio}${qSede}`);
        if (resp.data) {
            setState(prev => ({ ...prev, gastos: resp.data! }));
        }
    }, [mesDePeriodo.mes, mesDePeriodo.anio, qSede]);

    const fetchIngresos = useCallback(async () => {
        const resp = await get<{ items: IngresoManual[]; total: number }>(`finanzas/ingresos-manuales?fechaInicio=${rango.fi}&fechaFin=${rango.ff}`);
        if (resp.data) {
            setState(prev => ({ ...prev, ingresos: (resp.data as any).items ?? [] }));
        }
    }, [rango.fi, rango.ff]);

    const fetchEvolucion = useCallback(async () => {
        const resp = await get<EvolucionPoint[]>(`analisis-financiero/evolucion?meses=6${qSede}`);
        if (resp.data) {
            setState(prev => ({ ...prev, evolucion: resp.data! }));
        }
    }, [qSede]);

    // Capital inmovilizado en stock (comprado, aún sin vender). Es una foto
    // del inventario ACTUAL, no del período seleccionado: la compra no se
    // gasta hasta que el producto se vende (ver "Costo Real de Productos"
    // en el P&L), así que este valor complementa esa fila explicando dónde
    // quedó el dinero de las compras que todavía no impactan la ganancia.
    const fetchValorInventario = useCallback(async () => {
        const resp = await get<{ resumen?: { valorTotalInventario?: number } }>(`kardex/inventario-valorizado`);
        if (resp.data) {
            setState(prev => ({ ...prev, valorInventario: resp.data!.resumen?.valorTotalInventario ?? 0 }));
        }
    }, []);

    // ─── Load on mount and on period change ──────────────────────────────────
    useEffect(() => {
        if (!rangoValido) return;
        const load = async () => {
            setState(prev => ({ ...prev, isLoading: true }));
            try {
                await Promise.all([fetchPnl(), fetchGastos(), fetchIngresos()]);
            } finally {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };
        load();
    }, [pnlQuery, mesDePeriodo.mes, mesDePeriodo.anio, rango.fi, rango.ff, rangoValido, qSede]);

    // Fetch evolution and current inventory value only once on mount
    useEffect(() => {
        fetchEvolucion();
    }, [qSede]);

    // Valor del inventario: foto actual de toda la empresa, no depende del período
    // ni de la sede seleccionada.
    useEffect(() => {
        fetchValorInventario();
    }, []);

    // ─── Navigation ───────────────────────────────────────────────────────────

    const navegarMes = useCallback((delta: -1 | 1) => {
        setState(prev => {
            let mes = prev.mesActual + delta;
            let anio = prev.anioActual;

            if (mes < 1) {
                mes = 12;
                anio -= 1;
            } else if (mes > 12) {
                mes = 1;
                anio += 1;
            }

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
    const setPeriodo = useCallback((p: PeriodoRentabilidad) => setState(prev => ({ ...prev, periodo: p })), []);
    const setDia = useCallback((d: string) => setState(prev => ({ ...prev, dia: d })), []);
    const setFechaInicio = useCallback((f: string) => setState(prev => ({ ...prev, fechaInicio: f })), []);
    const setFechaFin = useCallback((f: string) => setState(prev => ({ ...prev, fechaFin: f })), []);

    // ─── Gasto CRUD ───────────────────────────────────────────────────────────

    const refreshPnlAndGastos = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            await Promise.all([fetchPnl(), fetchGastos(), fetchIngresos()]);
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [fetchPnl, fetchGastos, fetchIngresos]);

    const crearGasto = useCallback(async (data: GastoFormData) => {
        setState(prev => ({ ...prev, isSaving: true }));
        try {
            const resp = await post<GastoOperativo>('analisis-financiero/gastos', data);
            if (resp.error) {
                alert(resp.error, 'error', 'Error');
                return false;
            }
            alert('Gasto registrado correctamente', 'success', 'Éxito');
            setState(prev => ({ ...prev, isModalOpen: false, gastoEditando: null }));
            await refreshPnlAndGastos();
            return true;
        } catch {
            alert('No se pudo registrar el gasto', 'error', 'Error');
            return false;
        } finally {
            setState(prev => ({ ...prev, isSaving: false }));
        }
    }, [alert, refreshPnlAndGastos]);

    const actualizarGasto = useCallback(async (id: number, data: Partial<GastoFormData>) => {
        setState(prev => ({ ...prev, isSaving: true }));
        try {
            const resp = await patch<GastoOperativo>(`analisis-financiero/gastos/${id}`, data);
            if (resp.error) {
                alert(resp.error, 'error', 'Error');
                return false;
            }
            alert('Gasto actualizado correctamente', 'success', 'Éxito');
            setState(prev => ({ ...prev, isModalOpen: false, gastoEditando: null }));
            await refreshPnlAndGastos();
            return true;
        } catch {
            alert('No se pudo actualizar el gasto', 'error', 'Error');
            return false;
        } finally {
            setState(prev => ({ ...prev, isSaving: false }));
        }
    }, [alert, refreshPnlAndGastos]);

    const eliminarGasto = useCallback(async (id: number) => {
        try {
            const resp = await del(`analisis-financiero/gastos/${id}`);
            if (resp.error) {
                alert(resp.error, 'error', 'Error');
                return false;
            }
            alert('Gasto eliminado', 'success', 'Éxito');
            await refreshPnlAndGastos();
            return true;
        } catch {
            alert('No se pudo eliminar el gasto', 'error', 'Error');
            return false;
        }
    }, [alert, refreshPnlAndGastos]);

    // ─── Modal helpers ────────────────────────────────────────────────────────

    const abrirModalCrear = useCallback(() => {
        setState(prev => ({ ...prev, isModalOpen: true, gastoEditando: null }));
    }, []);

    const abrirModalEditar = useCallback((gasto: GastoOperativo) => {
        setState(prev => ({ ...prev, isModalOpen: true, gastoEditando: gasto }));
    }, []);

    const cerrarModal = useCallback(() => {
        setState(prev => ({ ...prev, isModalOpen: false, gastoEditando: null }));
    }, []);

    // ─── Ingreso CRUD ─────────────────────────────────────────────────────────

    const crearIngreso = useCallback(async (data: IngresoFormData) => {
        setState(prev => ({ ...prev, isSavingIngreso: true }));
        try {
            const resp = await post<IngresoManual>('finanzas/ingresos-manuales', data);
            if (resp.error) { alert(resp.error, 'error', 'Error'); return false; }
            alert('Ingreso registrado correctamente', 'success', 'Éxito');
            setState(prev => ({ ...prev, isIngresoModalOpen: false, ingresoEditando: null }));
            await refreshPnlAndGastos();
            return true;
        } catch { alert('No se pudo registrar el ingreso', 'error', 'Error'); return false; }
        finally { setState(prev => ({ ...prev, isSavingIngreso: false })); }
    }, [alert, refreshPnlAndGastos]);

    const actualizarIngreso = useCallback(async (id: number, data: Partial<IngresoFormData>) => {
        setState(prev => ({ ...prev, isSavingIngreso: true }));
        try {
            const resp = await patch<IngresoManual>(`finanzas/ingresos-manuales/${id}`, data);
            if (resp.error) { alert(resp.error, 'error', 'Error'); return false; }
            alert('Ingreso actualizado correctamente', 'success', 'Éxito');
            setState(prev => ({ ...prev, isIngresoModalOpen: false, ingresoEditando: null }));
            await refreshPnlAndGastos();
            return true;
        } catch { alert('No se pudo actualizar el ingreso', 'error', 'Error'); return false; }
        finally { setState(prev => ({ ...prev, isSavingIngreso: false })); }
    }, [alert, refreshPnlAndGastos]);

    const eliminarIngreso = useCallback(async (id: number) => {
        try {
            const resp = await del(`finanzas/ingresos-manuales/${id}`);
            if (resp.error) { alert(resp.error, 'error', 'Error'); return false; }
            alert('Ingreso eliminado', 'success', 'Éxito');
            await refreshPnlAndGastos();
            return true;
        } catch { alert('No se pudo eliminar el ingreso', 'error', 'Error'); return false; }
    }, [alert, refreshPnlAndGastos]);

    const abrirModalCrearIngreso = useCallback(() => {
        setState(prev => ({ ...prev, isIngresoModalOpen: true, ingresoEditando: null }));
    }, []);

    const abrirModalEditarIngreso = useCallback((ingreso: IngresoManual) => {
        setState(prev => ({ ...prev, isIngresoModalOpen: true, ingresoEditando: ingreso }));
    }, []);

    const cerrarModalIngreso = useCallback(() => {
        setState(prev => ({ ...prev, isIngresoModalOpen: false, ingresoEditando: null }));
    }, []);

    // ─── Return ───────────────────────────────────────────────────────────────

    return {
        // State
        mesActual: state.mesActual,
        anioActual: state.anioActual,
        periodo: state.periodo,
        dia: state.dia,
        fechaInicio: state.fechaInicio,
        fechaFin: state.fechaFin,
        esHoy: state.dia >= today(),
        /** Tope del selector de fecha: no se piden ventas futuras. */
        hoy: today(),
        pnl: state.pnl,
        evolucion: state.evolucion,
        gastos: state.gastos,
        ingresos: state.ingresos,
        valorInventario: state.valorInventario,
        isLoading: state.isLoading,
        isModalOpen: state.isModalOpen,
        gastoEditando: state.gastoEditando,
        isSaving: state.isSaving,
        isIngresoModalOpen: state.isIngresoModalOpen,
        ingresoEditando: state.ingresoEditando,
        isSavingIngreso: state.isSavingIngreso,
        isCurrentOrFuture,
        sedeFiltrada: !!sedeId,

        // Actions
        navegarMes,
        navegarDia,
        setPeriodo,
        setDia,
        setFechaInicio,
        setFechaFin,
        crearGasto,
        actualizarGasto,
        eliminarGasto,
        abrirModalCrear,
        abrirModalEditar,
        crearIngreso,
        actualizarIngreso,
        eliminarIngreso,
        abrirModalCrearIngreso,
        abrirModalEditarIngreso,
        cerrarModalIngreso,
        cerrarModal,
    };
}
