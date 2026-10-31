import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import FalconBlog from './FalconBlog';
import { resolveTemplateId } from '@/components/tienda/resolveTemplate';
import CargandoTienda from '@/components/tienda/CargandoTienda';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

// Templates that ship a dedicated blog page. Others redirect to the store home.
const BLOG_PAGE_BY_TEMPLATE: Record<string, ComponentType> = {
  falcon: FalconBlog,
};

export default function BlogRouter() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  useStorePreviewNavigation(previewPlantillaId);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorTienda, setErrorTienda] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (previewPlantillaId) {
      setPlantillaId(previewPlantillaId);
      setLoading(false);
      return;
    }
    if (!slug) return;
    axios.get(`${BASE_URL}/public/store/${slug}`)
      .then((res) => {
        const tienda = res.data.data || res.data;
        setPlantillaId(tienda?.diseno?.plantillaId || '');
      })
      .catch((e) => {
        setPlantillaId('');
        setErrorTienda(!(axios.isAxiosError(e) && e.response?.status === 404));
      })
      .finally(() => setLoading(false));
  }, [slug, previewPlantillaId, intento]);

  if (loading || errorTienda) {
    return (
      <CargandoTienda
        error={!loading && errorTienda}
        onReintentar={() => { setErrorTienda(false); setLoading(true); setIntento((n) => n + 1); }}
      />
    );
  }

  const BlogPage = BLOG_PAGE_BY_TEMPLATE[resolveTemplateId(plantillaId)];
  if (BlogPage) return <BlogPage />;
  return <Navigate to={`/tienda/${slug}${previewPlantillaId ? `?previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template` : ''}`} replace />;
}
