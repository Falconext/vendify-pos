import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { resolveTemplateId } from '@/components/tienda/resolveTemplate';
import CargandoTienda from '@/components/tienda/CargandoTienda';
import StoreWhatsAppButton from '@/components/tienda/StoreWhatsAppButton';
import ApiculturaContactPage from '@/templates/apicultura/ApiculturaContactPage';
import ConstruccionContactPage from '@/templates/construccion/ConstruccionContactPage';
import FalconContactPage from '@/templates/falcon/FalconContactPage';

import { recordarVentaSinStock } from '@/templates/shared/ventaSinStock';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export default function ContactoRouter() {
  const { slug } = useParams();
  const [tienda, setTienda] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorTienda, setErrorTienda] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      setErrorTienda(false);
      try {
        const storeRes = await axios.get(`${BASE_URL}/public/store/${slug}`);
        setTienda(recordarVentaSinStock(storeRes.data?.data || storeRes.data));
        const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
        setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
      } catch (e) {
        // Sin tienda no hay plantilla: reintentar en vez de pintar el contacto por defecto.
        if (!(axios.isAxiosError(e) && e.response?.status === 404)) setErrorTienda(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, [slug, intento]);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito));
  }, [carrito, slug]);

  const updateQuantity = (itemId: number | string, cantidad: number) => {
    setCarrito((current) => cantidad <= 0
      ? current.filter((item) => String(item.cartId || item.id) !== String(itemId))
      : current.map((item) => String(item.cartId || item.id) === String(itemId) ? { ...item, cantidad } : item));
  };

  if (loading || (errorTienda && !tienda)) {
    return <CargandoTienda error={!loading} onReintentar={() => setIntento((n) => n + 1)} />;
  }

  const diseno = tienda?.diseno || {};
  const cp = diseno?.colorPrimario || '#FFD72E';
  const templateId = resolveTemplateId(diseno?.plantillaId);

  return (
    <>
      {templateId === 'falcon' ? (
        <FalconContactPage
          tienda={tienda}
          slug={slug || ''}
          diseno={diseno}
          cp={cp}
          allCategories={categories}
          carrito={carrito}
          setCarrito={setCarrito}
          mostrarCarrito={mostrarCarrito}
          setMostrarCarrito={setMostrarCarrito}
          actualizarCantidad={updateQuantity}
        />
      ) : templateId === 'construccion' ? (
        <ConstruccionContactPage
          tienda={tienda}
          slug={slug || ''}
          diseno={diseno}
          cp={cp}
          allCategories={categories}
          carrito={carrito}
          setCarrito={setCarrito}
          mostrarCarrito={mostrarCarrito}
          setMostrarCarrito={setMostrarCarrito}
          actualizarCantidad={updateQuantity}
        />
      ) : (
        <ApiculturaContactPage
          tienda={tienda}
          slug={slug || ''}
          diseno={diseno}
          cp={cp}
          allCategories={categories}
          carrito={carrito}
          setCarrito={setCarrito}
          mostrarCarrito={mostrarCarrito}
          setMostrarCarrito={setMostrarCarrito}
          actualizarCantidad={updateQuantity}
        />
      )}
      <StoreWhatsAppButton tienda={tienda} />
    </>
  );
}
