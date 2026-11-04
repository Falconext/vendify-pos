import { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { ConstruccionFooter } from './ConstruccionHomePage';
import ConstruccionHeader from './ConstruccionHeader';
import { EnlaceTienda, useIrEnTienda } from '@/components/tienda/navTienda';
import ConstruccionCartModal from './ConstruccionCartModal';

const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const } },
};

function pickContact(tienda: any, diseno: any) {
  return {
    address: diseno?.construccionContactAddress || tienda?.direccionTienda || tienda?.direccionFiscal || tienda?.direccion || 'Dirección no configurada',
    phone: diseno?.construccionContactPhone || tienda?.whatsappTienda || tienda?.telefono || tienda?.celular || 'Teléfono no configurado',
    email: diseno?.construccionContactEmail || tienda?.email || tienda?.correo || 'Correo no configurado',
    hours: diseno?.construccionContactHours || tienda?.horarioAtencion || 'Horario no configurado',
  };
}

export default function ConstruccionContactPage({
  tienda,
  slug,
  diseno,
  cp,
  carrito = [],
  setCarrito,
  mostrarCarrito = false,
  setMostrarCarrito,
  actualizarCantidad,
  onNavigate,
  allCategories = [],
}: {
  tienda: any;
  slug: string;
  diseno: any;
  cp: string;
  allCategories?: any[];
  carrito?: any[];
  setCarrito?: (items: any[]) => void;
  mostrarCarrito?: boolean;
  setMostrarCarrito?: (value: boolean) => void;
  actualizarCantidad?: (id: any, cantidad: number) => void;
  onNavigate?: (page: 'home' | 'catalogo' | 'producto' | 'checkout' | 'contacto') => void;
}) {
  const [sent, setSent] = useState(false);
  const contact = pickContact(tienda, diseno);
  const mapQuery = encodeURIComponent(contact.address || tienda?.nombreComercial || tienda?.razonSocial || 'Peru');

  const ir = useIrEnTienda(slug, diseno);
  const goCheckout = () => {
    if (onNavigate) onNavigate('checkout');
    else ir(`/tienda/${slug}/checkout`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#151515]" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <ConstruccionHeader
        tienda={tienda}
        slug={slug}
        diseno={diseno}
        accent={cp}
        cartCount={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito?.(true)}
        categories={allCategories}
        searchLabel="Todas las categorías"
        ultimoEnlace="contacto"
      />

      <section className="bg-[#f4f4f4]">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:px-6">
          <p className="text-[13px] font-bold tracking-wide text-[#151515]">
            <EnlaceTienda href={`/tienda/${slug}`} slug={slug} diseno={diseno} onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('home'); } }}>Inicio</EnlaceTienda>
            <span className="mx-2">/</span>
            <span>Contáctanos</span>
          </p>
          <h1 className="mt-4 text-[32px] font-medium text-[#111]">Contáctanos</h1>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.55fr_0.88fr]">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="min-h-[320px] overflow-hidden bg-gray-100 md:min-h-[520px]">
            <iframe
              title="Mapa de contacto"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-full min-h-[320px] w-full border-0 md:min-h-[520px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

          <motion.form
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="bg-[#f4f4f4] p-8 md:p-10"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <h2 className="text-[28px] font-black leading-tight text-[#151515]">{editable(diseno?.construccionContactTitle, 'Ponte en contacto con nosotros')}</h2>
            <p className="mt-4 max-w-sm text-[13px] font-semibold leading-6 text-gray-500">
              {editable(diseno?.construccionContactText, 'Completa el formulario y te responderemos lo antes posible.')}
            </p>

            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu nombre
              <input required className="mt-2 h-11 w-full rounded border border-gray-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu correo
              <input required type="email" className="mt-2 h-11 w-full rounded border border-gray-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu mensaje (opcional)
              <textarea rows={11} className="mt-2 w-full resize-none rounded border border-gray-200 bg-white p-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            {sent && <p className="mt-4 rounded bg-white px-4 py-3 text-[13px] font-bold text-emerald-700">Mensaje registrado correctamente.</p>}
            <button type="submit" className="mt-7 rounded-md px-7 py-3 text-[13px] font-black uppercase text-[#111]" style={{ background: cp }}>
              {editable(diseno?.construccionContactSubmitLabel, 'Enviar')}
            </button>
          </motion.form>
        </section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-12 grid bg-[#f4f4f4] md:grid-cols-4">
          {[
            ['solar:map-point-bold', contact.address],
            ['solar:phone-bold', contact.phone],
            ['solar:letter-bold', contact.email],
            ['solar:clock-circle-bold', contact.hours],
          ].map(([icon, text], index) => (
            <div key={`${icon}-${index}`} className="flex items-center gap-5 border-b border-white px-7 py-7 md:border-b-0 md:border-r last:md:border-r-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[#151515]">
                <Icon icon={icon} width={22} />
              </span>
              <p className="text-[13px] font-bold leading-6 text-gray-500">{text}</p>
            </div>
          ))}
        </motion.section>
      </main>

      <ConstruccionFooter tienda={tienda} slug={slug} cp={cp} categories={allCategories || []} diseno={diseno} />

      {setCarrito && actualizarCantidad && (
        <ConstruccionCartModal
          isOpen={mostrarCarrito}
          onClose={() => setMostrarCarrito?.(false)}
          carrito={carrito}
          setCarrito={setCarrito}
          actualizarCantidad={actualizarCantidad}
          onCheckout={goCheckout}
          cp={cp}
          tienda={tienda}
        />
      )}
    </div>
  );
}
