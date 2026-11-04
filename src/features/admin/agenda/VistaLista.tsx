import { memo, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import {
  DIAS_CORTOS,
  TIPO_META,
  diaSemanaDe,
  diasEntre,
  duracionMin,
  etiquetaDia,
  hora12,
  partesClave,
  sumarDias,
  textoDuracion,
  type AgendaOcurrencia,
  type Rango,
} from './AgendaModel';
import { Avatar, CheckHecho } from './ui';

interface Props {
  rango: Rango;
  cursor: string;
  hoy: string;
  porDia: Map<string, AgendaOcurrencia[]>;
  onAbrir: (e: AgendaOcurrencia) => void;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
  onNuevo: (fecha: string) => void;
}

export const FilaEvento = memo(function FilaEvento({
  e,
  onAbrir,
  onCompletar,
}: {
  e: AgendaOcurrencia;
  onAbrir: (e: AgendaOcurrencia) => void;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
}) {
  const meta = TIPO_META[e.tipo];
  const dur = textoDuracion(duracionMin(e));
  const persona = e.responsable ?? e.creador;
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onAbrir(e)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') onAbrir(e);
        }}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 transition-colors hover:border-violet-200 hover:bg-violet-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-violet-500/30"
      >
        <div className="w-[68px] shrink-0 sm:w-20">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">{e.todoElDia ? 'Todo el día' : hora12(e.inicio)}</p>
          {dur && <p className="text-[11px] text-gray-400">{dur}</p>}
        </div>
        <span className={`w-[3px] self-stretch rounded-full ${meta.punto}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold ${
              e.completado ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-white'
            }`}
          >
            {e.titulo}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`font-medium ${meta.texto}`}>{meta.etiqueta}</span>
            {e.lugar && (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <Icon icon="solar:map-point-linear" width={12} />
                <span className="max-w-[180px] truncate">{e.lugar}</span>
              </span>
            )}
            {e.repeticion !== 'NINGUNA' && <Icon icon="solar:restart-linear" width={12} aria-label="Se repite" />}
            {e.prioridad === 'ALTA' && !e.completado && (
              <span className="rounded-full bg-orange-100 px-1.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                Prioridad alta
              </span>
            )}
            {e.vencido && (
              <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                Vencido
              </span>
            )}
            {e.completado && <span className="font-medium text-emerald-600 dark:text-emerald-400">Hecho</span>}
          </p>
        </div>
        <span className="hidden sm:inline-flex">
          <Avatar id={persona.id} nombre={persona.nombre} />
        </span>
        <CheckHecho evento={e} onCompletar={onCompletar} />
      </div>
    </li>
  );
});

function VistaLista({ rango, cursor, hoy, porDia, onAbrir, onCompletar, onNuevo }: Props) {
  const dias = useMemo(() => {
    const n = diasEntre(rango.desde, rango.hasta);
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const k = sumarDias(rango.desde, i);
      if (porDia.has(k)) out.push(k);
    }
    return out;
  }, [rango, porDia]);

  // "Ver el día" desde el mes: llevar la lista a ese día (una vez por día elegido,
  // no en cada recarga, para no saltar mientras se marcan cosas como hechas).
  const scrolleado = useRef<string | null>(null);
  useEffect(() => {
    if (cursor === hoy || scrolleado.current === cursor) return;
    const el = document.getElementById(`agenda-dia-${cursor}`);
    if (!el) return;
    scrolleado.current = cursor;
    el.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [cursor, hoy, dias]);

  if (dias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Icon icon="solar:calendar-bold-duotone" width={28} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Nada agendado en estas dos semanas</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Anota una reunión, un pago o un recordatorio para no olvidarlo.</p>
        </div>
        <button
          type="button"
          onClick={() => onNuevo(cursor)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Icon icon="solar:add-circle-linear" width={18} />
          Nuevo evento
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {dias.map((dia) => {
        const lista = porDia.get(dia) ?? [];
        const esHoy = dia === hoy;
        return (
          <section key={dia} id={`agenda-dia-${dia}`} className="scroll-mt-4">
            <header className="mb-2 flex items-center gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${
                  esHoy ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <span className="text-base font-bold">{partesClave(dia).dia}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase">{DIAS_CORTOS[diaSemanaDe(dia)]}</span>
              </span>
              <p className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{etiquetaDia(dia, hoy)}</p>
              <span className="text-xs text-gray-400">
                {lista.length} {lista.length === 1 ? 'evento' : 'eventos'}
              </span>
            </header>
            <ul className="flex flex-col gap-1.5 sm:pl-14">
              {lista.map((e) => (
                <FilaEvento key={e.id} e={e} onAbrir={onAbrir} onCompletar={onCompletar} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default memo(VistaLista);
