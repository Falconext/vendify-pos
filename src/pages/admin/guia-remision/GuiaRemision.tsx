import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import moment from "moment";
import InputPro from "@/components/InputPro";
import { Calendar } from "@/components/Date";
import DataTable from "@/components/Datatable";
import TableActionMenu from "@/components/TableActionMenu";
import { useGuiaRemisionStore } from "@/zustand/guia-remision";
import useAlertStore from "@/zustand/alert";
import { useDebounce } from "@/hooks/useDebounce";
import ModalGuiaRemision from "./components/ModalGuiaRemision";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import GuiaRemisionPrint from "./print/GuiaRemisionPrint";
import { useAuthStore } from "@/zustand/auth";
import { useSedesStore } from "@/zustand/sedes";
import Select from "@/components/Select";
import apiClient from "@/utils/apiClient";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";
import ModalConfirm from "@/components/ModalConfirm";

const ACCENT = '#7551FF';

const MOTIVOS_TRASLADO: Record<string, string> = {
    "01": "VENTA",
    "02": "COMPRA",
    "03": "CONSIGNACIÓN",
    "04": "DEVOLUCIÓN",
    "05": "TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA",
    "06": "TRASLADO PARA EXPORTACIÓN",
    "07": "VENTA CON ENTREGA A TERCEROS",
    "08": "VENTA SUJETA A CONFIRMACIÓN DEL COMPRADOR",
    "09": "TRASLADO DE BIENES PARA TRANSFORMACIÓN",
    "13": "OTROS",
};

const GuiaRemision = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { getAllGuiasRemision, guiasRemision, enviarSunat, deleteGuiaRemision, downloadPdf } = useGuiaRemisionStore();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Menu Action State
    const [menuOpen, setMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [guiaToEdit, setGuiaToEdit] = useState<any>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
    const [isProcessingSend, setIsProcessingSend] = useState(false);
    const [isProcessingDelete, setIsProcessingDelete] = useState(false);

    // Print State
    const [guiaToPrint, setGuiaToPrint] = useState<any>(null);
    const componentRef = useRef(null);
    const { auth } = useAuthStore();

    const handlePrintReact = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle({ width: 210, height: 297 }),
    });

    const handlePrint = (guia: any) => {
        handleCloseMenu();
        setGuiaToPrint(guia);
        // Allow time for state update and render
        setTimeout(() => {
            handlePrintReact();
        }, 100);
    };

    const { sedes, listarSedes } = useSedesStore();
    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre}` : s.nombre }))
    ];

    // Filtros
    const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));

    useEffect(() => {
        const state = location.state as any;
        if (state?.fromDespachoComprobante && state?.comprobanteGuia) {
            const comprobante = state.comprobanteGuia;
            setGuiaToEdit({
                tipoGuia: "REMITENTE",
                serie: "T001",
                tipoDocumento: "09",
                destinatarioTipoDoc: String(comprobante.clienteNroDoc || '').length === 11 ? "6" : "1",
                destinatarioNumDoc: comprobante.clienteNroDoc || "10000000",
                destinatarioRazonSocial: comprobante.clienteNombre || "CLIENTES VARIOS",
                tipoTraslado: "01",
                modoTransporte: comprobante.agenciaEnvio === "PROPIOS" ? "02" : "01",
                pesoTotal: 1,
                unidadPeso: "KGM",
                llegadaDireccion: comprobante.clienteDireccion || "",
                fechaInicioTraslado: moment().format("YYYY-MM-DD"),
                observaciones: `Comprobante origen: ${comprobante.referencia}`,
                detalles: Array.isArray(comprobante.items) ? comprobante.items.map((item: any) => ({
                    productoId: item.productoId || undefined,
                    codigoProducto: item.codigo || "",
                    descripcion: item.descripcion || "Producto",
                    cantidad: Number(item.cantidad || 1),
                    unidadMedida: item.unidad || "NIU",
                })) : [],
            });
            setIsModalOpen(true);
            window.history.replaceState({}, document.title);
            return;
        }

        if (!state?.fromPedidoTienda || !state?.pedidoTiendaGuia) return;

        const pedido = state.pedidoTiendaGuia;
        setGuiaToEdit({
            tipoGuia: "REMITENTE",
            serie: "T001",
            tipoDocumento: "09",
            destinatarioTipoDoc: "1",
            destinatarioNumDoc: "10000000",
            destinatarioRazonSocial: pedido.clienteNombre || "CLIENTES VARIOS",
            tipoTraslado: "01",
            modoTransporte: pedido.agenciaEnvio === "PROPIOS" ? "02" : "01",
            pesoTotal: 1,
            unidadPeso: "KGM",
            llegadaDireccion: pedido.clienteDireccion || "",
            fechaInicioTraslado: moment().format("YYYY-MM-DD"),
            observaciones: `Pedido tienda: ${pedido.codigoSeguimiento}`,
            detalles: Array.isArray(pedido.items) ? pedido.items.map((item: any) => ({
                productoId: item.productoId || item.producto?.id || undefined,
                codigoProducto: item.producto?.codigo || "",
                descripcion: item.producto?.descripcion || "Producto",
                cantidad: Number(item.cantidad || 1),
                unidadMedida: "NIU",
            })) : [],
        });
        setIsModalOpen(true);
        window.history.replaceState({}, document.title);
    }, [location.state]);
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    useEffect(() => {
        if (isAdmin) listarSedes();
    }, [isAdmin]);

    useEffect(() => {
        getAllGuiasRemision({
            search: debouncedSearchTerm,
            fechaInicio,
            fechaFin,
            ...(isAdmin && selectedSedeId ? { sedeId: selectedSedeId } : {}),
        });
    }, [debouncedSearchTerm, fechaInicio, fechaFin, selectedSedeId]);

    const handleSearch = (e: any) => {
        setSearchTerm(e.target.value);
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, row: any) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedRow(row);
        setMenuOpen(true);
    };

    const handleCloseMenu = (clearSelection = true) => {
        setMenuOpen(false);
        setAnchorEl(null);
        if (clearSelection) {
            setSelectedRow(null);
        }
    };

    const handleEnviarSunat = async () => {
        if (!selectedRow) return;
        handleCloseMenu(false);
        setIsSendConfirmOpen(true);
    };

    const handleEliminar = async () => {
        if (!selectedRow) return;
        handleCloseMenu(false);
        setIsDeleteConfirmOpen(true);
    };

    const confirmEnviarSunat = async () => {
        if (!selectedRow) return;
        setIsSendConfirmOpen(false);
        try {
            setIsProcessingSend(true);
            await enviarSunat(selectedRow.id);
        } finally {
            setIsProcessingSend(false);
        }
    };

    const confirmEliminar = async () => {
        if (!selectedRow) return;
        setIsDeleteConfirmOpen(false);
        try {
            setIsProcessingDelete(true);
            await deleteGuiaRemision(selectedRow.id);
        } finally {
            setIsProcessingDelete(false);
        }
    };

    const handleEditar = async () => {
        if (!selectedRow) return;
        setGuiaToEdit(selectedRow);
        setIsModalOpen(true);
        handleCloseMenu();
    }

    const headerColumns = [
        { label: "Fecha y Hora", key: "fechaEmision" },
        { label: "Documento", key: "documento" },
        { label: "Destinatario", key: "destinatario" },
        { label: "Motivo Traslado", key: "motivo" },
        { label: "Estado SUNAT", key: "estadoSunat" },
        { label: "Acciones", key: "acciones", width: "100px" }
    ];

    const selectedEstadoSunat = selectedRow?.estadoSunat || 'PENDIENTE';
    const canEditGuia = ['PENDIENTE', 'FALLIDO_ENVIO', 'RECHAZADO'].includes(selectedEstadoSunat);
    const canDeleteGuia = ['PENDIENTE', 'FALLIDO_ENVIO', 'RECHAZADO'].includes(selectedEstadoSunat);
    const canSendGuia = ['PENDIENTE', 'FALLIDO_ENVIO'].includes(selectedEstadoSunat);
    const isRetryGuia = selectedEstadoSunat === 'FALLIDO_ENVIO';

    const bodyData = guiasRemision.map((guia: any) => ({
        ...guia,
        fechaEmision: `${moment.utc(guia.fechaEmision).format("DD/MM/YYYY")} ${guia.horaEmision || ''}`,
        documento: `${guia.serie}-${guia.correlativo}`,
        destinatario: guia.destinatarioRazonSocial,
        motivo: MOTIVOS_TRASLADO[guia.tipoTraslado] || guia.tipoTraslado,
        estadoSunat: (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                guia.estadoSunat === 'ACEPTADO'
                ? 'bg-emerald-50 text-emerald-600' :
                guia.estadoSunat === 'RECHAZADO' || guia.estadoSunat === 'FALLIDO_ENVIO'
                ? 'bg-rose-50 text-rose-600' :
                guia.estadoSunat === 'ENVIADO'
                ? 'bg-violet-50 text-violet-600' :
                'bg-blue-50 text-blue-600'
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                    guia.estadoSunat === 'ACEPTADO' ? 'bg-emerald-500' :
                    guia.estadoSunat === 'RECHAZADO' || guia.estadoSunat === 'FALLIDO_ENVIO' ? 'bg-rose-500' :
                    guia.estadoSunat === 'ENVIADO' ? 'bg-violet-500' : 'bg-blue-500'
                }`}></span>
                {guia.estadoSunat === 'FALLIDO_ENVIO' ? 'FALLIDO' : (guia.estadoSunat || 'PENDIENTE')}
            </span>
        ),
        acciones: (
            <button
                onClick={(e) => handleOpenMenu(e, guia)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
                <Icon icon="mdi:dots-vertical" width={20} height={20} />
            </button>
        )
    }));

    const activeFilterCount = [searchTerm.trim(), fechaInicio, fechaFin, selectedSedeId].filter(Boolean).length;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta" style={{ ['--accent' as any]: ACCENT }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Facturación</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Guías de Remisión</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 shrink-0">
                        <Icon icon="solar:delivery-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Guías de Remisión</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Gestión y envío de guías de remitente y transportista</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                    Nueva Guía
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 px-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <Icon icon="solar:filter-bold-duotone" className="text-xl text-violet-600" />
                            <div className="min-w-0">
                                <h3 className="font-bold uppercase tracking-wide text-xs text-slate-800">Filtros de búsqueda</h3>
                                <p className="truncate text-xs text-slate-400 md:hidden">
                                    {activeFilterCount} activos · {moment(fechaInicio).format('DD/MM')} - {moment(fechaFin).format('DD/MM')}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMobileFiltersOpen((value) => !value)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white shadow-lg shadow-violet-500/30 md:hidden"
                            style={{ background: ACCENT }}
                        >
                            {isMobileFiltersOpen ? 'Ocultar' : 'Ver filtros'}
                            <Icon icon={isMobileFiltersOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
                        </button>
                    </div>
                    <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-5 lg:items-end`}>
                        <div className="lg:col-span-2">
                            <InputPro
                                label="Búsqueda rápida"
                                name="search"
                                value={searchTerm}
                                onChange={handleSearch}
                                placeholder="Serie, correlativo o destinatario..."
                                isLabel={true}
                            />
                        </div>
                        <div>
                            <Calendar
                                text="Desde"
                                name="fechaInicio"
                                value={moment(fechaInicio).format('DD/MM/YYYY')}
                                onChange={(date: any) => setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'))}
                                className="admin-date-filter"
                                portal
                            />
                        </div>
                        <div>
                            <Calendar
                                text="Hasta"
                                name="fechaFin"
                                value={moment(fechaFin).format('DD/MM/YYYY')}
                                onChange={(date: any) => setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'))}
                                className="admin-date-filter"
                                portal
                            />
                        </div>
                        {isAdmin && (
                            <div>
                                <Select
                                    error=""
                                    label="Sede"
                                    name="sedeId"
                                    defaultValue="Todas las sedes"
                                    onChange={(id: any, _value: string) => setSelectedSedeId(id === 0 ? null : Number(id))}
                                    options={sedesOptions}
                                />
                            </div>
                        )}
                    </div>
                </div>


                <div className="mt-6">
                    <DataTable
                        headerColumns={headerColumns}
                        bodyData={bodyData}
                        isCompact={false}
                    />
                </div>

                <TableActionMenu
                    isOpen={menuOpen}
                    onClose={() => handleCloseMenu(true)}
                    anchorEl={anchorEl}
                >
                    <div className="py-1">
                        {['PENDIENTE', 'ACEPTADO', 'EMITIDO', 'ENVIADO', 'FALLIDO_ENVIO'].includes(selectedEstadoSunat) ? (
                            <button
                                onClick={() => {
                                    handleCloseMenu();
                                    navigate("/administrador/facturacion/nuevo", { state: { guiaRemision: selectedRow } });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"
                            >
                                <Icon icon="solar:bill-bold" width={16} height={16} /> <span>Facturar Guía</span>
                            </button>
                        ) : null}

                        <button
                            onClick={async () => {
                                handleCloseMenu();
                                if (selectedRow) {
                                    await downloadPdf(selectedRow.id);
                                }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                        >
                            <Icon icon="heroicons:arrow-down-tray" width={16} height={16} /> <span>Descargar PDF</span>
                        </button>

                        <button
                            onClick={() => {
                                handleCloseMenu();
                                // Open PDF in new tab for printing

                                // Strategy: Fetch blob, create ObjectURL, open in new tab.
                                apiClient.get(`guia-remision/${selectedRow.id}/pdf`, { responseType: 'blob' })
                                    .then(response => {
                                        const file = new Blob([response.data], { type: 'application/pdf' });
                                        const fileURL = URL.createObjectURL(file);
                                        window.open(fileURL, '_blank');
                                    })
                                    .catch(err => {
                                        useAlertStore.getState().alert('Error al abrir PDF para imprimir', 'error');
                                    });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                        >
                            <Icon icon="solar:printer-bold" width={16} height={16} /> <span>Imprimir Formato</span>
                        </button>

                        {canEditGuia && (
                            <>
                                <button
                                    onClick={handleEditar}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                                >
                                    <Icon icon="material-symbols:edit" width={16} height={16} /> <span>Editar</span>
                                </button>
                                {canSendGuia && (
                                    <button
                                        onClick={handleEnviarSunat}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50"
                                    >
                                        <Icon icon="heroicons:paper-airplane" width={16} height={16} /> <span>{isRetryGuia ? 'Reintentar envío a SUNAT' : 'Enviar a SUNAT'}</span>
                                    </button>
                                )}
                            </>
                        )}

                        {canDeleteGuia && (
                            <button
                                onClick={handleEliminar}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                                <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} /> <span>Eliminar</span>
                            </button>
                        )}
                    </div>
                </TableActionMenu>

                {/* Modal de Nueva Guía — solo monta cuando se abre */}
                {isModalOpen && (
                    <ModalGuiaRemision
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setGuiaToEdit(null);
                        }}
                        onSuccess={() => {
                            getAllGuiasRemision({
                                search: debouncedSearchTerm,
                                fechaInicio,
                                fechaFin
                            });
                            setGuiaToEdit(null);
                        }}
                        guiaToEdit={guiaToEdit}
                    />
                )}
                <ModalConfirm
                    isOpenModal={isSendConfirmOpen}
                    setIsOpenModal={setIsSendConfirmOpen}
                    confirmSubmit={confirmEnviarSunat}
                    title={isRetryGuia ? "Reintentar envío a SUNAT" : "Enviar a SUNAT"}
                    information={isRetryGuia
                        ? "¿Desea reintentar el envío de esta guía a SUNAT?"
                        : "¿Desea enviar esta guía a SUNAT?"}
                    confirmText={isRetryGuia ? "Reintentar" : "Enviar"}
                    confirmLoading={isProcessingSend}
                    confirmDisabled={isProcessingDelete}
                />
                <ModalConfirm
                    isOpenModal={isDeleteConfirmOpen}
                    setIsOpenModal={setIsDeleteConfirmOpen}
                    confirmSubmit={confirmEliminar}
                    title="Eliminar guía de remisión"
                    information="¿Está seguro de eliminar esta guía? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    confirmLoading={isProcessingDelete}
                    confirmDisabled={isProcessingSend}
                />
                {/* Componente oculto para impresión */}
                <div style={{ display: "none" }}>
                    <GuiaRemisionPrint
                        ref={componentRef}
                        guia={guiaToPrint}
                        company={auth?.empresa}
                    />
                </div>
            </div>
        </div>
    );
};

export default GuiaRemision;
