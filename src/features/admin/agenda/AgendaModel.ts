/**
 * Agenda de "Mi negocio": reuniones, tareas, pagos y recordatorios del negocio.
 *
 * Todo lo de acá es puro (sin React ni red) para poder probarlo: los tipos del
 * contrato con el backend, las fechas en hora de Lima, qué días pinta cada
 * vista, cómo se acomodan los bloques de la semana y la validación del
 * formulario.
 *
 * Fechas: el backend habla en ISO UTC. La pantalla piensa en hora de Lima
 * (UTC−5 todo el año, Perú no cambia de horario), sin depender de la zona del
 * navegador: un dueño de viaje en Madrid ve la agenda igual que en su tienda.
 * Un día se identifica por su clave 'YYYY-MM-DD' (de Lima).
 */

/* ───────────────────────── Contrato ───────────────────────── */

export type AgendaTipo = 'REUNION' | 'TAREA' | 'PAGO' | 'RECORDATORIO';
export type AgendaPrioridad = 'BAJA' | 'MEDIA' | 'ALTA';
export type AgendaVisibilidad = 'PERSONAL' | 'EQUIPO';
export type AgendaRepeticion = 'NINGUNA' | 'DIARIA' | 'SEMANAL' | 'MENSUAL';
export type AgendaRecordatorio = 15 | 60 | 1440 | null;

export interface AgendaUsuarioMin {
  id: number;
  nombre: string;
}

export interface AgendaOcurrencia {
  /** `${eventoId}:${inicioISO}` */
  id: string;
  eventoId: number;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  tipo: AgendaTipo;
  prioridad: AgendaPrioridad;
  visibilidad: AgendaVisibilidad;
  inicio: string;
  fin: string | null;
  todoElDia: boolean;
  repeticion: AgendaRepeticion;
  repetirHasta: string | null;
  recordatorioMin: AgendaRecordatorio;
  completado: boolean;
  vencido: boolean;
  creador: AgendaUsuarioMin;
  responsable: AgendaUsuarioMin | null;
  puedeEditar: boolean;
  puedeCompletar: boolean;
}

export interface AgendaEventoInput {
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  tipo: AgendaTipo;
  prioridad?: AgendaPrioridad;
  inicio: string;
  fin?: string | null;
  todoElDia?: boolean;
  visibilidad?: AgendaVisibilidad;
  responsableId?: number | null;
  repeticion?: AgendaRepeticion;
  repetirHasta?: string | null;
  recordatorioMin?: AgendaRecordatorio;
}

export interface AgendaResumen {
  hoy: AgendaOcurrencia[];
  proximos: AgendaOcurrencia[];
  vencidos: number;
}

/* ───────────────────────── Catálogos ───────────────────────── */

export const TIPOS: AgendaTipo[] = ['REUNION', 'TAREA', 'PAGO', 'RECORDATORIO'];

/** Clases completas (Tailwind solo ve literales). */
export interface TipoMeta {
  etiqueta: string;
  plural: string;
  icono: string;
  /** Punto / barra sólida. */
  punto: string;
  /** Texto del tipo. */
  texto: string;
  /** Chip del mes y bloque de la semana. */
  chip: string;
  /** Borde izquierdo del bloque de la semana. */
  borde: string;
}

export const TIPO_META: Record<AgendaTipo, TipoMeta> = {
  REUNION: {
    etiqueta: 'Reunión',
    plural: 'Reuniones',
    icono: 'solar:users-group-rounded-bold-duotone',
    punto: 'bg-violet-500',
    texto: 'text-violet-600 dark:text-violet-300',
    chip: 'bg-violet-50 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100',
    borde: 'border-violet-500',
  },
  TAREA: {
    etiqueta: 'Tarea',
    plural: 'Tareas',
    icono: 'solar:checklist-minimalistic-bold-duotone',
    punto: 'bg-amber-500',
    texto: 'text-amber-600 dark:text-amber-300',
    chip: 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100',
    borde: 'border-amber-500',
  },
  PAGO: {
    etiqueta: 'Pago',
    plural: 'Pagos',
    icono: 'solar:wallet-money-bold-duotone',
    punto: 'bg-emerald-500',
    texto: 'text-emerald-600 dark:text-emerald-300',
    chip: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100',
    borde: 'border-emerald-500',
  },
  RECORDATORIO: {
    etiqueta: 'Recordatorio',
    plural: 'Recordatorios',
    icono: 'solar:bell-bold-duotone',
    punto: 'bg-sky-500',
    texto: 'text-sky-600 dark:text-sky-300',
    chip: 'bg-sky-50 text-sky-900 dark:bg-sky-500/15 dark:text-sky-100',
    borde: 'border-sky-500',
  },
};

export const PRIORIDADES: { valor: AgendaPrioridad; etiqueta: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
];

export const REPETICIONES: { valor: AgendaRepeticion; etiqueta: string }[] = [
  { valor: 'NINGUNA', etiqueta: 'No se repite' },
  { valor: 'DIARIA', etiqueta: 'Cada día' },
  { valor: 'SEMANAL', etiqueta: 'Cada semana' },
  { valor: 'MENSUAL', etiqueta: 'Cada mes' },
];

export const RECORDATORIOS: { valor: AgendaRecordatorio; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Sin aviso' },
  { valor: 15, etiqueta: '15 minutos antes' },
  { valor: 60, etiqueta: '1 hora antes' },
  { valor: 1440, etiqueta: '1 día antes' },
];

export const MENSAJE_SIN_PLAN = 'Tu plan no incluye la Agenda. Consulta con tu proveedor para activarla.';

export const LIMITES = { titulo: 120, descripcion: 2000, lugar: 300 } as const;

/* ───────────────────────── Fechas en Lima ───────────────────────── */

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export interface PartesLima {
  anio: number;
  /** 0-11 */
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** 0 = lunes … 6 = domingo */
  diaSemana: number;
}

const aDate = (f: string | Date | number): Date => (f instanceof Date ? f : new Date(f));

export function partesLima(f: string | Date | number): PartesLima {
  const x = new Date(aDate(f).getTime() - LIMA_OFFSET_MS);
  return {
    anio: x.getUTCFullYear(),
    mes: x.getUTCMonth(),
    dia: x.getUTCDate(),
    hora: x.getUTCHours(),
    minuto: x.getUTCMinutes(),
    diaSemana: (x.getUTCDay() + 6) % 7,
  };
}

/** Instante (UTC) de una hora de pared en Lima. Acepta desbordes (día 32, minuto 90…). */
export function desdeLima(anio: number, mes: number, dia: number, hora = 0, minuto = 0): Date {
  return new Date(Date.UTC(anio, mes, dia, hora, minuto) + LIMA_OFFSET_MS);
}

const dos = (n: number) => String(n).padStart(2, '0');

export function claveDia(f: string | Date | number): string {
  const p = partesLima(f);
  return `${p.anio}-${dos(p.mes + 1)}-${dos(p.dia)}`;
}

export function partesClave(clave: string): { anio: number; mes: number; dia: number } {
  const [a, m, d] = clave.split('-').map(Number);
  return { anio: a, mes: m - 1, dia: d };
}

/** 00:00 de Lima de ese día, como instante. */
export function inicioDia(clave: string): Date {
  const { anio, mes, dia } = partesClave(clave);
  return desdeLima(anio, mes, dia);
}

export function sumarDias(clave: string, n: number): string {
  const { anio, mes, dia } = partesClave(clave);
  const x = new Date(Date.UTC(anio, mes, dia + n));
  return `${x.getUTCFullYear()}-${dos(x.getUTCMonth() + 1)}-${dos(x.getUTCDate())}`;
}

export function sumarMeses(clave: string, n: number): string {
  const { anio, mes } = partesClave(clave);
  const x = new Date(Date.UTC(anio, mes + n, 1));
  return `${x.getUTCFullYear()}-${dos(x.getUTCMonth() + 1)}-01`;
}

export function diaSemanaDe(clave: string): number {
  const { anio, mes, dia } = partesClave(clave);
  return (new Date(Date.UTC(anio, mes, dia)).getUTCDay() + 6) % 7;
}

/** Lunes de la semana del día. */
export function lunesDe(clave: string): string {
  return sumarDias(clave, -diaSemanaDe(clave));
}

export function primeroDelMes(clave: string): string {
  return `${clave.slice(0, 7)}-01`;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((inicioDia(hasta).getTime() - inicioDia(desde).getTime()) / DIA_MS);
}

/* ───────────────────────── Vistas y rangos ───────────────────────── */

export type Vista = 'mes' | 'semana' | 'agenda';

/** Días que muestra la vista Agenda (dos semanas, como la referencia). */
export const DIAS_VISTA_AGENDA = 14;

/** Semanas (lun–dom) que cubren el mes del día: 4 a 6 filas. */
export function semanasDelMes(clave: string): string[][] {
  const primero = primeroDelMes(clave);
  const ultimo = sumarDias(sumarMeses(clave, 1), -1);
  const semanas: string[][] = [];
  let lunes = lunesDe(primero);
  while (diasEntre(lunes, ultimo) >= 0) {
    semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)));
    lunes = sumarDias(lunes, 7);
  }
  return semanas;
}

export interface Rango {
  /** Primer día (incluido). */
  desde: string;
  /** Día siguiente al último (excluido). */
  hasta: string;
}

export function rangoDeVista(vista: Vista, cursor: string): Rango {
  if (vista === 'mes') {
    const semanas = semanasDelMes(cursor);
    const ultimaSemana = semanas[semanas.length - 1];
    return { desde: semanas[0][0], hasta: sumarDias(ultimaSemana[6], 1) };
  }
  const desde = lunesDe(cursor);
  return { desde, hasta: sumarDias(desde, vista === 'semana' ? 7 : DIAS_VISTA_AGENDA) };
}

export function moverCursor(vista: Vista, cursor: string, paso: 1 | -1): string {
  if (vista === 'mes') return sumarMeses(cursor, paso);
  return sumarDias(lunesDe(cursor), paso * (vista === 'semana' ? 7 : DIAS_VISTA_AGENDA));
}

export function tituloRango(vista: Vista, cursor: string): string {
  if (vista === 'mes') {
    const { anio, mes } = partesClave(cursor);
    return `${capitalizar(MESES[mes])} ${anio}`;
  }
  const { desde, hasta } = rangoDeVista(vista, cursor);
  const a = partesClave(desde);
  const b = partesClave(sumarDias(hasta, -1));
  if (a.anio !== b.anio) return `${a.dia} ${MESES[a.mes].slice(0, 3)} ${a.anio} – ${b.dia} ${MESES[b.mes].slice(0, 3)} ${b.anio}`;
  if (a.mes !== b.mes) return `${a.dia} ${MESES[a.mes].slice(0, 3)} – ${b.dia} ${MESES[b.mes].slice(0, 3)} ${b.anio}`;
  return `${a.dia} – ${b.dia} ${MESES[a.mes]} ${a.anio}`;
}

export const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ───────────────────────── Formatos ───────────────────────── */

/** "9 am", "3:30 pm", "12 m" no: mediodía es "12 pm". */
export function hora12(f: string | Date): string {
  const { hora, minuto } = partesLima(f);
  const sufijo = hora < 12 ? 'am' : 'pm';
  const h = hora % 12 === 0 ? 12 : hora % 12;
  return minuto === 0 ? `${h} ${sufijo}` : `${h}:${dos(minuto)} ${sufijo}`;
}

export function horaHHmm(f: string | Date): string {
  const { hora, minuto } = partesLima(f);
  return `${dos(hora)}:${dos(minuto)}`;
}

/** Duración en minutos; sin fin → null. */
export function duracionMin(o: Pick<AgendaOcurrencia, 'inicio' | 'fin'>): number | null {
  if (!o.fin) return null;
  const m = Math.round((aDate(o.fin).getTime() - aDate(o.inicio).getTime()) / 60000);
  return m > 0 ? m : null;
}

export function textoDuracion(min: number | null): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return ((partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** "Hoy", "Mañana", "En 3 días". */
export function textoFaltan(claveEvento: string, hoy: string): string {
  const n = diasEntre(hoy, claveEvento);
  if (n <= 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  return `En ${n} días`;
}

export function etiquetaDia(clave: string, hoy: string): string {
  const { mes, dia } = partesClave(clave);
  const base = `${capitalizar(DIAS_LARGOS[diaSemanaDe(clave)])} ${dia} de ${MESES[mes]}`;
  const n = diasEntre(hoy, clave);
  if (n === 0) return `Hoy · ${base}`;
  if (n === 1) return `Mañana · ${base}`;
  if (n === -1) return `Ayer · ${base}`;
  return base;
}

/* ───────────────────────── Agrupar y filtrar ───────────────────────── */

export function filtrarPorTipo(eventos: AgendaOcurrencia[], visibles: ReadonlySet<AgendaTipo>): AgendaOcurrencia[] {
  return eventos.filter((e) => visibles.has(e.tipo));
}

export function contarPorTipo(eventos: AgendaOcurrencia[]): Record<AgendaTipo, number> {
  const c: Record<AgendaTipo, number> = { REUNION: 0, TAREA: 0, PAGO: 0, RECORDATORIO: 0 };
  for (const e of eventos) c[e.tipo] += 1;
  return c;
}

/** Los de todo el día primero; luego por hora de inicio. */
export function ordenarDelDia(a: AgendaOcurrencia, b: AgendaOcurrencia): number {
  if (a.todoElDia !== b.todoElDia) return a.todoElDia ? -1 : 1;
  return aDate(a.inicio).getTime() - aDate(b.inicio).getTime();
}

/** Eventos por día de inicio (Lima), cada día ya ordenado. */
export function agruparPorDia(eventos: AgendaOcurrencia[]): Map<string, AgendaOcurrencia[]> {
  const m = new Map<string, AgendaOcurrencia[]>();
  for (const e of eventos) {
    const k = claveDia(e.inicio);
    const lista = m.get(k);
    if (lista) lista.push(e);
    else m.set(k, [e]);
  }
  for (const lista of m.values()) lista.sort(ordenarDelDia);
  return m;
}

/* ───────────────────────── Vista Semana ───────────────────────── */

export const HORA_INICIO = 7;
export const HORA_FIN = 21;
/** Alto de una hora en px. */
export const HORA_PX = 56;
const DURACION_MIN_VISUAL = 30;

export interface BloqueSemana {
  evento: AgendaOcurrencia;
  /** px desde las 7:00 */
  top: number;
  alto: number;
  /** Columna dentro del grupo de solapados y cuántas hay. */
  columna: number;
  columnas: number;
}

/**
 * Acomoda los eventos con hora de un día: posición por hora/duración y, si se
 * cruzan, lado a lado. Lo que cae fuera de 7am–9pm se recorta al borde para
 * que no se pierda.
 */
export function bloquesDelDia(eventos: AgendaOcurrencia[]): BloqueSemana[] {
  const conHora = eventos.filter((e) => !e.todoElDia).sort(ordenarDelDia);
  const totalMin = (HORA_FIN - HORA_INICIO) * 60;
  const items = conHora.map((e) => {
    const p = partesLima(e.inicio);
    const ini = p.hora * 60 + p.minuto - HORA_INICIO * 60;
    const dur = Math.max(duracionMin(e) ?? DURACION_MIN_VISUAL, DURACION_MIN_VISUAL);
    const a = Math.min(Math.max(ini, 0), totalMin - DURACION_MIN_VISUAL);
    const b = Math.min(Math.max(ini + dur, a + DURACION_MIN_VISUAL), totalMin);
    return { evento: e, a, b };
  });

  const bloques: BloqueSemana[] = [];
  let grupo: { evento: AgendaOcurrencia; a: number; b: number; col: number }[] = [];
  let finGrupo = -1;
  const cerrar = () => {
    const n = grupo.reduce((max, g) => Math.max(max, g.col + 1), 0);
    for (const g of grupo) {
      bloques.push({
        evento: g.evento,
        top: (g.a / 60) * HORA_PX,
        alto: ((g.b - g.a) / 60) * HORA_PX,
        columna: g.col,
        columnas: n,
      });
    }
    grupo = [];
    finGrupo = -1;
  };
  for (const it of items) {
    if (grupo.length && it.a >= finGrupo) cerrar();
    const finesPorColumna: number[] = [];
    for (const g of grupo) finesPorColumna[g.col] = Math.max(finesPorColumna[g.col] ?? 0, g.b);
    let col = finesPorColumna.findIndex((fin) => fin <= it.a);
    if (col === -1) col = finesPorColumna.length;
    grupo.push({ ...it, col });
    finGrupo = Math.max(finGrupo, it.b);
  }
  if (grupo.length) cerrar();
  return bloques;
}

/** px de la línea de "ahora" o null si está fuera de las franjas. */
export function posicionAhora(ahora: Date): number | null {
  const p = partesLima(ahora);
  const min = p.hora * 60 + p.minuto - HORA_INICIO * 60;
  if (min < 0 || min > (HORA_FIN - HORA_INICIO) * 60) return null;
  return (min / 60) * HORA_PX;
}

/**
 * Soltar un bloque en (día, px): nuevo inicio redondeado a 15 min, conservando
 * la duración. Devuelve null si no cambia nada.
 */
export function moverEvento(
  e: Pick<AgendaOcurrencia, 'inicio' | 'fin'>,
  dia: string,
  offsetPx: number,
): { inicio: string; fin: string | null } | null {
  const totalMin = (HORA_FIN - HORA_INICIO) * 60;
  const crudo = Math.round(((offsetPx / HORA_PX) * 60) / 15) * 15;
  const min = Math.min(Math.max(crudo, 0), totalMin - 15) + HORA_INICIO * 60;
  const { anio, mes, dia: d } = partesClave(dia);
  const inicio = desdeLima(anio, mes, d, Math.floor(min / 60), min % 60);
  if (inicio.getTime() === aDate(e.inicio).getTime()) return null;
  const dur = duracionMin(e);
  return {
    inicio: inicio.toISOString(),
    fin: dur ? new Date(inicio.getTime() + dur * 60000).toISOString() : e.fin,
  };
}

/** Solo se arrastran los eventos sueltos con hora: mover una repetición movería toda la serie. */
export const sePuedeArrastrar = (e: AgendaOcurrencia) => e.puedeEditar && !e.todoElDia && e.repeticion === 'NINGUNA';

/* ───────────────────────── Formulario ───────────────────────── */

export interface FormEvento {
  titulo: string;
  descripcion: string;
  lugar: string;
  tipo: AgendaTipo;
  prioridad: AgendaPrioridad;
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:mm */
  horaInicio: string;
  /** HH:mm o '' */
  horaFin: string;
  todoElDia: boolean;
  visibilidad: AgendaVisibilidad;
  /** '' = sin responsable */
  responsableId: string;
  repeticion: AgendaRepeticion;
  /** YYYY-MM-DD o '' */
  repetirHasta: string;
  recordatorioMin: AgendaRecordatorio;
}

export type ErroresForm = Partial<Record<keyof FormEvento, string>>;

export function formVacio(fecha: string, hora = '09:00', tipo: AgendaTipo = 'REUNION'): FormEvento {
  const [h, m] = hora.split(':').map(Number);
  const finMin = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return {
    titulo: '',
    descripcion: '',
    lugar: '',
    tipo,
    prioridad: 'MEDIA',
    fecha,
    horaInicio: hora,
    horaFin: `${dos(Math.floor(finMin / 60))}:${dos(finMin % 60)}`,
    todoElDia: false,
    visibilidad: 'PERSONAL',
    responsableId: '',
    repeticion: 'NINGUNA',
    repetirHasta: '',
    recordatorioMin: null,
  };
}

/**
 * Formulario desde una ocurrencia. En una serie se toma la fecha de la
 * ocurrencia abierta; el modal avisa que guardar aplica a toda la serie.
 */
export function formDesde(e: AgendaOcurrencia): FormEvento {
  return {
    titulo: e.titulo,
    descripcion: e.descripcion ?? '',
    lugar: e.lugar ?? '',
    tipo: e.tipo,
    prioridad: e.prioridad,
    fecha: claveDia(e.inicio),
    horaInicio: e.todoElDia ? '09:00' : horaHHmm(e.inicio),
    // Un fin en otro día (22:00 → 01:00) no cabe en "hora fin" del mismo día.
    horaFin: e.fin && !e.todoElDia && claveDia(e.fin) === claveDia(e.inicio) ? horaHHmm(e.fin) : '',
    todoElDia: e.todoElDia,
    visibilidad: e.visibilidad,
    responsableId: e.responsable ? String(e.responsable.id) : '',
    repeticion: e.repeticion,
    repetirHasta: e.repetirHasta ? claveDia(e.repetirHasta) : '',
    recordatorioMin: e.recordatorioMin,
  };
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 'YYYY-MM-DD' que existe de verdad (2026-02-30 no). */
export const esFechaValida = (f: string): boolean => RE_FECHA.test(f) && sumarDias(f, 0) === f;

function instante(fecha: string, hhmm: string): Date {
  const { anio, mes, dia } = partesClave(fecha);
  const [h, m] = hhmm.split(':').map(Number);
  return desdeLima(anio, mes, dia, h, m);
}

export function validarForm(f: FormEvento): ErroresForm {
  const e: ErroresForm = {};
  const titulo = f.titulo.trim();
  if (!titulo) e.titulo = 'Escribe un título.';
  else if (titulo.length > LIMITES.titulo) e.titulo = `Máximo ${LIMITES.titulo} caracteres.`;
  if (f.descripcion.trim().length > LIMITES.descripcion) e.descripcion = `Máximo ${LIMITES.descripcion} caracteres.`;
  if (f.lugar.trim().length > LIMITES.lugar) e.lugar = `Máximo ${LIMITES.lugar} caracteres.`;
  if (!esFechaValida(f.fecha)) e.fecha = 'Elige la fecha.';
  if (!f.todoElDia) {
    if (!RE_HORA.test(f.horaInicio)) e.horaInicio = 'Elige la hora.';
    if (f.horaFin) {
      if (!RE_HORA.test(f.horaFin)) e.horaFin = 'Hora no válida.';
      else if (!e.horaInicio && f.horaFin <= f.horaInicio) e.horaFin = 'Debe terminar después de empezar.';
    }
  }
  if (f.repeticion !== 'NINGUNA' && f.repetirHasta) {
    if (!esFechaValida(f.repetirHasta)) e.repetirHasta = 'Fecha no válida.';
    else if (!e.fecha && f.repetirHasta < f.fecha) e.repetirHasta = 'Debe ser igual o posterior a la fecha del evento.';
  }
  if (f.responsableId && !/^\d+$/.test(f.responsableId)) e.responsableId = 'Responsable no válido.';
  return e;
}

/** Arma el cuerpo del POST/PATCH. Llamar solo con el formulario ya validado. */
export function aInput(f: FormEvento): AgendaEventoInput {
  const repite = f.repeticion !== 'NINGUNA';
  const inicio = f.todoElDia ? inicioDia(f.fecha) : instante(f.fecha, f.horaInicio);
  const fin = !f.todoElDia && f.horaFin ? instante(f.fecha, f.horaFin) : null;
  const { anio, mes, dia } = repite && f.repetirHasta ? partesClave(f.repetirHasta) : { anio: 0, mes: 0, dia: 0 };
  return {
    titulo: f.titulo.trim(),
    descripcion: f.descripcion.trim() || null,
    lugar: f.lugar.trim() || null,
    tipo: f.tipo,
    prioridad: f.prioridad,
    inicio: inicio.toISOString(),
    fin: fin ? fin.toISOString() : null,
    todoElDia: f.todoElDia,
    visibilidad: f.visibilidad,
    responsableId: f.responsableId ? Number(f.responsableId) : null,
    repeticion: f.repeticion,
    // "Hasta el 30" incluye lo del 30: se manda el último minuto de ese día.
    repetirHasta: repite && f.repetirHasta ? desdeLima(anio, mes, dia, 23, 59).toISOString() : null,
    recordatorioMin: f.recordatorioMin,
  };
}

/** Cuerpo de "marcar hecho": en una serie va la ocurrencia (su inicio ISO). */
export function cuerpoCompletar(e: AgendaOcurrencia, completado: boolean): { ocurrencia?: string; completado: boolean } {
  return e.repeticion === 'NINGUNA' ? { completado } : { ocurrencia: e.inicio, completado };
}

/** Lee el mensaje de error del backend (o uno genérico). */
export function mensajeError(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const m = data?.message;
  if (Array.isArray(m) && m.length) return String(m[0]);
  if (typeof m === 'string' && m.trim()) return m;
  return porDefecto;
}

export function esErrorSinPlan(err: unknown): boolean {
  const r = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  return r?.status === 403 && typeof r.data?.message === 'string' && r.data.message.includes('plan');
}

/**
 * Cuerpo del PATCH: solo lo que cambió. Importa en las series: la ocurrencia
 * abierta no es la primera, así que si se mandara siempre `inicio`, editar el
 * título del tercer lunes borraría los dos anteriores. Fecha/hora viajan solo
 * si el usuario las tocó (y entonces la serie arranca en la nueva fecha).
 */
export function aPatch(f: FormEvento, original: AgendaOcurrencia): Partial<AgendaEventoInput> {
  const nuevo = aInput(f);
  const antes = aInput(formDesde(original));
  const cambios: Partial<AgendaEventoInput> = {};
  const claves = Object.keys(nuevo) as (keyof AgendaEventoInput)[];
  for (const k of claves) {
    if (k === 'inicio' || k === 'fin' || k === 'todoElDia') continue;
    if (nuevo[k] !== antes[k]) (cambios as Record<string, unknown>)[k] = nuevo[k];
  }
  const tocoHorario = nuevo.inicio !== antes.inicio || nuevo.fin !== antes.fin || nuevo.todoElDia !== antes.todoElDia;
  if (tocoHorario) {
    cambios.inicio = nuevo.inicio;
    cambios.fin = nuevo.fin;
    cambios.todoElDia = nuevo.todoElDia;
  }
  return cambios;
}

/* ───────────────────────── Enlace desde la campana ───────────────────────── */

export const RUTA_AGENDA = '/administrador/mi-negocio/agenda';

/**
 * Recordatorio de la Agenda en la campana (`metaData.origen === 'AGENDA'`):
 * abre la Agenda en el día de la ocurrencia y con el evento abierto.
 */
export function linkAlAgenda(meta: unknown): string | null {
  const m = (meta ?? {}) as { origen?: unknown; agendaEventoId?: unknown; ocurrencia?: unknown };
  if (m.origen !== 'AGENDA') return null;
  const q = new URLSearchParams();
  if (typeof m.ocurrencia === 'string' && !Number.isNaN(new Date(m.ocurrencia).getTime())) q.set('fecha', claveDia(m.ocurrencia));
  const id = Number(m.agendaEventoId);
  if (Number.isInteger(id) && id > 0) q.set('evento', String(id));
  const s = q.toString();
  return s ? `${RUTA_AGENDA}?${s}` : RUTA_AGENDA;
}

/** Lee `?fecha=YYYY-MM-DD&evento=<id>` (lo que arma `linkAlAgenda`). */
export function leerObjetivo(params: URLSearchParams): { fecha: string | null; eventoId: number | null } {
  const f = params.get('fecha');
  const fecha = f && esFechaValida(f) ? f : null;
  const id = Number(params.get('evento'));
  return { fecha, eventoId: Number.isInteger(id) && id > 0 ? id : null };
}
