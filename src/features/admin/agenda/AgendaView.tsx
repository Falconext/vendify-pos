import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { TIPOS, TIPO_META, claveDia, leerObjetivo, tituloRango, type Vista } from './AgendaModel';
import { useAgendaViewModel } from './useAgendaViewModel';
import VistaMes from './VistaMes';
import VistaSemana from './VistaSemana';
import VistaLista from './VistaLista';
import PanelLateral from './PanelLateral';
import ModalEvento from './ModalEvento';
import AvisoPlanAgenda from './AvisoPlanAgenda';
import { cardCls } from './ui';

const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'agenda', etiqueta: 'Agenda' },
];

const DESCRIPCION: Record<Vista, string> = {
  mes: 'Reuniones, tareas, pagos y recordatorios del negocio en un solo lugar.',
  semana: 'Arrastra un evento a otro día u hora para moverlo.',
  agenda: 'Lo que viene en las próximas dos semanas, día por día.',
};

const btnIcono =
  'grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300 dark:hover:bg-slate-800';

export default function AgendaView() {
  // `?fecha=YYYY-MM-DD&evento=<id>`: llega desde un recordatorio de la campana.
  const [params, setParams] = useSearchParams();
  const objetivo = leerObjetivo(params);
  const vm = useAgendaViewModel(objetivo.fecha);
  const { actions: a } = vm;

  // Ir al día pedido (también si la campana se usa estando ya en la Agenda)…
  const pendiente = useRef<{ fecha: string | null; eventoId: number | null } | null>(null);
  const clave = params.toString();
  useEffect(() => {
    if (!objetivo.fecha && !objetivo.eventoId) return;
    pendiente.current = objetivo;
    if (objetivo.fecha) a.irADia(objetivo.fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // …y, cuando llegan los eventos de ese rango, abrir el evento y limpiar la URL
  // (para que recargar no lo vuelva a abrir).
  useEffect(() => {
    const p = pendiente.current;
    if (!p || vm.cargando) return;
    if (p.fecha && (p.fecha < vm.rango.desde || p.fecha >= vm.rango.hasta)) return;
    pendiente.current = null;
    const e = p.eventoId ? vm.eventos.find((x) => x.eventoId === p.eventoId && (!p.fecha || claveDia(x.inicio) === p.fecha)) : undefined;
    if (e) a.abrirEvento(e);
    setParams({}, { replace: true });
  }, [vm.cargando, vm.eventos, vm.rango, a, setParams]);

  if (vm.sinPlan) return <AvisoPlanAgenda />;

  return (
    <div className="min-h-screen px-2 pb-6 dark:bg-[#0A0D14]">
      {/* Encabezado */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
            <Icon icon="solar:calendar-bold-duotone" width={13} />
            Mi negocio
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Agenda</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{DESCRIPCION[vm.vista]}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Vista">
            {VISTAS.map((v) => (
              <button
                key={v.valor}
                type="button"
                role="tab"
                aria-selected={vm.vista === v.valor}
                onClick={() => a.cambiarVista(v.valor)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  vm.vista === v.valor
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Anterior" onClick={a.anterior} className={btnIcono}>
              <Icon icon="solar:alt-arrow-left-linear" width={18} />
            </button>
            <button
              type="button"
              onClick={a.irHoy}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-slate-800"
            >
              Hoy
            </button>
            <button type="button" aria-label="Siguiente" onClick={a.siguiente} className={btnIcono}>
              <Icon icon="solar:alt-arrow-right-linear" width={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => a.abrirNuevo()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition-colors hover:bg-violet-700"
          >
            <Icon icon="solar:add-circle-linear" width={18} />
            Nuevo evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Calendario" className={`${cardCls} min-w-0 p-3 sm:p-4`}>
          {/* Título + filtros por tipo */}
          <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tituloRango(vm.vista, vm.cursor)}</h2>
              {vm.cargando && <Icon icon="svg-spinners:180-ring" width={16} className="text-violet-500" aria-label="Cargando" />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {TIPOS.map((t) => {
                const meta = TIPO_META[t];
                const activo = vm.tiposVisibles.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => a.alternarTipo(t)}
                    title={activo ? `Ocultar ${meta.plural.toLowerCase()}` : `Mostrar ${meta.plural.toLowerCase()}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
                      activo
                        ? 'border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200'
                        : 'border-dashed border-gray-200 text-gray-400 line-through opacity-70 dark:border-slate-700'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${activo ? meta.punto : 'bg-gray-300 dark:bg-slate-600'}`} />
                    {meta.plural}
                    <span className="text-gray-400">{vm.conteo[t]}</span>
                  </button>
                );
              })}
              <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={vm.soloMios}
                  onChange={(e) => a.setSoloMios(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Solo míos
              </label>
            </div>
          </div>

          {vm.error && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <span>{vm.error}</span>
              <button type="button" onClick={a.refrescar} className="font-semibold hover:underline">
                Reintentar
              </button>
            </div>
          )}

          {vm.vista === 'mes' && (
            <VistaMes cursor={vm.cursor} hoy={vm.hoy} porDia={vm.porDia} onNuevo={a.abrirNuevo} onAbrir={a.abrirEvento} onIrADia={a.irADia} />
          )}
          {vm.vista === 'semana' && (
            <VistaSemana cursor={vm.cursor} hoy={vm.hoy} porDia={vm.porDia} onNuevo={a.abrirNuevo} onAbrir={a.abrirEvento} onMover={a.mover} />
          )}
          {vm.vista === 'agenda' && (
            <VistaLista
              rango={vm.rango}
              cursor={vm.cursor}
              hoy={vm.hoy}
              porDia={vm.porDia}
              onAbrir={a.abrirEvento}
              onCompletar={a.completar}
              onNuevo={a.abrirNuevo}
            />
          )}
        </section>

        <PanelLateral
          cursor={vm.cursor}
          hoy={vm.hoy}
          diasConEventos={vm.diasConEventos}
          resumen={vm.resumen}
          onIrADia={a.irADia}
          onAbrir={a.abrirEvento}
          onCompletar={a.completar}
        />
      </div>

      {vm.modal && (
        <ModalEvento
          key={vm.modal.evento?.id ?? 'nuevo'}
          evento={vm.modal.evento}
          formInicial={vm.modal.form}
          usuarios={vm.usuarios}
          guardando={vm.guardando}
          onCerrar={a.cerrarModal}
          onGuardar={a.guardar}
          onEliminar={a.eliminar}
          onCompletar={a.completar}
        />
      )}
    </div>
  );
}
