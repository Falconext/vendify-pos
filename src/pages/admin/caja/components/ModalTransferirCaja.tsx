import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import Button from '@/components/Button';
import { Icon } from '@iconify/react';
import { useCajaStore } from '@/zustand/caja';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const INITIAL_FORM = {
  sedeDestinoId: '' as string | number,
  monto: '' as string | number,
  observaciones: '',
};

const ModalTransferirCaja: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { transferirCaja, loading } = useCajaStore();
  const { sedes, listarSedes } = useSedesStore();
  const { sedeActiva } = useAuthStore();
  const { alert } = useAlertStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) listarSedes();
  }, [isOpen, listarSedes]);

  // Sedes activas distintas a la propia; la sede principal aparece primero
  // como sugerencia natural para consolidar efectivo ahí.
  const sedesDestino = useMemo(() => {
    return [...sedes]
      .filter((s) => s.activo && s.id !== sedeActiva?.id)
      .sort((a, b) => (b.esPrincipal ? 1 : 0) - (a.esPrincipal ? 1 : 0));
  }, [sedes, sedeActiva?.id]);

  const validate = () => {
    const e: Record<string, string> = {};
    const monto = parseFloat(String(form.monto));
    if (!form.sedeDestinoId) e.sedeDestinoId = 'Selecciona la sede destino';
    if (!form.monto || isNaN(monto) || monto <= 0) e.monto = 'Ingresa un monto válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await transferirCaja({
      sedeDestinoId: Number(form.sedeDestinoId),
      monto: parseFloat(String(form.monto)),
      observaciones: form.observaciones || undefined,
    });
    if (result.success) {
      alert(result.message || 'Transferencia registrada correctamente', 'success');
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess?.();
      onClose();
    } else {
      alert(result.message || 'Error al transferir', 'error');
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
      title="Transferir a otra Sede"
      width="480px"
      icon="solar:transfer-horizontal-bold-duotone"
      iconClass="text-violet-500"
      height="auto"
    >
      <div className="p-6 space-y-4">
        {sedesDestino.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay otras sedes activas para transferir.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Select
                label="Sede destino *"
                name="sedeDestinoId"
                error={errors.sedeDestinoId || ''}
                defaultValue={
                  sedesDestino.find((s) => s.id === form.sedeDestinoId)?.nombre ||
                  'Seleccionar sede'
                }
                onChange={(id: any) => {
                  setForm((prev) => ({ ...prev, sedeDestinoId: Number(id) }));
                  setErrors((prev) => ({ ...prev, sedeDestinoId: '' }));
                }}
                options={sedesDestino.map((s) => ({
                  id: s.id,
                  value: s.esPrincipal ? `${s.nombre} (Principal)` : s.nombre,
                }))}
              />
            </div>

            <div className="col-span-2">
              <InputPro
                label="Monto (S/) *"
                name="monto"
                type="number"
                value={form.monto}
                onChange={(e: any) => {
                  setForm((prev) => ({ ...prev, monto: e.target.value }));
                  setErrors((prev) => ({ ...prev, monto: '' }));
                }}
                isLabel
                error={errors.monto}
                autoFocus
              />
            </div>

            <div className="col-span-2">
              <InputPro
                label="Observaciones"
                name="observaciones"
                type="textarea"
                rows={2}
                value={form.observaciones}
                onChange={(e: any) =>
                  setForm((prev) => ({ ...prev, observaciones: e.target.value }))
                }
                isLabel
                placeholder="Detalle de la transferencia (opcional)"
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
            disabled={loading || sedesDestino.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white border-none"
          >
            {loading
              ? <Icon icon="eos-icons:loading" className="mr-2" />
              : <Icon icon="solar:transfer-horizontal-bold" className="mr-2" />
            }
            Transferir
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalTransferirCaja;
