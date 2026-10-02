import React from 'react';
import moment from 'moment';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import Loading from '@/components/Loading';
import DataTable from '@/components/Datatable';
import { Calendar } from '@/components/Date';
import { useMermasViewModel } from './useMermasViewModel';

const soles = (n: number) => `S/ ${Number(n ?? 0).toFixed(2)}`;

/** Tarjeta de indicador, con el mismo formato que el dashboard de Kardex. */
const Tarjeta: React.FC<{
    titulo: string; valor: string; pie: string; icono: string; color: string;
}> = ({ titulo, valor, pie, icono, color }) => (
    <div className="bg-white dark:bg-[#131620] rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between group hover:shadow-md transition-shadow min-w-0">
        <div className="flex justify-between items-start gap-2 mb-4">
            <h3 className={`text-[13px] font-bold tracking-wide ${color}`}>{titulo}</h3>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center text-white shrink-0 group-hover:-translate-y-1 transition-transform ${color.replace('text-', 'bg-')}`}>
                <Icon icon={icono} className="text-xl" />
            </div>
        </div>
        <div>
            <h2 className="text-xl sm:text-[28px] leading-none font-extrabold text-gray-900 dark:text-white mb-2 truncate">{valor}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{pie}</span>
        </div>
    </div>
);

export const MermasView: React.FC = () => {
    const vm = useMermasViewModel();
    const { resumen, porMotivo, porProducto, detalle } = vm.data;

    return (
        <div className="min-h-screen px-2 pb-6 bg-gray-50 dark:bg-[#0A0D14]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Mermas y ajustes</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Cuánto perdiste por producto roto, vencido o extraviado{vm.sedeNombre ? ` · ${vm.sedeNombre}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={vm.verMesAnterior} color="secondary" className="rounded-2xl">
                        <Icon icon="solar:alt-arrow-left-linear" className="mr-1" /> Mes anterior
                    </Button>
                    <Button onClick={vm.verMesActual} color="primary" className="rounded-2xl">
                        <Icon icon="solar:calendar-mark-linear" className="mr-1" /> Mes actual
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Calendar
                    text="Desde" name="fechaInicio" isLabel portal
                    onChange={vm.handleDate}
                    value={moment(vm.fechaInicio, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                />
                <Calendar
                    text="Hasta" name="fechaFin" isLabel portal
                    onChange={vm.handleDate}
                    value={moment(vm.fechaFin, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                />
                <div className="flex items-end">
                    <Button onClick={vm.consultar} color="secondary" className="w-full rounded-2xl">
                        <Icon icon="solar:refresh-linear" className="mr-1" /> Actualizar
                    </Button>
                </div>
            </div>

            {vm.isLoading ? <Loading /> : (
                <>
                    {/* Indicadores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        <Tarjeta
                            titulo="Plata perdida" color="text-rose-500" icono="solar:bill-cross-bold"
                            valor={soles(resumen.valorPerdido)}
                            pie="al costo de reponerlo"
                        />
                        <Tarjeta
                            titulo="Unidades perdidas" color="text-amber-500" icono="solar:box-minimalistic-bold"
                            valor={String(resumen.unidadesPerdidas)}
                            pie="rotas, vencidas o extraviadas"
                        />
                        <Tarjeta
                            titulo="Productos afectados" color="text-violet-500" icono="solar:widget-5-bold"
                            valor={String(resumen.productosAfectados)}
                            pie="con alguna pérdida"
                        />
                        <Tarjeta
                            titulo="Ajustes registrados" color="text-blue-500" icono="solar:clipboard-list-bold"
                            valor={String(resumen.movimientosConMotivo)}
                            pie="con su motivo anotado"
                        />
                    </div>

                    {/* Por qué se perdió */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
                        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Por qué</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Las correcciones de conteo no son pérdida: el inventario se puso al día.
                            </p>
                            {porMotivo.length ? (
                                <DataTable actions={[]} bodyData={porMotivo.map((m) => ({
                                    motivo: m.etiqueta,
                                    tipo: m.esPerdida ? 'Pérdida' : 'Corrección',
                                    unidades: m.unidades,
                                    valor: soles(m.valor),
                                    veces: m.movimientos,
                                }))} headerColumns={[
                                    { label: 'Motivo', key: 'motivo' },
                                    { label: 'Tipo', key: 'tipo' },
                                    { label: 'Unidades', key: 'unidades' },
                                    { label: 'Valor', key: 'valor' },
                                    { label: 'Veces', key: 'veces' },
                                ]} />
                            ) : <p className="text-sm text-gray-400 py-6 text-center">Sin ajustes en este período.</p>}
                        </div>

                        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Qué producto</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Ordenado por lo que costó, no por cantidad: diez tornillos no pesan como una laptop.
                            </p>
                            {porProducto.length ? (
                                <DataTable actions={[]} bodyData={porProducto.map((p) => ({
                                    producto: `${p.codigo} - ${p.descripcion}`,
                                    unidades: p.unidades,
                                    valor: soles(p.valor),
                                }))} headerColumns={[
                                    { label: 'Producto', key: 'producto' },
                                    { label: 'Unidades', key: 'unidades' },
                                    { label: 'Valor', key: 'valor' },
                                ]} />
                            ) : <p className="text-sm text-gray-400 py-6 text-center">Sin pérdidas en este período.</p>}
                        </div>
                    </div>

                    {/* El detalle, con el motivo escrito a mano */}
                    <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Uno por uno</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Cada ajuste con lo que se escribió al registrarlo y quién lo hizo.
                        </p>
                        {detalle.length ? (
                            <DataTable actions={[]} bodyData={detalle.map((d) => ({
                                fecha: moment(d.fecha).format('DD/MM/YYYY HH:mm'),
                                producto: `${d.codigo} - ${d.producto}`,
                                motivo: d.motivo,
                                detalle: d.detalle || '—',
                                cantidad: `${d.tipoMovimiento === 'SALIDA' ? '-' : '+'}${d.cantidad}`,
                                valor: soles(d.valor),
                                responsable: d.responsable || '—',
                            }))} headerColumns={[
                                { label: 'Fecha', key: 'fecha' },
                                { label: 'Producto', key: 'producto' },
                                { label: 'Motivo', key: 'motivo' },
                                { label: 'Detalle', key: 'detalle' },
                                { label: 'Cant.', key: 'cantidad' },
                                { label: 'Valor', key: 'valor' },
                                { label: 'Responsable', key: 'responsable' },
                            ]} />
                        ) : <p className="text-sm text-gray-400 py-6 text-center">Sin ajustes con motivo en este período.</p>}
                    </div>
                </>
            )}
        </div>
    );
};

export default MermasView;
