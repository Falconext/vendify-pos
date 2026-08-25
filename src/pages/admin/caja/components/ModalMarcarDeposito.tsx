import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import Button from '@/components/Button';
import { Icon } from '@iconify/react';
import { useCajaStore, MovimientoCaja } from '@/zustand/caja';
import { useCuentasBancariasStore } from '@/zustand/cuentasBancarias';
import useAlertStore from '@/zustand/alert';

interface Props {
  isOpen: boolean;
  cierresSeleccionados: MovimientoCaja[];
  onClose: () => void;
  onSuccess?: () => void;
}

const INITIAL_FORM = () => ({
  cuentaBancariaId: '' as string | number,
  fecha: moment().format('YYYY-MM-DD'),
  numeroOperacion: '',
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

const ModalMarcarDeposito: React.FC<Props> = ({ isOpen, cierresSeleccionados, onClose, onSuccess }) => {
  const { marcarCierresDepositados, loading } = useCajaStore();
  const { cuentas, listar } = useCuentasBancariasStore();
  const { alert } = useAlertStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) listar();
  }, [isOpen, listar]);

  const cuentasActivas = cuentas.filter((c) => c.activo);
  const totalSeleccionado = cierresSeleccionados.reduce(
    (sum, c) => sum + Number(c.montoEfectivo || 0),
    0,
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.cuentaBancariaId) e.cuentaBancariaId = 'Selecciona la cuenta destino';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await marcarCierresDepositados({
      cierreIds: cierresSeleccionados.map((c) => c.id),
      cuentaBancariaId: Number(form.cuentaBancariaId),
      fecha: form.fecha || undefined,
      numeroOperacion: form.numeroOperacion || undefined,
    });
    if (result.success) {
      alert(result.message || 'Depósito registrado correctamente', 'success');
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess?.();
      onClose();
    } else {
      alert(result.message || 'Error al registrar el depósito', 'error');
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={handleClose}
      title="Marcar como Depositado"
      width="480px"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Select
                label="Cuenta destino *"
                name="cuentaBancariaId"
                error={errors.cuentaBancariaId || ''}
                defaultValue={
                  cuentasActivas.find((c) => c.id === form.cuentaBancariaId)
                    ? `${cuentasActivas.find((c) => c.id === form.cuentaBancariaId)!.banco} · ${cuentasActivas.find((c) => c.id === form.cuentaBancariaId)!.numeroCuenta}`
                    : 'Seleccionar cuenta'
                }
                onChange={(id: any) => {
                  setForm((prev) => ({ ...prev, cuentaBancariaId: Number(id) }));
                  setErrors((prev) => ({ ...prev, cuentaBancariaId: '' }));
                }}
                options={cuentasActivas.map((c) => ({
                  id: c.id,
                  value: c.alias ? `${c.alias} (${c.banco})` : `${c.banco} · ${c.numeroCuenta}`,
                }))}
              />
            </div>

            <div>
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
            </div>

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
