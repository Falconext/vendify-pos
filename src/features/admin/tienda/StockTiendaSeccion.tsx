import { Icon } from '@iconify/react';
import {
    MODOS_STOCK,
    alternarSede,
    sedeEfectiva,
    sedesHabilitadas,
    type SedeEmpresa,
    type StockTiendaForm,
} from './stockTiendaConfig';

interface Props {
    form: StockTiendaForm;
    sedes: SedeEmpresa[];
    aviso: boolean;
    error: string | null;
    guardando: boolean;
    onChange: (form: StockTiendaForm) => void;
    /** "Mantener este modo": guarda la elección sin cambiar nada (apaga el aviso). */
    onConfirmar: () => void;
}

const selectCls = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

/** Sección "Stock de la tienda virtual" (Tienda → Configuración). */
export default function StockTiendaSeccion({ form, sedes, aviso, error, guardando, onChange, onConfirmar }: Props) {
    if (sedes.length <= 1) {
        return (
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6" data-testid="stock-tienda-una-sede">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Icon icon="solar:box-bold-duotone" className="text-xl text-emerald-500" />
                    Stock de la tienda virtual
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {sedes.length === 1 ? `Tu tienda vende el stock de ${sedes[0].nombre}.` : 'Tu tienda vende el stock de tu inventario.'} Si abres otra sede podrás elegir de dónde vende.
                </p>
            </div>
        );
    }

    const efectiva = sedeEfectiva(form, sedes);
    const habilitadas = sedesHabilitadas(form, sedes);
    const modoActual = MODOS_STOCK.find((m) => m.id === form.modo);

    return (
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6" data-testid="stock-tienda-seccion">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <Icon icon="solar:box-bold-duotone" className="text-xl text-emerald-500" />
                Stock de la tienda virtual
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Tienes {sedes.length} sedes: elige de qué stock vende tu tienda.</p>

            {aviso && (
                <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200 sm:flex-row sm:items-center" role="alert" data-testid="aviso-stock-tienda">
                    <Icon icon="solar:danger-triangle-bold" className="h-5 w-5 flex-none" />
                    <p className="flex-1">
                        <strong className="font-semibold">Revisa este ajuste.</strong> Hoy tu tienda {form.modo === 'TODAS' ? 'suma el stock de todas tus sedes' : `vende como "${modoActual?.titulo}"`}. Elige el modo que va con tu negocio o mantenlo.
                    </p>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={guardando}
                        className="inline-flex flex-none items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                        <Icon icon={guardando ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} />
                        Mantener "{modoActual?.titulo}"
                    </button>
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Modo de stock de la tienda">
                {MODOS_STOCK.map((m) => {
                    const activo = form.modo === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            data-testid={`modo-stock-${m.id}`}
                            onClick={() => onChange({ ...form, modo: m.id })}
                            className={`flex h-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition ${activo ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30' : 'border-gray-100 hover:border-gray-200 dark:border-slate-800 dark:hover:border-slate-700'}`}
                        >
                            <span className="flex w-full items-center justify-between">
                                <Icon icon={m.icono} className={`text-2xl ${activo ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`h-4 w-4 rounded-full border-2 ${activo ? 'border-blue-600 bg-blue-600 ring-2 ring-inset ring-white dark:ring-[#111827]' : 'border-gray-300 dark:border-slate-600'}`} />
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.titulo}</span>
                            <span className="text-xs leading-5 text-gray-500 dark:text-gray-400">{m.descripcion}</span>
                            <span className="mt-auto text-[11px] font-medium text-gray-400 dark:text-gray-500">{m.paraQuien}</span>
                        </button>
                    );
                })}
            </div>

            {form.modo === 'SEDE' && (
                <label className="mt-5 block max-w-sm">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Sede de la tienda</span>
                    <select
                        data-testid="stock-sede-tienda"
                        value={efectiva ?? ''}
                        onChange={(e) => onChange({ ...form, sedeId: Number(e.target.value) || null })}
                        className={selectCls}
                    >
                        {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}{s.esPrincipal ? ' (principal)' : ''}</option>)}
                    </select>
                    <span className="mt-1 block text-xs text-gray-400">El recojo en tienda muestra la dirección de esta sede.</span>
                </label>
            )}

            {form.modo !== 'SEDE' && (
                <div className="mt-5 grid gap-5 md:grid-cols-[1fr_minmax(0,18rem)]">
                    <fieldset>
                        <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {form.modo === 'CLIENTE' ? 'Sedes que tu cliente puede elegir' : 'Sedes cuyo stock se suma'}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {sedes.map((s) => {
                                const marcada = habilitadas.includes(s.id);
                                const unica = marcada && habilitadas.length === 1;
                                return (
                                    <label key={s.id} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${marcada ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20' : 'border-gray-100 dark:border-slate-800'} ${unica ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            data-testid={`stock-sede-check-${s.id}`}
                                            checked={marcada}
                                            disabled={unica}
                                            onChange={() => onChange(alternarSede(form, sedes, s.id))}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                        <span className="min-w-0">
                                            <span className="block font-medium text-gray-800 dark:text-gray-100">{s.nombre}{s.esPrincipal ? ' · principal' : ''}</span>
                                            <span className="block truncate text-xs text-gray-400">{s.direccion || 'Sin dirección: agrégala en Sedes para mostrarla en el recojo'}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="mt-1.5 text-xs text-gray-400">
                            {form.sedesIds.length === 0 ? 'Todas marcadas: las sedes que crees después se agregan solas.' : `${habilitadas.length} de ${sedes.length} sedes.`}
                            {form.modo === 'CLIENTE' && habilitadas.length === 1 ? ' Con una sola sede tu cliente no verá el selector.' : ''}
                        </p>
                    </fieldset>

                    {form.modo === 'CLIENTE' && (
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">La tienda abre en</span>
                            <select
                                data-testid="stock-sede-inicial"
                                value={efectiva && habilitadas.includes(efectiva) ? efectiva : habilitadas[0] ?? ''}
                                onChange={(e) => onChange({ ...form, sedeId: Number(e.target.value) || null })}
                                className={selectCls}
                            >
                                {sedes.filter((s) => habilitadas.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <span className="mt-1 block text-xs text-gray-400">Lo que ve quien entra por primera vez hasta que elige su sede.</span>
                        </label>
                    )}
                </div>
            )}

            {error && (
                <p className="mt-4 flex items-start gap-1.5 text-xs font-medium text-rose-600" role="alert">
                    <Icon icon="solar:danger-circle-linear" className="mt-0.5 flex-none" /> {error}
                </p>
            )}
        </div>
    );
}
