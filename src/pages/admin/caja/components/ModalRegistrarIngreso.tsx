import React, { useState } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { Icon } from '@iconify/react';
import { useCajaStore } from '@/zustand/caja';
import useAlertStore from '@/zustand/alert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const INITIAL_FORM = {
  monto: '' as string | number,
  descripcion: '',
};

/**
 * Meter plata al cajón durante el turno sin que sea una venta: sencillo, un
 * aporte del dueño, un cobro suelto. Pedido de LA DESPENSA HM (21-10).
 *
 * Siempre es efectivo —es plata que entra al cajón— y suma al efectivo que el
 * sistema espera encontrar al cerrar el turno. Por eso no hay método de pago.
 */
const ModalRegistrarIngreso: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { registrarIngreso, loading } = useCajaStore();
  const { alert } = useAlertStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const monto = parseFloat(String(form.monto));
    if (!form.monto || isNaN(monto) || monto <= 0) e.monto = 'Ingresa un monto válido';
    if (!form.descripcion.trim()) e.descripcion = 'Escribe de dónde sale la plata';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await registrarIngreso({
      monto: parseFloat(String(form.monto)),
      descripcion: form.descripcion.trim(),
    });
    if (result.success) {
      alert('Ingreso registrado correctamente', 'success');
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess?.();
      onClose();
    } else {
      alert(result.message || 'Error al registrar ingreso', 'error');
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
      title="Ingreso de Caja"
      width="480px"
      icon="solar:hand-money-bold-duotone"
      iconClass="text-emerald-500"
      height="auto"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Plata en efectivo que metes al cajón y no es una venta. Se suma a lo que el sistema espera encontrar al cerrar el turno.
        </p>

        <InputPro
          label="Monto (S/) *"
          name="monto"
          type="number"
          value={form.monto}
          onChange={(e: any) => {
            setForm(prev => ({ ...prev, monto: e.target.value }));
            setErrors(prev => ({ ...prev, monto: '' }));
          }}
          isLabel
          error={errors.monto}
          autoFocus
        />

        <InputPro
          label="¿De dónde sale la plata? *"
          name="descripcion"
          value={form.descripcion}
          onChange={(e: any) => {
            setForm(prev => ({ ...prev, descripcion: e.target.value }));
            setErrors(prev => ({ ...prev, descripcion: '' }));
          }}
          isLabel
          error={errors.descripcion}
          placeholder="Ej: sencillo, aporte del dueño, cobro suelto"
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
          >
            {loading
              ? <Icon icon="eos-icons:loading" className="mr-2" />
              : <Icon icon="solar:arrow-left-down-bold" className="mr-2" />
            }
            Registrar Ingreso
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalRegistrarIngreso;
