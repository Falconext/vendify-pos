import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { useListasPrecioStore, IListaPrecio, IListaPrecioForm } from '@/zustand/listasPrecio';
import { useSedesStore } from '@/zustand/sedes';
import { useUsersStore } from '@/zustand/users';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    lista: IListaPrecio | null;
    isEdit: boolean;
}

const ListaPrecioModal: React.FC<Props> = ({ isOpen, onClose, lista, isEdit }) => {
    const { crear, actualizar, obtener, loading } = useListasPrecioStore();
    const { sedes, listarSedes } = useSedesStore();
    const { usuarios, getAllUsers } = useUsersStore();

    const [nombre, setNombre] = useState('');
    const [activo, setActivo] = useState(true);
    const [esPorDefecto, setEsPorDefecto] = useState(false);
    const [sedeIds, setSedeIds] = useState<number[]>([]);
    const [usuarioIds, setUsuarioIds] = useState<number[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            listarSedes();
            getAllUsers({ page: 1, limit: 100 });
        }
    }, [isOpen]);

    useEffect(() => {
        const cargar = async () => {
            if (lista && isEdit) {
                // Trae sedeIds/usuarioIds completos por si el listado no los incluye.
                const full = await obtener(lista.id);
                const src = full || lista;
                setNombre(src.nombre);
                setActivo(src.activo);
                setEsPorDefecto(src.esPorDefecto);
                setSedeIds(src.sedeIds || []);
                setUsuarioIds(src.usuarioIds || []);
            } else {
                setNombre(''); setActivo(true); setEsPorDefecto(false);
                setSedeIds([]); setUsuarioIds([]);
            }
            setError('');
        };
        if (isOpen) cargar();
    }, [lista, isEdit, isOpen]);

    const toggle = (arr: number[], id: number) =>
        arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
        const payload: IListaPrecioForm = { nombre: nombre.trim(), activo, esPorDefecto, sedeIds, usuarioIds };
        try {
            if (isEdit && lista) await actualizar(lista.id, payload);
            else await crear(payload);
            onClose();
        } catch { /* alert lo maneja el store */ }
    };

    const sedesActivas = (sedes || []).filter((s: any) => s.activo !== false);
    const usuariosEmpresa = (usuarios || []).filter((u: any) => u.rol !== 'ADMIN_SISTEMA');

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title={`${isEdit ? 'Editar' : 'Crear'} Lista de Precio`} width="640px">
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div>
                    <InputPro name="nombre" value={nombre} onChange={(e: any) => setNombre(e.target.value)} label="Nombre de la lista" isLabel placeholder="Ej: Lista Mayorista, Lista Sede Centro" error={error} />
                </div>

                <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={activo} onChange={() => setActivo(a => !a)} className="w-5 h-5 rounded text-violet-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Activa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={esPorDefecto} onChange={() => setEsPorDefecto(d => !d)} className="w-5 h-5 rounded text-amber-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Usar como precio general del negocio (por defecto)</span>
                    </label>
                </div>
                <p className="-mt-2 text-xs text-gray-400">La lista “por defecto” se aplica cuando un local no tiene su propia lista. Si un local tiene lista asignada, esa manda.</p>

                {/* Sedes asignadas */}
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Icon icon="solar:city-bold-duotone" className="text-violet-500" width={18} /> Sedes asignadas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {sedesActivas.map((s: any) => {
                            const sel = sedeIds.includes(s.id);
                            return (
                                <label key={s.id} onClick={() => setSedeIds(prev => toggle(prev, s.id))}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-100 dark:border-slate-800 hover:border-violet-200'}`}>
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sel ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>{sel && <Icon icon="mdi:check" className="text-white" width={12} />}</div>
                                    <span className="text-sm text-gray-800 dark:text-white">{s.nombre}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Usuarios asignados */}
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Icon icon="solar:users-group-rounded-bold-duotone" className="text-violet-500" width={18} /> Usuarios asignados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {usuariosEmpresa.map((u: any) => {
                            const sel = usuarioIds.includes(u.id);
                            return (
                                <label key={u.id} onClick={() => setUsuarioIds(prev => toggle(prev, u.id))}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-100 dark:border-slate-800 hover:border-violet-200'}`}>
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sel ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`}>{sel && <Icon icon="mdi:check" className="text-white" width={12} />}</div>
                                    <span className="text-sm text-gray-800 dark:text-white truncate">{u.nombre} <span className="text-xs text-gray-400">{u.email}</span></span>
                                </label>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Asigna un usuario solo si quieres que esa persona use siempre esta lista (ej. un cliente mayorista), sin importar el local. Para precio por local, basta con asignar la lista a la sede. Los precios de cada producto se configuran desde la ficha del producto.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" onClick={onClose} outline color="gray">Cancelar</Button>
                    <Button type="submit" color="violet" disabled={loading}>{isEdit ? 'Guardar cambios' : 'Crear lista'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ListaPrecioModal;
