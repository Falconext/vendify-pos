import EnlaceLibroReclamaciones from '@/components/tienda/EnlaceLibroReclamaciones';
import React from 'react';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import { EnlaceTienda, itemsDeMenu } from '@/components/tienda/navTienda';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';
import { menuAutopartes } from '@/templates/autopartes/menu';

interface Props {
  tienda: any;
  slug: string;
  diseno: any;
  categories?: any[];
}

const linkCls = 'text-xs text-gray-400 hover:text-white transition-colors';
const limpio = (v: unknown) => String(v ?? '').trim();

export default function AutopartesFooter({ tienda, slug, diseno, categories }: Props) {
  const currentYear = new Date().getFullYear();
  const cfg = diseno || tienda?.diseno || {};
  const base = `/tienda/${slug}`;
  // Solo datos reales de la tienda: lo que no está configurado no se muestra.
  const telefono = limpio(tienda?.telefono || tienda?.celular || tienda?.whatsappTienda);
  const email = limpio(tienda?.email || tienda?.correo);
  const whatsapp = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? cfg?.whatsappTienda, 'Hola, tengo una consulta.');
  const redes = [
    { icon: 'mdi:facebook', label: 'Facebook', url: limpio(tienda?.facebookUrl) },
    { icon: 'mdi:instagram', label: 'Instagram', url: limpio(tienda?.instagramUrl) },
    { icon: 'ic:baseline-tiktok', label: 'TikTok', url: limpio(tienda?.tiktokUrl) },
    { icon: 'mdi:whatsapp', label: 'WhatsApp', url: whatsapp || '' },
  ].filter((red) => red.url);
  // Mismos accesos que la barra del header (texto y destino configurables).
  const menu = itemsDeMenu(menuAutopartes(cfg, categories), { diseno: cfg, slug, categorias: categories });

  return (
    <footer className="w-full">
      {/* Top Features Strip */}
      <div className="w-full bg-white border-t border-gray-100 relative z-20">
        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center px-4 pt-4 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="mdi:truck-fast" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Envío a Todo el Mundo</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Con nuestros socios estratégicos, aseguramos la entrega más rápida a más de 120 destinos mundiales.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:card-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Compra Segura</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Compra con confianza gracias a nuestros protocolos de seguridad y encriptación de última generación.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:refresh-circle-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Devoluciones Gratis</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Nuestra política de devolución flexible garantiza la satisfacción del cliente.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:headphones-round-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Centro de Ayuda 24/7</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Nuestro equipo profesional de representantes de ventas está siempre feliz de ayudar.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Main Dark Footer Area */}
      <div className="w-full bg-[#111111] text-white pt-20 pb-10 relative overflow-hidden">
        {/* Background dark geometric pattern */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
          <div className="absolute left-[-20%] top-0 w-[50%] h-[150%] bg-[#1A1A1A] transform rotate-45 mix-blend-screen"></div>
          <div className="absolute right-[-10%] bottom-[-50%] w-[40%] h-[150%] bg-[#1A1A1A] transform -rotate-12 mix-blend-screen"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            
            {/* Help Information */}
            <div className="lg:col-span-2 pr-4">
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Información de Ayuda
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-8">
                {tienda?.descripcionTienda || 'Muestra de manera destacada la lista de los más vendidos en la página de inicio de tu sitio web de múltiples vendedores. Esto será lo primero que vean los visitantes.'}
              </p>
              
              {(telefono || email) && (
                <div className="flex flex-col gap-4 mb-8">
                  {telefono && (
                    <a href={`tel:${telefono.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                      <Icon icon="solar:phone-calling-linear" className="text-xl" />
                      <span className="text-sm">{telefono}</span>
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                      <Icon icon="solar:letter-linear" className="text-xl" />
                      <span className="text-sm">{email}</span>
                    </a>
                  )}
                </div>
              )}

              {redes.length > 0 && (
                <div className="flex items-center gap-3">
                  {redes.map((red, i) => (
                    <a
                      key={red.icon}
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={red.label}
                      className={i === 0
                        ? 'w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors'
                        : 'w-8 h-8 rounded-full bg-[#1A1A1A] border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-800 transition-colors'}
                    >
                      <Icon icon={red.icon} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Services */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Servicio al Cliente
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><EnlaceTienda href={`${base}/seguimiento`} slug={slug} diseno={cfg} className={linkCls}>Rastrear Tu Pedido</EnlaceTienda></li>
                <li><EnlaceTienda href={`${base}/checkout`} slug={slug} diseno={cfg} className={linkCls}>Mi Carrito</EnlaceTienda></li>
                <li>
                  {whatsapp
                    ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkCls}>Contáctanos</a>
                    : <EnlaceTienda href={`${base}/contacto`} slug={slug} diseno={cfg} className={linkCls}>Contáctanos</EnlaceTienda>}
                </li>
              </ul>
            </div>

            {/* Store Navigation */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Navegación
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><EnlaceTienda href={`${base}/catalogo`} slug={slug} diseno={cfg} className={linkCls}>Catálogo</EnlaceTienda></li>
                {menu.map((item) => (
                  <li key={item.key}>
                    <EnlaceTienda href={item.href!} slug={slug} diseno={cfg} target={item.externo ? '_blank' : undefined} rel={item.externo ? 'noreferrer' : undefined} className={linkCls}>{item.label}</EnlaceTienda>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-500">
              ©copyright {currentYear} . Diseñado Por <span className="text-white font-bold">{BRAND.name}</span>
            </p>
            <EnlaceLibroReclamaciones slug={slug} diseno={cfg} className="text-[11px] text-gray-400 hover:text-white" />
          </div>
        </div>
      </div>
    </footer>
  );
}
