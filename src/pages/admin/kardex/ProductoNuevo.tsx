import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import apiClient from '@/utils/apiClient'
import { useProductModalViewModel } from '@/features/admin/kardex/products/useProductModalViewModel'
import { ProductFormContent } from '@/features/admin/kardex/products/components/ProductFormContent'
import { ProductImageUploader } from '@/features/admin/kardex/products/components/ProductImageUploader'
import { initialProductForm, IFormProduct, buildEditFormValues } from '@/features/admin/kardex/products/ProductsModel'
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme'

const LIST_PATH = '/administrador/kardex/productos'

const emptyForm = (): IFormProduct => ({ ...initialProductForm, preciosMayorista: [] })
const emptyErrors = () => ({
  codigo: '', descripcion: '', categoriaId: 0, description: '', precioUnitario: '', stock: '', unidadMedida: '',
})

// Página del formulario de producto: sirve para NUEVO (/kardex/productos/nuevo)
// y EDITAR (/kardex/productos/editar/:id). Reutiliza el mismo ViewModel y
// contenido (ProductFormContent) que el modal — una sola fuente de verdad.
export default function ProductoNuevo() {
  const sidebarColor = useThemeStore((s) => s.sidebarColor)
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF'
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEdit = !!id

  // Producto pasado por navegación (al hacer clic en "Editar"). Si no hay
  // (refresh / deep-link), se trae por id más abajo.
  const productFromState = (location.state as any)?.product

  const [formValues, setFormValues] = useState<IFormProduct>(
    isEdit && productFromState ? buildEditFormValues(productFromState) : emptyForm(),
  )
  const [errors, setErrors] = useState<any>(emptyErrors())
  const enrichedFor = useRef<number | null>(null)

  const goToList = () => navigate(LIST_PATH)

  const vm = useProductModalViewModel({
    formValues,
    errors,
    isEdit,
    isOpenModal: true,
    initialForm: emptyForm(),
    setFormValues,
    setErrors,
    closeModal: goToList,
    setIsOpenModal: (v: boolean) => { if (!v) goToList() },
  })

  // Edición: enriquecer con el detalle completo del producto (descripcionLarga,
  // atributosTecnicos). Si se entró por deep-link/refresh (sin state), esto
  // también trae los datos base y puebla el formulario.
  useEffect(() => {
    if (!isEdit || !id) return
    const productId = Number(id)
    if (!productId || enrichedFor.current === productId) return
    enrichedFor.current = productId
    apiClient
      .get(`/productos/${productId}`)
      .then((res) => {
        const full = res?.data?.data ?? res?.data
        if (!full) return
        setFormValues((prev) => {
          // Si no teníamos datos (deep-link), mapear todo; si ya venían del
          // listado, solo completar los campos pesados que faltan.
          const base = prev?.productoId ? prev : buildEditFormValues(full)
          return {
            ...base,
            descripcionLarga: full.descripcionLarga ?? (base as any).descripcionLarga ?? '',
            atributosTecnicos: full.atributosTecnicos ?? (base as any).atributosTecnicos,
          } as IFormProduct
        })
      })
      .catch(() => {})
  }, [isEdit, id])

  // Delegado solo para fotos: no crea productos y aquí solo ve las imágenes.
  useEffect(() => {
    if (vm.soloImagenes && !isEdit) goToList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.soloImagenes, isEdit])

  if (vm.soloImagenes) {
    return (
      <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={goToList} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <Icon icon="solar:alt-arrow-left-linear" />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Fotos del producto</h1>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">{formValues?.descripcion || 'Sube, cambia u ordena las imágenes.'}</p>
          </div>
        </div>
        <div className="max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5">
          <ProductImageUploader vm={vm} />
          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            <button onClick={goToList} className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
            <button onClick={vm.guardarSoloImagenes} disabled={vm.loading} className="h-10 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: ACCENT }}>
              {vm.loading ? 'Guardando fotos...' : 'Guardar fotos'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Kardex</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <button onClick={goToList} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Productos</button>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={goToList} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Icon icon="solar:alt-arrow-left-linear" />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
          <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">
            {isEdit ? 'Actualiza la información del producto y guarda los cambios.' : 'Completa la información del producto y guárdalo.'}
          </p>
        </div>
      </div>

      {/* Contenido del formulario (mismo que el modal) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none pb-1">
        <ProductFormContent vm={vm} onCancel={goToList} forceBarcode />
      </div>
    </div>
  )
}
