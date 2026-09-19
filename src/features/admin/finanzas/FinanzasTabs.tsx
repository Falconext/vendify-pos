import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import { useSedeFinanzas } from './useSedeFinanzas';
import { useRentabilidadViewModel } from './rentabilidad/useRentabilidadViewModel';
import RentabilidadView from './rentabilidad/RentabilidadView';
import FinanceDashboardView from './FinanceDashboardView';
import ComisionesView from './comisiones/ComisionesView';
import CategoriasView from './categorias/CategoriasView';
import ProductosView from './productos/ProductosView';
import MetodosPagoView from './metodos-pago/MetodosPagoView';
import ConciliacionView from './conciliacion/ConciliacionView';
import ClientesView from './clientes/ClientesView';

type TabId = 'rentabilidad' | 'flujo' | 'comisiones' | 'categorias' | 'productos' | 'clientes' | 'metodosPago' | 'conciliacion';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
    description: string;
}

const TABS: Tab[] = [
    {
        id: 'rentabilidad',
        label: 'Rentabilidad',
        icon: 'solar:chart-2-bold-duotone',
        description: 'P&L — Análisis de ganancias y pérdidas',
    },
    {
        id: 'flujo',
        label: 'Flujo de Caja',
        icon: 'solar:wallet-money-bold-duotone',
        description: 'Ingresos y egresos del período',
    },
    {
        id: 'comisiones',
        label: 'Comisiones',
        icon: 'solar:users-group-rounded-bold-duotone',
        description: 'Comisiones por vendedor',
    },
    {
        id: 'categorias',
        label: 'Categorías',
        icon: 'solar:tag-bold-duotone',
        description: 'Ganancia por categoría de producto',
    },
    {
        id: 'productos',
        label: 'Productos',
        icon: 'solar:box-bold-duotone',
        description: 'Ventas por producto y acumulado por día',
    },
    {
        id: 'clientes',
        label: 'Clientes y envíos',
        icon: 'solar:map-point-wave-bold-duotone',
        description: 'Ciudades que más compran, ranking de clientes, cliente más fiel y repartidores',
    },
    {
        id: 'metodosPago',
        label: 'Métodos de pago',
        icon: 'solar:card-2-bold-duotone',
        description: 'Cobros por método, voucher y cuenta',
    },
    {
        id: 'conciliacion',
        label: 'Conciliación bancaria',
        icon: 'solar:bill-check-bold-duotone',
        description: 'Cruza el Excel del banco con ventas y compras',
    },
];

export default function FinanzasTabs() {
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as TabId | null;
    const initialTab: TabId = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'rentabilidad';
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    // Sede compartida por todas las pestañas del análisis (Flujo de Caja tiene su
    // propio filtro interno). `null` = todas las sedes.
    const sede = useSedeFinanzas();
    const vm = useRentabilidadViewModel(sede.sedeId);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F8F9FB] dark:bg-[#0A0D14]">
            {/* ── Header + Tab bar area ── */}
            <div className="px-3 pt-5 sm:px-6 sm:pt-6">
                {/* Page Header */}
                <div className="mb-5 sm:mb-6">
                    <div className="mb-1 flex min-w-0 items-center gap-2 text-sm font-medium text-gray-400">
                        <span>Finanzas</span>
                        <Icon icon="solar:alt-arrow-right-linear" className="shrink-0" />
                        <span className="truncate text-indigo-600 dark:text-indigo-400">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                            Análisis Financiero
                        </h1>
                        {sede.puedeElegirSede && (
                            <div className="w-full sm:w-[220px]">
                                <Select
                                    onChange={sede.handleSelectSede}
                                    label="Sede"
                                    name="sedeId"
                                    options={sede.sedesOptions}
                                    error=""
                                    defaultValue="Todas las sedes"
                                />
                            </div>
                        )}
                    </div>
                    {sede.sedeId && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Icon icon="solar:info-circle-bold" className="mt-0.5 shrink-0" />
                            <span>
                                Mostrando <strong>{sede.sedeNombre}</strong>. Los gastos marcados como
                                "toda la empresa" (alquiler central, contador) no se le cargan a esta
                                sede; se informan aparte en Total Gastos Op.
                            </span>
                        </p>
                    )}
                </div>

                {/* Tab Switcher */}
                <div className="mb-6 max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="inline-flex min-w-max items-center gap-1.5 rounded-2xl border border-gray-100/50 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:gap-2">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex min-w-[92px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all sm:min-w-0 sm:flex-row sm:gap-2 sm:px-5 sm:text-sm ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon icon={tab.icon} className="text-base flex-shrink-0" />
                                <span className="leading-tight">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'rentabilidad' && (
                <div className="px-3 pb-6 sm:px-6">
                    <RentabilidadView
                        mesActual={vm.mesActual}
                        anioActual={vm.anioActual}
                        periodo={vm.periodo}
                        dia={vm.dia}
                        fechaInicio={vm.fechaInicio}
                        fechaFin={vm.fechaFin}
                        esHoy={vm.esHoy}
                        hoy={vm.hoy}
                        navegarDia={vm.navegarDia}
                        setPeriodo={vm.setPeriodo}
                        setDia={vm.setDia}
                        setFechaInicio={vm.setFechaInicio}
                        setFechaFin={vm.setFechaFin}
                        sedesOptions={sede.sedesOptions.filter((o) => o.id > 0)}
                        sedeIdActual={sede.sedeId}
                        pnl={vm.pnl}
                        evolucion={vm.evolucion}
                        gastos={vm.gastos}
                        ingresos={vm.ingresos}
                        valorInventario={vm.valorInventario}
                        isLoading={vm.isLoading}
                        isModalOpen={vm.isModalOpen}
                        gastoEditando={vm.gastoEditando}
                        isSaving={vm.isSaving}
                        isIngresoModalOpen={vm.isIngresoModalOpen}
                        ingresoEditando={vm.ingresoEditando}
                        isSavingIngreso={vm.isSavingIngreso}
                        isCurrentOrFuture={vm.isCurrentOrFuture}
                        navegarMes={vm.navegarMes}
                        crearGasto={vm.crearGasto}
                        actualizarGasto={vm.actualizarGasto}
                        eliminarGasto={vm.eliminarGasto}
                        abrirModalCrear={vm.abrirModalCrear}
                        abrirModalEditar={vm.abrirModalEditar}
                        cerrarModal={vm.cerrarModal}
                        crearIngreso={vm.crearIngreso}
                        actualizarIngreso={vm.actualizarIngreso}
                        eliminarIngreso={vm.eliminarIngreso}
                        abrirModalCrearIngreso={vm.abrirModalCrearIngreso}
                        abrirModalEditarIngreso={vm.abrirModalEditarIngreso}
                        cerrarModalIngreso={vm.cerrarModalIngreso}
                    />
                </div>
            )}

            {/* Flujo tab: FinanceDashboardView owns its own full-page container */}
            {activeTab === 'flujo' && (
                <FinanceDashboardView />
            )}

            {activeTab === 'comisiones' && (
                <div className="px-3 pb-6 sm:px-6">
                    <ComisionesView />
                </div>
            )}

            {activeTab === 'categorias' && (
                <div className="px-3 pb-6 sm:px-6">
                    <CategoriasView sedeId={sede.sedeId} />
                </div>
            )}

            {activeTab === 'productos' && (
                <div className="px-3 pb-6 sm:px-6">
                    <ProductosView sedeId={sede.sedeId} />
                </div>
            )}

            {activeTab === 'clientes' && (
                <div className="px-3 pb-6 sm:px-6">
                    <ClientesView sedeId={sede.sedeId} />
                </div>
            )}

            {activeTab === 'metodosPago' && (
                <div className="px-3 pb-6 sm:px-6">
                    <MetodosPagoView sedeId={sede.sedeId} />
                </div>
            )}

            {activeTab === 'conciliacion' && (
                <div className="px-3 pb-6 sm:px-6">
                    <ConciliacionView />
                </div>
            )}
        </div>
    );
}
