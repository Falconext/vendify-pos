import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import {
  LIMITES,
  PRIORIDADES,
  RECORDATORIOS,
  REPETICIONES,
  TIPOS,
  TIPO_META,
  validarForm,
  type AgendaOcurrencia,
  type AgendaRecordatorio,
  type AgendaUsuarioMin,
  type ErroresForm,
  type FormEvento,
} from './AgendaModel';

interface Props {
  evento: AgendaOcurrencia | null;
  formInicial: FormEvento;
  usuarios: AgendaUsuarioMin[];
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (f: FormEvento) => void;
  onEliminar: () => void;
  onCompletar: (e: AgendaOcurrencia, valor: boolean) => void;
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800/60';

function Campo({ label, error, children, htmlFor }: { label: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ModalEvento({ evento, formInicial, usuarios, guardando, onCerrar, onGuardar, onEliminar, onCompletar }: Props) {
  const [f, setF] = useState<FormEvento>(formInicial);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const editable = !evento || evento.puedeEditar;
  const esSerie = !!evento && evento.repeticion !== 'NINGUNA';
  const set = <K extends keyof FormEvento>(k: K, v: FormEvento[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    if (errores[k]) setErrores((prev) => ({ ...prev, [k]: undefined }));
  };

  const enviar = () => {
    const e = validarForm(f);
    setErrores(e);
    if (Object.values(e).some(Boolean)) return;
    onGuardar(f);
  };

  // El responsable guardado puede ya no estar activo: que siga visible.
  const opcionesResponsable =
    evento?.responsable && !usuarios.some((u) => u.id === evento.responsable?.id) ? [...usuarios, evento.responsable] : usuarios;

  const titulo = !evento ? 'Nuevo evento' : editable ? 'Editar evento' : 'Detalle del evento';

  return (
    <Modal isOpenModal closeModal={onCerrar} title={titulo} icon="solar:calendar-add-bold-duotone" iconClass="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" width="600px">
      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          if (editable) enviar();
        }}
        className="flex flex-col gap-4 p-5"
      >
        {evento && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Creado por <b className="text-gray-700 dark:text-gray-200">{evento.creador.nombre}</b>
            </span>
            {evento.vencido && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">Vencido</span>}
            {evento.completado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Hecho</span>}
          </div>
        )}

        {esSerie && editable && (
          <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
            <Icon icon="solar:restart-linear" width={16} className="mt-px shrink-0" />
            <span>
              <b>Se aplica a todas las repeticiones.</b> Si cambias la fecha u hora, la serie empieza desde la nueva fecha. Marcar hecho afecta solo a esta fecha.
            </span>
          </div>
        )}

        <Campo label="Título" error={errores.titulo} htmlFor="agenda-titulo">
          <input
            id="agenda-titulo"
            autoFocus={editable}
            disabled={!editable}
            maxLength={LIMITES.titulo}
            value={f.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Ej. Reunión con el proveedor"
            className={`${inputCls} ${errores.titulo ? 'border-red-400' : ''}`}
          />
        </Campo>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Tipo</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tipo">
            {TIPOS.map((t) => {
              const meta = TIPO_META[t];
              const activo = f.tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  disabled={!editable}
                  onClick={() => set('tipo', t)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                    activo
                      ? `${meta.chip} border-transparent ring-2 ring-violet-500/40`
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon icon={meta.icono} width={16} />
                  {meta.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
          <Campo label="Fecha" error={errores.fecha} htmlFor="agenda-fecha">
            <input id="agenda-fecha" type="date" disabled={!editable} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} className={inputCls} />
          </Campo>
          {!f.todoElDia && (
            <>
              <Campo label="Empieza" error={errores.horaInicio} htmlFor="agenda-hora-inicio">
                <input id="agenda-hora-inicio" type="time" step={300} disabled={!editable} value={f.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} className={inputCls} />
              </Campo>
              <Campo label="Termina (opcional)" error={errores.horaFin} htmlFor="agenda-hora-fin">
                <input id="agenda-hora-fin" type="time" step={300} disabled={!editable} value={f.horaFin} onChange={(e) => set('horaFin', e.target.value)} className={inputCls} />
              </Campo>
            </>
          )}
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            disabled={!editable}
            checked={f.todoElDia}
            onChange={(e) => set('todoElDia', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          Todo el día
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Prioridad" htmlFor="agenda-prioridad">
            <select id="agenda-prioridad" disabled={!editable} value={f.prioridad} onChange={(e) => set('prioridad', e.target.value as FormEvento['prioridad'])} className={inputCls}>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Responsable" error={errores.responsableId} htmlFor="agenda-responsable">
            <select id="agenda-responsable" disabled={!editable} value={f.responsableId} onChange={(e) => set('responsableId', e.target.value)} className={inputCls}>
              <option value="">Sin responsable</option>
              {opcionesResponsable.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Repetir" htmlFor="agenda-repetir">
            <select id="agenda-repetir" disabled={!editable} value={f.repeticion} onChange={(e) => set('repeticion', e.target.value as FormEvento['repeticion'])} className={inputCls}>
              {REPETICIONES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          {f.repeticion !== 'NINGUNA' && (
            <Campo label="Hasta (opcional)" error={errores.repetirHasta} htmlFor="agenda-hasta">
              <input id="agenda-hasta" type="date" disabled={!editable} min={f.fecha} value={f.repetirHasta} onChange={(e) => set('repetirHasta', e.target.value)} className={inputCls} />
            </Campo>
          )}
          <Campo label="Avisarme" htmlFor="agenda-aviso">
            <SelectAviso valor={f.recordatorioMin} disabled={!editable} onChange={(v) => set('recordatorioMin', v)} />
          </Campo>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Quién lo ve</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Quién lo ve">
              {(
                [
                  ['PERSONAL', 'Solo yo', 'solar:lock-keyhole-minimalistic-linear'],
                  ['EQUIPO', 'Mi equipo', 'solar:users-group-rounded-linear'],
                ] as const
              ).map(([valor, etiqueta, icono]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={f.visibilidad === valor}
                  disabled={!editable}
                  onClick={() => set('visibilidad', valor)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                    f.visibilidad === valor ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon icon={icono} width={14} />
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Campo label="Lugar o enlace (opcional)" error={errores.lugar} htmlFor="agenda-lugar">
          <input
            id="agenda-lugar"
            disabled={!editable}
            maxLength={LIMITES.lugar}
            value={f.lugar}
            onChange={(e) => set('lugar', e.target.value)}
            placeholder="Ej. Oficina o https://meet.google.com/…"
            className={inputCls}
          />
        </Campo>

        <Campo label="Notas (opcional)" error={errores.descripcion} htmlFor="agenda-notas">
          <textarea
            id="agenda-notas"
            disabled={!editable}
            rows={3}
            maxLength={LIMITES.descripcion}
            value={f.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            className={`${inputCls} resize-y`}
          />
        </Campo>

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {evento && evento.puedeEditar && !confirmarBorrado && (
              <button
                type="button"
                disabled={guardando}
                onClick={() => setConfirmarBorrado(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
              >
                <Icon icon="solar:trash-bin-trash-linear" width={18} />
                Eliminar
              </button>
            )}
            {confirmarBorrado && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <span>{esSerie ? '¿Eliminar todas las repeticiones?' : '¿Eliminar este evento?'}</span>
                <button type="button" disabled={guardando} onClick={onEliminar} className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  Sí, eliminar
                </button>
                <button type="button" onClick={() => setConfirmarBorrado(false)} className="font-semibold hover:underline">
                  No
                </button>
              </div>
            )}
            {evento && evento.puedeCompletar && (
              <button
                type="button"
                onClick={() => onCompletar(evento, !evento.completado)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  evento.completado
                    ? 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
                }`}
              >
                <Icon icon={evento.completado ? 'solar:undo-left-round-linear' : 'solar:check-circle-linear'} width={18} />
                {evento.completado ? 'Marcar pendiente' : 'Marcar hecho'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800 sm:flex-none"
            >
              {editable ? 'Cancelar' : 'Cerrar'}
            </button>
            {editable && (
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-60 sm:flex-none"
              >
                {guardando && <Icon icon="svg-spinners:180-ring" width={16} />}
                {evento ? 'Guardar cambios' : 'Agendar'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function SelectAviso({ valor, disabled, onChange }: { valor: AgendaRecordatorio; disabled: boolean; onChange: (v: AgendaRecordatorio) => void }) {
  return (
    <select
      id="agenda-aviso"
      disabled={disabled}
      value={valor === null ? '' : String(valor)}
      onChange={(e) => onChange(e.target.value === '' ? null : (Number(e.target.value) as AgendaRecordatorio))}
      className={inputCls}
    >
      {RECORDATORIOS.map((r) => (
        <option key={String(r.valor)} value={r.valor === null ? '' : String(r.valor)}>
          {r.etiqueta}
        </option>
      ))}
    </select>
  );
}
