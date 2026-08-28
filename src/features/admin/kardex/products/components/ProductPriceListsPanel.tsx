import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { useListasPrecioStore, IListaConItemProducto } from '@/zustand/listasPrecio';

interface Props {
    productoId: number;
    // Presentaciones de paquete del producto (codigosBarrasExtra con unidadesPorPaquete > 1).
    paquetes?: { codigo: string; alias?: string | null; unidadesPorPaquete?: number }[];
    simbolo?: string;
}

// Panel de la ficha de producto: fija el precio de ESTE producto en cada lista
// (unidad base + cada presentación de paquete). Es la contraparte del panel
// "LISTA DE PRECIOS" de las capturas del cliente.
const ProductPriceListsPanel: React.FC<Props> = ({ productoId, paquetes = [], simbolo = 'S/' }) => {
    const { itemsDeProducto, guardarItemsDeProducto } = useListasPrecioStore();
    const [listas, setListas] = useState<IListaConItemProducto[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandida, setExpandida] = useState<number | null>(null);
    // clave `${listaId}|${presentacionCodigo}` -> valor del input (string)
    const [precios, setPrecios] = useState<Record<string, string>>({});

    const paquetesValidos = useMemo(
        () => (paquetes || []).filter(p => Number(p.unidadesPorPaquete || 1) > 1),
        [paquetes],
    );

    useEffect(() => {
        const cargar = async () => {
            if (!productoId) return;
            setLoading(true);
            const data = await itemsDeProducto(productoId);
            setListas(data);
            const init: Record<string, string> = {};
            for (const l of data) {
                for (const it of l.items) {
                    init[`${l.id}|${it.presentacionCodigo || ''}`] = String(it.precioUnitario);
                }
            }
            setPrecios(init);
            setLoading(false);
        };
        cargar();
    }, [productoId]);

    const setPrecio = (listaId: number, cod: string, val: string) =>
        setPrecios(prev => ({ ...prev, [`${listaId}|${cod}`]: val }));

    const handleGuardar = async () => {
        const entradas: { listaPrecioId: number; presentacionCodigo?: string; precioUnitario: number }[] = [];
        for (const [clave, val] of Object.entries(precios)) {
            const num = parseFloat(val);
            if (!val || isNaN(num) || num <= 0) continue; // vacío = no fijar precio en esa lista
            const [listaIdStr, cod] = clave.split('|');
            entradas.push({ listaPrecioId: Number(listaIdStr), presentacionCodigo: cod || '', precioUnitario: num });
        }
        setSaving(true);
        const ok = await guardarItemsDeProducto(productoId, entradas);
        if (ok) {
            const data = await itemsDeProducto(productoId);
            setListas(data);
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="p-4 text-sm text-gray-400">Cargando listas de precio…</div>;
    }

    if (listas.length === 0) {
        return (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/40 rounded-xl">
                No hay listas de precio creadas. Crea listas en <span className="font-semibold">Productos → Listas de Precio</span> y luego asigna aquí el precio de este producto por lista.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Fija el precio de este producto en cada lista. Vacío = la lista usa el precio normal del producto. La lista del usuario gana sobre la de la sede.
            </p>
            {listas.map(l => {
                const abierta = expandida === l.id;
                return (
                    <div key={l.id} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setExpandida(abierta ? null : l.id)}
                            className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800/50">
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                                <Icon icon="solar:tag-price-bold-duotone" className="text-violet-500" width={16} />
                                {l.nombre}
                                {l.esPorDefecto && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Por defecto</span>}
                                {!l.activo && <span className="text-[9px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full uppercase">Inactiva</span>}
                            </span>
                            <Icon icon={abierta ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={16} className="text-gray-400" />
                        </button>
                        {abierta && (
                            <div className="p-3 space-y-2 bg-gray-50/50 dark:bg-slate-900/30">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs w-32 text-gray-600 dark:text-gray-300">Unidad ({simbolo})</span>
                                    <InputPro name={`p-${l.id}-base`} type="number" step="0.01" placeholder="Precio normal"
                                        value={precios[`${l.id}|`] ?? ''} onChange={(e: any) => setPrecio(l.id, '', e.target.value)} />
                                </div>
                                {paquetesValidos.map(pq => (
                                    <div key={pq.codigo} className="flex items-center gap-2">
                                        <span className="text-xs w-32 text-gray-600 dark:text-gray-300 truncate">{pq.alias || `Paquete x${pq.unidadesPorPaquete}`} ({simbolo})</span>
                                        <InputPro name={`p-${l.id}-${pq.codigo}`} type="number" step="0.01" placeholder="Precio del paquete"
                                            value={precios[`${l.id}|${pq.codigo}`] ?? ''} onChange={(e: any) => setPrecio(l.id, pq.codigo, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="flex justify-end pt-1">
                <Button type="button" color="violet" onClick={handleGuardar} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar precios por lista'}
                </Button>
            </div>
        </div>
    );
};

export default ProductPriceListsPanel;
