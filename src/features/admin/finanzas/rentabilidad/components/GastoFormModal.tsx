import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import {
    GastoOperativo,
    GastoFormData,
    CATEGORIAS_FIJAS,
    getMesFullLabel,
} from '../RentabilidadModel';

interface GastoFormModalProps {
    isOpen: boolean;
    mesActual: number;
    anioActual: number;
    gastoEditando: GastoOperativo | null;
    isSaving: boolean;
    onClose: () => void;
    onCrear: (data: GastoFormData) => Promise<boolean>;
    onActualizar: (id: number, data: Partial<GastoFormData>) => Promise<boolean>;
}

const INITIAL_FORM = {
    categoria: 'PUBLICIDAD',
    etiqueta: '',
    monto: '',
    fecha: '',
    recurrenteDiario: false,
    fechaFin: '',
    descripcion: '',
};

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDefaultDate(mes: number, anio: number): string {
    const now = new Date();
    if (now.getFullYear() === anio && now.getMonth() + 1 === mes) {
        return toDateInputValue(now);
    }
    return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

export default function GastoFormModal({
    isOpen,
    mesActual,
    anioActual,
    gastoEditando,
    isSaving,
    onClose,
    onCrear,
    onActualizar,
}: GastoFormModalProps) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const minDate = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`;
    const maxDate = toDateInputValue(new Date(anioActual, mesActual, 0));

    // Populate form when editing
    useEffect(() => {
        if (gastoEditando) {
            setForm({
                categoria: gastoEditando.categoria,
                etiqueta: gastoEditando.etiqueta ?? '',
                monto: String(gastoEditando.monto),
                fecha: gastoEditando.fechaInicio?.slice(0, 10) ?? gastoEditando.fecha?.slice(0, 10) ?? getDefaultDate(mesActual, anioActual),
                recurrenteDiario: gastoEditando.recurrenteDiario,
                fechaFin: gastoEditando.fechaFin?.slice(0, 10) ?? '',
                descripcion: gastoEditando.descripcion ?? '',
            });
        } else {
            setForm({ ...INITIAL_FORM, fecha: getDefaultDate(mesActual, anioActual) });
        }
        setErrors({});
    }, [gastoEditando, isOpen, mesActual, anioActual]);

    if (!isOpen) return null;

    const isPersonalizada = form.categoria === 'PERSONALIZADA';

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!form.categoria) newErrors.categoria = 'Selecciona una categoría';
        if (!form.fecha) newErrors.fecha = 'Selecciona la fecha del gasto';
        if (!form.recurrenteDiario && form.fecha && (form.fecha < minDate || form.fecha > maxDate)) {
            newErrors.fecha = 'La fecha debe pertenecer al período seleccionado';
        }
        if (form.recurrenteDiario && form.fechaFin && form.fechaFin < form.fecha) {
            newErrors.fechaFin = 'La fecha final no puede ser menor al inicio';
        }
        if (isPersonalizada && !form.etiqueta.trim()) {
            newErrors.etiqueta = 'Ingresa un nombre para el gasto personalizado';
        }
        const montoNum = parseFloat(form.monto);
        if (!form.monto || isNaN(montoNum) || montoNum <= 0) {
            newErrors.monto = 'Ingresa un monto válido mayor a 0';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: GastoFormData = {
            mes: mesActual,
            anio: anioActual,
            fecha: form.fecha,
            recurrenteDiario: form.recurrenteDiario,
            ...(form.recurrenteDiario ? { fechaInicio: form.fecha } : {}),
            ...(form.recurrenteDiario && form.fechaFin ? { fechaFin: form.fechaFin } : {}),
            categoria: form.categoria,
            monto: parseFloat(form.monto),
            ...(form.etiqueta.trim() ? { etiqueta: form.etiqueta.trim() } : {}),
            ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
        };

        if (gastoEditando) {
            await onActualizar(gastoEditando.id, payload);
        } else {
            await onCrear(payload);
        }
    };

    const handleChange = (field: keyof typeof form, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const selectedCategoria = CATEGORIAS_FIJAS.find(c => c.key === form.categoria);

    return (
        <div className="fixed top-[-30px] inset-0 z-[999999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50  "
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-gray-100/50 dark:border-transparent overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <Icon
                                icon={gastoEditando ? 'solar:pen-bold-duotone' : 'solar:add-circle-bold-duotone'}
                                className="text-indigo-600 dark:text-indigo-400 text-xl"
                            />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">
                                {gastoEditando ? 'Editar Gasto' : 'Registrar Gasto'}
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Período: {getMesFullLabel(mesActual)} {anioActual}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon icon="solar:close-circle-bold" className="text-xl" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Categoría */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Categoría
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIAS_FIJAS.map(cat => (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => handleChange('categoria', cat.key)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                        form.categoria === cat.key
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <Icon icon={cat.icon} className="text-base flex-shrink-0" />
                                    <span className="truncate">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                        {errors.categoria && (
                            <p className="mt-1 text-xs text-rose-500">{errors.categoria}</p>
                        )}
                    </div>

                    {/* Etiqueta (only for PERSONALIZADA) */}
                    {isPersonalizada && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Nombre del gasto <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Icon icon="solar:tag-bold" className="text-gray-400 text-base" />
                                </div>
                                <input
                                    type="text"
                                    value={form.etiqueta}
                                    onChange={e => handleChange('etiqueta', e.target.value)}
                                    placeholder="Ej: Hosting, Internet, Contador..."
                                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                        errors.etiqueta
                                            ? 'border-rose-400 dark:border-rose-500'
                                            : 'border-gray-200 dark:border-slate-700'
                                    }`}
                                />
                            </div>
                            {errors.etiqueta && (
                                <p className="mt-1 text-xs text-rose-500">{errors.etiqueta}</p>
                            )}
                        </div>
                    )}

                    {/* Monto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                {form.recurrenteDiario ? 'Monto diario (S/)' : 'Monto (S/)'} <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-sm font-semibold">S/</span>
                                </div>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={form.monto}
                                    onChange={e => handleChange('monto', e.target.value)}
                                placeholder={form.recurrenteDiario ? 'Ej: 400.00 por día' : '0.00'}
                                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors tabular-nums ${
                                        errors.monto
                                            ? 'border-rose-400 dark:border-rose-500'
                                            : 'border-gray-200 dark:border-slate-700'
                                    }`}
                                />
                            </div>
                            {errors.monto && (
                                <p className="mt-1 text-xs text-rose-500">{errors.monto}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                {form.recurrenteDiario ? 'Inicio' : 'Fecha'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={form.recurrenteDiario ? undefined : minDate}
                                max={form.recurrenteDiario ? undefined : maxDate}
                                value={form.fecha}
                                onChange={e => handleChange('fecha', e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                    errors.fecha
                                        ? 'border-rose-400 dark:border-rose-500'
                                        : 'border-gray-200 dark:border-slate-700'
                                }`}
                            />
                            {errors.fecha && (
                                <p className="mt-1 text-xs text-rose-500">{errors.fecha}</p>
                            )}
                        </div>
                    </div>

                    {form.categoria === 'PUBLICIDAD' && (
                        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/70 dark:bg-indigo-900/10 p-4 space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.recurrenteDiario}
                                    onChange={e => handleChange('recurrenteDiario', e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">
                                        Repetir diariamente
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Úsalo para campañas activas. El sistema aplicará este monto cada día y calculará tu ganancia neta automáticamente, sin que lo registres manualmente.
                                    </span>
                                </span>
                            </label>

                            {form.recurrenteDiario && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                                        Termina el
                                        <span className="ml-1 font-normal normal-case text-gray-400">(opcional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        min={form.fecha || minDate}
                                        value={form.fechaFin}
                                        onChange={e => handleChange('fechaFin', e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                            errors.fechaFin
                                                ? 'border-rose-400 dark:border-rose-500'
                                                : 'border-indigo-100 dark:border-slate-700'
                                        }`}
                                    />
                                    {errors.fechaFin && (
                                        <p className="mt-1 text-xs text-rose-500">{errors.fechaFin}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Descripción
                            <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
                        </label>
                        <textarea
                            rows={2}
                            value={form.descripcion}
                            onChange={e => handleChange('descripcion', e.target.value)}
                            placeholder="Detalles adicionales del gasto..."
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Period badge */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl">
                        <Icon icon="solar:calendar-bold" className="text-gray-400 text-base flex-shrink-0" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {form.recurrenteDiario ? 'Se descontará diariamente desde ' : 'Se descontará del día '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {form.fecha || `${getMesFullLabel(mesActual)} ${anioActual}`}
                                {form.recurrenteDiario && form.fechaFin ? ` hasta ${form.fechaFin}` : ''}
                            </span>
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/20"
                        >
                            {isSaving ? (
                                <>
                                    <Icon icon="eos-icons:loading" className="text-base animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Icon
                                        icon={gastoEditando ? 'solar:pen-bold' : 'solar:add-circle-bold'}
                                        className="text-base"
                                    />
                                    {gastoEditando ? 'Actualizar' : 'Guardar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
