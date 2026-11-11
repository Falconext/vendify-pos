import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import Button from '@/components/Button';
import { Icon } from '@iconify/react';
import { useCajaStore, MovimientoCaja } from '@/zustand/caja';
import { useCuentasBancariasStore, ICuentaBancaria } from '@/zustand/cuentasBancarias';
import useAlertStore from '@/zustand/alert';
import { get } from '@/utils/fetch';
import { cn } from '@/utils/cn';

interface Props {
  isOpen: boolean;
  cierresSeleccionados: MovimientoCaja[];
  onClose: () => void;
  onSuccess?: () => void;
}

/** Una fila del reparto: el monto se guarda como texto mientras se escribe. */
interface FilaReparto {
  key: number;
  cuentaBancariaId: number | '';
  monto: string;
  numeroOperacion: string;
}

interface SugerenciaReparto {
  totalEfectivo: number;
  efectivoConComprobante: number;
  sugerido: { conComprobante: number; resto: number };
}

const MAX_CUENTAS = 5;

const INITIAL_FORM = () => ({
  cuentaBancariaId: '' as string | number,
  fecha: moment().format('YYYY-MM-DD'),
  numeroOperacion: '',
});

let siguienteKey = 1;
const filaVacia = (monto = ''): FilaReparto => ({
  key: siguienteKey++,
  cuentaBancariaId: '',
  monto,
  numeroOperacion: '',
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

const redondear = (n: number) => Math.round(n * 100) / 100;

const nombreCuenta = (c: ICuentaBancaria) =>
  c.alias ? `${c.alias} (${c.banco})` : `${c.banco} · ${c.numeroCuenta}`;

const ModalMarcarDeposito: React.FC<Props> = ({ isOpen, cierresSeleccionados, onClose, onSuccess }) => {
  const { marcarCierresDepositados, loading } = useCajaStore();
  const { cuentas, listar } = useCuentasBancariasStore();
  const { alert } = useAlertStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repartir, setRepartir] = useState(false);
  const [filas, setFilas] = useState<FilaReparto[]>(() => [filaVacia(), filaVacia()]);
  const [sugerencia, setSugerencia] = useState<SugerenciaReparto | null>(null);

  const idsSeleccionados = cierresSeleccionados.map((c) => c.id).join(',');

  useEffect(() => {
    if (isOpen) listar();
  }, [isOpen, listar]);

  // Cuánto del efectivo se cobró con factura/boleta: guía para repartir.
  useEffect(() => {
    if (!isOpen || !idsSeleccionados) return;
    let vigente = true;
    setSugerencia(null);
    get<SugerenciaReparto>(`caja/depositos/sugerencia-reparto?cierreIds=${idsSeleccionados}`).then((r) => {
      if (vigente && r.success && r.data) setSugerencia(r.data);
    });
    return () => {
      vigente = false;
    };
  }, [isOpen, idsSeleccionados]);

  const cuentasActivas = cuentas.filter((c) => c.activo);
  const puedeRepartir = cuentasActivas.length >= 2;
  const totalSeleccionado = redondear(
    cierresSeleccionados.reduce((sum, c) => sum + Number(c.montoEfectivo || 0), 0),
  );

  const asignado = useMemo(
    () => redondear(filas.reduce((s, f) => s + (Number(f.monto) || 0), 0)),
    [filas],
  );
  const pendiente = redondear(totalSeleccionado - asignado);
  const cuadra = Math.abs(pendiente) < 0.01;

  const sugerenciaUtil =
    sugerencia && sugerencia.sugerido.conComprobante > 0 && sugerencia.sugerido.resto > 0
      ? sugerencia
      : null;

  const actualizarFila = (key: number, cambios: Partial<FilaReparto>) => {
    setFilas((prev) => {
      const next = prev.map((f) => (f.key === key ? { ...f, ...cambios } : f));
      // Con dos cuentas, lo que se escribe en una completa la otra: es el caso
      // de siempre (lo facturado a una cuenta, el resto a la otra).
      if (cambios.monto !== undefined && next.length === 2) {
        const resto = redondear(totalSeleccionado - (Number(cambios.monto) || 0));
        return next.map((f) =>
          f.key === key ? f : { ...f, monto: resto > 0 ? resto.toFixed(2) : '' },
        );
      }
      return next;
    });
    setErrors({});
  };

  const usarSugerencia = () => {
    if (!sugerenciaUtil) return;
    setFilas((prev) => {
      const [a, b, ...resto] = prev.length >= 2 ? prev : [...prev, filaVacia()];
      return [
        { ...a, monto: sugerenciaUtil.sugerido.conComprobante.toFixed(2) },
        { ...b, monto: sugerenciaUtil.sugerido.resto.toFixed(2) },
        ...resto.map((f) => ({ ...f, monto: '' })),
      ];
    });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!repartir) {
      if (!form.cuentaBancariaId) e.cuentaBancariaId = 'Selecciona la cuenta destino';
    } else {
      filas.forEach((f) => {
        if (!f.cuentaBancariaId) e[`cuenta-${f.key}`] = 'Elige la cuenta';
        if (!(Number(f.monto) > 0)) e[`monto-${f.key}`] = 'Monto';
      });
      const ids = filas.map((f) => f.cuentaBancariaId).filter(Boolean);
      if (new Set(ids).size !== ids.length) e.reparto = 'Elegiste la misma cuenta dos veces.';
      else if (!cuadra)
        e.reparto =
          pendiente > 0
            ? `Faltan ${formatCurrency(pendiente)} por asignar.`
            : `El reparto se pasa por ${formatCurrency(-pendiente)}.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setRepartir(false);
    setFilas([filaVacia(), filaVacia()]);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await marcarCierresDepositados({
      cierreIds: cierresSeleccionados.map((c) => c.id),
      fecha: form.fecha || undefined,
      ...(repartir
        ? {
            repartos: filas.map((f) => ({
              cuentaBancariaId: Number(f.cuentaBancariaId),
              monto: redondear(Number(f.monto)),
              numeroOperacion: f.numeroOperacion.trim() || undefined,
            })),
          }
        : {
            cuentaBancariaId: Number(form.cuentaBancariaId),
            numeroOperacion: form.numeroOperacion || undefined,
          }),
    });
    if (result.success) {
      alert(result.message || 'Depósito registrado correctamente', 'success');
      reset();
      onSuccess?.();
      onClose();
    } else {
      alert(result.message || 'Error al registrar el depósito', 'error');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const opcionesCuenta = cuentasActivas.map((c) => ({ id: c.id, value: nombreCuenta(c) }));
  const cuentaPorId = (id: number | string) => cuentasActivas.find((c) => c.id === Number(id));

  const campoFecha = (
    <Calendar
      name="fecha"
      text="Fecha del depósito"
      portal
      value={form.fecha ? moment(form.fecha).format('DD/MM/YYYY') : ''}
      onChange={(date: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        setForm((prev) => ({ ...prev, fecha: moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') }));
      }}
    />
  );

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={handleClose}
      title="Marcar como Depositado"
      width={repartir ? '640px' : '480px'}
      icon="solar:card-transfer-bold-duotone"
      iconClass="text-emerald-500"
      height="auto"
    >
      <div className="p-6 space-y-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide">
              {cierresSeleccionados.length} cierre(s) seleccionado(s)
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
              {formatCurrency(totalSeleccionado)}
            </p>
          </div>
          <Icon icon="solar:wad-of-money-bold-duotone" className="text-4xl text-emerald-400" />
        </div>

        {cuentasActivas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tienes cuentas bancarias registradas. Agrega una en Empresa → Cuentas Bancarias.
          </p>
        ) : (
          <>
            {/* Una cuenta o repartido entre varias */}
            <div
              role="radiogroup"
              aria-label="Destino del depósito"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800"
            >
              {[
                { id: false, label: 'Una cuenta', icon: 'solar:card-bold-duotone' },
                { id: true, label: 'Repartir entre cuentas', icon: 'solar:card-transfer-bold-duotone' },
              ].map((op) => {
                const activo = repartir === op.id;
                const bloqueado = op.id && !puedeRepartir;
                return (
                  <button
                    key={op.label}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    disabled={bloqueado}
                    onClick={() => {
                      setRepartir(op.id);
                      setErrors({});
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                      activo
                        ? 'bg-white dark:bg-[#111827] text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                      bloqueado && 'opacity-40 cursor-not-allowed hover:text-gray-500',
                    )}
                  >
                    <Icon icon={op.icon} className="text-base" />
                    {op.label}
                  </button>
                );
              })}
            </div>
            {!puedeRepartir && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2">
                Para repartir el efectivo, registra tu otra cuenta en la pestaña Bancos.
              </p>
            )}

            {!repartir ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Select
                    label="Cuenta destino *"
                    name="cuentaBancariaId"
                    error={errors.cuentaBancariaId || ''}
                    defaultValue={
                      cuentaPorId(form.cuentaBancariaId)
                        ? `${cuentaPorId(form.cuentaBancariaId)!.banco} · ${cuentaPorId(form.cuentaBancariaId)!.numeroCuenta}`
                        : 'Seleccionar cuenta'
                    }
                    onChange={(id: any) => {
                      setForm((prev) => ({ ...prev, cuentaBancariaId: Number(id) }));
                      setErrors((prev) => ({ ...prev, cuentaBancariaId: '' }));
                    }}
                    options={opcionesCuenta}
                  />
                </div>

                <div>{campoFecha}</div>

                <div>
                  <InputPro
                    label="N° de operación"
                    name="numeroOperacion"
                    value={form.numeroOperacion}
                    onChange={(e: any) => setForm((prev) => ({ ...prev, numeroOperacion: e.target.value }))}
                    isLabel
                    placeholder="Opcional"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sugerenciaUtil && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-900/15 p-3">
                    <Icon icon="solar:lightbulb-bolt-bold-duotone" className="text-2xl text-indigo-500 shrink-0 hidden sm:block" />
                    <p className="text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-relaxed">
                      De este efectivo,{' '}
                      <strong>{formatCurrency(sugerenciaUtil.sugerido.conComprobante)}</strong> se cobró con
                      factura o boleta y <strong>{formatCurrency(sugerenciaUtil.sugerido.resto)}</strong> con
                      notas de venta u otros.
                    </p>
                    <button
                      type="button"
                      onClick={usarSugerencia}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      Usar este reparto
                    </button>
                  </div>
                )}

                <div className="space-y-3" data-testid="filas-reparto">
                  {filas.map((f, i) => (
                    <div
                      key={f.key}
                      className="relative grid grid-cols-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:gap-3 items-end rounded-xl border border-gray-100 dark:border-slate-800 p-3 sm:border-0 sm:p-0"
                    >
                      <div className="col-span-2 sm:col-span-1 pr-11 sm:pr-0">
                        <Select
                          label={i === 0 ? 'Cuenta *' : ''}
                          withLabel={i === 0}
                          name={`cuenta-${f.key}`}
                          error={errors[`cuenta-${f.key}`] || ''}
                          defaultValue={
                            f.cuentaBancariaId && cuentaPorId(f.cuentaBancariaId)
                              ? nombreCuenta(cuentaPorId(f.cuentaBancariaId)!)
                              : 'Seleccionar cuenta'
                          }
                          onChange={(id: any) => actualizarFila(f.key, { cuentaBancariaId: Number(id) })}
                          options={opcionesCuenta}
                        />
                      </div>
                      <div>
                        <InputPro
                          label="Monto (S/)"
                          isLabel={i === 0}
                          name={`monto-${f.key}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={f.monto}
                          error={errors[`monto-${f.key}`] || null}
                          onChange={(e: any) => actualizarFila(f.key, { monto: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <InputPro
                          label="N° de operación"
                          isLabel={i === 0}
                          name={`operacion-${f.key}`}
                          value={f.numeroOperacion}
                          onChange={(e: any) => actualizarFila(f.key, { numeroOperacion: e.target.value })}
                          placeholder="Opcional"
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Quitar cuenta"
                        disabled={filas.length <= 2}
                        onClick={() => setFilas((prev) => prev.filter((x) => x.key !== f.key))}
                        className="absolute top-3 right-3 sm:static h-10 w-10 grid place-items-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                      >
                        <Icon icon="solar:trash-bin-minimalistic-linear" className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>

                {filas.length < Math.min(MAX_CUENTAS, cuentasActivas.length) && (
                  <button
                    type="button"
                    onClick={() => setFilas((prev) => [...prev, filaVacia(pendiente > 0 ? pendiente.toFixed(2) : '')])}
                    className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <Icon icon="solar:add-circle-linear" className="text-base" />
                    Agregar otra cuenta
                  </button>
                )}

                {/* Cuánto falta asignar */}
                <div
                  aria-live="polite"
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm',
                    cuadra
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
                  )}
                >
                  <span>
                    Asignado <strong>{formatCurrency(asignado)}</strong> de {formatCurrency(totalSeleccionado)}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold" data-testid="estado-reparto">
                    <Icon icon={cuadra ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} />
                    {cuadra
                      ? 'Cuadra'
                      : pendiente > 0
                        ? `Faltan ${formatCurrency(pendiente)}`
                        : `Sobran ${formatCurrency(-pendiente)}`}
                  </span>
                </div>
                {errors.reparto && (
                  <p className="text-[#D35130] font-bold text-sm -mt-2">{errors.reparto}</p>
                )}

                <div className="sm:w-1/2">{campoFecha}</div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleSubmit}
            disabled={loading || cuentasActivas.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
          >
            {loading
              ? <Icon icon="eos-icons:loading" className="mr-2" />
              : <Icon icon="solar:check-circle-bold" className="mr-2" />
            }
            Marcar como Depositado
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalMarcarDeposito;
