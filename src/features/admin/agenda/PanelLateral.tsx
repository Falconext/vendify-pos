import { memo, useMemo } from 'react';
import { Icon } from '@iconify/react';
import {
  TIPO_META,
  capitalizar,
  claveDia,
  hora12,
  MESES,
  partesClave,
  semanasDelMes,
  sumarMeses,
  textoFaltan,
  type AgendaOcurrencia,
  type AgendaResumen,
} from './AgendaModel';
import { CheckHecho, cardCls } from './ui';

interface Props {
  cursor: string;
  hoy: string;
  diasConEventos: ReadonlySet<string>;
  resumen: AgendaResumen | null;
  onIrADia: (dia: string) => void;
  onAbrir: (e: AgendaOcurrencia) => void;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
}

const INICIALES_DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MiniCalendario = memo(function MiniCalendario({
  cursor,
  hoy,
  diasConEventos,
  onIrADia,
}: Pick<Props, 'cursor' | 'hoy' | 'diasConEventos' | 'onIrADia'>) {
  const semanas = useMemo(() => semanasDelMes(cursor), [cursor]);
  const { anio, mes } = partesClave(cursor);
  return (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {capitalizar(MESES[mes])} {anio}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => onIrADia(sumarMeses(cursor, -1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <Icon icon="solar:alt-arrow-left-linear" width={16} />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => onIrADia(sumarMeses(cursor, 1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <Icon icon="solar:alt-arrow-right-linear" width={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {INICIALES_DIAS.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-gray-400">
            {d}
          </span>
        ))}
        {semanas.flat().map((dia) => {
          const p = partesClave(dia);
          const fuera = p.mes !== mes;
          const esHoy = dia === hoy;
          const elegido = dia === cursor && !esHoy;
          return (
            <button
              key={dia}
              type="button"
              onClick={() => onIrADia(dia)}
              aria-label={`Ir al ${p.dia} de ${MESES[p.mes]}`}
              className={`relative mx-auto grid h-8 w-8 place-items-center rounded-lg text-xs font-medium transition-colors ${
                esHoy
                  ? 'bg-violet-600 text-white'
                  : elegido
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'
                    : fuera
                      ? 'text-gray-300 hover:bg-gray-100 dark:text-slate-600 dark:hover:bg-slate-800'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800'
              }`}
            >
              {p.dia}
              {diasConEventos.has(dia) && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${esHoy ? 'bg-white' : 'bg-violet-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function ItemResumen({
  e,
  hoy,
  conDia,
  onAbrir,
  onCompletar,
}: {
  e: AgendaOcurrencia;
  hoy: string;
  conDia: boolean;
  onAbrir: (e: AgendaOcurrencia) => void;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
}) {
  const meta = TIPO_META[e.tipo];
  const dia = claveDia(e.inicio);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onAbrir(e)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') onAbrir(e);
        }}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-slate-800/60"
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.chip}`}>
          <Icon icon={meta.icono} width={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-semibold ${
              e.completado ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
            }`}
          >
            {e.titulo}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {e.todoElDia ? 'Todo el día' : hora12(e.inicio)}
            {e.vencido && <span className="ml-1.5 font-semibold text-red-500">Vencido</span>}
          </p>
        </div>
        {conDia ? (
          <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300">
            {textoFaltan(dia, hoy)}
          </span>
        ) : (
          <CheckHecho evento={e} onCompletar={onCompletar} />
        )}
      </div>
    </li>
  );
}

function PanelLateral({ cursor, hoy, diasConEventos, resumen, onIrADia, onAbrir, onCompletar }: Props) {
  return (
    <aside className="flex flex-col gap-4">
      <MiniCalendario cursor={cursor} hoy={hoy} diasConEventos={diasConEventos} onIrADia={onIrADia} />

      {resumen && resumen.vencidos > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <Icon icon="solar:danger-triangle-bold-duotone" width={20} className="shrink-0" />
          <span>
            Tienes <b>{resumen.vencidos}</b> {resumen.vencidos === 1 ? 'pendiente vencido' : 'pendientes vencidos'}.
          </span>
        </div>
      )}

      <div className={`${cardCls} p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Hoy</p>
          <span className="text-xs text-gray-400">{resumen ? resumen.hoy.length : '—'}</span>
        </div>
        {resumen && resumen.hoy.length === 0 && <p className="px-2 py-3 text-xs text-gray-400">Nada para hoy. Buen momento para planificar.</p>}
        <ul className="-mx-2 flex flex-col">
          {resumen?.hoy.map((e) => (
            <ItemResumen key={e.id} e={e} hoy={hoy} conDia={false} onAbrir={onAbrir} onCompletar={onCompletar} />
          ))}
        </ul>
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Próximos</p>
          <span className="text-xs text-gray-400">7 días</span>
        </div>
        {resumen && resumen.proximos.length === 0 && <p className="px-2 py-3 text-xs text-gray-400">Sin eventos en los próximos días.</p>}
        <ul className="-mx-2 flex flex-col">
          {resumen?.proximos.map((e) => (
            <ItemResumen key={e.id} e={e} hoy={hoy} conDia onAbrir={onAbrir} onCompletar={onCompletar} />
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default memo(PanelLateral);
