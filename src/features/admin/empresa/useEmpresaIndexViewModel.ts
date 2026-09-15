import { useState, useEffect } from 'react';
import { useEmpresasStore } from '@/zustand/empresas';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import { post } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';
import { diasRestantesLima, formatFechaLima } from '@/utils/fechaLima';

// Día calendario en hora de Lima — misma fórmula que backend y panel reseller
const formatDateOnly = (value?: string | Date | null): string => formatFechaLima(value);

const getDaysUntilDate = (value?: string | Date | null): number | null =>
    diasRestantesLima(value);

const formatDaysUntil = (days: number | null): string => {
    if (days === null) return '-';
    if (days < 0) {
        const expiredDays = Math.abs(days);
        return `Vencido hace ${expiredDays} día${expiredDays === 1 ? '' : 's'}`;
    }
    if (days === 0) return 'Vence hoy';
    return `${days} día${days === 1 ? '' : 's'}`;
};

// Texto humano de la actividad de facturación ("Facturó hoy", "Hace 12 días", "Nunca facturó").
const describirUltimaVenta = (salud?: { ultimaVenta?: string | null; diasSinVender?: number } | null): string => {
    if (!salud) return '—';
    if (!salud.ultimaVenta) return 'Nunca facturó';
    const dias = salud.diasSinVender ?? 0;
    if (dias <= 0) return 'Facturó hoy';
    if (dias === 1) return 'Ayer';
    return `Hace ${dias} días`;
};

// Cliente en prueba/demo: no cuenta como riesgo de fuga (aún no es cliente de pago).
const esClienteDemo = (empresa: any): boolean => {
    const plan = empresa?.plan ?? {};
    return plan.esPrueba === true || empresa?.usaDemo === true || /\b(demo|prueba)\b/i.test(String(plan.nombre ?? ''));
};

// Empresa activa que dejó de facturar (amarillo ≥7 días, rojo ≥14) — prioridad de retención.
const estaEnRiesgoFuga = (e: any): boolean =>
    !e.esDemo && e.estado === 'ACTIVO' && (e.saludEstado === 'riesgo' || e.saludEstado === 'critico');

const normalizeWhatsappPhone = (value?: string | null): string => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 9) return `51${digits}`;
    if (digits.length === 11 && digits.startsWith('51')) return digits;
    return digits;
};

export const useEmpresaIndexViewModel = (): any => {
    const { empresas, totalEmpresas, currentPage, totalPages, loading, error, listarEmpresas, cambiarEstadoEmpresa, eliminarEmpresa } = useEmpresasStore();
    const { success } = useAlertStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState<'FORMAL' | 'INFORMAL' | ''>('');
    const [estadoFiltro, setEstadoFiltro] = useState<'ACTIVO' | 'INACTIVO' | 'TODOS'>('TODOS');
    const [saludFiltro, setSaludFiltro] = useState<'' | 'EN_RIESGO'>('');
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);
    const [currentPageState, setCurrentPageState] = useState(1);
    const [openEmpresaModal, setOpenEmpresaModal] = useState(false);
    const [empresaModalMode, setEmpresaModalMode] = useState<'create' | 'edit'>('create');
    const [empresaEditingId, setEmpresaEditingId] = useState<number | undefined>(undefined);

    const debounceSearch = useDebounce(searchTerm, 1000);

    const indexOfLastItem = currentPageState * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = Array.from({ length: Math.ceil(totalEmpresas / itemsPerPage) }, (_, i) => i + 1);

    useEffect(() => {
        listarEmpresas({ search: debounceSearch, page: currentPageState, limit: itemsPerPage, sort: 'id', order: 'desc', estado: estadoFiltro, tipoEmpresa: tipoFiltro });
    }, [debounceSearch, currentPageState, itemsPerPage, estadoFiltro, tipoFiltro]);

    // Exporta el listado filtrado de empresas en PDF o Excel
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
    const exportarEmpresas = async (formato: 'pdf' | 'excel') => {
        if (exportando) return;
        setExportando(formato);
        try {
            const params = new URLSearchParams({ formato });
            if (debounceSearch) params.set('search', debounceSearch);
            if (estadoFiltro !== 'TODOS') params.set('estado', estadoFiltro);
            if (tipoFiltro) params.set('tipoEmpresa', tipoFiltro);
            const resp = await apiClient.get(`/empresa/exportar?${params.toString()}`, {
                responseType: 'blob',
                timeout: 60_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `empresas.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            useAlertStore.getState().alert('No se pudo exportar el listado de empresas', 'error');
        } finally {
            setExportando(null);
        }
    };

    useEffect(() => { if (success === true) { setIsOpenModalConfirm(false); setSelectedEmpresa(null); } }, [success]);

    const handleSearch = (e: any) => { setSearchTerm(e.target.value); setCurrentPageState(1); };
    const handleEdit = (empresa: any) => { setEmpresaEditingId(empresa.id); setEmpresaModalMode('edit'); setOpenEmpresaModal(true); };
    const handleToggleState = (empresa: any) => { setSelectedEmpresa({ ...empresa, accion: 'cambiarEstado' }); setIsOpenModalConfirm(true); };
    const handleDelete = (empresa: any) => { setSelectedEmpresa({ ...empresa, accion: 'eliminar' }); setIsOpenModalConfirm(true); };

    const confirmAction = async () => {
        if (!selectedEmpresa) return;
        if (selectedEmpresa.accion === 'cambiarEstado') await cambiarEstadoEmpresa(selectedEmpresa.id, selectedEmpresa.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
        else if (selectedEmpresa.accion === 'eliminar') await eliminarEmpresa(selectedEmpresa.id);
        setIsOpenModalConfirm(false); setSelectedEmpresa(null);
    };

    const empresasTable = empresas?.map((empresa: any) => {
        const ambienteDisplay = empresa.ambienteFacturacion ?? (empresa.usaDemo ? 'DEMO' : 'PRODUCCIÓN');
        const tiendaEstado = empresa.plan?.tieneTienda && empresa?.slugTienda ? 'Activa' : empresa.plan?.tieneTienda && !empresa?.slugTienda ? 'Disponible' : 'No disponible';
        const diasRestantes = getDaysUntilDate(empresa.fechaExpiracion);
        const adminPrincipal = empresa.usuarios?.[0];
        return {
            id: empresa.id,
            'RUC': empresa.ruc,
            'Razon Social': empresa.razonSocial,
            nombreComercial: empresa.nombreComercial,
            adminNombre: adminPrincipal?.nombre || '',
            adminCelular: adminPrincipal?.celular || '',
            'Ambiente': ambienteDisplay,
            'Rubro': empresa?.rubro?.nombre || '-',
            'Reseller': empresa?.reseller?.nombre || '',
            resellerCodigo: empresa?.reseller?.codigo || '',
            'Plan': empresa.plan?.nombre || '-',
            'Tienda Virtual': tiendaEstado,
            fechaExpiracion: formatDateOnly(empresa.fechaExpiracion),
            'Vence en': formatDaysUntil(diasRestantes),
            estado: empresa.estado,
            // Uso del sistema: comprobantes emitidos (boleta / factura / nota de venta)
            comprobantes: empresa.comprobantes ?? { boletas: 0, facturas: 0, notasVenta: 0, total: 0 },
            // Salud (actividad de facturación) + gestión postventa
            esDemo: esClienteDemo(empresa),
            salud: empresa.salud ?? null,
            saludEstado: empresa.salud?.estado ?? 'sana',
            diasSinVender: empresa.salud?.diasSinVender ?? null,
            ultimaVentaTexto: describirUltimaVenta(empresa.salud),
            estadoGestion: empresa.estadoGestion ?? null,
        };
    }) || [];

    const [drawerEmpresa, setDrawerEmpresa] = useState<any>(null);
    const [alertasDismissed, setAlertasDismissed] = useState(false);
    const [filtroPorVencer, setFiltroPorVencer] = useState(false);

    const getDiasRestantes = (fechaExpiracion: string) => getDaysUntilDate(fechaExpiracion) ?? 0;

    const proximasVencer = (empresas || []).filter((e: any) => {
        if (!e.fechaExpiracion) return false;
        const dias = getDiasRestantes(e.fechaExpiracion);
        return dias >= 0 && dias <= 7;
    });

    const handleViewDetails = (row: any) => {
        const full = empresas?.find((e: any) => e.id === row.id);
        setDrawerEmpresa(full ?? row);
    };

    const refreshEmpresas = () => listarEmpresas({ search: debounceSearch, page: currentPageState, limit: itemsPerPage, sort: 'id', order: 'desc' });

    const handleEnviarRecordatorioEmail = async (row: any) => {
        if (row.estado !== 'ACTIVO') {
            useAlertStore.getState().alert('Solo se puede recordar a empresas activas', 'warning');
            return;
        }
        const resp = await post(`empresa/${row.id}/enviar-email`, { tipo: 'RECORDATORIO' });
        if (resp.success === false || resp.error) {
            useAlertStore.getState().alert(resp.error || 'No se pudo enviar el correo de recordatorio', 'error');
            return;
        }
        useAlertStore.getState().alert('Correo de recordatorio enviado correctamente', 'success');
    };

    const handleEnviarRecordatorioWhatsapp = async (row: any) => {
        if (row.estado !== 'ACTIVO') {
            useAlertStore.getState().alert('Solo se puede recordar a empresas activas', 'warning');
            return;
        }
        const phone = normalizeWhatsappPhone(row.adminCelular);
        if (!phone) {
            useAlertStore.getState().alert('La empresa no tiene celular de administrador activo', 'warning');
            return;
        }
        const empresaNombre = row.nombreComercial || row['Razon Social'] || 'tu empresa';
        const fechaExpiracion = row.fechaExpiracion && row.fechaExpiracion !== '-' ? row.fechaExpiracion : 'por confirmar';
        const estadoVencimiento = String(row['Vence en'] || '').toLowerCase();
        const mensaje = [
            `Hola ${row.adminNombre || 'equipo'}, te recordamos que la suscripción de ${empresaNombre} ${estadoVencimiento}.`,
            `Plan actual: ${row.Plan || 'Suscripción activa'}.`,
            `Fecha de vencimiento: ${fechaExpiracion}.`,
            'Renueva a tiempo para mantener activo tu acceso, facturación, inventario, ventas y tienda virtual.',
        ].join('\n');

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
    };

    // ── Postventa: bitácora de seguimiento + estado de gestión ──
    const [seguimientoEmpresa, setSeguimientoEmpresa] = useState<any>(null); // empresa/row abierto en el modal
    const openSeguimiento = (row: any) => {
        const full = empresas?.find((e: any) => e.id === row.id);
        setSeguimientoEmpresa({ ...(full ?? {}), ...row });
    };
    const closeSeguimiento = () => setSeguimientoEmpresa(null);
    const onGestionActualizada = (id: number, estadoGestion: string | null) => {
        // refresca la fila en memoria para reflejar el nuevo estado sin recargar todo
        useEmpresasStore.setState((s: any) => ({
            empresas: (s.empresas || []).map((e: any) => (e.id === id ? { ...e, estadoGestion } : e)),
        }));
        setSeguimientoEmpresa((prev: any) => (prev && prev.id === id ? { ...prev, estadoGestion } : prev));
    };

    // Abre el chat de WhatsApp del admin de la empresa, EN BLANCO, para escribir libremente.
    // (Distinto del recordatorio: no lleva mensaje predefinido.)
    const handleAbrirWhatsapp = (row: any) => {
        const phone = normalizeWhatsappPhone(row.adminCelular);
        if (!phone) {
            useAlertStore.getState().alert('La empresa no tiene celular de administrador activo', 'warning');
            return;
        }
        window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
    };

    // KPI de retención sobre el conjunto cargado (respeta búsqueda/estado del servidor)
    const kpis = {
        enRiesgoFuga: empresasTable.filter(estaEnRiesgoFuga).length,
    };

    const pasaSalud = (e: any) => (saludFiltro === 'EN_RIESGO' ? estaEnRiesgoFuga(e) : true);
    const toggleSalud = () => setSaludFiltro((prev) => (prev === 'EN_RIESGO' ? '' : 'EN_RIESGO'));

    const pasaVencimiento = (e: any) => {
        if (!filtroPorVencer) return true;
        const full = empresas?.find((emp: any) => emp.id === e.id);
        if (!full?.fechaExpiracion) return false;
        const dias = getDiasRestantes(full.fechaExpiracion);
        return dias >= 0 && dias <= 7;
    };

    const empresasTableFiltradas = empresasTable.filter((e: any) => pasaVencimiento(e) && pasaSalud(e));

    return { exportando, exportarEmpresas, empresas, empresasTable: empresasTableFiltradas, kpis, totalEmpresas, loading, error, searchTerm, tipoFiltro, estadoFiltro, saludFiltro, setSaludFiltro, toggleSalud, itemsPerPage, currentPageState, setCurrentPageState, setItemsPerPage, pages, indexOfFirstItem, indexOfLastItem, isOpenModalConfirm, setIsOpenModalConfirm, selectedEmpresa, openEmpresaModal, setOpenEmpresaModal, empresaModalMode, empresaEditingId, setEmpresaEditingId, setEmpresaModalMode, handleSearch, handleEdit, handleToggleState, handleDelete, confirmAction, refreshEmpresas, setTipoFiltro, setEstadoFiltro, drawerEmpresa, setDrawerEmpresa, handleViewDetails, proximasVencer, alertasDismissed, setAlertasDismissed, filtroPorVencer, setFiltroPorVencer, getDiasRestantes, handleEnviarRecordatorioEmail, handleEnviarRecordatorioWhatsapp, handleAbrirWhatsapp, seguimientoEmpresa, openSeguimiento, closeSeguimiento, onGestionActualizada };
};
