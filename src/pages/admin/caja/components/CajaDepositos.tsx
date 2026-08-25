import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useCajaStore, MovimientoCaja } from '@/zustand/caja';
import useAlertStore from '@/zustand/alert';
import ModalConfirm from '@/components/ModalConfirm';
import DataTable from '@/components/Datatable';
import ModalMarcarDeposito from './ModalMarcarDeposito';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

const CajaDepositos: React.FC = () => {
  const {
    cierresPendientesDeposito,
    totalPendienteDeposito,
    autoAbonado,
    depositosRealizados,
    loading,
    obtenerCierresPendientesDeposito,
    obtenerDepositosRealizados,
    desmarcarDeposito,
  } = useCajaStore();
  const { alert } = useAlertStore();

  const [tab, setTab] = useState<'PENDIENTES' | 'REALIZADOS'>('PENDIENTES');
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [showModalDeposito, setShowModalDeposito] = useState(false);
  const [cierreDesmarcarId, setCierreDesmarcarId] = useState<number | null>(null);
  const [loadingDesmarcar, setLoadingDesmarcar] = useState(false);

  useEffect(() => {
    obtenerCierresPendientesDeposito();
    obtenerDepositosRealizados();
  }, [obtenerCierresPendientesDeposito, obtenerDepositosRealizados]);

  const toggleSeleccionado = (id: number) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSeleccionarTodos = () => {
    setSeleccionados((prev) =>
      prev.length === cierresPendientesDeposito.length
        ? []
        : cierresPendientesDeposito.map((c) => c.id),
    );
  };

  const cierresSeleccionados = useMemo(
    () => cierresPendientesDeposito.filter((c) => seleccionados.includes(c.id)),
    [cierresPendientesDeposito, seleccionados],
  );

  const handleDepositoExitoso = () => {
    setSeleccionados([]);
    obtenerCierresPendientesDeposito();
    obtenerDepositosRealizados();
  };

  const handleDesmarcar = async () => {
    if (!cierreDesmarcarId) return;
    setLoadingDesmarcar(true);
    const result = await desmarcarDeposito(cierreDesmarcarId);
    setLoadingDesmarcar(false);
    setCierreDesmarcarId(null);
    if (result.success) {
      alert(result.message || 'Depósito revertido', 'success');
    } else {
      alert(result.message || 'Error al revertir el depósito', 'error');
    }
  };

  // Columnas propias de este flujo: checkbox de selección (Pendientes) y
  // desmarcar (Depositados). El resto son las mismas que en Historial de Turnos.
  const columnasPendientes = [
    { label: '', key: 'Seleccion' },
    'Fecha',
    'Sede',
    'Cajero',
    'Efectivo',
  ];

  const dataPendientes = cierresPendientesDeposito.map((c: MovimientoCaja) => ({
    Seleccion: (
      <input
        type="checkbox"
        checked={seleccionados.includes(c.id)}
        onChange={() => toggleSeleccionado(c.id)}
        className="rounded"
      />
    ),
    Fecha: new Date(c.fecha).toLocaleDateString('es-PE'),
    Sede: c.sede?.nombre || '—',
    Cajero: c.usuario?.nombre || c.usuario?.email || 'Sistema',
    Efectivo: (
      <span className="font-bold text-gray-800 dark:text-white">
        {formatCurrency(Number(c.montoEfectivo || 0))}
      </span>
    ),
  }));

  const columnasRealizados = [
    'Fecha cierre',
    'Sede',
    'Cajero',
    'Efectivo',
    'Cuenta',
    'Fecha depósito',
    'N° operación',
    'Acciones',
  ];

  const dataRealizados = depositosRealizados.map((c: MovimientoCaja) => ({
    'Fecha cierre': new Date(c.fecha).toLocaleDateString('es-PE'),
    Sede: c.sede?.nombre || '—',
    Cajero: c.usuario?.nombre || c.usuario?.email || 'Sistema',
    Efectivo: (
      <span className="font-bold text-gray-800 dark:text-white">
        {formatCurrency(Number(c.montoEfectivo || 0))}
      </span>
    ),
    Cuenta: c.cuentaBancaria ? `${c.cuentaBancaria.banco} · ${c.cuentaBancaria.numeroCuenta}` : '—',
    'Fecha depósito': c.fechaDeposito ? new Date(c.fechaDeposito).toLocaleDateString('es-PE') : '—',
    'N° operación': c.numeroOperacionDeposito || '—',
    Acciones: (
      <button
        onClick={() => setCierreDesmarcarId(c.id)}
        title="Deshacer depósito"
        className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Icon icon="solar:undo-left-bold" className="text-base" />
      </button>
    ),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Icon icon="solar:wad-of-money-bold-duotone" className="text-3xl" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Efectivo pendiente de depositar</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">{formatCurrency(totalPendienteDeposito)}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Requiere llevarlo al banco y marcarlo abajo.</p>
          </div>
        </div>

        {/* Yape/Plin abonan directo a la cuenta vinculada: informativo, sin acción manual */}
        {autoAbonado && (autoAbonado.totalYape > 0 || autoAbonado.totalPlin > 0) && (
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Icon icon="solar:smartphone-bold-duotone" className="text-3xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Ya abonado a tus cuentas</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(autoAbonado.totalYape + autoAbonado.totalPlin)}
              </p>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 space-y-0.5">
                {autoAbonado.totalYape > 0 && (
                  <p className="truncate">
                    Yape {formatCurrency(autoAbonado.totalYape)}
                    {autoAbonado.cuentaYape
                      ? ` → ${autoAbonado.cuentaYape.alias || `${autoAbonado.cuentaYape.banco} · ${autoAbonado.cuentaYape.numeroCuenta}`}`
                      : ' (sin cuenta vinculada — configúrala en Empresa → Cuentas Bancarias)'}
                  </p>
                )}
                {autoAbonado.totalPlin > 0 && (
                  <p className="truncate">
                    Plin {formatCurrency(autoAbonado.totalPlin)}
                    {autoAbonado.cuentaPlin
                      ? ` → ${autoAbonado.cuentaPlin.alias || `${autoAbonado.cuentaPlin.banco} · ${autoAbonado.cuentaPlin.numeroCuenta}`}`
                      : ' (sin cuenta vinculada — configúrala en Empresa → Cuentas Bancarias)'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('PENDIENTES')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'PENDIENTES'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
            }`}
        >
          Pendientes ({cierresPendientesDeposito.length})
        </button>
        <button
          onClick={() => setTab('REALIZADOS')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'REALIZADOS'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
            }`}
        >
          Depositados ({depositosRealizados.length})
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {tab === 'PENDIENTES' ? (
          <>
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cierresPendientesDeposito.length > 0 && seleccionados.length === cierresPendientesDeposito.length}
                  onChange={toggleSeleccionarTodos}
                  className="rounded"
                />
                Seleccionar todos
              </label>
              <button
                onClick={() => setShowModalDeposito(true)}
                disabled={seleccionados.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="solar:card-transfer-bold" />
                Marcar como Depositado ({seleccionados.length})
              </button>
            </div>
            <div className="overflow-x-auto p-4">
              {loading ? (
                <p className="py-8 text-center text-gray-400 text-sm">Cargando...</p>
              ) : cierresPendientesDeposito.length === 0 ? (
                <div className="py-16 text-center">
                  <Icon icon="solar:check-circle-bold-duotone" className="text-5xl text-emerald-200 dark:text-emerald-900 mx-auto mb-2" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No hay cierres pendientes de depositar.</p>
                </div>
              ) : (
                <DataTable headerColumns={columnasPendientes} bodyData={dataPendientes} />
              )}
            </div>
          </>
        ) : (
          <div className="overflow-x-auto p-4">
            {depositosRealizados.length === 0 ? (
              <p className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                Aún no hay depósitos registrados.
              </p>
            ) : (
              <DataTable headerColumns={columnasRealizados} bodyData={dataRealizados} />
            )}
          </div>
        )}
      </div>

      <ModalMarcarDeposito
        isOpen={showModalDeposito}
        cierresSeleccionados={cierresSeleccionados}
        onClose={() => setShowModalDeposito(false)}
        onSuccess={handleDepositoExitoso}
      />

      <ModalConfirm
        isOpenModal={!!cierreDesmarcarId}
        setIsOpenModal={(v) => { if (!v) setCierreDesmarcarId(null); }}
        title="Deshacer depósito"
        information="¿Seguro que quieres marcar este cierre como pendiente de depositar otra vez?"
        confirmText="Deshacer"
        confirmLoading={loadingDesmarcar}
        confirmSubmit={handleDesmarcar}
      />
    </div>
  );
};

export default CajaDepositos;
