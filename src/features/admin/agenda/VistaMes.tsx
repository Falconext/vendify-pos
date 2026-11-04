import { memo, useMemo } from 'react';
import {
  DIAS_CORTOS,
  TIPO_META,
  hora12,
  partesClave,
  semanasDelMes,
  type AgendaOcurrencia,
  type Vista,
} from './AgendaModel';

/** Chips visibles por día antes del "+N más". */
const MAX_CHIPS = 2;

interface Props {
  cursor: string;
  hoy: string;
  porDia: Map<string, AgendaOcurrencia[]>;
  onNuevo: (fecha: string) => void;
  onAbrir: (e: AgendaOcurrencia) => void;
  onIrADia: (dia: string, vista?: Vista) => void;
}

const Chip = memo(function Chip({ e, onAbrir }: { e: AgendaOcurrencia; onAbrir: (e: AgendaOcurrencia) => void }) {
  const meta = TIPO_META[e.tipo];
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onAbrir(e);
      }}
      title={e.titulo}
      className={`flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-4 transition hover:brightness-95 ${meta.chip} ${
        e.completado ? 'opacity-60' : ''
      }`}
    >
      {e.vencido && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-label="Vencido" />}
      {!e.todoElDia && <span className="shrink-0 opacity-70">{hora12(e.inicio)}</span>}
      <span className={`truncate ${e.completado ? 'line-through' : ''}`}>{e.titulo}</span>
    </button>
  );
});

function VistaMes({ cursor, hoy, porDia, onNuevo, onAbrir, onIrADia }: Props) {
  const semanas = useMemo(() => semanasDelMes(cursor), [cursor]);
  const mesActual = partesClave(cursor).mes;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1 sm:gap-1.5">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {semanas.flat().map((dia) => {
          const lista = porDia.get(dia) ?? [];
          const { mes, dia: n } = partesClave(dia);
          const fuera = mes !== mesActual;
          const esHoy = dia === hoy;
          const mostrar = lista.length <= MAX_CHIPS + 1 ? lista : lista.slice(0, MAX_CHIPS);
          const restantes = lista.length - mostrar.length;
          return (
            <div
              key={dia}
              role="button"
              tabIndex={0}
              aria-label={`Nuevo evento el ${n}`}
              onClick={() => onNuevo(dia)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onNuevo(dia);
                }
              }}
              className={`group flex min-h-[64px] cursor-pointer flex-col gap-1 rounded-xl border p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:min-h-[104px] sm:p-1.5 ${
                fuera
                  ? 'border-dashed border-gray-200 bg-transparent dark:border-slate-800'
                  : 'border-gray-100 bg-gray-50/60 hover:bg-violet-50/50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-violet-500/5'
              } ${esHoy ? 'ring-2 ring-violet-500/70' : ''}`}
            >
              <button
                type="button"
                title="Ver el día"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onIrADia(dia, 'agenda');
                }}
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold transition-colors ${
                  esHoy
                    ? 'bg-violet-600 text-white'
                    : fuera
                      ? 'text-gray-300 hover:bg-gray-100 dark:text-slate-600 dark:hover:bg-slate-800'
                      : 'text-gray-700 hover:bg-gray-200/70 dark:text-gray-200 dark:hover:bg-slate-800'
                }`}
              >
                {n}
              </button>

              {/* Escritorio: chips con hora y título */}
              <div className={`hidden min-w-0 flex-col gap-0.5 sm:flex ${fuera ? 'opacity-60' : ''}`}>
                {mostrar.map((e) => (
                  <Chip key={e.id} e={e} onAbrir={onAbrir} />
                ))}
                {restantes > 0 && (
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onIrADia(dia, 'agenda');
                    }}
                    className="px-1.5 text-left text-[11px] font-semibold text-gray-500 hover:text-violet-600 dark:text-gray-400"
                  >
                    +{restantes} más
                  </button>
                )}
              </div>

              {/* Celular: solo puntos por tipo */}
              {lista.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {lista.slice(0, 4).map((e) => (
                    <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${TIPO_META[e.tipo].punto}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(VistaMes);
