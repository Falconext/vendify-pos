import React, { useState, useEffect, useRef } from "react";
import { BarcodeScannerInput } from "@/components/BarcodeScannerInput";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import InputPro from "@/components/InputPro";
import Select from "@/components/Select";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAlertStore from "@/zustand/alert";
import { useAuthStore } from "@/zustand/auth";
import { useComprasStore } from "@/zustand/compras";
import { useCuentasBancariasStore } from "@/zustand/cuentasBancarias";
import { useClientsStore } from "@/zustand/clients";
import { useProductsStore } from "@/zustand/products";
import { get } from "@/utils/fetch";
import moment from "moment";
import { Calendar } from "@/components/Date";
import apiClient from "@/utils/apiClient";
import ModalConfirm from "@/components/ModalConfirm";
import { usaLotesFarmaciaRubro } from "@/utils/rubro-features";
import { hasPlanFeature } from "@/utils/permissions";

const PROV_DOC_TYPES = [
    { key: 'RUC', label: 'RUC', digits: 11 },
    { key: 'DNI', label: 'DNI', digits: 8 },
    { key: 'CE',  label: 'C.E.', digits: null },
];

interface ModalNuevaCompraProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    // Si viene una compra (con id), el modal opera en modo EDICIÓN.
    compra?: any;
}

const ModalNuevaCompra = ({ isOpen, onClose, onSuccess, compra }: ModalNuevaCompraProps) => {
    const isEdit = !!compra?.id;
    const { crearCompra, editarCompra } = useComprasStore();
    const { cuentas, listar: listarCuentas } = useCuentasBancariasStore();
    const { getAllClients, clients, resetClients, getClientFromDoc } = useClientsStore();
    const { getAllProducts, products, resetProducts } = useProductsStore();
    const { alert } = useAlertStore();
    const { auth, sedeActiva } = useAuthStore();
    const rubroNombre = (auth as any)?.empresa?.rubro?.nombre;
    const esRubroFarmaceutico = usaLotesFarmaciaRubro(rubroNombre);
    const tieneGestionLotes = hasPlanFeature(auth as any, 'tieneGestionLotes') || esRubroFarmaceutico;

    // Data states
    const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
    const [productOptions, setProductOptions] = useState<any[]>([]);

    // Form states
    const [header, setHeader] = useState({
        serie: 'F001',
        tipoDoc: 'FACTURA',
        numero: '',
        fechaEmision: moment().format('YYYY-MM-DD'),
        fechaVencimiento: moment().format('YYYY-MM-DD'),
        moneda: 'PEN',
        tipoCambio: 1.0,
        proveedorId: 0,
        observaciones: ''
    });

    const [payment, setPayment] = useState({
        condicionPago: 'CONTADO',
        montoPagadoInicial: 0,
        metodoPagoInicial: 'EFECTIVO',
        cuentaBancariaId: 0,
        numeroOperacion: ''
    });

    const [cuotas, setCuotas] = useState<any[]>([]);

    // Item entry state
    const [currentItem, setCurrentItem] = useState({
        productoId: 0,
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        lote: '',
        fechaVencimiento: ''
    });

    const [items, setItems] = useState<any[]>([]);
    // true = los precios ingresados YA incluyen IGV (ej: ticket de caja, proveedor informal)
    // false = los precios son NETOS sin IGV (default: factura formal de proveedor)
    const [incluyeIgv, setIncluyeIgv] = useState(false);
    // Reset key para limpiar el Select de producto al agregar un ítem
    const [productSelectKey, setProductSelectKey] = useState(0);

    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    // Compra por PAQUETE (código de caja escaneado, ej. caja x20): el bodeguero
    // habla en cajas y en el precio final **CON IGV** (como lo ve en la boleta
    // del proveedor: "el six-pack me costó 36"). El sistema convierte a
    // unidades y, si la compra está en modo "precios sin IGV" (default), le
    // quita el IGV internamente. El stock y el kardex siempre van en unidades.
    //
    // Flujo "caja de supermercado": cada escaneo AGREGA/ACUMULA la línea
    // directo en la tabla (sin presionar Agregar). El bloque morado queda como
    // editor en vivo de la línea escaneada (pkgLineId → items[i]._scanKey).
    const [pkg, setPkg] = useState<{ unidades: number; nombre: string; esGravado: boolean } | null>(null);
    const [pkgCajas, setPkgCajas] = useState('1');
    const [pkgCosto, setPkgCosto] = useState('');
    const [pkgLineKey, setPkgLineKey] = useState<string | null>(null);

    // Costo unitario para la línea a partir del costo del paquete CON IGV,
    // según el modo de la compra (con/sin IGV).
    const costoUnitDesdePaquete = (costoCajaConIgv: number, unidades: number, esGravado: boolean) => {
        const costoCajaLinea = incluyeIgv || !esGravado
            ? costoCajaConIgv
            : costoCajaConIgv / 1.18;
        return unidades > 0 ? Number((costoCajaLinea / unidades).toFixed(4)) : 0;
    };

    const etiquetaPaquete = (base: string, cajas: number, unidades: number) =>
        unidades > 1 ? `${base} (${cajas} paq. x${unidades})` : base;

    // Editor en vivo: cambios en el bloque morado actualizan la línea ya agregada.
    const aplicarPaquete = (cajasStr: string, costoStr: string, unidades: number, esGravado: boolean) => {
        if (!pkgLineKey) return;
        const cajas = Math.max(0, Number(cajasStr) || 0);
        const costoCajaConIgv = Math.max(0, Number(costoStr) || 0);
        const precioUnitario = costoUnitDesdePaquete(costoCajaConIgv, unidades, esGravado);
        setItems(prev => prev.map((it: any) => {
            if (it._scanKey !== pkgLineKey) return it;
            const cantidad = cajas * unidades;
            return {
                ...it,
                cantidad,
                precioUnitario,
                descripcion: etiquetaPaquete(it._descripcionBase ?? it.descripcion, cajas, unidades),
                _pkgCajas: cajas,
                subtotal: cantidad * precioUnitario,
            };
        }));
    };

    // Al cambiar el modo IGV de la compra, CONVERTIR las líneas ya agregadas
    // (neto ↔ con IGV) para preservar el precio REAL pagado: el Total a Pagar
    // no debe moverse por tocar el checkbox. Antes solo se reinterpretaban los
    // números (y en paquetes se pisaban los ajustes manuales del usuario).
    const prevIncluyeIgv = useRef(incluyeIgv);
    useEffect(() => {
        if (prevIncluyeIgv.current === incluyeIgv) return;
        prevIncluyeIgv.current = incluyeIgv;
        const factor = incluyeIgv ? 1.18 : 1 / 1.18;
        setItems(prev => prev.map((it: any) => {
            const raw = Number(it.precioUnitario || 0) * factor;
            // Snap a 2 decimales cuando el residuo es solo ruido de precisión
            // (ej. 5.999946 → 6.00); si la fracción es real (5.0847) se conservan
            // los 4 decimales para que el total siga cuadrando exacto.
            const r2 = Number(raw.toFixed(2));
            const precioUnitario = Math.abs(raw - r2) < 0.001 ? r2 : Number(raw.toFixed(4));
            return { ...it, precioUnitario, subtotal: (Number(it.cantidad) || 0) * precioUnitario };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incluyeIgv]);

    // Estado panel "Nuevo Proveedor" inline
    const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
    const [nuevoProvForm, setNuevoProvForm] = useState({ tipoDoc: 'RUC', nroDoc: '', nombre: '', direccion: '', email: '', telefono: '' });
    const [nuevoProvErrors, setNuevoProvErrors] = useState<Record<string, string>>({});
    const [savingProveedor, setSavingProveedor] = useState(false);
    const [lookingUpDoc, setLookingUpDoc] = useState(false);

    // XML import
    const xmlInputRef = useRef<HTMLInputElement>(null);
    const [isParsingXml, setIsParsingXml] = useState(false);
    // Foto IA (lee una foto de la factura/boleta con IA y pre-llena la compra)
    const fotoInputRef = useRef<HTMLInputElement>(null);
    const [isParsingFoto, setIsParsingFoto] = useState(false);
    const [supplierDisplay, setSupplierDisplay] = useState('');
    const [xmlBanner, setXmlBanner] = useState<{ matched: number; total: number; proveedor: boolean } | null>(null);
    const [xmlSupplierInfo, setXmlSupplierInfo] = useState<{ ruc: string; nombre: string } | null>(null);
    const [linkingRowIndex, setLinkingRowIndex] = useState<number | null>(null);
    const [linkProductIdByRow, setLinkProductIdByRow] = useState<Record<number, number>>({});
    const [showConfirmUnlinked, setShowConfirmUnlinked] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            resetClients();
            resetProducts();
            setHeader({
                serie: 'F001',
                tipoDoc: 'FACTURA',
                numero: '',
                fechaEmision: moment().format('YYYY-MM-DD'),
                fechaVencimiento: moment().format('YYYY-MM-DD'),
                moneda: 'PEN',
                tipoCambio: 1.0,
                proveedorId: 0,
                observaciones: ''
            });
            setPayment({
                condicionPago: 'CONTADO',
                montoPagadoInicial: 0,
                metodoPagoInicial: 'EFECTIVO',
                cuentaBancariaId: 0,
                numeroOperacion: ''
            });
            listarCuentas();
            setItems([]);
            setIncluyeIgv(false);
            setCuotas([]);
            setBarcodeInput('');
            setSupplierDisplay('');
            setXmlBanner(null);
            setXmlSupplierInfo(null);
            setLinkingRowIndex(null);
            setLinkProductIdByRow({});
            setShowConfirmUnlinked(false);
            setShowNuevoProveedor(false);
            setNuevoProvForm({ tipoDoc: 'RUC', nroDoc: '', nombre: '', direccion: '', email: '', telefono: '' });
            setNuevoProvErrors({});
            setProductSelectKey(k => k + 1);
        }
    }, [isOpen]);

    // Modo EDICIÓN: precargar la compra existente. Corre DESPUÉS del reset de
    // arriba (mismo trigger isOpen), por lo que sobreescribe los valores en blanco.
    useEffect(() => {
        if (!isOpen || !compra?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const resp: any = await get(`compras/${compra.id}`);
                const d = resp?.data;
                if (!d || cancelled) return;
                setHeader({
                    serie: d.serie || 'F001',
                    tipoDoc: d.tipoDoc || 'FACTURA',
                    numero: d.numero || '',
                    fechaEmision: d.fechaEmision ? moment(d.fechaEmision).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                    fechaVencimiento: d.fechaVencimiento ? moment(d.fechaVencimiento).format('YYYY-MM-DD') : (d.fechaEmision ? moment(d.fechaEmision).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')),
                    moneda: d.moneda || 'PEN',
                    tipoCambio: Number(d.tipoCambio || 1) || 1,
                    proveedorId: Number(d.proveedorId || 0),
                    observaciones: d.observaciones || '',
                });
                const provLabel = `${d.proveedor?.nroDoc || ''} - ${d.proveedor?.nombre || ''}`.trim();
                if (d.proveedorId) {
                    setSupplierOptions([{ id: Number(d.proveedorId), value: provLabel }]);
                    setSupplierDisplay(provLabel);
                }
                // Restaurar condición de pago: si la compra tiene cuotas guardadas es
                // a CRÉDITO; de lo contrario, CONTADO. El método de pago se toma del
                // primer pago registrado, si existe.
                let cuotasGuardadas: any[] = [];
                if (d.cuotas) {
                    try {
                        cuotasGuardadas = Array.isArray(d.cuotas) ? d.cuotas : JSON.parse(d.cuotas);
                    } catch { cuotasGuardadas = []; }
                }
                const esCredito = Array.isArray(cuotasGuardadas) && cuotasGuardadas.length > 0;
                const primerPago = Array.isArray(d.pagos) && d.pagos.length > 0 ? d.pagos[0] : null;
                setPayment((p) => ({
                    ...p,
                    condicionPago: esCredito ? 'CREDITO' : 'CONTADO',
                    metodoPagoInicial: primerPago?.metodoPago || p.metodoPagoInicial,
                    numeroOperacion: primerPago?.referencia || '',
                    cuentaBancariaId: Number(primerPago?.cuentaBancariaId || 0),
                }));
                setCuotas(esCredito ? cuotasGuardadas.map((c: any) => ({
                    monto: Number(c.monto || 0),
                    fechaVencimiento: c.fechaVencimiento ? moment(c.fechaVencimiento).format('YYYY-MM-DD') : moment().add(30, 'days').format('YYYY-MM-DD'),
                })) : []);
                // El precioUnitario se guarda NETO (sin IGV). Para mostrar los
                // números tal como se teclearon: si TODOS los netos × 1.18 caen
                // en montos exactos de 2 decimales (la compra se ingresó CON
                // IGV, ej. 5.0847 → 6.00), se restaura ese modo; si no, se
                // carga en neto con 4 decimales para no perder centavos
                // (antes se redondeaba a 2 y el total salía 359.66 en vez de 360).
                const dets = (d.detalles || []);
                const conv = dets.map((det: any) => {
                    const neto = Number(det.precioUnitario) || 0;
                    const conIgv = neto * 1.18;
                    const r2 = Math.round(conIgv * 100) / 100;
                    return { neto, conIgvLimpio: Math.abs(conIgv - r2) < 0.001 ? r2 : null };
                });
                const netoEsLimpio = (n: number) => Math.abs(n - Math.round(n * 100) / 100) < 0.0005;
                const restaurarConIgv = conv.length > 0
                    && conv.every((c: any) => c.conIgvLimpio != null)
                    && conv.some((c: any) => !netoEsLimpio(c.neto));
                setIncluyeIgv(restaurarConIgv);
                prevIncluyeIgv.current = restaurarConIgv;
                setItems(dets.map((det: any, i: number) => ({
                    productoId: Number(det.productoId || 0),
                    descripcion: det.descripcion || det.producto?.descripcion || '',
                    cantidad: Number(det.cantidad || 0),
                    precioUnitario: restaurarConIgv
                        ? conv[i].conIgvLimpio!
                        : Math.round(conv[i].neto * 10000) / 10000,
                    lote: det.lote || '',
                    fechaVencimiento: det.fechaVencimiento ? moment(det.fechaVencimiento).format('YYYY-MM-DD') : '',
                    numerosSerie: Array.isArray(det.seriesGarantias) ? det.seriesGarantias.map((s: any) => s.numeroSerie) : undefined,
                    garantiaMeses: Array.isArray(det.seriesGarantias) && det.seriesGarantias[0]?.garantiaMeses != null ? Number(det.seriesGarantias[0].garantiaMeses) : undefined,
                })));
            } catch {
                if (!cancelled) alert('No se pudo cargar la compra para editar.', 'error');
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, compra?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-focus barcode input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => barcodeRef.current?.focus(), 150);
        }
    }, [isOpen]);

    // Al pagar por Transferencia, autoseleccionar la primera cuenta bancaria activa.
    useEffect(() => {
        if (payment.metodoPagoInicial === 'TRANSFERENCIA' && !payment.cuentaBancariaId) {
            const activas = (cuentas || []).filter((c) => c.activo);
            if (activas.length > 0) setPayment((p) => ({ ...p, cuentaBancariaId: activas[0].id }));
        }
    }, [payment.metodoPagoInicial, cuentas]);

    // Update options when store changes
    useEffect(() => {
        setSupplierOptions((clients || []).map(c => ({ id: c.id, value: `${c.nroDoc} - ${c.nombre}` })));
    }, [clients]);

    // Etiqueta talla/color de una variante: {Color:"Rojo",Talla:"M"} -> "Rojo / M"
    const etiquetaAtributos = (v: any): string =>
        v?.valoresAtributos && typeof v.valoresAtributos === 'object'
            ? Object.values(v.valoresAtributos).filter(Boolean).join(' / ')
            : '';

    useEffect(() => {
        // Los productos con variantes (talla/color) se expanden: una opción por variante,
        // así la compra ingresa el stock a la variante correcta.
        setProductOptions((products || []).flatMap((p: any) => {
            const variantes = Array.isArray(p?.variantes)
                ? p.variantes.filter((v: any) => String(v?.estado || 'ACTIVO').toUpperCase() === 'ACTIVO')
                : [];
            if (variantes.length > 0) {
                return variantes.map((v: any) => {
                    const label = etiquetaAtributos(v);
                    return {
                        id: v.id,
                        value: `${v.codigo} - ${p.descripcion}${label ? ' (' + label + ')' : ''} (Stock: ${v.stock ?? 0})`,
                        data: { ...v, descripcion: `${p.descripcion}${label ? ' - ' + label : ''}` },
                    };
                });
            }
            return [{ id: p.id, value: `${p.codigo} - ${p.descripcion} (Stock: ${p.stock})`, data: p }];
        }));
    }, [products]);

    // Handlers
    const handleSupplierSearch = (query: string, cb: () => void) => {
        getAllClients({ search: query, persona: 'PROVEEDOR', limit: 20 }, cb);
    };

    const handleProductSearch = (query: string, cb: () => void) => {
        // El stock mostrado debe ser el de la sede activa (no el global sumado de
        // todas las sedes). Si no hay sede, el backend cae al global.
        getAllProducts({ search: query, limit: 20, sedeId: sedeActiva?.id || undefined }, cb);
    };

    const onSupplierChange = (id: any) => {
        setHeader(h => ({ ...h, proveedorId: Number(id) }));
        setSupplierDisplay('');
    };

    const onProductChange = (id: any, value: string) => {
        const nid = Number(id);
        let prod: any = products.find(p => p.id === nid);
        let descripcion = prod?.descripcion;
        let costo = prod?.costoUnitario;
        // Si no es un producto padre, buscar entre las variantes
        if (!prod) {
            for (const p of (products as any[])) {
                const v = (p?.variantes || []).find((x: any) => x.id === nid);
                if (v) {
                    prod = v;
                    const label = etiquetaAtributos(v);
                    descripcion = `${p.descripcion}${label ? ' - ' + label : ''}`;
                    costo = v.costoUnitario ?? p.costoUnitario;
                    break;
                }
            }
        }
        if (prod) {
            setPkg(null); // producto elegido del buscador: se compra en unidades
            setPkgLineKey(null);
            setCurrentItem({
                ...currentItem,
                productoId: prod.id,
                descripcion,
                precioUnitario: costo || 0
            });
        }
    };

    const handleBarcodeScan = async (codigo: string) => {
        const trimmed = codigo.trim();
        if (!trimmed) return;
        setBarcodeLoading(true);
        try {
            const resp: any = await get(`productos/barcode/${encodeURIComponent(trimmed)}`);
            if (resp.code === 1 && resp.data) {
                const prod = resp.data;
                // Si se escaneó un producto padre con variantes, no ingresar stock al padre:
                // pedir que se elija la variante desde el buscador (cada variante tiene su código).
                const tieneVariantes = Array.isArray(prod?.variantes)
                    && prod.variantes.some((v: any) => String(v?.estado || 'ACTIVO').toUpperCase() === 'ACTIVO');
                if (tieneVariantes) {
                    alert(`"${prod.descripcion}" tiene variantes (talla/color). Selecciónala desde el buscador de productos, o escanea el código de la variante específica.`, 'warning');
                    setBarcodeInput('');
                    return;
                }
                // Código de PAQUETE escaneado (ej. caja x20): se activa el modo
                // "compra por cajas" — el usuario ingresa cajas y costo POR CAJA,
                // y el sistema convierte a unidades (el stock se lleva en unidades).
                const unidadesPorPaquete = Math.max(1, Number(prod.unidadesPorPaquete ?? 1) || 1);
                const nombrePaquete = (prod.aliasPaquete || prod.descripcion) as string;
                // El bloque de paquete SIEMPRE habla CON IGV (como el empresario ve
                // la boleta del proveedor); la conversión al modo de la compra
                // (con/sin IGV) se hace al escribir la línea.
                const esGravadoScan = String(prod.tipoAfectacionIGV ?? '10') === '10';
                const costoNetoSug = Number(prod.costoUnitario) || 0;
                const costoConIgvSug = esGravadoScan
                    ? Math.round(costoNetoSug * 1.18 * 100) / 100
                    : costoNetoSug;

                // ── Flujo "caja de supermercado": el escaneo agrega/acumula la
                // línea DIRECTO en la tabla, sin pasar por el botón Agregar.
                // Mismo producto + mismo formato (paquete/unidad) = misma línea.
                const scanKey = `${prod.id}|x${unidadesPorPaquete}`;
                let cajasResultantes = 1;
                let costoCajaConIgvActual = costoConIgvSug * unidadesPorPaquete;
                const existente: any = items.find((it: any) => it._scanKey === scanKey);
                if (existente) {
                    cajasResultantes = (Number(existente._pkgCajas) || 1) + 1;
                    // Respetar el costo que el usuario ya haya ajustado en la línea
                    const costoUnitActual = Number(existente.precioUnitario) || 0;
                    costoCajaConIgvActual = (incluyeIgv || !esGravadoScan
                        ? costoUnitActual
                        : costoUnitActual * 1.18) * unidadesPorPaquete;
                    const cantidad = cajasResultantes * unidadesPorPaquete;
                    setItems(prev => prev.map((it: any) => it._scanKey !== scanKey ? it : {
                        ...it,
                        cantidad,
                        descripcion: etiquetaPaquete(it._descripcionBase ?? prod.descripcion, cajasResultantes, unidadesPorPaquete),
                        _pkgCajas: cajasResultantes,
                        subtotal: cantidad * (Number(it.precioUnitario) || 0),
                    }));
                } else {
                    const precioUnitario = costoUnitDesdePaquete(costoCajaConIgvActual, unidadesPorPaquete, esGravadoScan);
                    setItems(prev => [...prev, {
                        productoId: prod.id,
                        descripcion: etiquetaPaquete(prod.descripcion, 1, unidadesPorPaquete),
                        cantidad: unidadesPorPaquete,
                        precioUnitario,
                        lote: '',
                        fechaVencimiento: '',
                        subtotal: unidadesPorPaquete * precioUnitario,
                        _controlSeries: leerControlSeries(prod.atributosTecnicos),
                        _scanKey: scanKey,
                        _descripcionBase: prod.descripcion,
                        _pkgCajas: 1,
                    } as any]);
                }

                // Bloque morado = editor en vivo de la línea escaneada (solo paquetes)
                if (unidadesPorPaquete > 1) {
                    setPkg({ unidades: unidadesPorPaquete, nombre: nombrePaquete, esGravado: esGravadoScan });
                    setPkgCajas(String(cajasResultantes));
                    setPkgCosto(costoCajaConIgvActual ? String(Number((costoCajaConIgvActual / 1).toFixed(2))) : '');
                    setPkgLineKey(scanKey);
                } else {
                    setPkg(null);
                    setPkgLineKey(null);
                }
                setBarcodeInput('');
            } else {
                alert(`Producto no encontrado: ${trimmed}`, 'error');
                setBarcodeInput('');
            }
        } catch {
            alert(`Código de barras no encontrado: ${trimmed}`, 'error');
            setBarcodeInput('');
        } finally {
            setBarcodeLoading(false);
            barcodeRef.current?.focus();
        }
    };

    const updateItem = (idx: number, field: string, value: any) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
        // Si editan inline la línea vinculada al bloque de paquete, sincronizar
        // el bloque para que no queden dos verdades (y el bloque no pise luego
        // el ajuste manual del usuario).
        const it: any = items[idx];
        if (!it || !pkg || !pkgLineKey || it._scanKey !== pkgLineKey) return;
        if (field === 'precioUnitario') {
            const unit = Number(value) || 0;
            const unitConIgv = incluyeIgv || !pkg.esGravado ? unit : unit * 1.18;
            setPkgCosto(String(Number((unitConIgv * pkg.unidades).toFixed(2))));
        } else if (field === 'cantidad') {
            const cant = Number(value) || 0;
            if (cant > 0 && cant % pkg.unidades === 0) {
                const cajas = cant / pkg.unidades;
                setPkgCajas(String(cajas));
                setItems(prev => prev.map((x: any, i) => i !== idx ? x : {
                    ...x,
                    descripcion: etiquetaPaquete(x._descripcionBase ?? x.descripcion, cajas, pkg.unidades),
                    _pkgCajas: cajas,
                }));
            } else {
                // Cantidad suelta (no múltiplo del paquete): la línea deja de ser
                // "paquetes exactos" — se desvincula el bloque y se limpia el sufijo.
                setItems(prev => prev.map((x: any, i) => i !== idx ? x : {
                    ...x,
                    descripcion: x._descripcionBase ?? x.descripcion,
                    _scanKey: undefined,
                }));
                setPkg(null);
                setPkgLineKey(null);
            }
        }
    };

    // Lee el flag "controlar series/garantía" desde los atributos técnicos del producto.
    const leerControlSeries = (attrs: any): boolean => {
        if (!attrs) return false;
        const control = String(attrs.controlSeries ?? attrs.requiereSerie ?? '').toLowerCase();
        return attrs.controlSeries === true || attrs.requiereSerie === true || ['true', 'si', 'sí', '1'].includes(control);
    };

    // Determina si el producto (o su padre, para variantes) controla series.
    const productoControlaSeries = (productoId?: number): boolean => {
        if (!productoId) return false;
        const nid = Number(productoId);
        let prod: any = (products as any[]).find(p => Number(p.id) === nid);
        if (!prod) {
            for (const p of (products as any[])) {
                const v = (p?.variantes || []).find((x: any) => Number(x.id) === nid);
                if (v) { prod = p; break; } // controlSeries vive en el producto padre
            }
        }
        return prod ? leerControlSeries(prod.atributosTecnicos) : false;
    };

    // Prioriza el flag cacheado en el ítem (ej. escaneo por código de barras) y
    // cae al lookup en la lista de productos.
    const itemRequiereSeries = (item: any): boolean =>
        item?._controlSeries ?? productoControlaSeries(item?.productoId);

    const vincularItemXml = (idx: number) => {
        const productoId = Number(linkProductIdByRow[idx] || 0);
        if (!productoId) {
            alert('Selecciona un producto para vincular esta línea.', 'error');
            return;
        }

        const prod = products.find((p: any) => Number(p.id) === productoId);
        if (!prod) {
            alert('No se encontró el producto seleccionado. Vuelve a buscarlo.', 'error');
            return;
        }

        setItems(prev => prev.map((item, i) => (
            i === idx
                ? {
                    ...item,
                    productoId: prod.id,
                    _sinVincular: false,
                    _vinculadoManual: true,
                    _productoVinculadoLabel: `${prod.codigo} - ${prod.descripcion}`,
                }
                : item
        )));

        setXmlBanner((prev) => {
            if (!prev) return prev;
            const sinVincularAntes = items.filter((it: any) => it._sinVincular).length;
            const matched = sinVincularAntes > 0 ? Math.min(prev.total, prev.matched + 1) : prev.matched;
            return { ...prev, matched };
        });

        setLinkingRowIndex(null);
        setLinkProductIdByRow((prev) => {
            const next = { ...prev };
            delete next[idx];
            return next;
        });
    };

    // Aplica al formulario los datos de una compra importada (XML o FOTO IA).
    const aplicarDatosImportados = (data: any, origen: 'xml' | 'foto') => {
        const etiqueta = origen === 'foto' ? 'Foto leída' : 'XML importado';
        setHeader(h => ({
            ...h,
            tipoDoc: data.tipoDoc || h.tipoDoc,
            serie: data.serie || h.serie,
            numero: data.numero || h.numero,
            fechaEmision: data.fechaEmision || h.fechaEmision,
            fechaVencimiento: data.fechaEmision || h.fechaVencimiento,
            moneda: data.moneda || h.moneda,
            proveedorId: data.proveedorId || 0,
        }));

        const proveedorLabel = [data.proveedorRuc, data.proveedorNombre].filter(Boolean).join(' - ');
        if (proveedorLabel) setSupplierDisplay(proveedorLabel);
        setXmlSupplierInfo({
            ruc: String(data.proveedorRuc || '').trim(),
            nombre: String(data.proveedorNombre || '').trim(),
        });
        if (data.proveedorId) {
            setSupplierOptions([{ id: data.proveedorId, value: proveedorLabel }]);
        }

        const importedItems = (data.items || []).map((item: any) => ({
            productoId: item.productoId || 0,
            descripcion: item.productoDescripcion || item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            lote: '',
            fechaVencimiento: '',
            subtotal: item.subtotal,
            _fromXml: true,
            _codigoXml: item.codigo,
            _sinVincular: !item.productoId,
        }));
        setItems(importedItems);

        const matched = importedItems.filter((i: any) => !i._sinVincular).length;
        setXmlBanner({ matched, total: importedItems.length, proveedor: !!data.proveedorId });

        if (!data.proveedorId) {
            alert(`${etiqueta}. Proveedor no encontrado (RUC: ${data.proveedorRuc}) — selecciónalo manualmente.`, 'error');
        } else {
            alert(`${etiqueta}: ${matched}/${importedItems.length} productos vinculados.`, 'success');
        }
    };

    const handleXmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setIsParsingXml(true);
        setXmlBanner(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/compras/parse-xml', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data?.data ?? res.data;
            aplicarDatosImportados(data, 'xml');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al procesar el XML. Verifica que sea una factura SUNAT válida.', 'error');
        } finally {
            setIsParsingXml(false);
        }
    };

    // Sube una FOTO de la factura/boleta; la IA la lee y pre-llena la compra.
    const handleImagenFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setIsParsingFoto(true);
        setXmlBanner(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/compras/parse-imagen', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data?.data ?? res.data;
            aplicarDatosImportados(data, 'foto');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'No se pudo leer la foto. Prueba con una imagen más nítida y bien iluminada.', 'error');
        } finally {
            setIsParsingFoto(false);
        }
    };

    const addItem = () => {
        if (!currentItem.productoId) {
            alert("Seleccione un producto", "error");
            return;
        }
        if (currentItem.cantidad <= 0) {
            alert("Cantidad inválida", "error");
            return;
        }

        setItems([...items, { ...currentItem, subtotal: currentItem.cantidad * currentItem.precioUnitario }]);
        setCurrentItem({ productoId: 0, descripcion: '', cantidad: 1, precioUnitario: 0, lote: '', fechaVencimiento: '' });
        setPkg(null);
        setPkgLineKey(null);
        // Incrementar key fuerza remount del Select y limpia la selección visual
        setProductSelectKey(k => k + 1);
    };

    // ── Nuevo proveedor inline ────────────────────────────────────────────
    const handleNuevoProvDocChange = async (value: string) => {
        setNuevoProvForm(prev => ({ ...prev, nroDoc: value }));
        const clean = value.trim();
        const { tipoDoc } = nuevoProvForm;
        const shouldLookup = (tipoDoc === 'RUC' && clean.length === 11) || (tipoDoc === 'DNI' && clean.length === 8);
        if (!shouldLookup) return;
        setLookingUpDoc(true);
        try {
            const result = await getClientFromDoc(clean, tipoDoc);
            if (result) {
                setNuevoProvForm(prev => ({
                    ...prev,
                    nombre:    result.nombre_completo || result.nombre_o_razon_social || prev.nombre,
                    direccion: result.direccion || result.direccion_completa || prev.direccion,
                }));
            }
        } catch { /* silent */ } finally {
            setLookingUpDoc(false);
        }
    };

    const guardarNuevoProveedor = async () => {
        const errs: Record<string, string> = {};
        if (!nuevoProvForm.nroDoc.trim()) errs.nroDoc = 'Requerido';
        if (!nuevoProvForm.nombre.trim()) errs.nombre = 'Requerido';
        setNuevoProvErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSavingProveedor(true);
        try {
            const payload = { ...nuevoProvForm, persona: 'PROVEEDOR', estado: 'ACTIVO' };
            const res = await apiClient.post('/clientes', payload);
            const creado = res?.data?.data || res?.data;
            if (creado?.id) {
                const label = `${creado.nroDoc} - ${creado.nombre}`;
                setSupplierOptions(prev => [{ id: creado.id, value: label }, ...prev]);
                setHeader(h => ({ ...h, proveedorId: creado.id }));
                setSupplierDisplay(label);
                setShowNuevoProveedor(false);
                setNuevoProvForm({ tipoDoc: 'RUC', nroDoc: '', nombre: '', direccion: '', email: '', telefono: '' });
                setNuevoProvErrors({});
                alert('Proveedor creado y seleccionado.', 'success');
            }
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al crear proveedor', 'error');
        } finally {
            setSavingProveedor(false);
        }
    };

    const removeItem = (index: number) => {
        // Si se elimina la línea vinculada al bloque de paquete, cerrarlo.
        if (pkgLineKey && (items[index] as any)?._scanKey === pkgLineKey) {
            setPkg(null);
            setPkgLineKey(null);
        }
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    // Totals — cuando incluyeIgv, el precio ingresado ya trae el IGV embebido
    const totalConIgvBruto = items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
    const subtotal = incluyeIgv
        ? parseFloat((totalConIgvBruto / 1.18).toFixed(2))
        : totalConIgvBruto;
    const total = incluyeIgv
        ? parseFloat(totalConIgvBruto.toFixed(2))
        : parseFloat((subtotal * 1.18).toFixed(2));
    const igv = incluyeIgv
        ? parseFloat((total - subtotal).toFixed(2))
        : parseFloat((subtotal * 0.18).toFixed(2));

    const guardarCompra = async () => {
        let proveedorId = Number(header.proveedorId || 0);
        if (!proveedorId && xmlSupplierInfo?.ruc && xmlSupplierInfo?.nombre) {
            try {
                const tipoDoc = xmlSupplierInfo.ruc.length === 11 ? 'RUC' : 'DNI';
                const payloadProveedor = {
                    nombre: xmlSupplierInfo.nombre,
                    tipoDoc,
                    nroDoc: xmlSupplierInfo.ruc,
                    persona: 'PROVEEDOR',
                    direccion: '',
                    email: '',
                    telefono: '',
                    ubigeo: '',
                    departamento: '',
                    provincia: '',
                    distrito: '',
                };
                const creado = await apiClient.post('/clientes', payloadProveedor);
                const proveedorCreado = creado?.data?.data || creado?.data;
                if (proveedorCreado?.id) {
                    proveedorId = Number(proveedorCreado.id);
                    setHeader((h) => ({ ...h, proveedorId }));
                    const label = `${xmlSupplierInfo.ruc} - ${xmlSupplierInfo.nombre}`;
                    setSupplierOptions((prev) => {
                        const existe = prev.some((o: any) => Number(o.id) === proveedorId);
                        return existe ? prev : [{ id: proveedorId, value: label }, ...prev];
                    });
                    setSupplierDisplay(label);
                }
            } catch (e: any) {
                const msg = String(e?.response?.data?.message || '').toLowerCase();
                // Si ya existe, intentar resolverlo buscando por documento.
                if (msg.includes('ya existe')) {
                    try {
                        const listResp = await apiClient.get(`/clientes?search=${encodeURIComponent(xmlSupplierInfo.ruc)}&limit=10`);
                        const data = listResp?.data?.data || listResp?.data;
                        const encontrados = Array.isArray(data?.clientes) ? data.clientes : [];
                        const match = encontrados.find((c: any) => String(c.nroDoc || '').trim() === xmlSupplierInfo.ruc);
                        if (match?.id) {
                            proveedorId = Number(match.id);
                            setHeader((h) => ({ ...h, proveedorId }));
                            const label = `${match.nroDoc} - ${match.nombre}`;
                            setSupplierOptions((prev) => {
                                const existe = prev.some((o: any) => Number(o.id) === proveedorId);
                                return existe ? prev : [{ id: proveedorId, value: label }, ...prev];
                            });
                            setSupplierDisplay(label);
                        }
                    } catch {
                        // fallback to validation below
                    }
                }
            }
        }

        if (!proveedorId) {
            alert("Seleccione un proveedor", "error");
            return;
        }
        if (items.length === 0) {
            alert("Agregue al menos un producto", "error");
            return;
        }

        // Rubro farmacéutico: lote + fecha de vencimiento obligatorios por ítem
        if (esRubroFarmaceutico) {
            for (const item of items) {
                if (!item.lote?.trim()) {
                    alert(`El producto "${item.descripcion}" requiere código de lote (rubro farmacéutico).`, "error");
                    return;
                }
                if (!item.fechaVencimiento) {
                    alert(`El producto "${item.descripcion}" requiere fecha de vencimiento (rubro farmacéutico).`, "error");
                    return;
                }
            }
        }

        const payload = {
            ...header,
            proveedorId,
            proveedorNombre: supplierDisplay?.split(' - ').slice(1).join(' - ') || xmlSupplierInfo?.nombre || '',
            proveedorRuc: supplierDisplay?.split(' - ')[0] || xmlSupplierInfo?.ruc || '',
            items: undefined,
            detalles: items.map(i => ({
                productoId: i.productoId || undefined,
                descripcion: i.descripcion,
                cantidad: i.cantidad,
                precioUnitario: i.precioUnitario,
                incluyeIgv,
                lote: i.lote || undefined,
                fechaVencimiento: i.fechaVencimiento || undefined,
                codigoXml: i._codigoXml || undefined,
                numerosSerie: (i.numerosSerie && i.numerosSerie.length) ? i.numerosSerie : undefined,
                garantiaMeses: i.garantiaMeses || undefined,
            })),
            formaPago: payment.condicionPago,
            montoPagadoInicial: payment.condicionPago === 'CONTADO' ? total : Number(payment.montoPagadoInicial),
            metodoPagoInicial: payment.metodoPagoInicial,
            cuentaBancariaIdInicial: payment.metodoPagoInicial === 'TRANSFERENCIA' ? (payment.cuentaBancariaId || undefined) : undefined,
            referenciaInicial: payment.metodoPagoInicial === 'TRANSFERENCIA' ? (payment.numeroOperacion || undefined) : undefined,
            cuotas: payment.condicionPago === 'CREDITO' ? cuotas : undefined,
            subtotal,
            igv,
            total
        };

        const success = isEdit
            ? await editarCompra(Number(compra.id), payload)
            : await crearCompra(payload);
        if (success) {
            onClose();
            if (onSuccess) onSuccess();
        }
    };

    const handleSubmit = async () => {
        const sinVincular = items.filter(i => i._sinVincular).length;
        if (sinVincular > 0) {
            setShowConfirmUnlinked(true);
            return;
        }
        await guardarCompra();
    };

    const confirmGuardarConSinVincular = async () => {
        setShowConfirmUnlinked(false);
        await guardarCompra();
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={isEdit ? "Editar Compra" : "Nueva Compra"}
            icon="solar:cart-plus-bold-duotone"
            width="1200px"
            position="right"
        >
            <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="px-4 pb-4 space-y-5">
                    {isEdit && (
                        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                            <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 text-base shrink-0" />
                            <span>Estás editando una compra. Se ajustará el stock según los cambios. Puedes corregir el N° de operación del pago inicial (transferencia); los abonos adicionales se gestionan desde el historial de pagos.</span>
                        </div>
                    )}
                    {/* Datos del Documento */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-transparent mt-5">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 uppercase tracking-wide">Datos del Documento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Proveedor + botón nuevo proveedor */}
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Select
                                            label="Proveedor"
                                            name="proveedor"
                                            options={supplierOptions}
                                            onChange={onSupplierChange}
                                            isSearch
                                            handleGetData={handleSupplierSearch}
                                            withLabel
                                            error={null}
                                            placeholder="Buscar proveedor..."
                                            value={supplierDisplay || supplierOptions.find((o: any) => Number(o.id) === Number(header.proveedorId))?.value || ''}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNuevoProveedor(v => !v)}
                                        title="Crear nuevo proveedor"
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-[42px] rounded-xl border text-xs font-semibold transition-all ${showNuevoProveedor ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
                                    >
                                        <Icon icon={showNuevoProveedor ? "solar:close-circle-bold" : "solar:add-circle-bold"} width={16} />
                                        {showNuevoProveedor ? 'Cancelar' : 'Nuevo'}
                                    </button>
                                </div>

                                {/* Panel inline: crear nuevo proveedor */}
                                {showNuevoProveedor && (
                                    <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 space-y-3">
                                        <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <Icon icon="solar:user-plus-bold-duotone" width={14} />
                                            Nuevo Proveedor
                                        </p>

                                        {/* Tipo de documento */}
                                        <div className="flex gap-2 flex-wrap">
                                            {PROV_DOC_TYPES.map(dt => (
                                                <button
                                                    key={dt.key}
                                                    type="button"
                                                    onClick={() => setNuevoProvForm(p => ({ ...p, tipoDoc: dt.key, nroDoc: '' }))}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${nuevoProvForm.tipoDoc === dt.key ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-violet-400'}`}
                                                >
                                                    {dt.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="relative">
                                                <InputPro
                                                    autocomplete="off"
                                                    label={nuevoProvForm.tipoDoc === 'RUC' ? 'RUC (11 dígitos)' : nuevoProvForm.tipoDoc === 'DNI' ? 'DNI (8 dígitos)' : 'N° Documento'}
                                                    name="nuevoProvNroDoc"
                                                    value={nuevoProvForm.nroDoc}
                                                    onChange={e => handleNuevoProvDocChange(e.target.value)}
                                                    isLabel
                                                    error={nuevoProvErrors.nroDoc}
                                                />
                                                {lookingUpDoc && (
                                                    <span className="absolute right-3 top-[34px]">
                                                        <Icon icon="svg-spinners:270-ring-with-bg" width={14} className="text-violet-500" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="md:col-span-2">
                                                <InputPro
                                                    autocomplete="off"
                                                    label="Razón Social / Nombre"
                                                    name="nuevoProvNombre"
                                                    value={nuevoProvForm.nombre}
                                                    onChange={e => setNuevoProvForm(p => ({ ...p, nombre: e.target.value }))}
                                                    isLabel
                                                    error={nuevoProvErrors.nombre}
                                                />
                                            </div>
                                            <div>
                                                <InputPro autocomplete="off" label="Teléfono (Opc.)" name="nuevoProvTel" value={nuevoProvForm.telefono} onChange={e => setNuevoProvForm(p => ({ ...p, telefono: e.target.value }))} isLabel />
                                            </div>
                                            <div className="md:col-span-2">
                                                <InputPro autocomplete="off" label="Dirección (Opc.)" name="nuevoProvDir" value={nuevoProvForm.direccion} onChange={e => setNuevoProvForm(p => ({ ...p, direccion: e.target.value }))} isLabel />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                            <button type="button" onClick={() => { setShowNuevoProveedor(false); setNuevoProvErrors({}); }} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 transition-colors">
                                                Cancelar
                                            </button>
                                            <Button
                                                outline
                                                color="black"
                                                onClick={guardarNuevoProveedor}
                                                className="!bg-[var(--accent)] !text-white !border-none !text-xs !py-1.5 shadow-sm"
                                            >
                                                {savingProveedor ? <Icon icon="svg-spinners:270-ring-with-bg" width={14} /> : <Icon icon="solar:check-circle-bold" width={14} />}
                                                {savingProveedor ? 'Guardando...' : 'Guardar Proveedor'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <InputPro autocomplete="off" label="Serie" name="doc_serie_compra" id="doc_serie_compra" value={header.serie} onChange={(e) => setHeader({ ...header, serie: e.target.value })} isLabel />
                            <InputPro autocomplete="off" label="Nro. Comprobante" name="doc_correlativo" id="doc_correlativo" value={header.numero} onChange={(e) => setHeader({ ...header, numero: e.target.value })} isLabel />
                            <Calendar
                                text="Fecha Emisión"
                                name="fechaEmision"
                                value={header.fechaEmision ? moment(header.fechaEmision).format('DD/MM/YYYY') : ''}
                                onChange={(date: string, name: string) => {
                                    if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                        setHeader({ ...header, fechaEmision: moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') });
                                    }
                                }}
                            />
                            <Calendar
                                text="Fecha Vencimiento"
                                name="fechaVencimiento"
                                value={header.fechaVencimiento ? moment(header.fechaVencimiento).format('DD/MM/YYYY') : ''}
                                onChange={(date: string, name: string) => {
                                    if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                        setHeader({ ...header, fechaVencimiento: moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') });
                                    }
                                }}
                            />
                            <div className="md:col-span-2">
                                <InputPro autocomplete="off" label="Observaciones" name="observaciones" value={header.observaciones} onChange={(e) => setHeader({ ...header, observaciones: e.target.value })} isLabel />
                            </div>
                        </div>
                    </div>

                    {/* Detalle de Productos */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-transparent">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Detalle de Productos</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fotoInputRef.current?.click()}
                                    disabled={isParsingFoto}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 disabled:opacity-50 transition-colors bg-violet-50 dark:bg-violet-900/30 px-3 py-1.5 rounded-lg"
                                >
                                    <Icon icon={isParsingFoto ? "svg-spinners:270-ring-with-bg" : "solar:camera-bold-duotone"} width={14} />
                                    {isParsingFoto ? 'Leyendo foto...' : 'Subir foto (IA)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => xmlInputRef.current?.click()}
                                    disabled={isParsingXml}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg"
                                >
                                    <Icon icon={isParsingXml ? "svg-spinners:270-ring-with-bg" : "solar:upload-minimalistic-bold-duotone"} width={14} />
                                    {isParsingXml ? 'Procesando...' : 'Importar XML'}
                                </button>
                            </div>
                        </div>
                        <input
                            ref={xmlInputRef}
                            type="file"
                            accept=".xml,application/xml,text/xml"
                            className="hidden"
                            onChange={handleXmlFileSelect}
                        />
                        <input
                            ref={fotoInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImagenFileSelect}
                        />

                        {/* Banner resultado XML */}
                        {xmlBanner && (
                            <div className={`mb-3 p-3 rounded-xl text-xs flex items-start gap-2 border ${xmlBanner.matched === xmlBanner.total && xmlBanner.proveedor ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                                <Icon icon={xmlBanner.matched === xmlBanner.total && xmlBanner.proveedor ? "solar:check-circle-bold-duotone" : "solar:info-circle-bold-duotone"} width={16} className="mt-0.5 shrink-0" />
                                <span className="flex-1">
                                    <strong>XML importado:</strong> {xmlBanner.total} producto(s), {xmlBanner.matched} vinculado(s) automáticamente.
                                    {!xmlBanner.proveedor && <span className="block mt-0.5">Proveedor no encontrado — selecciónalo manualmente.</span>}
                                    {xmlBanner.matched < xmlBanner.total && <span className="block mt-0.5">Los items sin vincular no actualizarán el kardex de stock.</span>}
                                </span>
                                <button type="button" onClick={() => setXmlBanner(null)} className="opacity-40 hover:opacity-80 shrink-0 transition-opacity">
                                    <Icon icon="solar:close-circle-bold" width={14} />
                                </button>
                            </div>
                        )}

                        {/* Barcode scanner input */}
                        <BarcodeScannerInput
                            className="mb-4"
                            inputRef={barcodeRef}
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onScan={handleBarcodeScan}
                            loading={barcodeLoading}
                            placeholder="Escanea el código (entra solo) o escríbelo y presiona Enter..."
                        />

                        {/* Compra por paquete (código de caja escaneado) */}
                        {pkg && (
                            <div className="mb-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800/40 bg-violet-50/60 dark:bg-violet-900/10">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                                        <Icon icon="solar:check-circle-bold" width={16} className="text-emerald-500" />
                                        Agregado a la compra · {pkg.nombre} (x{pkg.unidades} unidades) — escanea otra vez para sumar 1 paquete, o ajusta aquí:
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setPkg(null); setPkgLineKey(null); }}
                                        className="text-[11px] text-violet-500 hover:underline font-medium"
                                        title="Cerrar el editor — la línea ya quedó en la compra"
                                    >
                                        Listo ✓
                                    </button>
                                </div>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-3">
                                        <InputPro
                                            autocomplete="off"
                                            type="number"
                                            label="N° de paquetes"
                                            name="pkgCajas"
                                            value={pkgCajas}
                                            onChange={(e: any) => {
                                                setPkgCajas(e.target.value);
                                                aplicarPaquete(e.target.value, pkgCosto, pkg.unidades, pkg.esGravado);
                                            }}
                                            isLabel
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <InputPro
                                            autocomplete="off"
                                            type="number"
                                            label="Costo por paquete (S/) — precio final"
                                            name="pkgCosto"
                                            value={pkgCosto}
                                            onChange={(e: any) => {
                                                setPkgCosto(e.target.value);
                                                aplicarPaquete(pkgCajas, e.target.value, pkg.unidades, pkg.esGravado);
                                            }}
                                            isLabel
                                        />
                                    </div>
                                    <div className="col-span-6 pb-2">
                                        <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold">
                                            = {(Math.max(0, Number(pkgCajas) || 0) * pkg.unidades).toLocaleString('es-PE')} unidades
                                            {Number(pkgCosto) > 0 && (
                                                <> a S/ {(Number(pkgCosto) / pkg.unidades).toFixed(2)} c/u
                                                    <span className="ml-2 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200">
                                                        Total: S/ {(Math.max(0, Number(pkgCajas) || 0) * Number(pkgCosto)).toFixed(2)}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Pon el precio final que pagaste por el paquete (tal como sale en la boleta del proveedor, IGV incluido). El sistema hace el desglose solo y el stock ingresa en unidades sueltas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Item Form */}
                        <div className="grid grid-cols-12 gap-3 mb-4 items-end p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="col-span-4">
                                <Select
                                    key={productSelectKey}
                                    label="Producto"
                                    name="producto"
                                    options={productOptions}
                                    onChange={onProductChange}
                                    isSearch
                                    handleGetData={handleProductSearch}
                                    withLabel
                                    error={null}
                                    placeholder="Buscar producto..."
                                    defaultValue={currentItem.descripcion || undefined}
                                />
                            </div>
                            <div className="col-span-2">
                                <InputPro autocomplete="off" type="number" label="Cantidad" name="cantidad" value={currentItem.cantidad} onChange={(e) => setCurrentItem({ ...currentItem, cantidad: Number(e.target.value) })} isLabel />
                            </div>
                            <div className="col-span-2">
                                <InputPro autocomplete="off" type="number" label="Costo Unit." name="precioUnitario" value={currentItem.precioUnitario} onChange={(e) => setCurrentItem({ ...currentItem, precioUnitario: Number(e.target.value) })} isLabel />
                            </div>
                            {tieneGestionLotes && (
                            <div className="col-span-2">
                                <InputPro autocomplete="off" label={esRubroFarmaceutico ? "Lote *" : "Lote (Opc.)"} name="lote" value={currentItem.lote} onChange={(e) => setCurrentItem({ ...currentItem, lote: e.target.value })} isLabel />
                            </div>
                            )}
                            <div className="col-span-2">
                                <Calendar
                                    text="Venc. (Opc.)"
                                    placeholder="F. vencimiento"
                                    portal
                                    name="fechaVencimientoItem"
                                    onChange={(date: string) => {
                                        if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                            setCurrentItem({ ...currentItem, fechaVencimiento: moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') });
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-span-2">
                                <Button outline color="black" onClick={addItem} className="w-full justify-center !bg-[var(--accent)] !text-white !border-none shadow-md shadow-black/20 hover:opacity-90">
                                    Agregar
                                    <Icon width={25} icon="solar:add-circle-bold" className="ml-2" />
                                </Button>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm text-left">
                                <thead className="bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2">Producto</th>
                                        <th className="px-3 py-2 text-center">Cant.</th>
                                        <th className="px-3 py-2 text-right">Costo</th>
                                        <th className="px-3 py-2 text-right">Subtotal</th>
                                        <th className="px-3 py-2 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-10 text-center text-gray-400 dark:text-gray-500">
                                                <Icon icon="solar:box-linear" width={32} className="mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">No hay productos agregados</p>
                                            </td>
                                        </tr>
                                    ) : items.map((item, idx) => (
                                        <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors ${item._sinVincular ? 'border-l-2 border-l-slate-300 dark:border-l-slate-600' : ''}`}>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                                    <span className="font-medium text-gray-800 dark:text-white text-sm">{item.descripcion}</span>
                                                    {item._fromXml && (
                                                        item._sinVincular ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                                Sin vincular{item._codigoXml ? ` · ${item._codigoXml}` : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/30">
                                                                <Icon icon="solar:check-circle-bold" width={10} />
                                                                XML
                                                            </span>
                                                        )
                                                    )}
                                                    {item._vinculadoManual && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/30">
                                                            <Icon icon="solar:link-bold" width={10} />
                                                            Vinculado
                                                        </span>
                                                    )}
                                                </div>
                                                {item._sinVincular && (
                                                    <div className="mb-2 p-2 rounded-lg border border-slate-200 dark:border-transparent bg-slate-50/60 dark:bg-slate-800/40">
                                                        {linkingRowIndex === idx ? (
                                                            <div className="flex flex-col md:flex-row gap-2">
                                                                <div className="flex-1 min-w-[260px]">
                                                                    <Select
                                                                        label="Vincular con producto"
                                                                        name={`link_producto_${idx}`}
                                                                        options={productOptions}
                                                                        onChange={(id: any) => setLinkProductIdByRow(prev => ({ ...prev, [idx]: Number(id) }))}
                                                                        isSearch
                                                                        handleGetData={handleProductSearch}
                                                                        withLabel
                                                                        error={null}
                                                                        placeholder="Busca el producto interno..."
                                                                    />
                                                                </div>
                                                                <div className="flex items-end gap-2">
                                                                    <Button
                                                                        outline
                                                                        color="black"
                                                                        className="!bg-[var(--accent)] !text-white !border-none"
                                                                        onClick={() => vincularItemXml(idx)}
                                                                    >
                                                                        Vincular
                                                                    </Button>
                                                                    <Button
                                                                        outline
                                                                        color="black"
                                                                        className="!bg-gray-200 !text-gray-700 !border-none"
                                                                        onClick={() => setLinkingRowIndex(null)}
                                                                    >
                                                                        Cancelar
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setLinkingRowIndex(idx)}
                                                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                                            >
                                                                <Icon icon="solar:link-bold" width={12} />
                                                                Vincular este ítem al inventario
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 items-end">
                                                    {tieneGestionLotes && (
                                                    <div className="w-28">
                                                        <InputPro
                                                            placeholder="Lote..."
                                                            name={`lote_${idx}`}
                                                            value={item.lote || ''}
                                                            onChange={e => updateItem(idx, 'lote', e.target.value)}
                                                            autocomplete="off"
                                                        />
                                                    </div>
                                                    )}
                                                    <div className="flex-1 min-w-[140px]">
                                                        <Calendar
                                                            text=""
                                                            placeholder="F. vencimiento (opcional)"
                                                            portal
                                                            name={`venc_${idx}`}
                                                            value={item.fechaVencimiento ? moment(item.fechaVencimiento).format('DD/MM/YYYY') : ''}
                                                            onChange={(date: string) => {
                                                                if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                                                    updateItem(idx, 'fechaVencimiento', moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {itemRequiereSeries(item) && (() => {
                                                    const series: string[] = (item.numerosSerie || []).filter((s: string) => String(s).trim());
                                                    const completo = series.length === Number(item.cantidad);
                                                    return (
                                                        <div className="mt-2 p-2 rounded-lg border border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-900/10">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                                                                    <Icon icon="solar:shield-check-bold" width={12} />
                                                                    Series / IMEI (opcional)
                                                                </label>
                                                                <span className={`text-[10px] font-semibold ${completo ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                    {series.length}/{item.cantidad}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col md:flex-row gap-2">
                                                                <textarea
                                                                    className="flex-1 min-w-[180px] text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-gray-800 dark:text-gray-100 resize-y focus:outline-none focus:ring-1 focus:ring-violet-400"
                                                                    rows={Math.min(Math.max(Number(item.cantidad) || 1, 1), 4)}
                                                                    placeholder="Una serie/IMEI por línea"
                                                                    value={(item.numerosSerie || []).join('\n')}
                                                                    onChange={e => updateItem(idx, 'numerosSerie', e.target.value.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean))}
                                                                />
                                                                <div className="w-full md:w-28">
                                                                    <InputPro
                                                                        type="number"
                                                                        placeholder="Garantía (meses)"
                                                                        name={`garantia_${idx}`}
                                                                        value={item.garantiaMeses ?? ''}
                                                                        onChange={e => updateItem(idx, 'garantiaMeses', e.target.value === '' ? undefined : Number(e.target.value))}
                                                                        autocomplete="off"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step="any"
                                                    value={item.cantidad}
                                                    onChange={e => updateItem(idx, 'cantidad', e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm text-gray-700 focus:border-violet-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                                                />
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-xs text-gray-400">S/</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        value={item.precioUnitario}
                                                        onChange={e => updateItem(idx, 'precioUnitario', e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm text-gray-700 focus:border-violet-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-white">S/ {Number((Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0)).toFixed(2)}</td>
                                            <td className="px-3 py-3 text-center">
                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Resumen y Condiciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Resumen */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-transparent space-y-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Resumen</h3>

                            {/* Toggle incluyeIgv */}
                            <button
                                type="button"
                                onClick={() => setIncluyeIgv(v => !v)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${incluyeIgv ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:border-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${incluyeIgv ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                    {incluyeIgv && <Icon icon="mdi:check" width={11} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">Precios incluyen IGV</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        {incluyeIgv ? 'El costo neto se calculará extrayendo el IGV (÷1.18)' : 'Los precios son netos — se agrega IGV encima (×1.18)'}
                                    </p>
                                </div>
                            </button>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Op. Gravada</span>
                                    <span>S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>IGV (18%)</span>
                                    <span>S/ {igv.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-700 pt-2">
                                    <span>Total a Pagar</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Condiciones de Pago */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-transparent">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 uppercase tracking-wide">Condiciones de Pago</h3>
                            <div className="space-y-3">
                                <Select
                                    label="Condición"
                                    name="condicionPago"
                                    options={[
                                        { id: 'CONTADO', value: 'Contado' },
                                        { id: 'CREDITO', value: 'Crédito' }
                                    ]}
                                    onChange={(id, val) => {
                                        setPayment({ ...payment, condicionPago: String(id) });
                                        if (id === 'CONTADO') {
                                            setPayment(prev => ({ ...prev, condicionPago: 'CONTADO', montoPagadoInicial: total }));
                                            setCuotas([]);
                                        } else {
                                            setPayment(prev => ({ ...prev, condicionPago: 'CREDITO', montoPagadoInicial: 0 }));
                                            setCuotas([{ monto: total, fechaVencimiento: moment().add(30, 'days').format('YYYY-MM-DD') }]);
                                        }
                                    }}
                                    value={payment.condicionPago}
                                    withLabel
                                    error={null}
                                />

                                {payment.condicionPago === 'CONTADO' && (
                                    <Select
                                        label="Método de Pago"
                                        name="metodoPago"
                                        options={[
                                            { id: 'EFECTIVO', value: 'Efectivo' },
                                            { id: 'TRANSFERENCIA', value: 'Transferencia' },
                                            { id: 'YAPE', value: 'Yape / Plin' },
                                            { id: 'TARJETA', value: 'Tarjeta' }
                                        ]}
                                        onChange={(id, val) => setPayment({ ...payment, metodoPagoInicial: String(id) })}
                                        value={payment.metodoPagoInicial}
                                        withLabel
                                        error={null}
                                    />
                                )}

                                {/* Pago por banco: cuenta + N° de operación.
                                    Al editar una compra ya inscrita también se muestra
                                    (aunque sea a crédito) para poder corregir el N° de
                                    operación del pago inicial con el del estado de cuenta. */}
                                {(payment.condicionPago === 'CONTADO' || isEdit) && payment.metodoPagoInicial === 'TRANSFERENCIA' && (
                                    <div className="space-y-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3">
                                        {(cuentas || []).filter((c) => c.activo).length === 0 ? (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                                No hay cuentas bancarias registradas. Agrégalas en <strong>Mi Negocio → Cuentas Bancarias</strong> para elegir el banco.
                                            </p>
                                        ) : (
                                            <Select
                                                label="Banco / Cuenta"
                                                name="cuentaBancaria"
                                                options={(cuentas || []).filter((c) => c.activo).map((c) => ({ id: c.id, value: `${c.alias || c.banco} — ${c.numeroCuenta} (${c.moneda})` }))}
                                                onChange={(id) => setPayment((p) => ({ ...p, cuentaBancariaId: Number(id) }))}
                                                value={(() => { const c = (cuentas || []).find((x) => x.id === payment.cuentaBancariaId); return c ? `${c.alias || c.banco} — ${c.numeroCuenta} (${c.moneda})` : ''; })()}
                                                withLabel
                                                error={null}
                                            />
                                        )}
                                        <InputPro
                                            autocomplete="off"
                                            label="N° de Operación"
                                            name="numeroOperacion"
                                            value={payment.numeroOperacion}
                                            onChange={(e) => setPayment({ ...payment, numeroOperacion: e.target.value })}
                                            isLabel
                                            placeholder="Ej: 00123456"
                                        />
                                    </div>
                                )}

                                {payment.condicionPago === 'CREDITO' && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cuotas</span>
                                            <button
                                                onClick={() => setCuotas([...cuotas, { monto: 0, fechaVencimiento: moment().add(30 * (cuotas.length + 1), 'days').format('YYYY-MM-DD') }])}
                                                className="text-blue-600 dark:text-blue-400 text-xs hover:underline font-medium"
                                                type="button"
                                            >
                                                + Agregar
                                            </button>
                                        </div>
                                        {cuotas.map((cuota, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-5">
                                                    <Calendar
                                                        text={`Vencimiento ${idx + 1}`}
                                                        portal
                                                        name={`fechaVencimiento_${idx}`}
                                                        onChange={(date: string) => {
                                                            if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                                                const newCuotas = [...cuotas];
                                                                newCuotas[idx].fechaVencimiento = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
                                                                setCuotas(newCuotas);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-6">
                                                    <InputPro
                                                        type="number"
                                                        label={`Monto ${idx + 1}`}
                                                        name={`monto_${idx}`}
                                                        value={cuota.monto}
                                                        onChange={(e) => {
                                                            const newCuotas = [...cuotas];
                                                            newCuotas[idx].monto = Number(e.target.value);
                                                            setCuotas(newCuotas);
                                                        }}
                                                        isLabel
                                                        autocomplete="off"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex items-end pb-2">
                                                    <button onClick={() => {
                                                        const newCuotas = [...cuotas];
                                                        newCuotas.splice(idx, 1);
                                                        setCuotas(newCuotas);
                                                    }} className="text-red-500 hover:text-red-700 p-1">
                                                        <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="text-xs text-right text-gray-500 dark:text-gray-400 font-medium">
                                            Total Cuotas: S/ {cuotas.reduce((acc, c) => acc + (Number(c.monto) || 0), 0).toFixed(2)}
                                        </div>
                                        {Math.abs(total - cuotas.reduce((acc, c) => acc + (Number(c.monto) || 0), 0)) > 0.01 && (
                                            <div className="text-xs text-red-500 dark:text-red-400 font-bold text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border dark:border-red-900/30">
                                                ⚠️ Las cuotas no suman el total
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                        <Button color="gray" onClick={onClose} type="button">Cancelar</Button>
                        <Button outline color="black" onClick={handleSubmit} className="!bg-emerald-500 !text-white !border-none shadow-md shadow-emerald-200 dark:shadow-emerald-900/20 hover:opacity-90">{isEdit ? 'Guardar Cambios' : 'Guardar Compra'}</Button>
                    </div>
                </div>
            </form>
            <ModalConfirm
                isOpenModal={showConfirmUnlinked}
                setIsOpenModal={setShowConfirmUnlinked}
                title="Confirmar Guardado"
                information={`${items.filter(i => i._sinVincular).length} producto(s) del XML no están vinculados y no actualizarán stock. ¿Deseas continuar de todos modos?`}
                confirmText="Sí, guardar compra"
                confirmSubmit={confirmGuardarConSinVincular}
            />
        </Modal>
    );
};

export default ModalNuevaCompra;
