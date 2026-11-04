/**
 * Validación de la hoja de reclamación en el cliente. Es la misma regla que
 * aplica el backend: el servidor manda, pero el consumidor ve el error antes de
 * enviar y junto al campo.
 */
import {
  TIPOS_BIEN, TIPOS_DOCUMENTO, TIPOS_RECLAMO,
  type CampoHoja, type FormularioHoja, type HojaReclamacionPayload,
} from './tipos';

export type ErroresHoja = Partial<Record<CampoHoja, string>>;

export const LIMITES = {
  detalle: { min: 10, max: 3000 },
  pedidoConsumidor: { min: 5, max: 2000 },
  respuesta: { min: 10, max: 4000 },
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONTO = /^\d+(\.\d{1,2})?$/;

export const FORMULARIO_VACIO: FormularioHoja = {
  nombres: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  domicilio: '',
  telefono: '',
  email: '',
  menorDeEdad: false,
  apoderadoNombre: '',
  apoderadoDocumento: '',
  bienTipo: 'PRODUCTO',
  bienDescripcion: '',
  montoReclamado: '',
  pedidoCodigo: '',
  tipo: 'RECLAMO',
  detalle: '',
  pedidoConsumidor: '',
  aceptaDeclaracion: false,
  website: '',
};

/** Error del número de documento según su tipo, o `null`. */
export function errorDocumento(tipo: string, numero: string): string | null {
  // Igual que el servidor: sin espacios y en mayúsculas.
  const n = numero.replace(/\s/g, '').toUpperCase();
  if (!n) return 'Ingresa tu número de documento.';
  switch (tipo) {
    case 'DNI': return /^\d{8}$/.test(n) ? null : 'El DNI tiene 8 dígitos.';
    case 'RUC': return /^\d{11}$/.test(n) ? null : 'El RUC tiene 11 dígitos.';
    case 'CE': return /^[A-Z0-9]{6,12}$/.test(n) ? null : 'El carné de extranjería tiene de 6 a 12 letras o números.';
    case 'PASAPORTE': return /^[A-Z0-9]{5,15}$/.test(n) ? null : 'El pasaporte tiene de 5 a 15 letras o números.';
    default: return 'Elige el tipo de documento.';
  }
}

function largo(valor: string, { min, max }: { min: number; max: number }, que: string): string | null {
  const n = valor.trim().length;
  if (n === 0) return `Escribe ${que}.`;
  if (n < min) return `Escribe al menos ${min} caracteres.`;
  if (n > max) return `Máximo ${max} caracteres.`;
  return null;
}

/** Todos los errores de la hoja (objeto vacío = lista para enviar). */
export function validarHoja(f: FormularioHoja): ErroresHoja {
  const e: ErroresHoja = {};
  const req = (campo: CampoHoja, valor: string, mensaje: string) => {
    if (!valor.trim()) e[campo] = mensaje;
  };

  req('nombres', f.nombres, 'Ingresa tu nombre completo.');
  if (!TIPOS_DOCUMENTO.includes(f.tipoDocumento)) e.tipoDocumento = 'Elige el tipo de documento.';
  const doc = errorDocumento(f.tipoDocumento, f.numeroDocumento);
  if (doc) e.numeroDocumento = doc;
  req('domicilio', f.domicilio, 'Ingresa tu domicilio.');

  const digitosTel = f.telefono.replace(/\D/g, '');
  if (!f.telefono.trim()) e.telefono = 'Ingresa un teléfono de contacto.';
  else if (!/^[\d\s+()-]+$/.test(f.telefono) || digitosTel.length < 6 || digitosTel.length > 15) e.telefono = 'Teléfono no válido.';

  if (!f.email.trim()) e.email = 'Ingresa tu correo: ahí te llega la constancia.';
  else if (!EMAIL.test(f.email.trim())) e.email = 'Correo no válido.';

  if (f.menorDeEdad) {
    req('apoderadoNombre', f.apoderadoNombre, 'Ingresa el nombre del padre, madre o apoderado.');
    req('apoderadoDocumento', f.apoderadoDocumento, 'Ingresa el documento del apoderado.');
  }

  if (!TIPOS_BIEN.includes(f.bienTipo)) e.bienTipo = 'Elige producto o servicio.';
  req('bienDescripcion', f.bienDescripcion, 'Describe el producto o servicio.');
  const monto = f.montoReclamado.trim();
  if (monto && !MONTO.test(monto)) e.montoReclamado = 'Monto no válido (ej. 120.50).';

  if (!TIPOS_RECLAMO.includes(f.tipo)) e.tipo = 'Elige reclamo o queja.';
  const detalle = largo(f.detalle, LIMITES.detalle, 'el detalle');
  if (detalle) e.detalle = detalle;
  const pedido = largo(f.pedidoConsumidor, LIMITES.pedidoConsumidor, 'lo que solicitas');
  if (pedido) e.pedidoConsumidor = pedido;

  if (!f.aceptaDeclaracion) e.aceptaDeclaracion = 'Debes aceptar la declaración para enviar.';
  return e;
}

/** Cuerpo del POST: textos recortados, monto como número y opcionales omitidos. */
export function armarPayload(f: FormularioHoja): HojaReclamacionPayload {
  const opcional = (v: string) => (v.trim() ? v.trim() : undefined);
  const monto = f.montoReclamado.trim();
  return {
    nombres: f.nombres.trim(),
    tipoDocumento: f.tipoDocumento,
    numeroDocumento: f.numeroDocumento.trim().toUpperCase(),
    domicilio: f.domicilio.trim(),
    telefono: f.telefono.trim(),
    email: f.email.trim().toLowerCase(),
    menorDeEdad: f.menorDeEdad,
    apoderadoNombre: f.menorDeEdad ? opcional(f.apoderadoNombre) : undefined,
    apoderadoDocumento: f.menorDeEdad ? opcional(f.apoderadoDocumento) : undefined,
    bienTipo: f.bienTipo,
    bienDescripcion: f.bienDescripcion.trim(),
    montoReclamado: monto ? Number(monto) : undefined,
    pedidoCodigo: opcional(f.pedidoCodigo),
    tipo: f.tipo,
    detalle: f.detalle.trim(),
    pedidoConsumidor: f.pedidoConsumidor.trim(),
    aceptaDeclaracion: true,
    website: f.website,
  };
}

/** Error de la respuesta del dueño, o `null`. */
export function errorRespuesta(texto: string): string | null {
  return largo(texto, LIMITES.respuesta, 'la respuesta');
}
