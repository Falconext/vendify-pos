import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Calendar } from '@/components/Date';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/Datatable';
import Select from '@/components/Select';
import {
  AGENCIAS_ENVIO,
  ESTADOS_ENTREGA,
  ESTADOS_ENVIO,
  PedidoTiendaAdmin,
  usePedidosViewModel,
} from '@/features/admin/tienda/usePedidosViewModel';
import { PedidoDetalleDrawer } from './PedidoDetalleDrawer';
import ModalNotaVentaPedido from './ModalNotaVentaPedido';
import ModalDetalleComprobante from '@/pages/admin/facturacion/ModalDetalleComprobante';
import TableActionMenu from '@/components/TableActionMenu';
import ModalRegistrarPago from '@/pages/admin/facturacion/ModalRegistrarPago';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useNavigate, useSearchParams } from 'react-router-dom';

const money = (value: number) => `S/ ${value.toFixed(2)}`;

const formatDate = (value: string) => new Date(value).toLocaleString('es-PE', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

const inputBase = 'h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-[#0F172A] dark:text-white';

const HEADER_COLS = ['#', 'Fecha', 'Cliente', 'Vendedor', 'Estado entrega', 'Agencia envío', 'Estado envío', 'Total', 'Pagado', 'Por pagar', 'Estado pago', 'Acciones'];

const selCls = '!h-9 !rounded-xl !border-gray-200 dark:!border-slate-700 !bg-white dark:!bg-slate-800 !px-2 !py-0 !text-xs !shadow-none !text-gray-700 dark:!text-white';

const entregaOpts = ESTADOS_ENTREGA.map(e => ({ id: e.value, value: e.label }));
const agenciaOpts = AGENCIAS_ENVIO.map(a => ({ id: a.value, value: a.label }));
const envioOpts   = ESTADOS_ENVIO.map(e => ({ id: e.value, value: e.label }));

function ConfirmPagoModal({ pedido, onConfirm, onCancel }: { pedido: PedidoTiendaAdmin; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed top-[-30px] inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50  " onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Icon icon="solar:wallet-money-bold" className="text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Confirmar pago completo</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pedido.clienteNombre}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          ¿Marcar como pagado el total de <span className="font-semibold text-gray-900 dark:text-white">S/ {pedido.total.toFixed(2)}</span>?
          Esta acción se puede revertir ajustando el monto manualmente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Icon icon="solar:check-circle-bold" className="text-base" />
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}

function toCalendarDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function toIsoDate(value: string | Date) {
  if (!value) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function PagoBadge({ pedido }: { pedido: PedidoTiendaAdmin }) {
  const pagado = pedido.saldoPendiente <= 0.01;
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${pagado ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
      {pagado ? 'Pagado' : 'Pendiente'}
    </span>
  );
}

function SellerCell({ nombre }: { nombre: string }) {
  const partes = nombre.trim().split(' ').filter(Boolean);
  const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  const display = [partes[0], partes[1]].filter(Boolean).join(' ');
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium flex-shrink-0" title={nombre}>
        {iniciales || '?'}
      </span>
      <span className="text-xs text-slate-600 dark:text-slate-300">{display || '—'}</span>
    </div>
  );
}

const pedidoPuedeDocumentarse = (pedido: PedidoTiendaAdmin) => (
  !pedido.comprobanteId &&
  (pedido.saldoPendiente <= 0.01 || pedido.estadoEntrega === 'ENTREGADO_COMPLETADO' || pedido.estadoEnvio === 'ENTREGADO')
);

/**
 * La nota de venta no espera el pago: el pedido de la tienda se pasa a nota
 * apenas llega (con su envío por agencia) y se cobra después, como cualquier
 * nota con saldo. Una sola vez por pedido.
 */
const pedidoPuedeNotaVenta = (pedido: PedidoTiendaAdmin) => (
  !pedido.comprobanteId && pedido.estado !== 'CANCELADO'
);

export default function PedidosTienda() {
  const vm = usePedidosViewModel();
  const navigate = useNavigate();
  const [selectedPedido, setSelectedPedido] = useState<PedidoTiendaAdmin | null>(null);
  const [confirmPago, setConfirmPago] = useState<PedidoTiendaAdmin | null>(null);
  const [nvPedido, setNvPedido] = useState<PedidoTiendaAdmin | null>(null);
  const [verNotaId, setVerNotaId] = useState<number | null>(null);
  // Cobro de un pedido que ya es nota de venta: se registra en la nota (caja,
  // historial de pagos) y el backend actualiza el pedido.
  const [cobroNota, setCobroNota] = useState<any | null>(null);
  // Menú de acciones: un solo menú abierto, anclado al botón ⋮ de la fila.
  const [menu, setMenu] = useState<{ pedido: PedidoTiendaAdmin; anchor: HTMLElement } | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Llegada desde el Panel de ventas ("Ver / gestionar pedido"): ?codigo=PT-… →
  // se filtra por ese código y se abre su detalle en cuanto carguen los pedidos.
  const [searchParams] = useSearchParams();
  const codigoParam = searchParams.get('codigo');
  const codigoAbiertoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!codigoParam || vm.loading) return;
    if (codigoAbiertoRef.current === codigoParam) return;
    const pedido = vm.pedidos.find((p) => p.codigoSeguimiento === codigoParam);
    if (!pedido) return;
    codigoAbiertoRef.current = codigoParam;
    vm.setBusqueda(codigoParam);
    setSelectedPedido(pedido);
  }, [codigoParam, vm.loading, vm.pedidos, vm.setBusqueda]);

  const navegarComprobantePedido = (pedido: PedidoTiendaAdmin, defaultType: 'BOLETA' | 'FACTURA' | 'NV') => {
    navigate('/administrador/facturacion/nuevo', {
      state: {
        defaultType,
        defaultClient: 'CLIENTES_VARIOS',
        fromPedidoTienda: true,
        pedidoTiendaData: pedido,
      },
    });
  };

  const navegarGuiaPedido = (pedido: PedidoTiendaAdmin) => {
    navigate('/administrador/facturacion/guia-remision', {
      state: {
        fromPedidoTienda: true,
        pedidoTiendaGuia: pedido,
      },
    });
  };

  const abrirCobroNota = async (comprobanteId: number) => {
    const resp: any = await get(`comprobante/${comprobanteId}`);
    const comp = resp?.success === false ? null : (resp?.data ?? null);
    if (!comp) {
      useAlertStore.getState().alert('No se pudo abrir la nota de venta para cobrar.', 'error');
      return;
    }
    setCobroNota(comp);
  };

  /**
   * Todas las acciones de un pedido, en el orden en que se usan. La tabla y
   * las tarjetas del celular muestran este mismo menú (antes eran hasta 9
   * botones sueltos por fila, más la columna Pagos).
   */
  const accionesDe = (pedido: PedidoTiendaAdmin) => {
    type Accion = { key: string; label: string; icon: string; tone?: 'primary' | 'danger'; onClick?: () => void; href?: string | null; separador?: boolean };
    const acciones: Accion[] = [];
    if (pedidoPuedeNotaVenta(pedido)) {
      acciones.push({
        key: 'nv',
        label: pedido.tipoEntrega === 'ENVIO' ? 'Nota de venta y despacho' : 'Nota de venta',
        icon: 'solar:document-add-bold',
        tone: 'primary',
        onClick: () => setNvPedido(pedido),
      });
    }
    if (pedido.comprobanteId) {
      acciones.push({ key: 'ver-nv', label: 'Ver comprobante', icon: 'solar:document-text-bold', onClick: () => setVerNotaId(Number(pedido.comprobanteId)) });
    }
    if (pedido.saldoPendiente > 0.01) {
      acciones.push({
        key: 'pago',
        label: 'Registrar pago',
        icon: 'solar:wallet-money-bold',
        onClick: () => (pedido.comprobanteId ? void abrirCobroNota(Number(pedido.comprobanteId)) : setConfirmPago(pedido)),
      });
    }
    if (pedidoPuedeDocumentarse(pedido)) {
      acciones.push({ key: 'boleta', label: 'Hacer boleta', icon: 'solar:bill-list-bold', onClick: () => navegarComprobantePedido(pedido, 'BOLETA'), separador: true });
      acciones.push({ key: 'factura', label: 'Hacer factura', icon: 'solar:document-add-linear', onClick: () => navegarComprobantePedido(pedido, 'FACTURA') });
      if (pedido.tipoEntrega === 'ENVIO') {
        acciones.push({ key: 'guia', label: 'Hacer guía de remisión', icon: 'solar:route-bold-duotone', onClick: () => navegarGuiaPedido(pedido) });
      }
    }
    if (pedido.clienteTelefono) {
      acciones.push({ key: 'wsp', label: 'WhatsApp al cliente', icon: 'mdi:whatsapp', href: vm.buildWhatsappUrl(pedido, pedido.estadoEntrega), separador: true });
    }
    const resena = vm.buildReviewWhatsappUrl(pedido);
    if (resena) acciones.push({ key: 'resena', label: 'Pedir reseña', icon: 'solar:star-bold', href: resena });
    acciones.push({ key: 'detalle', label: 'Ver detalle', icon: 'solar:eye-bold', onClick: () => setSelectedPedido(pedido), separador: true });
    if (pedido.tipoEntrega === 'ENVIO') {
      acciones.push({
        key: 'despacho',
        label: 'Ver en despacho',
        icon: 'solar:delivery-bold-duotone',
        onClick: () => navigate(`/administrador/ventas?fecha=${pedido.creadoEn.slice(0, 10)}&pedidoId=${pedido.id}`),
      });
    }
    return acciones;
  };

  // Función y no componente: un componente declarado aquí adentro se re-monta
  // en cada render (parpadeo, ver memoria del proyecto).
  const botonAcciones = (pedido: PedidoTiendaAdmin, grande = false) => (
    <button
      type="button"
      data-testid={`pedido-acciones-${pedido.id}`}
      onClick={(e) => {
        e.stopPropagation();
        const anchor = e.currentTarget;
        setMenu((m) => (m?.pedido.id === pedido.id ? null : { pedido, anchor }));
      }}
      className={grande
        ? 'inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
        : 'inline-flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-slate-700'}
      title="Acciones"
      aria-label="Acciones del pedido"
    >
      {grande ? <>Acciones <Icon icon="solar:alt-arrow-down-linear" className="h-3.5 w-3.5" /></> : <Icon icon="solar:menu-dots-bold" className="h-5 w-5 rotate-90" />}
    </button>
  );

  if (vm.loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-600 shadow-sm shadow-violet-200/70">
            <Icon icon="eos-icons:loading" className="h-10 w-10" />
          </div>
          <p className="text-sm text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  const bodyData = vm.pedidosFiltrados.map((pedido, index) => {
    const formattedDate = formatDate(pedido.creadoEn).split(',');
    return {
      id: pedido.id,
      '#': <span className="text-gray-400">{index + 1}</span>,
      'Fecha': (
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-300">{formattedDate[0]}</div>
          <div className="text-[11px] text-gray-400">{formattedDate[1]?.trim()}</div>
        </div>
      ),
      'Cliente': (
        <div>
          <div className="uppercase text-xs text-gray-700 dark:text-gray-200 max-w-[200px] truncate">{pedido.clienteNombre}</div>
          <div className="text-[11px] text-gray-400">{pedido.clienteTelefono || pedido.codigoSeguimiento}</div>
        </div>
      ),
      'Vendedor': <SellerCell nombre={pedido.vendedorNombre} />,
      'Estado entrega': (
        <div onClick={(e) => e.stopPropagation()} className="w-[200px]">
          <Select
            name={`estadoEntrega-${pedido.id}`}
            label="" error={null} withLabel={false}
            options={entregaOpts}
            value={entregaOpts.find(o => o.id === pedido.estadoEntrega)?.value ?? ''}
            inputClassName={selCls}
            onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { estadoEntrega: String(id) as PedidoTiendaAdmin['estadoEntrega'] })}
          />
        </div>
      ),
      'Agencia envío': (
        <div onClick={(e) => e.stopPropagation()} className="w-[170px]">
          <Select
            name={`agenciaEnvio-${pedido.id}`}
            label="" error={null} withLabel={false}
            options={agenciaOpts}
            value={agenciaOpts.find(o => o.id === pedido.agenciaEnvio)?.value ?? ''}
            inputClassName={selCls}
            onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { agenciaEnvio: String(id) as PedidoTiendaAdmin['agenciaEnvio'] })}
          />
        </div>
      ),
      'Estado envío': (
        <div onClick={(e) => e.stopPropagation()} className="w-[160px]">
          <Select
            name={`estadoEnvio-${pedido.id}`}
            label="" error={null} withLabel={false}
            options={envioOpts}
            value={envioOpts.find(o => o.id === pedido.estadoEnvio)?.value ?? ''}
            inputClassName={selCls}
            onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { estadoEnvio: String(id) as PedidoTiendaAdmin['estadoEnvio'] })}
          />
        </div>
      ),
      'Total': <span className="text-xs text-gray-700 dark:text-gray-200">{money(pedido.total)}</span>,
      'Pagado': <span className="text-xs text-gray-500 dark:text-gray-400">{money(pedido.montoPagado)}</span>,
      'Por pagar': <span className="text-xs text-gray-500 dark:text-gray-400">{money(pedido.saldoPendiente)}</span>,
      'Estado pago': <PagoBadge pedido={pedido} />,
      'Acciones': (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {botonAcciones(pedido)}
        </div>
      ),
    };
  });

  const activeFilterCount = [
    vm.busqueda.trim(),
    vm.fechaDesde,
    vm.fechaHasta,
    vm.filtroEstado,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Pedidos</h1>
        {vm.newOrdersCount > 0 && (
          <button
            onClick={vm.clearNewOrders}
            className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600"
          >
            {vm.newOrdersCount} nuevo{vm.newOrdersCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <section className="rounded-[22px] border border-gray-100 bg-white shadow-sm dark:border-transparent dark:bg-[#111827]">
        {/* Filtros */}
        <div className="rounded-t-[22px] border-b border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-[#111827] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <Icon icon="solar:filter-bold-duotone" className="text-xl text-blue-600" />
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800 dark:text-white">Filtros</h3>
                <p className="truncate text-xs text-gray-400">{activeFilterCount} activos</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-500/20"
            >
              {isMobileFiltersOpen ? 'Ocultar' : 'Ver filtros'}
              <Icon icon={isMobileFiltersOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
            </button>
          </div>
          <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} gap-4 md:grid md:grid-cols-2 xl:grid-cols-[1.4fr_0.7fr_0.7fr_auto]`}>
            <label className="space-y-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Buscar pedido</span>
              <div className="relative">
                <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={vm.busqueda}
                  onChange={(e) => vm.setBusqueda(e.target.value)}
                  placeholder="Cliente, teléfono, vendedor o código..."
                  className={`${inputBase} w-full pl-12`}
                />
              </div>
            </label>
            <div>
              <Calendar
                text="Fecha inicio"
                name="fechaDesde"
                value={toCalendarDate(vm.fechaDesde)}
                onChange={(date) => vm.setFechaDesde(toIsoDate(date))}
              />
            </div>
            <div>
              <Calendar
                text="Fecha fin"
                name="fechaHasta"
                value={toCalendarDate(vm.fechaHasta)}
                onChange={(date) => vm.setFechaHasta(toIsoDate(date))}
                right
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline-default"
                className="h-11 w-full rounded-xl px-4 xl:w-auto"
                onClick={() => { vm.setBusqueda(''); vm.setFechaDesde(''); vm.setFechaHasta(''); vm.setFiltroEstado(''); }}
              >
                <Icon icon="solar:refresh-bold" className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>

          {/* Filtros de estado */}
          <div className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} -mx-1 mt-5 gap-2 overflow-x-auto px-1 pb-1 md:flex md:flex-wrap md:overflow-visible`}>
            <button
              onClick={() => vm.setFiltroEstado('')}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm transition ${!vm.filtroEstado ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-[#0F172A] dark:text-gray-300'}`}
            >
              Todos
              <span className={`rounded-full px-2 py-0.5 text-xs ${!vm.filtroEstado ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'}`}>{vm.pedidos.length}</span>
            </button>
            {vm.estadisticas.map((estado) => (
              <button
                key={estado.value}
                onClick={() => vm.setFiltroEstado(vm.filtroEstado === estado.value ? '' : estado.value)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm transition ${vm.filtroEstado === estado.value ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-[#0F172A] dark:text-gray-300'}`}
              >
                {estado.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${vm.filtroEstado === estado.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'}`}>{estado.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {vm.pedidosFiltrados.map((pedido, index) => {
            const formattedDate = formatDate(pedido.creadoEn).split(',');

            return (
              <article
                key={pedido.id}
                onClick={() => setSelectedPedido(pedido)}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.99] dark:border-transparent dark:bg-[#0F172A]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">Pedido #{index + 1}</p>
                    <h3 className="mt-1 truncate text-base font-black uppercase text-gray-900 dark:text-white">{pedido.clienteNombre}</h3>
                    <p className="text-xs text-gray-500">{formattedDate[0]} · {formattedDate[1]?.trim()}</p>
                  </div>
                  <PagoBadge pedido={pedido} />
                </div>

                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-slate-900/60">
                  <SellerCell nombre={pedido.vendedorNombre} />
                  <span className="truncate text-xs font-semibold text-gray-500">{pedido.clienteTelefono || pedido.codigoSeguimiento}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-3 dark:bg-slate-900/60">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Total</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{money(pedido.total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Pagado</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-300">{money(pedido.montoPagado)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Saldo</p>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-300">{money(pedido.saldoPendiente)}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2" onClick={(e) => e.stopPropagation()}>
                  <Select
                    name={`mobile-estadoEntrega-${pedido.id}`}
                    label="Estado entrega"
                    error={null}
                    options={entregaOpts}
                    value={entregaOpts.find(o => o.id === pedido.estadoEntrega)?.value ?? ''}
                    inputClassName={selCls}
                    onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { estadoEntrega: String(id) as PedidoTiendaAdmin['estadoEntrega'] })}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select
                      name={`mobile-agenciaEnvio-${pedido.id}`}
                      label="Agencia envío"
                      error={null}
                      options={agenciaOpts}
                      value={agenciaOpts.find(o => o.id === pedido.agenciaEnvio)?.value ?? ''}
                      inputClassName={selCls}
                      onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { agenciaEnvio: String(id) as PedidoTiendaAdmin['agenciaEnvio'] })}
                    />
                    <Select
                      name={`mobile-estadoEnvio-${pedido.id}`}
                      label="Estado envío"
                      error={null}
                      options={envioOpts}
                      value={envioOpts.find(o => o.id === pedido.estadoEnvio)?.value ?? ''}
                      inputClassName={selCls}
                      onChange={(id) => vm.actualizarPedidoOperativo(pedido.id, { estadoEnvio: String(id) as PedidoTiendaAdmin['estadoEnvio'] })}
                    />
                  </div>
                </div>

                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  {botonAcciones(pedido, true)}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden md:block">
          <DataTable
            bodyData={bodyData}
            headerColumns={HEADER_COLS}
            pageSize={20}
          />
        </div>
      </section>

      {/* Drawer lateral */}
      <PedidoDetalleDrawer
        open={selectedPedido !== null}
        pedido={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />

      {/* Confirmación de pago */}
      {confirmPago && (
        <ConfirmPagoModal
          pedido={confirmPago}
          onConfirm={() => {
            vm.actualizarPedidoOperativo(confirmPago.id, { montoPagado: confirmPago.total });
            setConfirmPago(null);
          }}
          onCancel={() => setConfirmPago(null)}
        />
      )}

      {/* Menú de acciones del pedido */}
      <TableActionMenu isOpen={!!menu} anchorEl={menu?.anchor ?? null} onClose={() => setMenu(null)} className="w-60">
        {menu && accionesDe(menu.pedido).map((a) => {
          const clase = `flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-gray-100 dark:hover:bg-slate-700 ${a.separador ? 'border-t border-gray-100 dark:border-slate-700' : ''} ${a.tone === 'primary' ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`;
          const icono = <Icon icon={a.icon} className={`h-4 w-4 flex-none ${a.tone === 'primary' ? 'text-violet-600' : a.key === 'wsp' ? 'text-emerald-500' : a.key === 'resena' ? 'text-amber-400' : 'text-gray-400'}`} />;
          return a.href !== undefined ? (
            <a key={a.key} href={a.href || undefined} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)} className={clase} data-testid={`accion-${a.key}`}>
              {icono} {a.label}
            </a>
          ) : (
            <button key={a.key} type="button" onClick={() => { setMenu(null); a.onClick?.(); }} className={clase} data-testid={`accion-${a.key}`}>
              {icono} {a.label}
            </button>
          );
        })}
      </TableActionMenu>

      {/* Pedido → nota de venta con despacho en un clic */}
      <ModalNotaVentaPedido
        pedido={nvPedido}
        onClose={() => setNvPedido(null)}
        onRevisarEnPos={(p) => { setNvPedido(null); navegarComprobantePedido(p, 'NV'); }}
        onVerNota={(id) => { setNvPedido(null); setVerNotaId(id); }}
        onGenerada={() => void vm.recargar()}
      />

      <ModalDetalleComprobante comprobanteId={verNotaId} isOpen={verNotaId !== null} onClose={() => setVerNotaId(null)} />

      {cobroNota && (
        <ModalRegistrarPago
          comprobante={cobroNota}
          onClose={() => setCobroNota(null)}
          onSuccess={() => { setCobroNota(null); void vm.recargar(); }}
        />
      )}
    </div>
  );
}
