import React, { useEffect, useMemo, useState } from 'react';
import { useCajaStore } from '../../../../zustand/caja';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import ModalConfirm from '@/components/ModalConfirm';
import useEscapeKey from '@/hooks/useEscapeKey';
import ModalRegistrarGasto from './ModalRegistrarGasto';
import ModalRegistrarIngreso from './ModalRegistrarIngreso';
import ModalTransferirCaja from './ModalTransferirCaja';

const ACCENT = 'var(--accent, #7551FF)';

/** Fecha corta en hora de Lima (el backend devuelve ISO en UTC). */
const fechaCorta = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

const CajaControl: React.FC = () => {
    const {
        estadoCaja,
        loading,
        error,
        obtenerEstadoCaja,
        abrirCaja,
        cerrarCaja,
        eliminarIngreso,
        clearError,
    } = useCajaStore();
    const { sedes, listarSedes } = useSedesStore();
    const { sedeActiva, auth } = useAuthStore();
    /**
     * Si el cierre arranca con los montos del sistema o en blanco.
     *
     * Lo eligió cada negocio en Configuración → Ventas y caja. Prellenado, la
     * cajera revisa y guarda: sirve donde no arquean y se guían del sistema.
     * En blanco, cuenta el cajón y escribe lo que encontró, y recién ahí la
     * diferencia contra lo esperado significa algo.
     *
     * Por defecto prendido: es como venía funcionando.
     */
    const prellenarCierre =
        ((auth as any)?.empresa?.cajaPrellenarMontosCierre ?? true) !== false;

    const [showApertura, setShowApertura] = useState(false);
    const [showCierre, setShowCierre] = useState(false);
    // Turno de un día anterior que se está cuadrando. null = el turno de hoy,
    // que es el caso de siempre.
    const [turnoPendiente, setTurnoPendiente] = useState<{ id: number; fecha: string } | null>(null);
    const [showGasto, setShowGasto] = useState(false);
    const [showIngreso, setShowIngreso] = useState(false);
    const [ingresoABorrar, setIngresoABorrar] = useState<number | null>(null);
    const [showTransferencia, setShowTransferencia] = useState(false);
    const [confirmCierre, setConfirmCierre] = useState(false);
    const [formApertura, setFormApertura] = useState({
        montoInicial: '' as string | number,
        observaciones: ''
    });
    const [formCierre, setFormCierre] = useState({
        montoEfectivo: '' as string | number,
        montoYape: '' as string | number,
        montoPlin: '' as string | number,
        montoTransferencia: '' as string | number,
        montoTarjeta: '' as string | number,
        observaciones: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    // Montos que el sistema espera al cierre. Se muestran como referencia
    // debajo de cada campo, pero NO se prellenan: el cajero tiene que escribir
    // lo que contó de verdad para que la diferencia del arqueo sea real (con el
    // prellenado todos los cierres salían con diferencia 0).
    const [esperadoCierre, setEsperadoCierre] = useState({
        montoEfectivo: 0, montoYape: 0, montoPlin: 0, montoTransferencia: 0, montoTarjeta: 0,
    });

    useEffect(() => {
        obtenerEstadoCaja();
        listarSedes();
    }, [obtenerEstadoCaja, listarSedes]);

    // Transferir solo tiene sentido con OTRA sede activa a la cual enviar.
    // Sin sede activa en sesión (caso raro), se exige que existan ≥2 activas.
    const hayOtrasSedes = useMemo(() => {
        const activas = sedes.filter((s) => s.activo);
        if (sedeActiva?.id) return activas.some((s) => s.id !== sedeActiva.id);
        return activas.length > 1;
    }, [sedes, sedeActiva?.id]);

    const totalDeclarado = useMemo(() => {
        return (
            (parseFloat(String(formCierre.montoEfectivo)) || 0) +
            (parseFloat(String(formCierre.montoYape)) || 0) +
            (parseFloat(String(formCierre.montoPlin)) || 0) +
            (parseFloat(String(formCierre.montoTransferencia)) || 0) +
            (parseFloat(String(formCierre.montoTarjeta)) || 0)
        );
    }, [formCierre]);

    // Lo que el sistema espera en total, medio por medio: la misma referencia
    // que sale bajo cada campo. Antes leía los ingresos de HOY de `estadoCaja`:
    // al cuadrar un turno de otro día comparaba contra las ventas de hoy, y en
    // cualquier cierre dejaba fuera el fondo inicial que sí va en el efectivo
    // declarado, así que un cierre exacto salía "sobrando" el fondo.
    const totalSistema = useMemo(() => (
        esperadoCierre.montoEfectivo + esperadoCierre.montoYape + esperadoCierre.montoPlin
        + esperadoCierre.montoTransferencia + esperadoCierre.montoTarjeta
    ), [esperadoCierre]);

    const diferencia = useMemo(() => totalDeclarado - totalSistema, [totalDeclarado, totalSistema]);

    const validateApertura = () => {
        const errors: Record<string, string> = {};
        const monto = parseFloat(String(formApertura.montoInicial));
        if (isNaN(monto) || String(formApertura.montoInicial) === '') {
            errors.montoInicial = 'El monto inicial es requerido';
        } else if (monto < 0) {
            errors.montoInicial = 'El monto no puede ser negativo';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAbrirCaja = async () => {
        if (!validateApertura()) return;
        const result = await abrirCaja({
            montoInicial: parseFloat(String(formApertura.montoInicial)) || 0,
            observaciones: formApertura.observaciones,
        });
        if (result.success) {
            setShowApertura(false);
            setFormApertura({ montoInicial: '', observaciones: '' });
            setFormErrors({});
        }
    };

    const handleCerrarCaja = async () => {
        const result = await cerrarCaja({
            ...(turnoPendiente ? { aperturaId: turnoPendiente.id } : {}),
            montoEfectivo: parseFloat(String(formCierre.montoEfectivo)) || 0,
            montoYape: parseFloat(String(formCierre.montoYape)) || 0,
            montoPlin: parseFloat(String(formCierre.montoPlin)) || 0,
            montoTransferencia: parseFloat(String(formCierre.montoTransferencia)) || 0,
            montoTarjeta: parseFloat(String(formCierre.montoTarjeta)) || 0,
            observaciones: formCierre.observaciones,
        });
        if (result.success) {
            setShowCierre(false);
            setConfirmCierre(false);
            setTurnoPendiente(null);
            setFormCierre({
                montoEfectivo: '',
                montoYape: '',
                montoPlin: '',
                montoTransferencia: '',
                montoTarjeta: '',
                observaciones: ''
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const isAbierta = estadoCaja?.estado === 'ABIERTA';
    // Con la caja cerrada, el backend devuelve el acumulado del DÍA (misma
    // ventana que ventasDelDia); con turno abierto, lo del turno. La etiqueta
    // acompaña ese cambio para no mentirle al usuario.
    const periodoLabel = isAbierta ? 'Turno' : 'Día';

    useEscapeKey(() => setShowApertura(false), showApertura);
    useEscapeKey(() => setShowCierre(false), showCierre);
    useEscapeKey(() => setShowGasto(false), showGasto);
    useEscapeKey(() => setShowIngreso(false), showIngreso);
    useEscapeKey(() => setShowTransferencia(false), showTransferencia);

    if (loading && !estadoCaja) {
        return (
            <div className="font-jakarta space-y-6">
                <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
            </div>
        );
    }

    /**
     * Lo que debería haber en el cajón, a partir del estado de un turno.
     *
     * Efectivo esperado = monto inicial + ventas en efectivo + ingresos de caja
     * (plata que se metió al cajón sin ser venta) − egresos (gastos del turno)
     * + transferencias recibidas de otra sede − transferencias enviadas a
     * otra sede.
     *
     * Sirve igual para el turno de hoy y para uno pendiente: la diferencia está
     * en de dónde sale el estado, no en la cuenta.
     */
    const calcularEsperado = (estado: any) => {
        const mediosPago = estado?.ventasDelDia?.mediosPago ?? {};
        const montoInicial = Number(estado?.movimiento?.montoInicial || 0);
        const egresos = Number(estado?.totalEgresos || 0);
        const ingresosCaja = Number(estado?.totalIngresosCaja || 0);
        const transferenciasRecibidas = Number(estado?.totalTransferenciasRecibidas || 0);
        const transferenciasEnviadas = Number(estado?.totalTransferenciasEnviadas || 0);
        return {
            montoEfectivo: Math.max(0, montoInicial + Number(mediosPago.EFECTIVO || 0) + ingresosCaja - egresos + transferenciasRecibidas - transferenciasEnviadas),
            montoYape: Number(mediosPago.YAPE || 0),
            montoPlin: Number(mediosPago.PLIN || 0),
            montoTransferencia: Number(mediosPago.TRANSFERENCIA || 0),
            montoTarjeta: Number(mediosPago.TARJETA || 0),
        };
    };

    const EN_CERO = { montoEfectivo: 0, montoYape: 0, montoPlin: 0, montoTransferencia: 0, montoTarjeta: 0 };
    const FORM_VACIO = { montoEfectivo: '', montoYape: '', montoPlin: '', montoTransferencia: '', montoTarjeta: '', observaciones: '' };

    /** Los montos del sistema, listos para el formulario. */
    const formDesdeEsperado = (esp: typeof EN_CERO, observaciones = '') => ({
        montoEfectivo: esp.montoEfectivo.toFixed(2),
        montoYape: esp.montoYape.toFixed(2),
        montoPlin: esp.montoPlin.toFixed(2),
        montoTransferencia: esp.montoTransferencia.toFixed(2),
        montoTarjeta: esp.montoTarjeta.toFixed(2),
        observaciones,
    });

    /**
     * Cuadrar un turno que quedó abierto de un día anterior.
     *
     * El esperado se le pide al backend para ESE turno: `estadoCaja` trae las
     * ventas de HOY, y mostrarlas como referencia de un turno del viernes sería
     * mentirle a quien está contando el cajón.
     */
    const handleOpenCierrePendiente = async (t: { id: number; fecha: string }) => {
        setTurnoPendiente(t);
        setEsperadoCierre(EN_CERO);
        setFormCierre(FORM_VACIO);
        setShowCierre(true);
        try {
            const { data } = await apiClient.get(`/caja/turno-pendiente/${t.id}/estado`);
            const esperado = calcularEsperado(data?.data ?? data);
            // El esperado se guarda igual aunque no se prellene: es la
            // referencia contra la que se compara lo declarado.
            setEsperadoCierre(esperado);
            if (prellenarCierre) setFormCierre(formDesdeEsperado(esperado));
        } catch {
            // Sin el esperado se puede cuadrar igual: el backend lo recalcula al
            // cerrar. Lo que no se puede es inventarlo con los números de hoy.
        }
    };

    const handleOpenCierre = () => {
        setTurnoPendiente(null);
        if (estadoCaja && estadoCaja.ventasDelDia) {
            const esperado = calcularEsperado(estadoCaja);
            setEsperadoCierre(esperado);
            setFormCierre(prellenarCierre ? formDesdeEsperado(esperado) : FORM_VACIO);
        } else {
            setFormCierre(FORM_VACIO);
        }
        setShowCierre(true);
    };

    /** Copia los montos del sistema al formulario. Es una acción explícita, no el estado inicial. */
    const usarMontosDelSistema = () => {
        setFormCierre(prev => ({
            ...prev,
            montoEfectivo: esperadoCierre.montoEfectivo.toFixed(2),
            montoYape: esperadoCierre.montoYape.toFixed(2),
            montoPlin: esperadoCierre.montoPlin.toFixed(2),
            montoTransferencia: esperadoCierre.montoTransferencia.toFixed(2),
            montoTarjeta: esperadoCierre.montoTarjeta.toFixed(2),
        }));
    };
    const HintEsperado = ({ monto }: { monto: number }) => (
        <p className="text-[11px] text-slate-400 mt-1">Según el sistema: {formatCurrency(monto)}</p>
    );

    return (
        <div className="space-y-6 font-jakarta animate-in fade-in duration-500">

            {/* Error global */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/40 dark:text-rose-300 px-4 py-3 rounded-2xl">
                    <Icon icon="solar:danger-circle-bold" className="text-xl flex-shrink-0" />
                    <span className="text-sm font-semibold flex-1">{error}</span>
                    <button onClick={clearError} className="text-rose-400 hover:text-rose-600">
                        <Icon icon="solar:close-circle-bold" className="text-lg" />
                    </button>
                </div>
            )}

            {/* Hero Status Card */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`h-16 w-16 grid place-items-center rounded-2xl ${isAbierta ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <Icon
                                icon={isAbierta ? "solar:shop-2-bold-duotone" : "solar:lock-keyhole-minimalistic-bold-duotone"}
                                className="text-4xl"
                            />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Estado del Turno</p>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-[26px] font-extrabold tracking-tight text-slate-800 dark:text-white">
                                    {isAbierta ? 'Turno Abierto' : 'Turno Cerrado'}
                                </h2>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isAbierta ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isAbierta ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {isAbierta ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            {isAbierta && estadoCaja?.movimiento && (
                                <p className="mt-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 inline-flex items-center px-3 py-1 rounded-full">
                                    <Icon icon="solar:clock-circle-linear" className="mr-1.5" />
                                    {/* El turno sigue abierto pasada la medianoche: si es de
                                        otro día, la hora sola confundiría. */}
                                    Abierto desde: {fechaCorta(estadoCaja.movimiento.fecha) !== fechaCorta(new Date().toISOString())
                                        ? `${fechaCorta(estadoCaja.movimiento.fecha)} `
                                        : ''}
                                    {new Date(estadoCaja.movimiento.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {isAbierta ? (
                            <div className="flex flex-wrap gap-2.5 justify-end">
                                <button
                                    onClick={() => setShowGasto(true)}
                                    className="h-11 px-5 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30 text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Icon icon="solar:wallet-money-bold-duotone" className="text-xl" />
                                    Registrar Gasto
                                </button>
                                <button
                                    onClick={() => setShowIngreso(true)}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-5 py-3 rounded-xl font-bold shadow-sm transition-all transform hover:scale-105 flex items-center gap-2"
                                >
                                    <Icon icon="solar:hand-money-bold-duotone" className="text-xl" />
                                    Ingreso de Caja
                                </button>
                                {hayOtrasSedes && (
                                    <button
                                        onClick={() => setShowTransferencia(true)}
                                        className="h-11 px-5 rounded-2xl bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Icon icon="solar:transfer-horizontal-bold-duotone" className="text-xl" />
                                        Transferir a otra Sede
                                    </button>
                                )}
                                <button
                                    onClick={handleOpenCierre}
                                    className="h-11 px-5 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Icon icon="solar:stop-circle-bold" className="text-xl" />
                                    Cerrar Turno
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowApertura(true)}
                                className="h-11 px-6 rounded-2xl text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                                style={{ background: ACCENT }}
                            >
                                <Icon icon="solar:play-circle-bold" className="text-xl" />
                                Abrir Nuevo Turno
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Turnos anteriores que quedaron abiertos: sus movimientos se
                contabilizan igual, pero nadie contó el cajón (no hay arqueo
                ni diferencia registrada). Antes esto pasaba en silencio. */}
            {(estadoCaja?.pendientesDeCierre?.length ?? 0) > 0 && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <div className="flex items-start gap-3">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="text-2xl text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                {estadoCaja!.pendientesDeCierre!.length === 1
                                    ? 'Tienes 1 turno anterior sin cerrar'
                                    : `Tienes ${estadoCaja!.pendientesDeCierre!.length} turnos anteriores sin cerrar`}
                            </p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                                Sus ventas y gastos sí están contabilizados, pero esos días quedaron sin arqueo: nadie contó el efectivo del cajón. Toca una fecha para cuadrarla.
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {estadoCaja!.pendientesDeCierre!.slice(0, 6).map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleOpenCierrePendiente({ id: t.id, fecha: t.fecha })}
                                        title={`Cuadrar este turno · ${[t.sede, t.usuario, t.turno].filter(Boolean).join(' · ')}`}
                                        data-testid={`cerrar-turno-${t.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                                    >
                                        <Icon icon="solar:safe-circle-bold" className="text-sm" />
                                        Cerrar turno del {fechaCorta(t.fecha)}
                                    </button>
                                ))}
                                {estadoCaja!.pendientesDeCierre!.length > 6 && (
                                    <span className="px-2 py-0.5 text-[11px] font-bold text-amber-700/70 dark:text-amber-300/70">
                                        +{estadoCaja!.pendientesDeCierre!.length - 6} más
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumen del turno abierto o, si ya se cerró, del día. */}
            {estadoCaja && (
                <div className={`grid grid-cols-1 gap-6 ${isAbierta ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {/* El monto inicial solo existe mientras el turno está abierto. */}
                    {isAbierta && (
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                            <div className="h-12 w-12 grid place-items-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 rounded-2xl">
                                <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Monto Inicial</p>
                                <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                    {formatCurrency(Number(estadoCaja?.movimiento?.montoInicial || 0))}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-2xl">
                            <Icon icon="solar:hand-money-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{`Ingresos del ${periodoLabel}`}</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.ventasDelDia?.totalIngresos || 0))}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300 rounded-2xl">
                            <Icon icon="solar:bill-list-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{`Gastos del ${periodoLabel}`}</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.totalEgresos || 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transferencias del turno — solo visible si hubo movimiento, para no
                mezclar con "Gastos del Turno" (no son gastos reales del negocio). */}
            {isAbierta && (Number(estadoCaja?.totalTransferenciasEnviadas || 0) > 0 || Number(estadoCaja?.totalTransferenciasRecibidas || 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 rounded-2xl">
                            <Icon icon="solar:round-arrow-right-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Transferido a otra Sede</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.totalTransferenciasEnviadas || 0))}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 rounded-2xl">
                            <Icon icon="solar:round-arrow-left-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Recibido de otra Sede</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.totalTransferenciasRecibidas || 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingresos de caja del turno: plata que se metió al cajón sin ser
                venta. Aparte de "Ingresos del Turno" (que son ventas) para no
                inflar lo vendido. */}
            {isAbierta && (Number(estadoCaja?.totalIngresosCaja || 0) > 0 || (estadoCaja?.ingresosRecientes?.length ?? 0) > 0) && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <Icon icon="solar:hand-money-bold-duotone" className="text-3xl" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Ingresos de Caja del Turno</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.totalIngresosCaja || 0))}
                            </p>
                        </div>
                    </div>
                    <ul className="mt-4 divide-y divide-gray-100 dark:divide-slate-800">
                        {(estadoCaja?.ingresosRecientes ?? []).map((ing) => (
                            <li key={ing.id} className="flex items-center justify-between gap-3 py-2" data-testid={`ingreso-caja-${ing.id}`}>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{ing.descripcionGasto || 'Ingreso de caja'}</p>
                                    <p className="text-[11px] text-gray-400">
                                        {new Date(ing.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        {ing.usuario?.nombre ? ` · ${ing.usuario.nombre}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+ {formatCurrency(Number(ing.monto || 0))}</span>
                                    <button
                                        type="button"
                                        onClick={() => setIngresoABorrar(ing.id)}
                                        title="Eliminar ingreso"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Icon icon="solar:trash-bin-minimalistic-linear" className="text-base" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Modal Apertura */}
            {showApertura && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 top-[-30px] flex items-center justify-center p-4 animate-in fade-in duration-200 font-jakarta">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-emerald-50 p-6 border-b border-emerald-100">
                            <h3 className="text-xl font-extrabold text-emerald-700 flex items-center gap-2">
                                <Icon icon="solar:wad-of-money-bold" className="text-2xl" /> Apertura de Caja
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <InputPro
                                label="Monto Inicial (S/)"
                                name="montoInicial"
                                type="number"
                                value={formApertura.montoInicial}
                                onChange={(e: any) => {
                                    setFormApertura({ ...formApertura, montoInicial: e.target.value });
                                    setFormErrors({});
                                }}
                                autoFocus
                                isLabel
                            />
                            {formErrors.montoInicial && (
                                <p className="text-red-500 text-xs flex items-center gap-1 -mt-2">
                                    <Icon icon="solar:danger-circle-bold" />
                                    {formErrors.montoInicial}
                                </p>
                            )}
                            <InputPro
                                label="Observaciones"
                                name="observaciones"
                                value={formApertura.observaciones}
                                onChange={(e: any) => setFormApertura({ ...formApertura, observaciones: e.target.value })}
                                isLabel
                                placeholder="Opcional"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => { setShowApertura(false); setFormErrors({}); }} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <Button onClick={handleAbrirCaja} disabled={loading} className="bg-emerald-600 text-white hover:bg-emerald-700 border-none">
                                {loading ? <Icon icon="eos-icons:loading" className="mr-2" /> : null}
                                Confirmar Apertura
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cierre */}
            {showCierre && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-jakarta">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-slate-50 p-6 border-b border-slate-100">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Icon icon="solar:safe-circle-bold" className="text-rose-500" />
                                {turnoPendiente ? `Cuadrar el turno del ${fechaCorta(turnoPendiente.fecha)}` : 'Cierre de Turno'}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {turnoPendiente
                                    ? 'Es un turno de un día anterior que quedó sin cerrar. Escribe lo que había en el cajón al terminar ESE día; el sistema calcula la diferencia contra lo que debió haber y deja anotado que se cuadró tarde.'
                                    : 'Cuenta el dinero y escribe lo que hay de verdad. Debajo de cada campo va lo que el sistema espera, solo como referencia.'}
                            </p>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <InputPro
                                    label="Efectivo en Caja (S/)"
                                    name="montoEfectivo"
                                    type="number"
                                    value={formCierre.montoEfectivo}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoEfectivo: e.target.value })}
                                    isLabel
                                    autoFocus
                                />
                                <HintEsperado monto={esperadoCierre.montoEfectivo} />
                            </div>
                            <div>
                                <InputPro
                                    label="Yape (S/)"
                                    name="montoYape"
                                    type="number"
                                    value={formCierre.montoYape}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoYape: e.target.value })}
                                    isLabel
                                />
                                <HintEsperado monto={esperadoCierre.montoYape} />
                            </div>
                            <div>
                                <InputPro
                                    label="Plin (S/)"
                                    name="montoPlin"
                                    type="number"
                                    value={formCierre.montoPlin}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoPlin: e.target.value })}
                                    isLabel
                                />
                                <HintEsperado monto={esperadoCierre.montoPlin} />
                            </div>
                            <div>
                                <InputPro
                                    label="Tarjetas (S/)"
                                    name="montoTarjeta"
                                    type="number"
                                    value={formCierre.montoTarjeta}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoTarjeta: e.target.value })}
                                    isLabel
                                />
                                <HintEsperado monto={esperadoCierre.montoTarjeta} />
                            </div>
                            <div>
                                <InputPro
                                    label="Transferencias (S/)"
                                    name="montoTransferencia"
                                    type="number"
                                    value={formCierre.montoTransferencia}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoTransferencia: e.target.value })}
                                    isLabel
                                />
                                <HintEsperado monto={esperadoCierre.montoTransferencia} />
                            </div>
                            <div className="col-span-2">
                                <InputPro
                                    label="Observaciones"
                                    name="observaciones"
                                    value={formCierre.observaciones}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, observaciones: e.target.value })}
                                    isLabel
                                    type="textarea"
                                    rows={2}
                                    placeholder="Comentarios finales del turno..."
                                />
                            </div>

                            {/* Resumen en tiempo real */}
                            <div className="col-span-2 bg-slate-50 rounded-2xl p-4 space-y-2">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Total del sistema:</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(totalSistema)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Total declarado:</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(totalDeclarado)}</span>
                                </div>
                                <div className={`flex justify-between text-sm font-bold border-t border-slate-200 pt-2 ${Math.abs(diferencia) < 0.01 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                    <span>Diferencia:</span>
                                    <span>{diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowCierre(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="button" onClick={usarMontosDelSistema} title="Copia los montos que calcula el sistema; úsalo solo si ya contaste y coincide" className="px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">Usar montos del sistema</button>
                            <Button onClick={() => setConfirmCierre(true)} className="bg-amber-500 text-white hover:bg-amber-600 border-none">
                                <Icon icon="solar:shield-warning-bold" className="mr-1" />
                                Revisar y Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmación de cierre — modal aparte, no reemplaza el pie del modal anterior */}
            <ModalConfirm
                isOpenModal={confirmCierre}
                setIsOpenModal={setConfirmCierre}
                title="Confirmar Cierre de Turno"
                information="¿Confirmas el cierre de caja? Esta acción no se puede deshacer."
                confirmText="Confirmar Cierre"
                confirmLoading={loading}
                confirmSubmit={handleCerrarCaja}
            />

            <ModalRegistrarGasto
                isOpen={showGasto}
                onClose={() => setShowGasto(false)}
                onSuccess={() => obtenerEstadoCaja()}
            />

            <ModalRegistrarIngreso
                isOpen={showIngreso}
                onClose={() => setShowIngreso(false)}
                onSuccess={() => obtenerEstadoCaja()}
            />

            <ModalConfirm
                isOpenModal={ingresoABorrar != null}
                setIsOpenModal={(v: boolean) => { if (!v) setIngresoABorrar(null); }}
                title="Eliminar ingreso de caja"
                information="¿Eliminar este ingreso? Deja de sumar al efectivo esperado del cierre."
                confirmText="Eliminar"
                confirmLoading={loading}
                confirmSubmit={async () => {
                    if (ingresoABorrar == null) return;
                    await eliminarIngreso(ingresoABorrar);
                    setIngresoABorrar(null);
                }}
            />

            <ModalTransferirCaja
                isOpen={showTransferencia}
                onClose={() => setShowTransferencia(false)}
                onSuccess={() => obtenerEstadoCaja()}
            />
        </div>
    );
};

export default CajaControl;
