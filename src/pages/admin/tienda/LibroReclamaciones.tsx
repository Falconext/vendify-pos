/**
 * Panel del dueño: Libro de Reclamaciones de su tienda virtual.
 * Resumen por plazo, filtros, detalle con respuesta única, constancia PDF y
 * exportación a Excel por rango de fechas.
 */
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import BadgePlazo from '@/features/libroReclamaciones/BadgePlazo';
import DetalleReclamo from '@/features/libroReclamaciones/DetalleReclamo';
import IconoLibroReclamaciones from '@/features/libroReclamaciones/IconoLibroReclamaciones';
import { exportarExcel, listarReclamos, mensajeDeError } from '@/features/libroReclamaciones/api';
import { fechaLima, hoyLima } from '@/features/libroReclamaciones/formato';
import type { EstadoReclamo, ListadoReclamos, Reclamo, ResumenLibro } from '@/features/libroReclamaciones/tipos';

const POR_PAGINA = 20;

type Filtro = 'TODOS' | EstadoReclamo;

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'VENCIDO', label: 'Vencidos' },
  { id: 'RESPONDIDO', label: 'Respondidos' },
];

const RESUMEN: { clave: keyof ResumenLibro; label: string; icon: string; color: string; filtro: Filtro }[] = [
  { clave: 'pendientes', label: 'Pendientes', icon: 'solar:clock-circle-bold-duotone', color: 'text-sky-600 bg-sky-50', filtro: 'PENDIENTE' },
  { clave: 'porVencer', label: 'Por vencer (≤3 días)', icon: 'solar:alarm-bold-duotone', color: 'text-amber-600 bg-amber-50', filtro: 'PENDIENTE' },
  { clave: 'vencidos', label: 'Vencidos', icon: 'solar:danger-triangle-bold-duotone', color: 'text-rose-600 bg-rose-50', filtro: 'VENCIDO' },
  { clave: 'respondidos', label: 'Respondidos', icon: 'solar:check-circle-bold-duotone', color: 'text-emerald-600 bg-emerald-50', filtro: 'RESPONDIDO' },
];

const VACIO: ListadoReclamos = { data: [], total: 0, resumen: { pendientes: 0, vencidos: 0, porVencer: 0, respondidos: 0 } };

/** Primer día del mes en Lima (`AAAA-MM-01`). */
const inicioDeMes = () => `${hoyLima().slice(0, 8)}01`;

export default function LibroReclamacionesPanel() {
  const { alert } = useAlertStore();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const search = useDebounce(busqueda, 350);
  const [page, setPage] = useState(1);
  const [listado, setListado] = useState<ListadoReclamos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const [desde, setDesde] = useState(inicioDeMes);
  const [hasta, setHasta] = useState(() => hoyLima());
  const [exportando, setExportando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => { setPage(1); }, [filtro, search]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCarga(false);
    listarReclamos({ estado: filtro === 'TODOS' ? undefined : filtro, search, page, limit: POR_PAGINA })
      .then((r) => { if (vigente) setListado(r); })
      .catch(() => { if (vigente) setErrorCarga(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtro, search, page, recarga]);

  const paginas = Math.max(1, Math.ceil(listado.total / POR_PAGINA));

  const cerrarDetalle = useCallback(() => setAbiertoId(null), []);
  const avisarError = useCallback((m: string) => alert(m, 'error'), [alert]);
  const alResponder = useCallback((r: Reclamo) => {
    alert(`Respuesta registrada para ${r.codigo}.`, 'success');
    setRecarga((n) => n + 1);
  }, [alert]);

  const exportar = async () => {
    if (!desde || !hasta || desde > hasta) {
      alert('Elige un rango válido: "desde" no puede ser posterior a "hasta".', 'warning');
      return;
    }
    setExportando(true);
    try { await exportarExcel(desde, hasta); }
    catch (e) { alert(mensajeDeError(e, 'No se pudo exportar el libro.'), 'error'); }
    finally { setExportando(false); }
  };

  const filas = listado.data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <IconoLibroReclamaciones size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Libro de Reclamaciones</h1>
            <p className="text-sm text-slate-500">Reclamos y quejas de tu tienda virtual. Debes responder en un máximo de 15 días hábiles.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-semibold uppercase text-slate-400">
            Desde
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} aria-label="Exportar desde" className="mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal normal-case text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-slate-400">
            Hasta
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} aria-label="Exportar hasta" className="mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal normal-case text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
          </label>
          <button type="button" onClick={exportar} disabled={exportando} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            <Icon icon={exportando ? 'svg-spinners:ring-resize' : 'vscode-icons:file-type-excel'} width={18} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {RESUMEN.map((c) => (
          <button
            key={c.clave}
            type="button"
            onClick={() => setFiltro(c.filtro)}
            className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900 md:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">{c.label}</p>
                <p data-testid={`resumen-${c.clave}`} className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{listado.resumen[c.clave]}</p>
              </div>
              <span className={`hidden h-11 w-11 items-center justify-center rounded-2xl sm:flex ${c.color}`}><Icon icon={c.icon} className="h-5 w-5" /></span>
            </div>
          </button>
        ))}
      </div>

      <div className="relative z-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${filtro === f.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Icon icon="solar:magnifer-linear" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, nombre o documento"
              aria-label="Buscar reclamos"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Código</th>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-3 font-semibold">Consumidor</th>
                <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plazo</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cargando && filas.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></td></tr>
                ))
              ) : errorCarga ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No se pudo cargar el libro.{' '}
                  <button type="button" onClick={() => setRecarga((n) => n + 1)} className="font-semibold text-slate-900 underline dark:text-white">Reintentar</button>
                </td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center">
                  <IconoLibroReclamaciones size={36} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Sin reclamos</p>
                  <p className="text-xs text-slate-400">{search || filtro !== 'TODOS' ? 'Nada coincide con el filtro.' : 'Cuando un cliente registre una hoja, aparecerá aquí.'}</p>
                </td></tr>
              ) : (
                filas.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setAbiertoId(r.id)}>
                    <td className="px-4 py-3 font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{r.codigo}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fechaLima(r.fecha)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{r.nombres}</p>
                      <p className="text-[11px] text-slate-400">{r.tipoDocumento} {r.numeroDocumento}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${r.tipo === 'QUEJA' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{r.tipo === 'QUEJA' ? 'Queja' : 'Reclamo'}</span>
                    </td>
                    <td className="px-4 py-3"><BadgePlazo dias={r.diasHabilesRestantes} estado={r.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setAbiertoId(r.id); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                        {r.estado === 'RESPONDIDO' ? 'Ver' : 'Responder'} <Icon icon="solar:alt-arrow-right-linear" width={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {listado.total > POR_PAGINA && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
            <span>{listado.total} reclamos · página {page} de {paginas}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40 dark:border-slate-700">Anterior</button>
              <button type="button" disabled={page >= paginas} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40 dark:border-slate-700">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      <DetalleReclamo reclamoId={abiertoId} onCerrar={cerrarDetalle} onRespondido={alResponder} onError={avisarError} />
    </div>
  );
}
