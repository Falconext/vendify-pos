/**
 * Panel lateral con la hoja completa de un reclamo y su respuesta.
 * La respuesta se registra UNA sola vez (es definitiva y se envía al
 * consumidor), por eso se confirma antes de enviarla.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import ModalConfirm from '@/components/ModalConfirm';
import useEscapeKey from '@/hooks/useEscapeKey';
import BadgePlazo from './BadgePlazo';
import { descargarConstancia, mensajeDeError, obtenerReclamo, responderReclamo } from './api';
import { fechaLima, soles } from './formato';
import { LIMITES, errorRespuesta } from './validacion';
import { ETIQUETA_DOCUMENTO, type Reclamo } from './tipos';

interface Props {
  reclamoId: number | null;
  onCerrar: () => void;
  /** Se llama con el reclamo ya respondido para refrescar la lista. */
  onRespondido: (r: Reclamo) => void;
  onError: (mensaje: string) => void;
}

function Dato({ label, children, ancho = false }: { label: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-[13.5px] text-slate-800 dark:text-slate-200">{children || '—'}</dd>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">{titulo}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export default function DetalleReclamo({ reclamoId, onCerrar, onRespondido, onError }: Props) {
  const [reclamo, setReclamo] = useState<Reclamo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const abierto = reclamoId !== null;

  useEffect(() => {
    if (reclamoId === null) return;
    let vigente = true;
    setReclamo(null);
    setRespuesta('');
    setErrorTexto(null);
    setCargando(true);
    obtenerReclamo(reclamoId)
      .then((r) => { if (vigente) setReclamo(r); })
      .catch((e) => { if (vigente) { onError(mensajeDeError(e, 'No se pudo abrir el reclamo.')); onCerrar(); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [reclamoId, onCerrar, onError]);

  const cerrar = useCallback(() => { if (!confirmando) onCerrar(); }, [confirmando, onCerrar]);
  useEscapeKey(cerrar, abierto);

  const pedirConfirmacion = () => {
    const err = errorRespuesta(respuesta);
    setErrorTexto(err);
    if (!err) setConfirmando(true);
  };

  const enviar = async () => {
    if (!reclamo || enviando) return;
    setEnviando(true);
    try {
      const r = await responderReclamo(reclamo.id, respuesta);
      setReclamo(r);
      setConfirmando(false);
      onRespondido(r);
    } catch (e) {
      setConfirmando(false);
      // 409: alguien ya respondió (otra pestaña u otro usuario): se muestra la respuesta guardada.
      const conflicto = (e as { response?: { status?: number } })?.response?.status === 409;
      onError(conflicto ? 'Este reclamo ya tiene una respuesta registrada.' : mensajeDeError(e, 'No se pudo registrar la respuesta.'));
      if (conflicto) obtenerReclamo(reclamo.id).then(setReclamo).catch(() => {});
    } finally {
      setEnviando(false);
    }
  };

  const descargar = async () => {
    if (!reclamo) return;
    setDescargando(true);
    try { await descargarConstancia(reclamo); }
    catch (e) { onError(mensajeDeError(e, 'No se pudo descargar la constancia.')); }
    finally { setDescargando(false); }
  };

  if (!abierto || typeof document === 'undefined') return null;

  const r = reclamo;
  const contenido = (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={cerrar} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-labelledby="detalle-reclamo-titulo" className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-[#111827]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hoja de reclamación</p>
            <h2 id="detalle-reclamo-titulo" className="font-mono text-lg font-bold text-slate-900 dark:text-white">{r?.codigo || '…'}</h2>
            {r && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${r.tipo === 'QUEJA' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{r.tipo === 'QUEJA' ? 'Queja' : 'Reclamo'}</span>
                <BadgePlazo dias={r.diasHabilesRestantes} estado={r.estado} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {r && (
              <button type="button" onClick={descargar} disabled={descargando} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
                <Icon icon={descargando ? 'svg-spinners:ring-resize' : 'solar:file-download-linear'} width={16} /> Constancia PDF
              </button>
            )}
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Icon icon="solar:close-circle-linear" width={22} />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {cargando || !r ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : (
            <>
              <Bloque titulo="Plazo">
                <Dato label="Registrado">{fechaLima(r.fecha, true)}</Dato>
                <Dato label="Fecha límite de respuesta">{fechaLima(r.fechaLimite)}</Dato>
              </Bloque>
              <Bloque titulo="1. Consumidor">
                <Dato label="Nombres" ancho>{r.nombres}</Dato>
                <Dato label="Documento">{`${ETIQUETA_DOCUMENTO[r.tipoDocumento] ?? r.tipoDocumento} ${r.numeroDocumento}`}</Dato>
                <Dato label="Teléfono">{r.telefono}</Dato>
                <Dato label="Correo">{r.email}</Dato>
                <Dato label="Domicilio">{r.domicilio}</Dato>
                {r.menorDeEdad && (
                  <>
                    <Dato label="Apoderado">{r.apoderadoNombre}</Dato>
                    <Dato label="Documento del apoderado">{r.apoderadoDocumento}</Dato>
                  </>
                )}
              </Bloque>
              <Bloque titulo="2. Bien contratado">
                <Dato label="Tipo">{r.bienTipo === 'SERVICIO' ? 'Servicio' : 'Producto'}</Dato>
                <Dato label="Monto reclamado">{soles(r.montoReclamado)}</Dato>
                <Dato label="Descripción" ancho>{r.bienDescripcion}</Dato>
                {r.pedidoCodigo && <Dato label="Código de pedido">{r.pedidoCodigo}</Dato>}
              </Bloque>
              <Bloque titulo="3. Detalle y pedido">
                <Dato label={r.tipo === 'QUEJA' ? 'Detalle de la queja' : 'Detalle del reclamo'} ancho>{r.detalle}</Dato>
                <Dato label="Pedido del consumidor" ancho>{r.pedidoConsumidor}</Dato>
              </Bloque>

              {r.respuesta ? (
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                    <Icon icon="solar:check-circle-bold" width={16} /> Respuesta del proveedor
                  </h3>
                  <p data-testid="respuesta-registrada" className="whitespace-pre-line text-[13.5px] leading-6 text-slate-800 dark:text-slate-200">{r.respuesta}</p>
                  <p className="mt-3 text-[12px] text-slate-500">
                    {fechaLima(r.fechaRespuesta, true)}{r.respondidoPor?.nombre ? ` · ${r.respondidoPor.nombre}` : ''}
                  </p>
                </section>
              ) : (
                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <label htmlFor="respuesta-reclamo" className="mb-1 block text-[13px] font-bold text-slate-900 dark:text-white">Responder al consumidor</label>
                  <p className="mb-3 text-[12px] text-slate-500">La respuesta se envía por correo al consumidor y no se puede editar después.</p>
                  <textarea
                    id="respuesta-reclamo"
                    rows={6}
                    maxLength={LIMITES.respuesta.max}
                    value={respuesta}
                    onChange={(e) => { setRespuesta(e.target.value); if (errorTexto) setErrorTexto(errorRespuesta(e.target.value)); }}
                    aria-invalid={errorTexto ? true : undefined}
                    aria-describedby={errorTexto ? 'respuesta-reclamo-error' : undefined}
                    className={`block w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/10 dark:bg-slate-900 dark:text-white ${errorTexto ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'}`}
                    placeholder="Explica la solución o la posición de la empresa frente al reclamo."
                  />
                  <div className="mt-1 flex items-center justify-between text-[12px]">
                    {errorTexto ? <span id="respuesta-reclamo-error" className="font-medium text-rose-600">{errorTexto}</span> : <span />}
                    <span className="text-slate-400">{respuesta.trim().length}/{LIMITES.respuesta.max}</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={pedirConfirmacion} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                      <Icon icon="solar:plain-2-bold" width={16} /> Enviar respuesta
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
      <ModalConfirm
        isOpenModal={confirmando}
        setIsOpenModal={setConfirmando}
        confirmSubmit={enviar}
        confirmLoading={enviando}
        confirmText="Sí, enviar respuesta"
        title="¿Enviar la respuesta?"
        information="La respuesta es definitiva: se guarda en el libro, se envía al consumidor y no se podrá modificar."
      />
    </div>
  );
  return createPortal(contenido, document.body);
}
