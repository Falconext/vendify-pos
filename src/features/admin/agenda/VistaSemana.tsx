import { memo, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import {
  DIAS_CORTOS,
  HORA_FIN,
  HORA_INICIO,
  HORA_PX,
  TIPO_META,
  bloquesDelDia,
  hora12,
  lunesDe,
  partesClave,
  posicionAhora,
  sePuedeArrastrar,
  sumarDias,
  type AgendaOcurrencia,
} from './AgendaModel';

interface Props {
  cursor: string;
  hoy: string;
  porDia: Map<string, AgendaOcurrencia[]>;
  onNuevo: (fecha: string, hora?: string) => void;
  onAbrir: (e: AgendaOcurrencia) => void;
  onMover: (e: AgendaOcurrencia, dia: string, offsetPx: number) => void;
}

const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
const ALTO = (HORA_FIN - HORA_INICIO) * HORA_PX;
const etiquetaHora = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;

/** Lo que se está arrastrando (dataTransfer no se puede leer en dragover). */
interface Arrastre {
  evento: AgendaOcurrencia;
  /** Dónde se agarró el bloque, desde su borde superior. */
  agarreY: number;
}

/** La línea de "ahora": se actualiza sola cada minuto sin re-pintar la grilla. */
function LineaAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const top = posicionAhora(ahora);
  if (top === null) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top }} aria-hidden="true">
      <div className="relative h-0.5 bg-red-500">
        <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

function VistaSemana({ cursor, hoy, porDia, onNuevo, onAbrir, onMover }: Props) {
  const dias = useMemo(() => {
    const lunes = lunesDe(cursor);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }, [cursor]);
  const bloques = useMemo(() => dias.map((d) => bloquesDelDia(porDia.get(d) ?? [])), [dias, porDia]);
  const todoElDia = useMemo(() => dias.map((d) => (porDia.get(d) ?? []).filter((e) => e.todoElDia)), [dias, porDia]);
  const hayTodoElDia = todoElDia.some((l) => l.length > 0);

  const arrastre = useRef<Arrastre | null>(null);
  const [destino, setDestino] = useState<string | null>(null);

  const clicEnColumna = (dia: string) => (ev: MouseEvent<HTMLDivElement>) => {
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
    const media = Math.floor((y / HORA_PX) * 2);
    const min = HORA_INICIO * 60 + Math.max(0, media) * 30;
    const h = Math.min(Math.floor(min / 60), HORA_FIN - 1);
    onNuevo(dia, `${String(h).padStart(2, '0')}:${min % 60 === 0 ? '00' : '30'}`);
  };

  const soltar = (dia: string) => (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setDestino(null);
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top - a.agarreY;
    onMover(a.evento, dia, y);
  };

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="min-w-[720px]">
        {/* Cabecera de días */}
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1.5 pb-2">
          <div />
          {dias.map((d, i) => {
            const esHoy = d === hoy;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{DIAS_CORTOS[i]}</span>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                    esHoy ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30' : 'text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {partesClave(d).dia}
                </span>
              </div>
            );
          })}
        </div>

        {/* Todo el día */}
        {hayTodoElDia && (
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1.5 pb-2">
            <div className="pt-1 text-right text-[10px] font-medium leading-3 text-gray-400">Todo el día</div>
            {todoElDia.map((lista, i) => (
              <div key={dias[i]} className="flex min-w-0 flex-col gap-0.5">
                {lista.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onAbrir(e)}
                    title={e.titulo}
                    className={`truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${TIPO_META[e.tipo].chip} ${
                      e.completado ? 'line-through opacity-60' : ''
                    }`}
                  >
                    {e.titulo}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Franjas horarias */}
        <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1.5">
          <div className="relative" style={{ height: ALTO }}>
            {HORAS.map((h, i) => (
              <span
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] font-medium text-gray-400"
                style={{ top: i * HORA_PX + (i === 0 ? 6 : 0) }}
              >
                {etiquetaHora(h)}
              </span>
            ))}
          </div>

          {dias.map((dia, i) => {
            const esHoy = dia === hoy;
            return (
              <div
                key={dia}
                data-dia={dia}
                onClick={clicEnColumna(dia)}
                onDragOver={(ev) => {
                  if (!arrastre.current) return;
                  ev.preventDefault();
                  ev.dataTransfer.dropEffect = 'move';
                  if (destino !== dia) setDestino(dia);
                }}
                onDragLeave={() => setDestino((d) => (d === dia ? null : d))}
                onDrop={soltar(dia)}
                className={`relative cursor-pointer rounded-xl border transition-colors ${
                  destino === dia
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
                    : esHoy
                      ? 'border-violet-200 bg-violet-50/40 dark:border-violet-500/30 dark:bg-violet-500/5'
                      : 'border-gray-100 bg-gray-50/60 dark:border-slate-800 dark:bg-slate-900/40'
                }`}
                style={{
                  height: ALTO,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HORA_PX - 1}px, rgb(148 163 184 / 0.18) ${HORA_PX - 1}px, rgb(148 163 184 / 0.18) ${HORA_PX}px)`,
                }}
              >
                {esHoy && <LineaAhora />}
                {bloques[i].map(({ evento: e, top, alto, columna, columnas }) => {
                  const meta = TIPO_META[e.tipo];
                  const arrastrable = sePuedeArrastrar(e);
                  const ancho = 100 / columnas;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      draggable={arrastrable}
                      onDragStart={(ev) => {
                        arrastre.current = { evento: e, agarreY: ev.clientY - ev.currentTarget.getBoundingClientRect().top };
                        ev.dataTransfer.effectAllowed = 'move';
                        ev.dataTransfer.setData('text/plain', e.id);
                      }}
                      onDragEnd={() => {
                        arrastre.current = null;
                        setDestino(null);
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onAbrir(e);
                      }}
                      title={arrastrable ? `${e.titulo} — arrástralo para moverlo` : e.titulo}
                      className={`absolute z-10 flex flex-col overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-4 shadow-sm transition hover:z-30 hover:shadow-md ${meta.chip} ${meta.borde} ${
                        e.completado ? 'opacity-60' : ''
                      } ${arrastrable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{
                        top: top + 1,
                        height: Math.max(alto - 2, 20),
                        left: `calc(${columna * ancho}% + 2px)`,
                        width: `calc(${ancho}% - 4px)`,
                      }}
                    >
                      {alto < 50 ? (
                        <span className="flex min-w-0 items-center gap-1">
                          {e.vencido && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-label="Vencido" />}
                          <span className="shrink-0 font-semibold opacity-70">{hora12(e.inicio)}</span>
                          <span className={`truncate font-medium ${e.completado ? 'line-through' : ''}`}>{e.titulo}</span>
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 font-semibold opacity-70">
                            {e.vencido && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Vencido" />}
                            {hora12(e.inicio)}
                            {e.repeticion !== 'NINGUNA' && <Icon icon="solar:restart-linear" width={10} />}
                          </span>
                          <span className={`line-clamp-2 font-medium ${e.completado ? 'line-through' : ''}`}>{e.titulo}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(VistaSemana);
