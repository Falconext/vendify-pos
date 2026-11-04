import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import Button from "@/components/Button";
import { Icon } from "@iconify/react";
import { precioPorCantidad, precioUnitarioDeEscala } from "@/features/admin/facturacion/mayoristaMezcla";

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    onSave: (newData: any) => void;
    monedaSimbolo?: string;
    /**
     * Precio por mayor mezclando productos: unidades de las OTRAS líneas que se
     * suman a esta. 0 = la mezcla no aplica a esta línea.
     */
    cantidadOtrasEnMezcla?: number;
}

// Misma regla de escalas que el carrito (y la mezcla de productos).
const normalizeWholesaleUnitPrice = precioUnitarioDeEscala;
const getApplicablePrice = precioPorCantidad;

const ModalEditLineItem = ({ isOpen, onClose, item, onSave, monedaSimbolo = "S/", cantidadOtrasEnMezcla = 0 }: IProps) => {
    const otrasEnMezcla = Math.max(0, Number(cantidadOtrasEnMezcla) || 0);
    // El precio que el sistema pone solo según la cantidad (y la mezcla).
    const cantidadParaEscala = (qty: number) => qty + otrasEnMezcla;
    const [formValues, setFormValues] = useState<any>({
        precioUnitario: 0,
        cantidad: 0,
        descuento: 0,
        descripcion: ""
    });
    // El descuento por línea viaja siempre como porcentaje (precio, totales y
    // backend lo leen así). "En monto" solo cambia cómo lo escribe el cajero:
    // al guardar se convierte al porcentaje exacto de esa línea.
    const [descuentoTipo, setDescuentoTipo] = useState<'PORCENTAJE' | 'MONTO'>('PORCENTAJE');
    // El cajero escribió el precio o eligió una escala: ese precio manda y la
    // mezcla de productos ya no lo cambia (hasta que cambie la cantidad).
    const [precioTocado, setPrecioTocado] = useState(false);

    useEffect(() => {
        if (item) {
            const tipo = item.descuentoTipo === 'MONTO' ? 'MONTO' : 'PORCENTAJE';
            const pct = Number(item.descuento || 0);
            const subtotal = Number(item.precioUnitario) * Number(item.cantidad);
            setDescuentoTipo(tipo);
            setPrecioTocado(Boolean(item.precioManual));
            setFormValues({
                precioUnitario: Number(item.precioUnitario),
                cantidad: Number(item.cantidad),
                descuento: tipo === 'MONTO' ? Number((subtotal * pct / 100).toFixed(2)) : pct,
                descripcion: item.descripcion
            });
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'cantidad') {
            const qty = Number(value);
            const base = Number(item?.precioBase ?? item?.precioUnitario);
            const price = getApplicablePrice(base, item?.preciosMayorista ?? [], cantidadParaEscala(qty));
            setPrecioTocado(false);
            setFormValues((prev: any) => ({ ...prev, cantidad: value, precioUnitario: price }));
        } else {
            if (name === 'precioUnitario') setPrecioTocado(true);
            setFormValues((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const precioActual = Number(formValues.precioUnitario);
    const subtotalLinea = precioActual * Number(formValues.cantidad);
    const descuentoIngresado = Number(formValues.descuento) || 0;
    const descuentoPct = descuentoTipo === 'MONTO'
        ? (subtotalLinea > 0 ? (descuentoIngresado / subtotalLinea) * 100 : 0)
        : descuentoIngresado;
    const descuentoMonto = descuentoTipo === 'MONTO' ? descuentoIngresado : subtotalLinea * descuentoIngresado / 100;
    const errorDescuento =
        descuentoIngresado < 0
            ? 'El descuento no puede ser negativo'
            : descuentoTipo === 'MONTO' && descuentoIngresado > subtotalLinea + 0.001
                ? `El descuento no puede pasar de ${monedaSimbolo} ${subtotalLinea.toFixed(2)}`
                : descuentoTipo === 'PORCENTAJE' && descuentoIngresado > 100
                    ? 'El descuento no puede pasar de 100%'
                    : '';

    const cambiarTipoDescuento = (tipo: 'PORCENTAJE' | 'MONTO') => {
        if (tipo === descuentoTipo) return;
        // Conserva el mismo descuento expresado en la otra unidad.
        const valor = tipo === 'MONTO'
            ? Number(descuentoMonto.toFixed(2))
            : Number(descuentoPct.toFixed(2));
        setDescuentoTipo(tipo);
        setFormValues((prev: any) => ({ ...prev, descuento: valor }));
    };

    const handleSubmit = () => {
        if (errorDescuento) return;
        onSave({
            ...item,
            precioUnitario: Number(formValues.precioUnitario),
            cantidad: Number(formValues.cantidad),
            descuento: descuentoPct,
            descuentoTipo,
            descripcion: formValues.descripcion,
            // Si lo que eligió es justo el precio automático, no queda "a mano":
            // así la mezcla lo sigue ajustando si cambian las otras líneas.
            precioManual: precioTocado && Math.abs(
                Number(formValues.precioUnitario) -
                getApplicablePrice(Number(item?.precioBase ?? item?.precioUnitario), item?.preciosMayorista ?? [], cantidadParaEscala(Number(formValues.cantidad) || 0)),
            ) > 0.000001,
        });
        onClose();
    };

    const hasWholesaleRules = item?.preciosMayorista?.length > 0;

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title="Editar Item" width="500px">
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Descripción del Producto</label>
                    <InputPro
                        name="descripcion"
                        value={formValues.descripcion}
                        onChange={handleChange}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Precio Unitario ({monedaSimbolo})</label>
                        <InputPro
                            name="precioUnitario"
                            type="number"
                            value={formValues.precioUnitario}
                            onChange={handleChange}
                        />
                        {hasWholesaleRules && (
                            <p className="text-xs text-green-600 mt-1">
                                {otrasEnMezcla > 0
                                    ? `Precio por mayor según el total mezclado: ${cantidadParaEscala(Number(formValues.cantidad) || 0)} unidades`
                                    : 'Precio mayorista aplicado según cantidad'}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Cantidad</label>
                        <InputPro
                            name="cantidad"
                            type="number"
                            value={formValues.cantidad}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="col-span-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="block text-sm font-bold text-gray-600">
                                Descuento ({descuentoTipo === 'MONTO' ? monedaSimbolo : '%'})
                            </label>
                            <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-600 p-0.5 text-xs font-semibold" role="group" aria-label="Tipo de descuento">
                                {([['PORCENTAJE', '%'], ['MONTO', monedaSimbolo]] as const).map(([tipo, etiqueta]) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        aria-pressed={descuentoTipo === tipo}
                                        onClick={() => cambiarTipoDescuento(tipo)}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${
                                            descuentoTipo === tipo
                                                ? 'bg-[var(--accent,#7551FF)] text-white'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {etiqueta}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-start">
                            <InputPro
                                name="descuento"
                                type="number"
                                value={formValues.descuento}
                                onChange={handleChange}
                            />
                            {descuentoIngresado > 0 && !errorDescuento && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 pt-2.5">
                                    {descuentoTipo === 'MONTO'
                                        ? `Equivale a ${descuentoPct.toFixed(2)}%`
                                        : `Equivale a ${monedaSimbolo} ${descuentoMonto.toFixed(2)}`}
                                    {' · '}Total {monedaSimbolo} {(subtotalLinea - descuentoMonto).toFixed(2)}
                                </p>
                            )}
                        </div>
                        {errorDescuento && (
                            <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{errorDescuento}</p>
                        )}
                    </div>
                </div>

                {hasWholesaleRules && (
                    <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800/60 dark:to-slate-900/40 p-3">
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon icon="solar:tag-price-bold-duotone" className="text-white" width={13} />
                            </div>
                            <p className="text-xs font-bold text-gray-800 dark:text-white">Precio por Mayorista</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Seleccionar:</span>

                            {/* Base price pill */}
                            {(() => {
                                const base = Number(item?.precioBase ?? item?.precioUnitario);
                                const isActive = Math.abs(Number(formValues.precioUnitario) - base) < 0.001 &&
                                    !item.preciosMayorista.some((t: any) => Math.abs(Number(formValues.precioUnitario) - t.precio) < 0.001 && t.precio !== base);
                                return (
                                    <button
                                        type="button"
                                        onClick={() => { setPrecioTocado(true); setFormValues((prev: any) => ({ ...prev, precioUnitario: base })); }}
                                        className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                                            isActive
                                                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:border-gray-500'
                                        }`}
                                    >
                                        Base {monedaSimbolo}{base.toFixed(2)}
                                    </button>
                                );
                            })()}

                            {/* Tier pills */}
                            {[...item.preciosMayorista]
                                .sort((a: any, b: any) => a.cantidadMinima - b.cantidadMinima)
                                .map((tier: any, i: number) => {
                                    const tierUnitPrice = normalizeWholesaleUnitPrice(Number(item?.precioBase ?? item?.precioUnitario), tier);
                                    const isActive = Math.abs(Number(formValues.precioUnitario) - tierUnitPrice) < 0.001;
                                    const isReached = cantidadParaEscala(Number(formValues.cantidad) || 0) >= tier.cantidadMinima;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setPrecioTocado(true);
                                                setFormValues((prev: any) => ({
                                                    ...prev,
                                                    // Con la mezcla, las otras líneas ya aportan unidades:
                                                    // no se le sube la cantidad a esta si ya alcanza.
                                                    cantidad: otrasEnMezcla > 0
                                                        ? Math.max(Number(prev.cantidad) || 1, Number(tier.cantidadMinima) - otrasEnMezcla)
                                                        : Number(tier.cantidadMinima),
                                                    precioUnitario: tierUnitPrice,
                                                }));
                                            }}
                                            title={`Aplica desde ${tier.cantidadMinima} unidades`}
                                            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                                                isActive
                                                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                    : isReached
                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-100'
                                                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-slate-700 hover:border-green-400'
                                            }`}
                                        >
                                            {isReached && !isActive && <Icon icon="mdi:check-circle" width={9} className="text-green-500" />}
                                            {tier.cantidadMinima}u → {monedaSimbolo}{Number(tierUnitPrice).toFixed(2)}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <Button color="secondary" outline onClick={onClose}>Cancelar</Button>
                    <Button color="primary" onClick={handleSubmit} disabled={!!errorDescuento}>Guardar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalEditLineItem;
