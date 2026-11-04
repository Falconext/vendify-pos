/**
 * Libro de Reclamaciones (Ley 29571 y D.S. 011-2011-PCM): tipos compartidos
 * por la hoja pública de la tienda y el panel del dueño. Calcan el contrato
 * del backend (`/public/store/:slug/libro-reclamaciones` y `/libro-reclamaciones`).
 */

export const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'RUC'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const TIPOS_RECLAMO = ['RECLAMO', 'QUEJA'] as const;
export type TipoReclamo = (typeof TIPOS_RECLAMO)[number];

export const TIPOS_BIEN = ['PRODUCTO', 'SERVICIO'] as const;
export type TipoBien = (typeof TIPOS_BIEN)[number];

export type EstadoReclamo = 'PENDIENTE' | 'RESPONDIDO' | 'VENCIDO';

/** Datos del proveedor que arma el servidor desde la empresa. */
export interface ProveedorLibro {
  razonSocial: string;
  ruc: string;
  direccion: string | null;
  nombreComercial: string | null;
  logo: string | null;
}

/** Campos que llena el consumidor (todo texto: así vive en el formulario). */
export interface FormularioHoja {
  nombres: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  domicilio: string;
  telefono: string;
  email: string;
  menorDeEdad: boolean;
  apoderadoNombre: string;
  apoderadoDocumento: string;
  bienTipo: TipoBien;
  bienDescripcion: string;
  montoReclamado: string;
  pedidoCodigo: string;
  tipo: TipoReclamo;
  detalle: string;
  pedidoConsumidor: string;
  aceptaDeclaracion: boolean;
  /** Honeypot: un humano no lo ve ni lo llena. */
  website: string;
}

export type CampoHoja = keyof FormularioHoja;

/** Cuerpo del POST público (tipos del contrato). */
export interface HojaReclamacionPayload {
  nombres: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  domicilio: string;
  telefono: string;
  email: string;
  menorDeEdad: boolean;
  apoderadoNombre?: string;
  apoderadoDocumento?: string;
  bienTipo: TipoBien;
  bienDescripcion: string;
  montoReclamado?: number;
  pedidoCodigo?: string;
  tipo: TipoReclamo;
  detalle: string;
  pedidoConsumidor: string;
  aceptaDeclaracion: true;
  website: string;
}

export interface ReclamoRegistrado {
  codigo: string;
  fecha: string;
  fechaLimite: string;
  token: string;
}

export interface Reclamo {
  id: number;
  codigo: string;
  estado: EstadoReclamo;
  fecha: string;
  fechaLimite: string;
  /** Negativo si venció; `null` si ya se respondió. */
  diasHabilesRestantes: number | null;
  tipo: TipoReclamo;
  nombres: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  domicilio: string;
  telefono: string;
  email: string;
  menorDeEdad: boolean;
  apoderadoNombre: string | null;
  apoderadoDocumento: string | null;
  bienTipo: TipoBien;
  bienDescripcion: string;
  montoReclamado: number | string | null;
  pedidoCodigo: string | null;
  detalle: string;
  pedidoConsumidor: string;
  respuesta: string | null;
  fechaRespuesta: string | null;
  respondidoPor: { id: number; nombre: string } | null;
}

export interface ResumenLibro {
  pendientes: number;
  vencidos: number;
  porVencer: number;
  respondidos: number;
}

export interface ListadoReclamos {
  data: Reclamo[];
  total: number;
  resumen: ResumenLibro;
}

export const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: 'DNI',
  CE: 'Carné de extranjería',
  PASAPORTE: 'Pasaporte',
  RUC: 'RUC',
};

export const EXPLICACION_TIPO: Record<TipoReclamo, string> = {
  RECLAMO: 'Disconformidad relacionada con los productos o servicios.',
  QUEJA: 'Disconformidad no relacionada con los productos o servicios; o malestar o descontento respecto a la atención al público.',
};

/** Plazo legal de respuesta, en días hábiles. */
export const PLAZO_DIAS_HABILES = 15;
