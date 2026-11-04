/**
 * El pie (footer) de cada plantilla, suelto, para páginas genéricas de la
 * tienda (Libro de Reclamaciones) que no tienen versión por plantilla.
 *
 * Cada pie se descarga solo si la tienda usa esa plantilla. Las claves son las
 * mismas del `templateRegistry`: una prueba verifica que no falte ninguna y
 * que todas muestren el enlace al Libro de Reclamaciones.
 */
import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/tienda/Footer';

export interface PropsPie {
  tienda: any;
  slug: string;
  diseno: any;
  cp: string;
  /** Nombres de categorías. */
  categories: string[];
  navigate: (to: string) => void;
}

type Modulo = { default: ComponentType<PropsPie> };
export type CargadorPie = () => Promise<Modulo>;

const pie = (C: ComponentType<PropsPie>): Modulo => ({ default: C });

export const PIES_DE_PLANTILLA: Record<string, CargadorPie> = {
  moda: () => import('@/components/tienda/ModaFooter').then((m) => pie((p) => <m.default diseno={p.diseno} tiendaNombre={p.tienda?.nombre || p.tienda?.nombreComercial || ''} />)),
  autopartes: () => import('@/components/tienda/AutopartesFooter').then((m) => pie((p) => <m.default tienda={p.tienda} slug={p.slug} diseno={p.diseno} />)),
  tecnologia: () => import('@/components/tienda/TecnologiaFooter').then((m) => pie((p) => <m.default tienda={p.tienda} slug={p.slug} diseno={p.diseno} categories={p.categories} />)),
  maye: () => import('@/components/tienda/MayeFooter').then((m) => pie((p) => <m.default tienda={p.tienda} slug={p.slug} diseno={p.diseno} />)),
  gadgets: () => Promise.resolve(pie((p) => <Footer tienda={p.tienda} diseno={p.diseno} slug={p.slug} />)),
  urbano: () => import('@/templates/urbano/UrbanoFooter').then((m) => pie((p) => <m.default tienda={p.tienda} slug={p.slug} diseno={p.diseno} categories={p.categories} />)),
  apicultura: () => import('@/templates/apicultura/ApiculturaParts').then((m) => pie(m.ApiculturaFooter)),
  construccion: () => import('@/templates/construccion/ConstruccionHomePage').then((m) => pie(m.ConstruccionFooter)),
  falcon: () => import('@/templates/falcon/FalconShared').then((m) => pie((p) => <m.FalconFooter {...p} green={m.resolveFalconGreen(p.diseno, p.cp)} />)),
};

const perezosos = new Map<string, ComponentType<PropsPie>>();
function piePerezoso(id: string): ComponentType<PropsPie> | null {
  const cargar = PIES_DE_PLANTILLA[id];
  if (!cargar) return null;
  if (!perezosos.has(id)) perezosos.set(id, lazy(cargar));
  return perezosos.get(id)!;
}

interface Props {
  templateId: string;
  tienda: any;
  slug: string;
  diseno: any;
  categories?: string[];
}

/** Pie de la plantilla activa; sin plantilla conocida, el pie genérico. */
export default function PieDePlantilla({ templateId, tienda, slug, diseno, categories = [] }: Props) {
  const navigate = useNavigate();
  const Pie = useMemo(() => piePerezoso(templateId), [templateId]);
  const cp = diseno?.colorPrimario || '#111827';
  if (!Pie) return <Footer tienda={tienda || {}} diseno={diseno} slug={slug} />;
  return (
    <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
      <Pie tienda={tienda} slug={slug} diseno={diseno} cp={cp} categories={categories} navigate={navigate} />
    </Suspense>
  );
}
