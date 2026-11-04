/**
 * Hoja de reclamación virtual (formato del Anexo I del D.S. 011-2011-PCM):
 * proveedor, 1) consumidor, 2) bien contratado, 3) detalle y pedido.
 * Al enviarla muestra el código, la fecha límite y la constancia en PDF.
 */
import { memo, useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { readableText } from '@/templates/shared/color';
import IconoLibroReclamaciones from './IconoLibroReclamaciones';
import { mensajeDeError, registrarReclamo, urlConstanciaPublica } from './api';
import { fechaLima } from './formato';
import { FORMULARIO_VACIO, LIMITES, armarPayload, validarHoja, type ErroresHoja } from './validacion';
import {
  ETIQUETA_DOCUMENTO, EXPLICACION_TIPO, PLAZO_DIAS_HABILES, TIPOS_DOCUMENTO,
  type CampoHoja, type FormularioHoja, type ProveedorLibro, type ReclamoRegistrado,
} from './tipos';

interface Props {
  slug: string;
  proveedor: ProveedorLibro;
  /** Color de la tienda para el botón y los acentos. */
  color: string;
  /** Vuelve a la portada de la tienda. */
  onVolver?: () => void;
}

const ORDEN_CAMPOS: CampoHoja[] = [
  'nombres', 'tipoDocumento', 'numeroDocumento', 'domicilio', 'telefono', 'email',
  'apoderadoNombre', 'apoderadoDocumento', 'bienTipo', 'bienDescripcion', 'montoReclamado',
  'pedidoCodigo', 'tipo', 'detalle', 'pedidoConsumidor', 'aceptaDeclaracion',
];

const inputCls = 'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50';
const borde = (error?: string) => (error ? 'border-rose-400' : 'border-slate-200');

// ─── Piezas ──────────────────────────────────────────────────────────────────

interface PropsCampo {
  id: string;
  label: string;
  error?: string;
  requerido?: boolean;
  ayuda?: ReactNode;
  className?: string;
  children: ReactNode;
}

const Campo = memo(function Campo({ id, label, error, requerido = false, ayuda, className = '', children }: PropsCampo) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}{requerido && <span className="text-rose-500" aria-hidden="true"> *</span>}
      </label>
      {children}
      {ayuda && !error && <p id={`${id}-ayuda`} className="mt-1 text-[12px] text-slate-500">{ayuda}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-[12px] font-medium text-rose-600">{error}</p>}
    </div>
  );
});

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-200 px-5 py-6 sm:px-8">
      <legend className="sr-only">{numero}. {titulo}</legend>
      <h2 aria-hidden="true" className="mb-4 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-900">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[12px] text-white">{numero}</span>
        {titulo}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Opcion({ name, value, checked, onChange, titulo, texto, color }: {
  name: string; value: string; checked: boolean; onChange: (v: string) => void; titulo: string; texto?: string; color: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${checked ? 'bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
      style={checked ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : undefined}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: color }} />
      <span>
        <span className="block text-[14px] font-semibold text-slate-900">{titulo}</span>
        {texto && <span className="mt-0.5 block text-[12.5px] leading-5 text-slate-500">{texto}</span>}
      </span>
    </label>
  );
}

export function CabeceraHoja({ proveedor, color, codigo, fecha }: { proveedor: ProveedorLibro; color: string; codigo?: string; fecha?: string }) {
  return (
    <header className="px-5 pb-6 pt-6 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: color, color: readableText(color) }}>
            <IconoLibroReclamaciones size={28} />
          </span>
          <div>
            <h1 className="text-[17px] font-extrabold uppercase tracking-[0.06em] text-slate-900 sm:text-[19px]">Libro de Reclamaciones</h1>
            <p className="text-[13px] font-medium text-slate-500">Hoja de reclamación</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-[12.5px] sm:min-w-[220px]">
          <dt className="text-slate-500">Fecha</dt>
          <dd className="text-right font-semibold text-slate-900">{fecha ? fechaLima(fecha) : fechaLima(new Date().toISOString())}</dd>
          <dt className="text-slate-500">N.º</dt>
          <dd className="text-right font-semibold text-slate-900">{codigo || 'Se asigna al enviar'}</dd>
        </dl>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 px-4 py-3 text-[13px] leading-6 text-slate-600">
        <p className="font-semibold text-slate-900">{proveedor.razonSocial}</p>
        {proveedor.nombreComercial && proveedor.nombreComercial !== proveedor.razonSocial && <p>Nombre comercial: {proveedor.nombreComercial}</p>}
        <p>RUC: {proveedor.ruc}</p>
        {proveedor.direccion && <p>Domicilio: {proveedor.direccion}</p>}
      </div>
    </header>
  );
}

// ─── Éxito ───────────────────────────────────────────────────────────────────

function Registrado({ slug, registro, color, onVolver }: { slug: string; registro: ReclamoRegistrado; color: string; onVolver?: () => void }) {
  return (
    <div className="px-5 py-10 text-center sm:px-8" role="status" aria-live="polite">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <Icon icon="solar:check-circle-bold" width={34} />
      </span>
      <h2 className="mt-4 text-xl font-bold text-slate-900">Tu hoja de reclamación fue registrada</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-slate-500">
        Te enviamos una copia a tu correo. Guarda tu código para cualquier consulta.
      </p>
      <dl className="mx-auto mt-6 grid max-w-sm gap-3 rounded-2xl border border-slate-200 p-5 text-left text-[14px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Código</dt>
          <dd data-testid="codigo-reclamo" className="font-mono text-[16px] font-bold text-slate-900">{registro.codigo}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Fecha de registro</dt>
          <dd className="font-semibold text-slate-900">{fechaLima(registro.fecha, true)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Respuesta hasta</dt>
          <dd data-testid="fecha-limite" className="font-semibold text-slate-900">{fechaLima(registro.fechaLimite)}</dd>
        </div>
      </dl>
      <p className="mx-auto mt-3 max-w-sm text-[12.5px] text-slate-500">
        El proveedor debe responderte en un plazo máximo de {PLAZO_DIAS_HABILES} días hábiles.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={urlConstanciaPublica(slug, registro.codigo, registro.token)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition hover:brightness-110"
          style={{ background: color, color: readableText(color) }}
        >
          <Icon icon="solar:download-minimalistic-bold" width={18} /> Descargar constancia
        </a>
        {onVolver && (
          <button type="button" onClick={onVolver} className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">
            Volver a la tienda
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Hoja ────────────────────────────────────────────────────────────────────

export default function HojaReclamacion({ slug, proveedor, color, onVolver }: Props) {
  const uid = useId();
  const id = (campo: string) => `${uid}-${campo}`;
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormularioHoja>(FORMULARIO_VACIO);
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const [registro, setRegistro] = useState<ReclamoRegistrado | null>(null);

  // Los errores se muestran recién tras el primer intento y se recalculan al escribir.
  const errores: ErroresHoja = useMemo(() => (intentado ? validarHoja(form) : {}), [form, intentado]);

  const set = useCallback(<K extends CampoHoja>(campo: K, valor: FormularioHoja[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
  }, []);

  const aria = (campo: CampoHoja) => ({
    id: id(campo),
    name: campo,
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${id(campo)}-error` : undefined,
  });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setIntentado(true);
    setErrorServidor('');
    const encontrados = validarHoja(form);
    const primero = ORDEN_CAMPOS.find((c) => encontrados[c]);
    if (primero) {
      formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const r = await registrarReclamo(slug, armarPayload(form));
      setRegistro(r);
      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorServidor(mensajeDeError(err, 'No pudimos registrar tu hoja. Revisa tu conexión e inténtalo otra vez.'));
    } finally {
      setEnviando(false);
    }
  };

  if (registro) {
    return (
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CabeceraHoja proveedor={proveedor} color={color} codigo={registro.codigo} fecha={registro.fecha} />
        <div className="border-t border-slate-200"><Registrado slug={slug} registro={registro} color={color} onVolver={onVolver} /></div>
      </article>
    );
  }

  const contador = (texto: string, max: number) => `${texto.trim().length}/${max}`;

  return (
    <form ref={formRef} onSubmit={enviar} noValidate className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Hoja de reclamación">
      <CabeceraHoja proveedor={proveedor} color={color} />

      <Seccion numero={1} titulo="Identificación del consumidor reclamante">
        <Campo id={id('nombres')} label="Nombres y apellidos" requerido error={errores.nombres} className="sm:col-span-2">
          <input {...aria('nombres')} autoComplete="name" maxLength={150} value={form.nombres} onChange={(e) => set('nombres', e.target.value)} className={`${inputCls} ${borde(errores.nombres)}`} />
        </Campo>
        <Campo id={id('tipoDocumento')} label="Tipo de documento" requerido error={errores.tipoDocumento}>
          <select {...aria('tipoDocumento')} value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value as FormularioHoja['tipoDocumento'])} className={`${inputCls} ${borde(errores.tipoDocumento)}`}>
            {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{ETIQUETA_DOCUMENTO[t]}</option>)}
          </select>
        </Campo>
        <Campo id={id('numeroDocumento')} label="Número de documento" requerido error={errores.numeroDocumento}>
          <input
            {...aria('numeroDocumento')}
            inputMode={form.tipoDocumento === 'DNI' || form.tipoDocumento === 'RUC' ? 'numeric' : 'text'}
            maxLength={form.tipoDocumento === 'DNI' ? 8 : form.tipoDocumento === 'RUC' ? 11 : 20}
            value={form.numeroDocumento}
            onChange={(e) => set('numeroDocumento', e.target.value)}
            className={`${inputCls} ${borde(errores.numeroDocumento)}`}
          />
        </Campo>
        <Campo id={id('domicilio')} label="Domicilio" requerido error={errores.domicilio} className="sm:col-span-2">
          <input {...aria('domicilio')} autoComplete="street-address" maxLength={250} value={form.domicilio} onChange={(e) => set('domicilio', e.target.value)} className={`${inputCls} ${borde(errores.domicilio)}`} />
        </Campo>
        <Campo id={id('telefono')} label="Teléfono" requerido error={errores.telefono}>
          <input {...aria('telefono')} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} value={form.telefono} onChange={(e) => set('telefono', e.target.value)} className={`${inputCls} ${borde(errores.telefono)}`} />
        </Campo>
        <Campo id={id('email')} label="Correo electrónico" requerido error={errores.email} ayuda="Aquí recibirás la constancia y la respuesta.">
          <input {...aria('email')} type="email" autoComplete="email" inputMode="email" maxLength={150} value={form.email} onChange={(e) => set('email', e.target.value)} className={`${inputCls} ${borde(errores.email)}`} />
        </Campo>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate-700 sm:col-span-2">
          <input type="checkbox" name="menorDeEdad" checked={form.menorDeEdad} onChange={(e) => set('menorDeEdad', e.target.checked)} className="h-4 w-4" style={{ accentColor: color }} />
          Soy menor de edad
        </label>
        {form.menorDeEdad && (
          <>
            <Campo id={id('apoderadoNombre')} label="Padre, madre o apoderado" requerido error={errores.apoderadoNombre}>
              <input {...aria('apoderadoNombre')} maxLength={150} value={form.apoderadoNombre} onChange={(e) => set('apoderadoNombre', e.target.value)} className={`${inputCls} ${borde(errores.apoderadoNombre)}`} />
            </Campo>
            <Campo id={id('apoderadoDocumento')} label="Documento del apoderado" requerido error={errores.apoderadoDocumento}>
              <input {...aria('apoderadoDocumento')} maxLength={20} value={form.apoderadoDocumento} onChange={(e) => set('apoderadoDocumento', e.target.value)} className={`${inputCls} ${borde(errores.apoderadoDocumento)}`} />
            </Campo>
          </>
        )}
      </Seccion>

      <Seccion numero={2} titulo="Identificación del bien contratado">
        <div className="grid grid-cols-2 gap-3 sm:col-span-2" role="radiogroup" aria-label="Tipo de bien">
          <Opcion name="bienTipo" value="PRODUCTO" checked={form.bienTipo === 'PRODUCTO'} onChange={(v) => set('bienTipo', v as 'PRODUCTO')} titulo="Producto" color={color} />
          <Opcion name="bienTipo" value="SERVICIO" checked={form.bienTipo === 'SERVICIO'} onChange={(v) => set('bienTipo', v as 'SERVICIO')} titulo="Servicio" color={color} />
        </div>
        <Campo id={id('bienDescripcion')} label="Descripción" requerido error={errores.bienDescripcion} className="sm:col-span-2">
          <input {...aria('bienDescripcion')} maxLength={500} value={form.bienDescripcion} onChange={(e) => set('bienDescripcion', e.target.value)} className={`${inputCls} ${borde(errores.bienDescripcion)}`} placeholder="Ej. Zapatillas talla 40, color negro" />
        </Campo>
        <Campo id={id('montoReclamado')} label="Monto reclamado (S/)" error={errores.montoReclamado} ayuda="Opcional.">
          <input {...aria('montoReclamado')} inputMode="decimal" maxLength={12} value={form.montoReclamado} onChange={(e) => set('montoReclamado', e.target.value.replace(',', '.'))} className={`${inputCls} ${borde(errores.montoReclamado)}`} placeholder="0.00" />
        </Campo>
        <Campo id={id('pedidoCodigo')} label="Código de pedido" error={errores.pedidoCodigo} ayuda="Opcional, si compraste en esta tienda.">
          <input {...aria('pedidoCodigo')} maxLength={40} value={form.pedidoCodigo} onChange={(e) => set('pedidoCodigo', e.target.value)} className={`${inputCls} ${borde(errores.pedidoCodigo)}`} />
        </Campo>
      </Seccion>

      <Seccion numero={3} titulo="Detalle de la reclamación y pedido del consumidor">
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de reclamación">
          <Opcion name="tipo" value="RECLAMO" checked={form.tipo === 'RECLAMO'} onChange={(v) => set('tipo', v as 'RECLAMO')} titulo="Reclamo" texto={EXPLICACION_TIPO.RECLAMO} color={color} />
          <Opcion name="tipo" value="QUEJA" checked={form.tipo === 'QUEJA'} onChange={(v) => set('tipo', v as 'QUEJA')} titulo="Queja" texto={EXPLICACION_TIPO.QUEJA} color={color} />
        </div>
        <Campo id={id('detalle')} label="Detalle" requerido error={errores.detalle} ayuda={contador(form.detalle, LIMITES.detalle.max)} className="sm:col-span-2">
          <textarea {...aria('detalle')} rows={5} maxLength={LIMITES.detalle.max} value={form.detalle} onChange={(e) => set('detalle', e.target.value)} className={`${inputCls} ${borde(errores.detalle)} resize-y`} placeholder="Cuéntanos qué pasó, cuándo y con qué producto o atención." />
        </Campo>
        <Campo id={id('pedidoConsumidor')} label="Pedido" requerido error={errores.pedidoConsumidor} ayuda={contador(form.pedidoConsumidor, LIMITES.pedidoConsumidor.max)} className="sm:col-span-2">
          <textarea {...aria('pedidoConsumidor')} rows={3} maxLength={LIMITES.pedidoConsumidor.max} value={form.pedidoConsumidor} onChange={(e) => set('pedidoConsumidor', e.target.value)} className={`${inputCls} ${borde(errores.pedidoConsumidor)} resize-y`} placeholder="¿Qué solución esperas? Ej. cambio del producto, devolución del dinero." />
        </Campo>
      </Seccion>

      <div className="border-t border-slate-200 px-5 py-6 sm:px-8">
        <ul className="mb-5 space-y-1.5 text-[12.5px] leading-5 text-slate-500">
          <li>• La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.</li>
          <li>• El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a {PLAZO_DIAS_HABILES} días hábiles.</li>
        </ul>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-6 text-slate-700">
          <input
            {...aria('aceptaDeclaracion')}
            type="checkbox"
            checked={form.aceptaDeclaracion}
            onChange={(e) => set('aceptaDeclaracion', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
            style={{ accentColor: color }}
          />
          <span>Declaro que los datos consignados son verdaderos y acepto que se me notifique la respuesta al correo electrónico indicado.</span>
        </label>
        {errores.aceptaDeclaracion && <p id={`${id('aceptaDeclaracion')}-error`} className="mt-1 pl-7 text-[12px] font-medium text-rose-600">{errores.aceptaDeclaracion}</p>}

        {/* Honeypot: fuera de la vista y del teclado; un bot lo llena, una persona no. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor={id('website')}>No llenar este campo</label>
          <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>

        {errorServidor && (
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
            <Icon icon="solar:danger-circle-bold" width={18} className="mt-0.5 shrink-0" /> {errorServidor}
          </p>
        )}
        {intentado && Object.keys(errores).length > 0 && !errorServidor && (
          <p role="alert" className="mt-5 text-[13px] font-medium text-rose-600">Revisa los campos marcados.</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-8"
          style={{ background: color, color: readableText(color) }}
        >
          {enviando ? <><Icon icon="svg-spinners:ring-resize" width={18} /> Enviando…</> : 'Enviar hoja de reclamación'}
        </button>
      </div>
    </form>
  );
}
