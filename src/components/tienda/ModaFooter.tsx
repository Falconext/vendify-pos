import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';
import { EnlaceTienda, itemsDeMenu } from '@/components/tienda/navTienda';
import { menuModa } from '@/templates/moda/menu';

interface ModaFooterProps {
  diseno?: any;
  tiendaNombre: string;
  tienda?: any;
  slug?: string;
}

const limpio = (v: unknown) => String(v ?? '').trim();
const linkCls = 'underline decoration-white/35 underline-offset-4 transition-colors hover:text-white';

const payments = ['VISA', 'MC', 'DISC', 'PP', 'DIN', 'JCB', 'AMEX', 'Klarna', 'Pay', 'GPay'];

export default function ModaFooter({ tiendaNombre, diseno, tienda, slug: slugProp }: ModaFooterProps) {
  const year = new Date().getFullYear();
  const params = useParams();
  // Sin slug (vista previa del editor) los enlaces avisan al editor en vez de navegar.
  const slug = slugProp || params.slug || 'preview';
  const cfg = diseno || tienda?.diseno || {};
  const base = `/tienda/${slug}`;
  const menu = itemsDeMenu(menuModa(cfg), { diseno: cfg, slug, categorias: [] });
  const nuevos = menu.find((it) => it.key === 'modaMenu1Action');
  const ofertas = menu.find((it) => it.key === 'modaMenu7Action');
  const columns: { title: string; links: { label: string; href: string; externo?: boolean }[] }[] = [
    {
      title: 'Información',
      links: [
        { label: 'Sobre nosotros', href: `${base}/contacto` },
        { label: 'Catálogo', href: `${base}/catalogo` },
      ],
    },
    {
      title: 'Comprar',
      links: [nuevos, ofertas].filter((it): it is NonNullable<typeof it> => !!it?.href).map((it) => ({ label: it.label, href: it.href!, externo: it.externo })),
    },
    {
      title: 'Atención al cliente',
      links: [
        { label: 'Contáctanos', href: `${base}/contacto` },
        { label: 'Rastrea tu pedido', href: `${base}/seguimiento` },
      ],
    },
  ].filter((column) => column.links.length > 0);
  // Solo datos reales de la tienda: lo no configurado no se muestra.
  const email = limpio(tienda?.email || tienda?.correo);
  const telefono = limpio(tienda?.whatsappTienda || tienda?.telefono || tienda?.celular);
  const direccion = limpio(tienda?.direccionTienda || tienda?.direccion);
  const socials = [
    { icon: 'ri:facebook-fill', label: 'Facebook', url: limpio(tienda?.facebookUrl) },
    { icon: 'ri:instagram-line', label: 'Instagram', url: limpio(tienda?.instagramUrl) },
    { icon: 'ic:baseline-tiktok', label: 'TikTok', url: limpio(tienda?.tiktokUrl) },
  ].filter((social) => social.url);

  return (
    <footer className="w-full bg-black px-5 py-16 text-[14px] text-[#D7D7D7] md:px-10 lg:px-16 lg:py-20">
      <div className="mx-auto max-w-[1800px]">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr_1fr_1.1fr_1.45fr]">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
                {column.title}
              </h3>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <EnlaceTienda href={link.href} slug={slug} diseno={cfg} target={link.externo ? '_blank' : undefined} rel={link.externo ? 'noreferrer' : undefined} className={linkCls}>
                      {link.label}
                    </EnlaceTienda>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
              Síguenos
            </h3>
            <p className="max-w-[330px] leading-7">
              Únete a nuestra comunidad y síguenos en redes para conocer novedades, lanzamientos y tendencias.
            </p>
            {socials.length > 0 && (
              <div className="mt-7 flex w-fit border border-white/15">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-[54px] w-[54px] items-center justify-center border-r border-white/15 text-white transition-colors last:border-r-0 hover:bg-white hover:text-black"
                  >
                    <Icon icon={social.icon} width={22} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
              Sobre nuestra tienda
            </h3>
            <div className="space-y-6 leading-7">
              {email && (
                <p>
                  <strong className="font-black text-white">Email:</strong>{' '}
                  <a href={`mailto:${email}`} className="underline decoration-white/35 underline-offset-4 hover:text-white">
                    {email}
                  </a>
                </p>
              )}
              {direccion && (
                <div>
                  <p className="mb-4 text-[20px] font-black text-white">Dirección:</p>
                  <p>{direccion}</p>
                </div>
              )}
              {telefono && (
                <p>
                  <strong className="font-black text-white">Soporte:</strong>{' '}
                  <a href={`tel:${telefono.replace(/[^\d+]/g, '')}`} className="underline decoration-white/35 underline-offset-4 hover:text-white">
                    {telefono}
                  </a>
                </p>
              )}
              {!email && !direccion && !telefono && (
                <EnlaceTienda href={`${base}/contacto`} slug={slug} diseno={cfg} className={linkCls}>Escríbenos</EnlaceTienda>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-8 lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <p>© {tiendaNombre} Todos los derechos reservados {year}.</p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-2 text-white/60">Aceptamos</span>
            {payments.map((payment) => (
              <span
                key={payment}
                className="flex h-7 min-w-[44px] items-center justify-center rounded-[3px] bg-white px-2 text-[10px] font-black text-black"
              >
                {payment}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
