import { useConfiguracionTiendaViewModel } from '@/features/admin/tienda/useConfiguracionTiendaViewModel';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import ModalConfirm from '@/components/ModalConfirm';
export default function ConfiguracionTienda() {
  const vm = useConfiguracionTiendaViewModel();
  if (vm.loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-[#0A0D14]">
        <Icon icon="eos-icons:loading" className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  if (!vm.config?.plan?.tieneTienda) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white dark:bg-[#111827] rounded-lg shadow text-center border dark:border-transparent">
        <Icon icon="mdi:store-off" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Tienda Virtual no disponible</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Tu plan actual no incluye tienda virtual. Actualiza tu plan para activar esta funcionalidad.</p>
        <Button onClick={() => window.location.href = '/administrador/perfil'}>Ver Planes</Button>
      </div>
    );
  }

  const { formData, handleChange, handleSubmit, saving } = vm;

  return (
    <div className="min-h-screen pb-4 px-2 bg-gray-50 dark:bg-[#0A0D14]">
      <ModalConfirm
        isOpenModal={vm.showConfirmDelete}
        setIsOpenModal={vm.setShowConfirmDelete}
        confirmSubmit={vm.confirmarEliminarQr}
        title={`Eliminar QR de ${vm.deleteQrType?.toUpperCase() || ''}`}
        information={`¿Estás seguro de que deseas eliminar el código QR de ${vm.deleteQrType?.toUpperCase() || ''}?`}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Icon icon="solar:settings-bold-duotone" className="text-blue-600 dark:text-blue-400" />
            Configuración de Tienda Virtual
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Datos generales, logo, envío y recojo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.href = '/administrador/tienda/template'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-900 transition-all"
          >
            <Icon icon="solar:palette-round-bold" className="text-lg text-indigo-500" />
            Diseño y template
          </button>
          {formData.slugTienda && (
          <button
            type="button"
            onClick={vm.abrirTienda}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Icon icon="solar:shop-2-bold" className="text-lg" />
            Ver mi tienda
          </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Información Básica ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Icon icon="solar:info-circle-bold-duotone" className="text-xl text-blue-500" />
            Información Básica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <InputPro label="Nombre de la tienda (URL)" name="slugTienda" value={formData.slugTienda} onChange={handleChange} placeholder="mi-negocio" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Solo letras minúsculas, números y guiones.</p>
            </div>
            <InputPro label="WhatsApp" name="whatsappTienda" value={formData.whatsappTienda} onChange={handleChange} placeholder="+51 999 999 999" />
            <div className="md:col-span-2">
              <InputPro label="Descripción" name="descripcionTienda" value={formData.descripcionTienda} onChange={handleChange} placeholder="Breve descripción de tu negocio" type="textarea" rows={3} isLabel />
            </div>
            <InputPro label="Horario de atención" name="horarioAtencion" value={formData.horarioAtencion} onChange={handleChange} />
          </div>
        </div>

        {/* ── Logo de Tienda ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Icon icon="solar:image-bold-duotone" className="text-xl text-[#FF9500]" />
            Logo de Tienda
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Aparece en el <strong>encabezado</strong> de tu tienda virtual junto al nombre. Recomendado: 200×200px, fondo transparente (PNG).
          </p>

          <div className="flex items-start gap-6 flex-wrap">
            {/* Preview actual */}
            <div className="flex-shrink-0">
              {vm.previewLogoUrl ? (
                <div className="relative group">
                  <div className="w-28 h-28 rounded-2xl border-2 border-[#FF9500]/30 bg-[#FAF6F1] dark:bg-slate-900/50 flex items-center justify-center overflow-hidden">
                    <img src={vm.previewLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                  </div>
                  <button
                    type="button"
                    onClick={vm.eliminarLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" className="text-xs" />
                  </button>
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">Logo actual</p>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1">
                  <Icon icon="solar:shop-bold" className="text-3xl text-gray-300 dark:text-gray-700" />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Sin logo</p>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1 min-w-[220px]">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-900/20 hover:bg-[#FFF3E0] dark:hover:bg-[#FF9500]/10 hover:border-[#FF9500] transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => vm.setLogoFile(e.target.files?.[0] || null)}
                />
                {vm.logoFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <img src={URL.createObjectURL(vm.logoFile)} className="h-16 object-contain" alt="preview" />
                    <p className="text-xs text-[#FF9500] font-medium truncate max-w-[180px]">{vm.logoFile.name}</p>
                  </div>
                ) : (
                  <>
                    <Icon icon="solar:upload-minimalistic-bold-duotone" className="text-3xl text-gray-400 mb-1" />
                    <p className="text-sm text-gray-500"><span className="font-semibold">Clic para elegir</span> logo</p>
                    <p className="text-xs text-gray-400">PNG, JPG, SVG · máx 2.5MB</p>
                  </>
                )}
              </label>
              <Button
                type="button"
                onClick={vm.subirLogo}
                disabled={vm.logoUploading || !vm.logoFile}
                className="w-full mt-3"
                color="secondary"
              >
                {vm.logoUploading ? (
                  <span className="flex items-center gap-2"><Icon icon="eos-icons:loading" className="animate-spin" /> Subiendo...</span>
                ) : 'Subir Logo'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Redes Sociales ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Icon icon="solar:share-circle-bold-duotone" className="text-xl text-purple-500" />
            Redes Sociales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputPro label="Facebook" name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} placeholder="https://facebook.com/tu-pagina" />
            <InputPro label="Instagram" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} placeholder="https://instagram.com/tu-cuenta" />
            <InputPro label="TikTok" name="tiktokUrl" value={formData.tiktokUrl} onChange={handleChange} placeholder="https://tiktok.com/@tu-cuenta" />
          </div>
        </div>

        {/* ── Envío y Recojo ── */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
            <Icon icon="solar:delivery-bold" className="text-xl text-amber-500" />
            Configuración de Envío y Recojo
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" name="aceptaRecojo" checked={formData.aceptaRecojo} onChange={handleChange} className="w-4 h-4 dark:bg-slate-800 dark:border-slate-700" />
                <label className="text-sm dark:text-gray-300">Acepto recojo en tienda</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="aceptaEnvio" checked={formData.aceptaEnvio} onChange={handleChange} className="w-4 h-4 dark:bg-slate-800 dark:border-slate-700" />
                <label className="text-sm dark:text-gray-300">Acepto envío a domicilio</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="aceptaEfectivo" checked={formData.aceptaEfectivo} onChange={handleChange} className="w-4 h-4 dark:bg-slate-800 dark:border-slate-700" />
                <label className="text-sm dark:text-gray-300">Acepto pago en efectivo contra entrega</label>
              </div>
            </div>
            {formData.aceptaEnvio && <InputPro label="Costo de envío fijo (S/)" name="costoEnvioFijo" type="number" value={formData.costoEnvioFijo} onChange={handleChange} placeholder="0.00" isLabel />}
            {formData.aceptaEnvio && <InputPro label="Envío gratis desde (S/) — 0 = nunca gratis" name="envioGratisDesdeSoles" type="number" value={formData.envioGratisDesdeSoles} onChange={handleChange} placeholder="0.00" isLabel />}
            {formData.aceptaRecojo && <InputPro label="Dirección de recojo" name="direccionRecojo" value={formData.direccionRecojo} onChange={handleChange} placeholder="Av. Principal 123, Distrito, Ciudad" isLabel />}
            <InputPro label="Monto mínimo de pedido (S/) — 0 = sin mínimo" name="minimoCompra" type="number" value={formData.minimoCompra} onChange={handleChange} placeholder="0.00" isLabel />
            <InputPro label="Tiempo estimado de preparación (minutos)" name="tiempoPreparacionMin" type="number" value={formData.tiempoPreparacionMin} onChange={handleChange} placeholder="30" isLabel />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" onClick={() => window.location.reload()} disabled={saving} color="secondary">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2"><Icon icon="eos-icons:loading" className="animate-spin" /> Guardando...</span>
            ) : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </div>
  );
}
