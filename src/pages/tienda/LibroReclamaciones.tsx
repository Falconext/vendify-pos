/**
 * `/tienda/:slug/libro-reclamaciones`: Libro de Reclamaciones virtual de la
 * tienda. La hoja es la misma en todas las plantillas (es un formato legal);
 * alrededor va la marca de la tienda y el pie de su plantilla.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { obtenerTiendaPublica, tiendaPublicaEnCache } from '@/lib/tiendaPublica';
import { resolveTemplateId } from '@/components/tienda/resolveTemplate';
import CargandoTienda from '@/components/tienda/CargandoTienda';
import PieDePlantilla from '@/components/tienda/PieDePlantilla';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';
import { recordarVentaSinStock } from '@/templates/shared/ventaSinStock';
import HojaReclamacion from '@/features/libroReclamaciones/HojaReclamacion';
import { obtenerProveedor } from '@/features/libroReclamaciones/api';
import type { ProveedorLibro } from '@/features/libroReclamaciones/tipos';

type Estado = 'cargando' | 'listo' | 'error' | 'no-existe';

export default function LibroReclamaciones() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  useStorePreviewNavigation(previewPlantillaId);

  const [tienda, setTienda] = useState<any>(() => {
    const t = tiendaPublicaEnCache(slug);
    return t ? recordarVentaSinStock(t) : null;
  });
  const [proveedor, setProveedor] = useState<ProveedorLibro | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');

  const cargar = useCallback(async () => {
    if (!slug) return;
    setEstado('cargando');
    try {
      const [resTienda, prov] = await Promise.all([obtenerTiendaPublica(slug), obtenerProveedor(slug)]);
      setTienda(recordarVentaSinStock(resTienda.data?.data || resTienda.data));
      setProveedor(prov);
      setEstado('listo');
    } catch (e) {
      setEstado(axios.isAxiosError(e) && e.response?.status === 404 ? 'no-existe' : 'error');
    }
  }, [slug]);

  useEffect(() => { void cargar(); }, [cargar]);

  const disenoBase = tienda?.diseno || {};
  const diseno = previewPlantillaId ? { ...disenoBase, plantillaId: previewPlantillaId } : disenoBase;
  const color = diseno?.colorPrimario || '#111827';
  const nombre = tienda?.nombreComercial || tienda?.nombre || proveedor?.nombreComercial || proveedor?.razonSocial || 'Tienda';
  const logo = tienda?.logo || proveedor?.logo;
  const irEnTienda = useNavigate();

  useEffect(() => {
    if (estado === 'listo') document.title = `Libro de Reclamaciones · ${nombre}`;
  }, [estado, nombre]);

  if (estado === 'no-existe') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-base font-semibold text-slate-900">No encontramos esta tienda.</p>
        <p className="mt-1 text-sm text-slate-500">Revisa la dirección e inténtalo otra vez.</p>
      </main>
    );
  }
  if (!tienda || !proveedor) {
    return <CargandoTienda error={estado === 'error'} onReintentar={cargar} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50" style={{ fontFamily: diseno?.tipografia ? `${diseno.tipografia}, system-ui, sans-serif` : undefined }}>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
          <Link to={`/tienda/${slug}`} className="flex min-w-0 items-center gap-2.5">
            {logo
              ? <img src={logo} alt={nombre} className="h-9 w-auto max-w-[140px] object-contain" />
              : <span className="truncate text-[17px] font-bold text-slate-900">{nombre}</span>}
          </Link>
          <Link to={`/tienda/${slug}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
            <Icon icon="solar:arrow-left-linear" width={16} /> Volver a la tienda
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
        <HojaReclamacion slug={slug} proveedor={proveedor} color={color} onVolver={() => irEnTienda(`/tienda/${slug}`)} />
      </main>

      <PieDePlantilla templateId={resolveTemplateId(diseno?.plantillaId)} tienda={tienda} slug={slug} diseno={diseno} />
    </div>
  );
}
