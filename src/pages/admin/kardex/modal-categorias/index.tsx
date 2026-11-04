import { ChangeEvent, Dispatch, useEffect, useState } from "react"
import Modal from "@/components/Modal"
import { useCategoriesStore } from "@/zustand/categories"
import DataTable from "@/components/Datatable"
import Pagination from "@/components/Pagination"
import { Icon } from "@iconify/react/dist/iconify.js"
import TableSkeleton from "@/components/Skeletons/table"
import { IFormCategories } from "@/interfaces/categories"
import ModalConfirm from "@/components/ModalConfirm"
import InputPro from "@/components/InputPro"
import Button from "@/components/Button"
import CircularImageUploader from "@/components/CircularImageUploader"
import apiClient from "@/utils/apiClient"
import Select from "@/components/Select"
import { etiquetaCategoria, madresPosibles, ordenarCategorias } from "@/utils/categoriasArbol"

interface IPropsProducts {
    isOpenModal: boolean
    closeModal: any
    setIsOpenModal: Dispatch<boolean>
}

const ModalCategories = ({ isOpenModal, closeModal, setIsOpenModal }: IPropsProducts) => {

    const initialForm: IFormCategories = {
        categoriaId: 0,
        nombre: "",
        padreId: null
    }

    const [formValues, setFormValues] = useState(initialForm);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const { categories, addCategory, editCategory, deleteCategory, getAllCategories, updateCategoryImage } = useCategoriesStore();
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [currentPage, setcurrentPage] = useState(1);
    const [itemsPerPage, setitemsPerPage] = useState(50);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [errors, setErrors] = useState({
        nombre: ""
    });

    const validateForm = () => {
        const newErrors: any = {
            // codigo: formValues?.codigo && formValues?.codigo.trim() !== "" ? "" : "El código del producto es obligatorio",
            nombre: formValues?.nombre && formValues?.nombre.trim() !== "" ? "" : "El nombre de categoría es obligatorio",
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((error) => !error); // Retorna `true` si no hay errores
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = [];
    for (let i = 1; i <= Math.ceil(10 / itemsPerPage); i++) {
        pages.push(i);
    }

    useEffect(() => {
        getAllCategories({})
    }, [])

    const handleGetCategory = (data: any) => {
        setFormValues({
            categoriaId: data.categoriaId,
            nombre: data.nombre,
            padreId: data.padreId ?? null
        })
        setPreviewUrl(data.imagenUrl || null)
        setImageFile(null)
        setIsEdit(true);
    }

    console.log(formValues)

    const handleDeleteCategory = (data: IFormCategories) => {
        setFormValues({
            ...formValues,
            categoriaId: data.categoriaId
        })
        setIsOpenModalConfirm(true)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues({
            ...formValues,
            [name]: value
        });
    };


    const handleSubmitCategory = async () => {
        if (!validateForm()) {
            return;
        }

        let result: any = null;

        if (formValues.categoriaId !== 0) {
            console.log(formValues)
            result = await editCategory(formValues)
        } else {
            console.log("hello")
            result = await addCategory(formValues)
        }

        // Upload image if exists
        const entityId = result?.id || (formValues.categoriaId !== 0 ? formValues.categoriaId : null);

        if (imageFile && entityId) {
            try {
                const fd = new FormData();
                fd.append('file', imageFile);
                const imgResp = await apiClient.post(`/categoria/${entityId}/imagen`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (imgResp.data?.url) {
                    console.log("Updating store with URL:", imgResp.data.url);
                    updateCategoryImage(entityId, imgResp.data.url);
                } else {
                    console.warn("No URL in response", imgResp);
                }

                // Only fetch all if necessary, but we are updating locally now
                // getAllCategories({}); 
            } catch (error) {
                console.error("Error uploading image:", error);
            }
        }

        setFormValues(initialForm)
        setPreviewUrl(null)
        setImageFile(null)
        setIsEdit(false)
        // La lista trae la madre de cada una: se recarga para verla en su lugar.
        getAllCategories({})
    }

    const actions = [
        { onClick: (row: any) => handleGetCategory(row), icon: <Icon icon="solar:pen-bold" width={18} />, tooltip: 'Editar', color: 'blue' as const },
        { onClick: (row: any) => handleDeleteCategory(row), icon: <Icon icon="solar:trash-bin-trash-bold" width={18} />, tooltip: 'Eliminar', color: 'rose' as const },
    ];

    // Cada madre seguida de sus subcategorías, sangradas.
    const categoriesTable = ordenarCategorias(categories ?? []).map((item: any, index: number) => ({
        '#': index + 1,
        categoriaId: item.id,
        nombre: item.nombre,
        padreId: item.padreId ?? null,
        'Nombre': item.padreId
            ? <span className="pl-5 font-medium tracking-wide text-gray-600 dark:text-gray-300">↳ {item.nombre?.toUpperCase()}</span>
            : <span className="font-medium tracking-wide">{item.nombre?.toUpperCase()}</span>,
        imagenUrl: item.imagenUrl,
    }))

    // Una categoría con subcategorías no puede volverse subcategoría (un solo nivel).
    const tieneHijas = !!formValues.categoriaId && (categories ?? []).some((c: any) => c.padreId === formValues.categoriaId)
    const opcionesMadre = [
        { id: '', value: 'Ninguna (categoría principal)' },
        ...madresPosibles(categories, formValues.categoriaId || undefined).map((c) => ({ id: c.id, value: c.nombre })),
    ]

    const confirmDeleteCategory = () => {
        deleteCategory(formValues)
        setFormValues(initialForm)
        setIsOpenModalConfirm(false)
    }

    return (
        <>
            {isOpenModal && <Modal width="650px" isOpenModal={isOpenModal} closeModal={closeModal} title={isEdit ? "Editar categoria" : "Nueva categoria"}>
                <div className="px-6 mt-5 flex flex-col md:flex-row gap-6 items-start border-b border-[#e5e7eb] dark:border-white/10 pb-10">
                    <div className="flex-1 w-full">
                        <InputPro
                            autocomplete="off"
                            value={formValues?.nombre}
                            error={errors.nombre}
                            name="nombre"
                            onChange={handleChange}
                            isLabel
                            label="Nombre de la categoría"
                        />
                        <div className="mt-4">
                            <Select
                                onChange={(id: any) => setFormValues({ ...formValues, padreId: id ? Number(id) : null })}
                                label={tieneHijas ? 'Dentro de (tiene subcategorías: queda principal)' : 'Dentro de (opcional)'}
                                name="padreId"
                                isSearch
                                disabled={tieneHijas}
                                options={opcionesMadre}
                                error=""
                                value={opcionesMadre.find(o => o.id === formValues.padreId)?.value ?? 'Ninguna (categoría principal)'}
                                defaultValue="Ninguna (categoría principal)"
                            />
                            {formValues.padreId ? (
                                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                    Quedará como {etiquetaCategoria({ nombre: formValues.nombre || '…', padreId: formValues.padreId }, categories)}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-5 mt-5 md:mt-7 relative">
                        <Button color="black" outline onClick={() => {
                            setIsEdit(false)
                            setFormValues(initialForm)
                            setPreviewUrl(null)
                            setImageFile(null)
                        }}>Limpiar</Button>
                        <Button color="secondary" onClick={handleSubmitCategory}>{isEdit ? "Editar" : "Guardar"}</Button>
                    </div>
                </div>

                <>
                    {
                        categories?.length > 0 ? (
                            <>
                                <div className="px-6">
                                    <div className="overflow-hidden overflow-x-scroll md:overflow-x-visible mt-4">
                                        <DataTable actions={actions} bodyData={categoriesTable} tableInitFinal={false}
                                            headerColumns={['#', { label: 'Nombre', key: 'Nombre' }]} isCompact={true} />
                                    </div>
                                    <Pagination
                                        data={categories}
                                        optionSelect
                                        currentPage={currentPage}
                                        indexOfFirstItem={indexOfFirstItem}
                                        indexOfLastItem={indexOfLastItem}
                                        setcurrentPage={setcurrentPage}
                                        setitemsPerPage={setitemsPerPage}
                                        pages={pages}
                                        total={10}
                                    />
                                </div>
                            </>
                        ) :
                            <TableSkeleton arrayData={categories} />
                    }
                </>
            </Modal>
            }
            {isOpenModalConfirm && <ModalConfirm confirmSubmit={confirmDeleteCategory} isOpenModal={isOpenModalConfirm} setIsOpenModal={setIsOpenModalConfirm} title="Confirmación" information="¿Estás seguro que deseas eliminar esta categoria? , si lo haces no podrás revertir este cambio." />}
        </>
    )
}

export default ModalCategories