import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import DataTable from '@/components/Datatable';
import Loading from '@/components/Loading';
import ModalConfirm from '@/components/ModalConfirm';
import { useState } from 'react';
import { useListasPrecioStore, IListaPrecio } from '@/zustand/listasPrecio';
import ListaPrecioModal from './ListaPrecioModal';

const ListasPrecioIndex = () => {
    const { listas, loading, listar, eliminar } = useListasPrecioStore();
    const [showModal, setShowModal] = useState(false);
    const [selected, setSelected] = useState<IListaPrecio | null>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [toDelete, setToDelete] = useState<IListaPrecio | null>(null);

    useEffect(() => { listar(); }, []);

    const handleCreate = () => { setSelected(null); setIsEdit(false); setShowModal(true); };
    const handleEdit = (l: IListaPrecio) => { setSelected(l); setIsEdit(true); setShowModal(true); };
    const handleDelete = (l: IListaPrecio) => { setToDelete(l); setShowConfirm(true); };
    const confirmDelete = async () => { if (toDelete) { await eliminar(toDelete.id); setShowConfirm(false); setToDelete(null); } };

    const actions = [
        { onClick: (data: any) => handleEdit(data._original), icon: <Icon icon="solar:pen-bold" width={18} />, tooltip: 'Editar', color: 'blue' as const },
        { onClick: (data: any) => handleDelete(data._original), icon: <Icon icon="solar:trash-bin-trash-bold" width={18} />, tooltip: 'Eliminar', color: 'rose' as const },
    ];

    const tableData = listas.map(l => ({
        id: l.id,
        Nombre: (
            <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-white">
                {l.nombre}
                {l.esPorDefecto && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Por defecto</span>}
            </span>
        ),
        Sedes: (l.sedeIds?.length ?? 0),
        Usuarios: (l.usuarioIds?.length ?? 0),
        Productos: (l.totalItems ?? 0),
        Estado: (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${l.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {l.activo ? 'Activa' : 'Inactiva'}
            </span>
        ),
        _original: l,
    }));

    if (loading && listas.length === 0) return <Loading />;

    return (
        <div className="min-h-screen px-4 pb-6 bg-gray-50 dark:bg-[#0A0D14]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Icon icon="solar:tag-price-bold-duotone" className="text-violet-600 dark:text-violet-400" />
                        Listas de Precio
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">El precio normal es el del producto. Crea una lista solo para el local que cobra distinto y asígnasela. Marca una lista como “por defecto” para usarla como precio general cuando un local no tiene lista propia.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                    Nueva Lista
                </button>
            </div>
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden p-4">
                {tableData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <DataTable actions={actions} bodyData={tableData} headerColumns={[
                            { label: 'Nombre', key: 'Nombre' }, { label: 'Sedes', key: 'Sedes' },
                            { label: 'Usuarios', key: 'Usuarios' }, { label: 'Productos', key: 'Productos' },
                            { label: 'Estado', key: 'Estado' },
                        ]} />
                    </div>
                ) : <div className="text-center py-12 text-gray-500 dark:text-gray-400">No hay listas de precio. Crea la primera para asignar precios por local o usuario.</div>}
            </div>
            {showModal && <ListaPrecioModal isOpen={showModal} onClose={() => setShowModal(false)} lista={selected} isEdit={isEdit} />}
            {showConfirm && toDelete && (
                <ModalConfirm isOpenModal={showConfirm} setIsOpenModal={setShowConfirm} title="Eliminar Lista de Precio"
                    information={`¿Eliminar la lista "${toDelete.nombre}"? Sus precios asignados dejarán de aplicarse.`}
                    confirmSubmit={confirmDelete} />
            )}
        </div>
    );
};

export default ListasPrecioIndex;
