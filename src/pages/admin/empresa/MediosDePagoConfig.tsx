import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import ModalConfirm from '@/components/ModalConfirm';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

/**
 * Medios de Pago (Yape / Plin) — componente autónomo.
 *
 * Gestiona su propia carga y guardado contra los endpoints de configuración de
 * tienda (`/tienda/config` y `/tienda/qr/:tipo`), sin depender del viewmodel de
 * la página de Configuración de Tienda. Así puede montarse en el Perfil.
 */
export default function MediosDePagoConfig() {
  const { alert } = useAlertStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [yapeNumero, setYapeNumero] = useState('');
  const [plinNumero, setPlinNumero] = useState('');

  const [yapeQrUrl, setYapeQrUrl] = useState('');
  const [plinQrUrl, setPlinQrUrl] = useState('');
  const [previewYapeUrl, setPreviewYapeUrl] = useState('');
  const [previewPlinUrl, setPreviewPlinUrl] = useState('');

  const [yapeFile, setYapeFile] = useState<File | null>(null);
  const [plinFile, setPlinFile] = useState<File | null>(null);
  const [yapeUploading, setYapeUploading] = useState(false);
  const [plinUploading, setPlinUploading] = useState(false);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteQrType, setDeleteQrType] = useState<'yape' | 'plin' | null>(null);

  const cargar = async () => {
    try {
      const { data } = await apiClient.get('/tienda/config');
      const d = data.data || {};
      setYapeNumero(d.yapeNumero || '');
      setPlinNumero(d.plinNumero || '');
      setYapeQrUrl(d.yapeQrUrl || '');
      setPlinQrUrl(d.plinQrUrl || '');
      setPreviewYapeUrl(d.yapeQrSignedUrl || d.yapeQrUrl || '');
      setPreviewPlinUrl(d.plinQrSignedUrl || d.plinQrUrl || '');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cargar medios de pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/tienda/config', { yapeNumero, plinNumero });
      alert('Medios de pago guardados exitosamente', 'success');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar medios de pago', 'error');
    } finally {
      setSaving(false);
    }
  };

  const subirQr = async (tipo: 'yape' | 'plin') => {
    const file = tipo === 'yape' ? yapeFile : plinFile;
    if (!file) return;
    tipo === 'yape' ? setYapeUploading(true) : setPlinUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post(`/tienda/qr/${tipo}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data?.data?.url || data?.url || '';
      const signed = data?.data?.signedUrl || data?.signedUrl || url;
      if (tipo === 'yape') {
        setYapeQrUrl(url);
        setPreviewYapeUrl(signed);
        setYapeFile(null);
      } else {
        setPlinQrUrl(url);
        setPreviewPlinUrl(signed);
        setPlinFile(null);
      }
      alert('QR subido correctamente', 'success');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al subir QR', 'error');
    } finally {
      tipo === 'yape' ? setYapeUploading(false) : setPlinUploading(false);
    }
  };

  const eliminarQr = (tipo: 'yape' | 'plin') => {
    setDeleteQrType(tipo);
    setShowConfirmDelete(true);
  };

  const confirmarEliminarQr = async () => {
    if (!deleteQrType) return;
    const tipo = deleteQrType;
    setShowConfirmDelete(false);
    setDeleteQrType(null);
    try {
      if (tipo === 'yape') {
        setYapeQrUrl('');
        setPreviewYapeUrl('');
        setYapeFile(null);
      } else {
        setPlinQrUrl('');
        setPreviewPlinUrl('');
        setPlinFile(null);
      }
      await apiClient.patch('/tienda/config', {
        [tipo === 'yape' ? 'yapeQrUrl' : 'plinQrUrl']: null,
      });
      alert('QR eliminado', 'success');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar QR', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-500">
        <Icon icon="eos-icons:loading" className="animate-spin mr-2" /> Cargando medios de pago...
      </div>
    );
  }

  return (
    <>
      <ModalConfirm
        isOpenModal={showConfirmDelete}
        setIsOpenModal={() => setShowConfirmDelete(false)}
        confirmSubmit={confirmarEliminarQr}
        title={`Eliminar QR de ${deleteQrType?.toUpperCase() || ''}`}
        information={`¿Estás seguro de que deseas eliminar el código QR de ${deleteQrType?.toUpperCase() || ''}?`}
      />

      <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Icon icon="solar:wallet-money-bold-duotone" className="text-emerald-500" width={18} />
          Medios de Pago
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yape */}
        <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center"><span className="text-lg">💜</span></div>
            <span className="font-semibold text-gray-800 dark:text-white">Yape</span>
          </div>
          <div className="space-y-4">
            <InputPro label="Número Yape" name="yapeNumero" value={yapeNumero} onChange={(e: any) => setYapeNumero(e.target.value)} placeholder="999 999 999" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código QR</label>
              <div className="flex items-stretch gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => setYapeFile(e.target.files?.[0] || null)} className="hidden" />
                    <Icon icon="solar:upload-minimalistic-bold-duotone" className="text-3xl text-gray-400 dark:text-gray-600 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{yapeFile ? yapeFile.name : 'Seleccionar imagen'}</span>
                  </label>
                  <Button type="button" onClick={() => subirQr('yape')} disabled={yapeUploading || !yapeFile} color="lila" fill className="w-full mt-3">
                    {yapeUploading ? 'Subiendo...' : 'Subir QR'}
                  </Button>
                </div>
                {(previewYapeUrl || yapeQrUrl) ? (
                  <div className="relative">
                    <img src={previewYapeUrl || yapeQrUrl} alt="QR Yape" className="w-28 h-auto max-h-40 object-contain rounded-xl border border-gray-200 dark:border-slate-700" />
                    <button type="button" onClick={() => eliminarQr('yape')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md">
                      <Icon icon="solar:trash-bin-trash-bold" className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/50 flex items-center justify-center">
                    <Icon icon="solar:qr-code-linear" className="text-4xl text-gray-300 dark:text-gray-700" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Plin */}
        <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center"><span className="text-lg">💚</span></div>
            <span className="font-semibold text-gray-800 dark:text-white">Plin</span>
          </div>
          <div className="space-y-4">
            <InputPro label="Número Plin" name="plinNumero" value={plinNumero} onChange={(e: any) => setPlinNumero(e.target.value)} placeholder="999 999 999" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código QR</label>
              <div className="flex items-stretch gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => setPlinFile(e.target.files?.[0] || null)} className="hidden" />
                    <Icon icon="solar:upload-minimalistic-bold-duotone" className="text-3xl text-gray-400 dark:text-gray-600 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{plinFile ? plinFile.name : 'Seleccionar imagen'}</span>
                  </label>
                  <Button type="button" onClick={() => subirQr('plin')} disabled={plinUploading || !plinFile} color="lila" fill className="w-full mt-3">
                    {plinUploading ? 'Subiendo...' : 'Subir QR'}
                  </Button>
                </div>
                {(previewPlinUrl || plinQrUrl) ? (
                  <div className="relative">
                    <img src={previewPlinUrl || plinQrUrl} alt="QR Plin" className="w-28 h-auto max-h-40 object-contain rounded-xl border border-gray-200 dark:border-slate-700" />
                    <button type="button" onClick={() => eliminarQr('plin')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md">
                      <Icon icon="solar:trash-bin-trash-bold" className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/50 flex items-center justify-center">
                    <Icon icon="solar:qr-code-linear" className="text-4xl text-gray-300 dark:text-gray-700" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon={saving ? 'solar:refresh-bold' : 'solar:diskette-bold'} className={saving ? 'animate-spin' : ''} width={16} />
          {saving ? 'Guardando...' : 'Guardar medios de pago'}
        </button>
      </div>
    </>
  );
}
