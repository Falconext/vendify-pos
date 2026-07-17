import { useResellersViewModel } from '@/features/admin/sistema/useResellersViewModel';
import { Icon } from '@iconify/react';
import { useMemo, useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import apiClient from '@/utils/apiClient';

// Chequeo en vivo de disponibilidad del dominio/subdominio del reseller.
function DominioDisponibilidad({ dominio, excludeId }: { dominio?: string; excludeId?: number }) {
    const [estado, setEstado] = useState<{ disponible?: boolean; motivo?: string; loading?: boolean } | null>(null);
    useEffect(() => {
        const d = String(dominio || '').trim();
        if (!d) { setEstado(null); return; }
        let cancel = false;
        setEstado({ loading: true });
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ dominio: d });
                if (excludeId) params.set('excludeId', String(excludeId));
                const { data } = await apiClient.get(`/resellers/dominio/check?${params.toString()}`);
                const r = data?.data ?? data;
                if (!cancel) setEstado({ disponible: r?.disponible, motivo: r?.motivo });
            } catch {
                if (!cancel) setEstado({ disponible: false, motivo: 'No se pudo verificar el dominio.' });
            }
        }, 500);
        return () => { cancel = true; clearTimeout(t); };
    }, [dominio, excludeId]);

    if (!estado) return null;
    if (estado.loading) return <p className="mt-1 text-xs text-gray-400 flex items-center gap-1"><Icon icon="eos-icons:loading" className="animate-spin" /> Verificando…</p>;
    if (estado.disponible) return <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1"><Icon icon="solar:check-circle-bold" /> Dominio disponible</p>;
    return <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1"><Icon icon="solar:danger-circle-bold" /> {estado.motivo}</p>;
}

export default function AdminResellers() {
    const vm = useResellersViewModel();
    const [costoComprobante, setCostoComprobante] = useState(0.05);
    const [activeTab, setActiveTab] = useState<'general' | 'whitelabel'>('general');

    useEffect(() => {
        if (vm.isCreateModalOpen) setActiveTab('general');
    }, [vm.isCreateModalOpen]);

    const pricingPlans = useMemo(
        () => [
            { plan: 'Plan 100', comprobantesMes: 100, mensual: 29.9, anual: 299 },
            { plan: 'Plan 300', comprobantesMes: 300, mensual: 39.9, anual: 399 },
            { plan: 'Plan 500', comprobantesMes: 500, mensual: 49.9, anual: 500 },
            { plan: 'Plan 600', comprobantesMes: 600, mensual: 69.9, anual: 699 },
            { plan: 'Plan 800', comprobantesMes: 800, mensual: 89.9, anual: 899 },
            { plan: 'Plan 1200', comprobantesMes: 1200, mensual: 119.9, anual: 1199 },
        ],
        []
    );

    const simulatorRows = useMemo(() => {
        return pricingPlans.map((item) => {
            const costoSunatMensual = item.comprobantesMes * costoComprobante;
            const costoSunatAnual = costoSunatMensual * 12;

            const calc = (publicPrice: number, discountPct: number, sunatCost: number) => {
                const resellerPrice = publicPrice * (1 - discountPct / 100);
                const platformMargin = resellerPrice - sunatCost;
                const resellerMargin = publicPrice - resellerPrice;
                return { resellerPrice, platformMargin, resellerMargin };
            };

            return {
                ...item,
                costoSunatMensual,
                costoSunatAnual,
                mensual20: calc(item.mensual, 20, costoSunatMensual),
                mensual30: calc(item.mensual, 30, costoSunatMensual),
                mensual35: calc(item.mensual, 35, costoSunatMensual),
                anual20: calc(item.anual, 20, costoSunatAnual),
                anual30: calc(item.anual, 30, costoSunatAnual),
                anual35: calc(item.anual, 35, costoSunatAnual),
            };
        });
    }, [pricingPlans, costoComprobante]);

    const exportSimulatorCsv = () => {
        const header = [
            'Plan',
            'ComprobantesMes',
            'PrecioPublicoMensual',
            'CostoSunatMensual',
            'ResellerMensual20',
            'MargenPlataformaMensual20',
            'ResellerMensual30',
            'MargenPlataformaMensual30',
            'ResellerMensual35',
            'MargenPlataformaMensual35',
            'PrecioPublicoAnual',
            'CostoSunatAnual',
            'ResellerAnual20',
            'MargenPlataformaAnual20',
            'ResellerAnual30',
            'MargenPlataformaAnual30',
            'ResellerAnual35',
            'MargenPlataformaAnual35',
        ];

        const lines = simulatorRows.map((row) => [
            row.plan,
            row.comprobantesMes,
            row.mensual.toFixed(2),
            row.costoSunatMensual.toFixed(2),
            row.mensual20.resellerPrice.toFixed(2),
            row.mensual20.platformMargin.toFixed(2),
            row.mensual30.resellerPrice.toFixed(2),
            row.mensual30.platformMargin.toFixed(2),
            row.mensual35.resellerPrice.toFixed(2),
            row.mensual35.platformMargin.toFixed(2),
            row.anual.toFixed(2),
            row.costoSunatAnual.toFixed(2),
            row.anual20.resellerPrice.toFixed(2),
            row.anual20.platformMargin.toFixed(2),
            row.anual30.resellerPrice.toFixed(2),
            row.anual30.platformMargin.toFixed(2),
            row.anual35.resellerPrice.toFixed(2),
            row.anual35.platformMargin.toFixed(2),
        ]);

        const csv = [header.join(','), ...lines.map((line) => line.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'simulador-precios-reseller.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Icon icon="solar:users-group-two-rounded-bold-duotone" className="text-indigo-600" />Distribuidores</h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona los socios comerciales y sus saldos</p>
                </div>
                <button onClick={vm.openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95">
                    <Icon icon="solar:user-plus-bold" width="20" />Nuevo Distribuidor
                </button>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto font-inter">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold">
                            <tr><th className="px-6 py-4">Nombre / Código</th><th className="px-6 py-4">Representante</th><th className="px-6 py-4">Contacto</th><th className="px-6 py-4 text-right">Saldo</th><th className="px-6 py-4 text-right">MRR Bruto</th><th className="px-6 py-4 text-right">Margen</th><th className="px-6 py-4 text-right">Churn 30d</th><th className="px-6 py-4 text-center">Clientes</th><th className="px-6 py-4 text-center">Estado</th><th className="px-6 py-4 text-center">Acciones</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {vm.resellers.length === 0 ? (
                                <tr><td className="px-6 py-12" colSpan={10}><div className="flex flex-col items-center justify-center text-gray-400"><Icon icon="solar:users-group-two-rounded-linear" width="48" className="mb-2 opacity-50" /><p>No hay distribuidores registrados</p></div></td></tr>
                            ) : (
                                vm.resellers.map((reseller) => (
                                    (() => {
                                        const metric = vm.getRentabilidadByReseller(reseller.id);
                                        return (
                                    <tr key={reseller.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4"><p className="font-bold text-gray-800">{reseller.nombre}</p><span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-mono">{reseller.codigo}</span></td>
                                        <td className="px-6 py-4 text-gray-600">{reseller.representante || '-'}</td>
                                        <td className="px-6 py-4"><div className="flex flex-col text-xs text-gray-500 gap-1">{reseller.email && <div className="flex items-center gap-1.5"><Icon icon="solar:letter-linear" width="14" />{reseller.email}</div>}{reseller.telefono && <div className="flex items-center gap-1.5"><Icon icon="solar:phone-linear" width="14" />{reseller.telefono}</div>}</div></td>
                                        <td className="px-6 py-4 text-right text-gray-700">S/ {Number(reseller.saldo).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-gray-700">S/ {Number(metric?.mrrBruto || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right"><div className="text-gray-700">S/ {Number(metric?.margenMensual || 0).toFixed(2)}</div><div className="text-xs text-emerald-600 font-semibold">{Number(metric?.margenPct || 0).toFixed(1)}%</div></td>
                                        <td className="px-6 py-4 text-right"><div className="text-gray-700 font-semibold">{Number(metric?.churn30dPct || 0).toFixed(1)}%</div><div className="text-xs text-gray-500">{metric?.clientesPerdidos30d || 0} perdidos</div></td>
                                        <td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-bold">{reseller._count?.empresas || 0}</span></td>
                                        <td className="px-6 py-4 text-center"><div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${reseller.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}><div className={`w-1.5 h-1.5 rounded-full ${reseller.activo ? 'bg-emerald-500' : 'bg-red-500'}`}></div>{reseller.activo ? 'Activo' : 'Inactivo'}</div></td>
                                        <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => vm.openRechargeModal(reseller)} title="Recargar Saldo" className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"><Icon icon="solar:wallet-money-bold" width="18" /></button><button onClick={() => vm.openEditModal(reseller)} title="Editar" className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><Icon icon="solar:pen-bold" width="18" /></button><button onClick={() => vm.handleToggleEstado(reseller)} title={reseller.activo ? 'Desactivar' : 'Activar'} className={`p-1.5 rounded-lg transition-colors ${reseller.activo ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'}`}><Icon icon={reseller.activo ? 'solar:forbidden-circle-bold' : 'solar:check-circle-bold'} width="18" /></button></div></td>
                                    </tr>
                                        );
                                    })()
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Icon icon="solar:calculator-bold-duotone" className="text-blue-600" />
                            Simulador de Precios Reseller
                        </h3>
                        <p className="text-sm text-gray-500">Evalúa margen para plataforma y reseller en planes mensual/anual.</p>
                    </div>
                    <div className="flex items-end gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Costo SUNAT x comprobante (incluye IGV)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costoComprobante}
                                onChange={(e) => setCostoComprobante(Number(e.target.value) || 0)}
                                className="mt-1 w-44 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-100"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Ejemplo: S/ 0.05 ya considera IGV del proveedor.</p>
                        </div>
                        <button
                            onClick={exportSimulatorCsv}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            <Icon icon="solar:file-download-bold-duotone" width="18" />
                            Exportar CSV
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-x-auto font-inter">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Comp./Mes</th>
                                <th className="px-4 py-3">Público Mensual</th>
                                <th className="px-4 py-3">Costo SUNAT (incl. IGV)</th>
                                <th className="px-4 py-3">Reseller 20/30/35</th>
                                <th className="px-4 py-3">Margen Plataforma Mensual</th>
                                <th className="px-4 py-3">Público Anual</th>
                                <th className="px-4 py-3">Costo SUNAT (incl. IGV)</th>
                                <th className="px-4 py-3">Reseller 20/30/35</th>
                                <th className="px-4 py-3">Margen Plataforma Anual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {simulatorRows.map((row) => (
                                <tr key={row.plan} className="hover:bg-gray-50/40">
                                    <td className="px-4 py-3 font-semibold text-gray-800">{row.plan}</td>
                                    <td className="px-4 py-3 text-gray-700">{row.comprobantesMes}</td>
                                    <td className="px-4 py-3">S/ {row.mensual.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">S/ {row.costoSunatMensual.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {`S/ ${row.mensual20.resellerPrice.toFixed(2)} / S/ ${row.mensual30.resellerPrice.toFixed(2)} / S/ ${row.mensual35.resellerPrice.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="text-gray-700">20%: S/ {row.mensual20.platformMargin.toFixed(2)}</div>
                                        <div className="text-gray-700">30%: S/ {row.mensual30.platformMargin.toFixed(2)}</div>
                                        <div className="text-gray-700">35%: S/ {row.mensual35.platformMargin.toFixed(2)}</div>
                                    </td>
                                    <td className="px-4 py-3">S/ {row.anual.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">S/ {row.costoSunatAnual.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {`S/ ${row.anual20.resellerPrice.toFixed(2)} / S/ ${row.anual30.resellerPrice.toFixed(2)} / S/ ${row.anual35.resellerPrice.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="text-gray-700">20%: S/ {row.anual20.platformMargin.toFixed(2)}</div>
                                        <div className="text-gray-700">30%: S/ {row.anual30.platformMargin.toFixed(2)}</div>
                                        <div className="text-gray-700">35%: S/ {row.anual35.platformMargin.toFixed(2)}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpenModal={vm.isCreateModalOpen}
                closeModal={() => vm.setIsCreateModalOpen(false)}
                title={vm.isEditMode ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
                icon="solar:users-group-two-rounded-bold-duotone"
                iconClass="bg-indigo-50 text-indigo-600"
                width="660px"
                height="auto"
            >
                <form onSubmit={vm.handleCreateSubmit}>
                    <div className="flex border-b border-gray-100">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Icon icon="solar:user-id-bold" width="14" />General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('whitelabel')}
                            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'whitelabel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Icon icon="solar:palette-bold" width="14" />White Label
                        </button>
                    </div>

                    <div className="p-5">
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <InputPro isLabel label="Nombre Comercial" name="nombre" value={vm.formData.nombre} onChange={vm.handleCreateChange as any} placeholder="Ej. Distribuciones Lima Norte" />
                                </div>
                                <InputPro isLabel label="Código Único" name="codigo" value={vm.formData.codigo} onChange={vm.handleCreateChange as any} placeholder="Ej. RES-001" />
                                <InputPro isLabel label="Teléfono" name="telefono" value={vm.formData.telefono} onChange={vm.handleCreateChange as any} placeholder="999 999 999" />
                                <div className="col-span-2">
                                    <InputPro isLabel label="Email (Usuario)" name="email" type="email" value={vm.formData.email} onChange={vm.handleCreateChange as any} placeholder="contacto@distribuidor.com" />
                                </div>
                                <InputPro isLabel label="Representante Legal" name="representante" value={vm.formData.representante} onChange={vm.handleCreateChange as any} placeholder="Nombre completo" />
                                <div>
                                    <InputPro isLabel label="Dominio White Label" name="dominioPersonalizado" value={vm.formData.dominioPersonalizado} onChange={vm.handleCreateChange as any} placeholder="micliente.vendify.pe o dominio propio" />
                                    <DominioDisponibilidad dominio={vm.formData.dominioPersonalizado} excludeId={(vm.formData as any)?.id} />
                                    <p className="mt-1 text-[11px] text-gray-400">Subdominio de Vendify (ej: <b>micliente.vendify.pe</b>) o un dominio propio (ej: <b>misistema.com</b>).</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'whitelabel' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <InputPro isLabel label="Nombre de Marca" name="whiteLabelNombre" value={vm.formData.whiteLabelNombre} onChange={vm.handleCreateChange as any} placeholder="Jamble" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <InputPro isLabel label="Color Primario" name="whiteLabelColorPrimario" value={vm.formData.whiteLabelColorPrimario} onChange={vm.handleCreateChange as any} placeholder="#0F172A" />
                                    </div>
                                    {vm.formData.whiteLabelColorPrimario && (
                                        <div className="w-9 h-9 rounded-lg border border-gray-200 mb-0.5 flex-shrink-0" style={{ backgroundColor: vm.formData.whiteLabelColorPrimario }} />
                                    )}
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <InputPro isLabel label="Color Secundario" name="whiteLabelColorSecundario" value={vm.formData.whiteLabelColorSecundario} onChange={vm.handleCreateChange as any} placeholder="#334155" />
                                    </div>
                                    {vm.formData.whiteLabelColorSecundario && (
                                        <div className="w-9 h-9 rounded-lg border border-gray-200 mb-0.5 flex-shrink-0" style={{ backgroundColor: vm.formData.whiteLabelColorSecundario }} />
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <InputPro isLabel label="Logo URL" name="whiteLabelLogoUrl" value={vm.formData.whiteLabelLogoUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../logo.png" />
                                </div>
                                <InputPro isLabel label="Logo Blanco URL" name="whiteLabelLogoWhiteUrl" value={vm.formData.whiteLabelLogoWhiteUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../logo-white.png" />
                                <InputPro isLabel label="Favicon URL" name="whiteLabelFaviconUrl" value={vm.formData.whiteLabelFaviconUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../favicon.ico" />
                                <InputPro isLabel label="Website" name="whiteLabelWebsite" value={vm.formData.whiteLabelWebsite} onChange={vm.handleCreateChange as any} placeholder="https://jamble.pe" />
                                <InputPro isLabel label="Email Comercial" name="whiteLabelEmail" value={vm.formData.whiteLabelEmail} onChange={vm.handleCreateChange as any} placeholder="ventas@jamble.pe" />
                                <InputPro isLabel label="Teléfono Marca" name="whiteLabelTelefono" value={vm.formData.whiteLabelTelefono} onChange={vm.handleCreateChange as any} placeholder="+51 ..." />
                                <InputPro isLabel label="WhatsApp Marca" name="whiteLabelWhatsapp" value={vm.formData.whiteLabelWhatsapp} onChange={vm.handleCreateChange as any} placeholder="51999..." />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 px-5 pb-5">
                        <Button type="button" onClick={() => vm.setIsCreateModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
                        <Button type="submit" color="primary" className="flex-1">{vm.isEditMode ? 'Guardar Cambios' : 'Crear Distribuidor'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpenModal={vm.isRechargeModalOpen && !!vm.selectedReseller}
                closeModal={() => vm.setIsRechargeModalOpen(false)}
                title="Recargar Saldo"
                icon="solar:wallet-money-bold-duotone"
                iconClass="bg-emerald-50 text-emerald-600"
                width="380px"
                height="auto"
            >
                {vm.selectedReseller && (
                    <form onSubmit={vm.handleRechargeSubmit}>
                        <div className="px-5 pt-4 pb-2 text-center border-b border-gray-50">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{vm.selectedReseller.nombre}</p>
                            <p className="text-sm text-gray-400 mt-0.5">Saldo actual: <span className="text-gray-800 font-bold font-mono">S/ {Number(vm.selectedReseller.saldo).toFixed(2)}</span></p>
                        </div>
                        <div className="p-5 space-y-3">
                            <InputPro isLabel label="Monto a Recargar (S/)" name="monto" type="number" value={vm.rechargeData.monto} onChange={vm.handleRechargeChange as any} placeholder="0.00" autoFocus step="0.01" />
                            <InputPro isLabel label="Referencia (Opcional)" name="referencia" value={vm.rechargeData.referencia} onChange={vm.handleRechargeChange as any} placeholder="Ej. Transferencia BCP #1234" />
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <Button type="button" onClick={() => vm.setIsRechargeModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
                            <Button type="submit" color="success" className="flex-1">Confirmar</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
