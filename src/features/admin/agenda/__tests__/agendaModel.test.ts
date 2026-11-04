/**
 * Agenda: lo que decide qué día, a qué hora y en qué orden se pinta cada
 * evento, y qué se le manda al backend. Todo en hora de Lima, sin importar la
 * zona del navegador.
 */
import {
  aInput,
  aPatch,
  agruparPorDia,
  bloquesDelDia,
  claveDia,
  contarPorTipo,
  cuerpoCompletar,
  esErrorSinPlan,
  etiquetaDia,
  filtrarPorTipo,
  formDesde,
  formVacio,
  hora12,
  leerObjetivo,
  linkAlAgenda,
  HORA_PX,
  inicioDia,
  lunesDe,
  mensajeError,
  moverCursor,
  moverEvento,
  posicionAhora,
  rangoDeVista,
  semanasDelMes,
  sePuedeArrastrar,
  textoDuracion,
  textoFaltan,
  tituloRango,
  validarForm,
  type AgendaOcurrencia,
} from '../AgendaModel';

const ev = (p: Partial<AgendaOcurrencia> = {}): AgendaOcurrencia => ({
  id: `1:${p.inicio ?? '2026-11-02T14:00:00.000Z'}`,
  eventoId: 1,
  titulo: 'Reunión con proveedor',
  descripcion: null,
  lugar: null,
  tipo: 'REUNION',
  prioridad: 'MEDIA',
  visibilidad: 'PERSONAL',
  inicio: '2026-11-02T14:00:00.000Z', // 9:00 Lima
  fin: '2026-11-02T15:00:00.000Z', // 10:00 Lima
  todoElDia: false,
  repeticion: 'NINGUNA',
  repetirHasta: null,
  recordatorioMin: null,
  completado: false,
  vencido: false,
  creador: { id: 7, nombre: 'Diego Ortega' },
  responsable: null,
  puedeEditar: true,
  puedeCompletar: true,
  ...p,
});

describe('fechas en Lima', () => {
  it('un evento a las 23:30 de Lima es de ese día aunque en UTC ya sea el siguiente', () => {
    expect(claveDia('2026-11-03T04:30:00.000Z')).toBe('2026-11-02');
    expect(hora12('2026-11-03T04:30:00.000Z')).toBe('11:30 pm');
  });

  it('00:00 de Lima es 05:00 UTC', () => {
    expect(inicioDia('2026-11-02').toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('la semana empieza el lunes (domingo → lunes anterior)', () => {
    expect(lunesDe('2026-11-08')).toBe('2026-11-02');
    expect(lunesDe('2026-11-02')).toBe('2026-11-02');
  });

  it('hora12: mediodía y medianoche', () => {
    expect(hora12('2026-11-02T17:00:00.000Z')).toBe('12 pm');
    expect(hora12('2026-11-02T05:00:00.000Z')).toBe('12 am');
    expect(hora12('2026-11-02T14:30:00.000Z')).toBe('9:30 am');
  });
});

describe('vistas', () => {
  it('noviembre 2026 ocupa 6 semanas lun–dom (26 oct → 6 dic)', () => {
    const s = semanasDelMes('2026-11-15');
    expect(s).toHaveLength(6);
    expect(s[0][0]).toBe('2026-10-26');
    expect(s[5][6]).toBe('2026-12-06');
  });

  it('febrero 2027 que empieza lunes ocupa 4 semanas', () => {
    expect(semanasDelMes('2027-02-10')).toHaveLength(4);
  });

  it('ningún rango pasa el máximo de 62 días del backend', () => {
    for (const v of ['mes', 'semana', 'agenda'] as const) {
      const r = rangoDeVista(v, '2026-11-15');
      const dias = (inicioDia(r.hasta).getTime() - inicioDia(r.desde).getTime()) / 86_400_000;
      expect(dias).toBeLessThanOrEqual(62);
    }
    expect(rangoDeVista('semana', '2026-11-05')).toEqual({ desde: '2026-11-02', hasta: '2026-11-09' });
    expect(rangoDeVista('agenda', '2026-11-05')).toEqual({ desde: '2026-11-02', hasta: '2026-11-16' });
  });

  it('navegar: mes salta de mes (31 ene → feb), semana 7 días, agenda 14', () => {
    expect(moverCursor('mes', '2027-01-31', 1)).toBe('2027-02-01');
    expect(moverCursor('mes', '2026-01-15', -1)).toBe('2025-12-01');
    expect(moverCursor('semana', '2026-11-05', 1)).toBe('2026-11-09');
    expect(moverCursor('agenda', '2026-11-05', -1)).toBe('2026-10-19');
  });

  it('títulos del rango', () => {
    expect(tituloRango('mes', '2026-11-02')).toBe('Noviembre 2026');
    expect(tituloRango('semana', '2026-11-02')).toBe('2 – 8 noviembre 2026');
    expect(tituloRango('semana', '2026-12-30')).toBe('28 dic 2026 – 3 ene 2027');
  });
});

describe('agrupar y filtrar', () => {
  const lista = [
    ev({ id: 'a', inicio: '2026-11-02T20:00:00.000Z', tipo: 'PAGO' }),
    ev({ id: 'b', inicio: '2026-11-02T14:00:00.000Z' }),
    ev({ id: 'c', inicio: '2026-11-02T05:00:00.000Z', todoElDia: true, fin: null, tipo: 'TAREA' }),
    ev({ id: 'd', inicio: '2026-11-03T04:59:00.000Z', tipo: 'RECORDATORIO' }),
  ];

  it('por día de Lima; todo el día primero y luego por hora', () => {
    const m = agruparPorDia(lista);
    expect(m.get('2026-11-02')?.map((e) => e.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('cuenta por tipo y filtra por la leyenda', () => {
    expect(contarPorTipo(lista)).toEqual({ REUNION: 1, TAREA: 1, PAGO: 1, RECORDATORIO: 1 });
    expect(filtrarPorTipo(lista, new Set(['PAGO'] as const)).map((e) => e.id)).toEqual(['a']);
  });
});

describe('vista semana', () => {
  it('posiciona por hora y duración (9:00–10:00 → 2 h después de las 7)', () => {
    const [b] = bloquesDelDia([ev()]);
    expect(b.top).toBe(2 * HORA_PX);
    expect(b.alto).toBe(HORA_PX);
    expect(b.columnas).toBe(1);
  });

  it('dos eventos que se cruzan van lado a lado; el tercero suelto ocupa todo', () => {
    const bs = bloquesDelDia([
      ev({ id: 'x', inicio: '2026-11-02T14:00:00.000Z', fin: '2026-11-02T15:00:00.000Z' }),
      ev({ id: 'y', inicio: '2026-11-02T14:30:00.000Z', fin: '2026-11-02T15:30:00.000Z' }),
      ev({ id: 'z', inicio: '2026-11-02T18:00:00.000Z', fin: '2026-11-02T19:00:00.000Z' }),
    ]);
    const por = Object.fromEntries(bs.map((b) => [b.evento.id, b]));
    expect([por.x.columna, por.y.columna]).toEqual([0, 1]);
    expect(por.x.columnas).toBe(2);
    expect(por.z.columnas).toBe(1);
  });

  it('sin fin dura 30 min visuales; antes de las 7 se pega arriba; todo el día no entra', () => {
    const bs = bloquesDelDia([
      ev({ id: 'sinfin', fin: null }),
      ev({ id: 'madrugada', inicio: '2026-11-02T10:00:00.000Z', fin: null }),
      ev({ id: 'dia', todoElDia: true }),
    ]);
    expect(bs.map((b) => b.evento.id).sort()).toEqual(['madrugada', 'sinfin']);
    expect(bs.find((b) => b.evento.id === 'sinfin')?.alto).toBe(HORA_PX / 2);
    expect(bs.find((b) => b.evento.id === 'madrugada')?.top).toBe(0);
  });

  it('línea de ahora solo entre 7am y 9pm', () => {
    expect(posicionAhora(new Date('2026-11-02T13:00:00.000Z'))).toBe(HORA_PX); // 8:00 Lima
    expect(posicionAhora(new Date('2026-11-02T10:00:00.000Z'))).toBeNull(); // 5:00 Lima
  });

  it('arrastrar conserva la duración y redondea a 15 min', () => {
    const r = moverEvento(ev(), '2026-11-04', 3 * HORA_PX + 20); // ~10:21 → 10:15
    expect(r).toEqual({ inicio: '2026-11-04T15:15:00.000Z', fin: '2026-11-04T16:15:00.000Z' });
    expect(moverEvento(ev(), '2026-11-02', 2 * HORA_PX)).toBeNull(); // mismo lugar
    expect(moverEvento(ev({ fin: null }), '2026-11-03', 0)).toEqual({ inicio: '2026-11-03T12:00:00.000Z', fin: null });
  });

  it('no se arrastran series, todo el día ni eventos ajenos', () => {
    expect(sePuedeArrastrar(ev())).toBe(true);
    expect(sePuedeArrastrar(ev({ repeticion: 'SEMANAL' }))).toBe(false);
    expect(sePuedeArrastrar(ev({ todoElDia: true }))).toBe(false);
    expect(sePuedeArrastrar(ev({ puedeEditar: false }))).toBe(false);
  });
});

describe('formulario', () => {
  it('título obligatorio y con tope; fin después del inicio', () => {
    const f = { ...formVacio('2026-11-02'), titulo: '   ', horaInicio: '10:00', horaFin: '09:00' };
    const e = validarForm(f);
    expect(e.titulo).toBeTruthy();
    expect(e.horaFin).toBe('Debe terminar después de empezar.');
    expect(validarForm({ ...f, titulo: 'x'.repeat(121), horaFin: '' }).titulo).toMatch(/120/);
  });

  it('descripción y lugar con tope; "hasta" no antes de la fecha', () => {
    const base = { ...formVacio('2026-11-10'), titulo: 'Pago luz' };
    expect(validarForm({ ...base, descripcion: 'x'.repeat(2001) }).descripcion).toBeTruthy();
    expect(validarForm({ ...base, lugar: 'x'.repeat(301) }).lugar).toBeTruthy();
    expect(validarForm({ ...base, repeticion: 'MENSUAL', repetirHasta: '2026-11-01' }).repetirHasta).toBeTruthy();
    expect(validarForm({ ...base, repeticion: 'MENSUAL', repetirHasta: '2027-11-01' })).toEqual({});
  });

  it('todo el día no exige hora', () => {
    expect(validarForm({ ...formVacio('2026-11-10'), titulo: 'Feriado', todoElDia: true, horaInicio: '' })).toEqual({});
  });

  it('arma el cuerpo en UTC desde la hora de Lima', () => {
    const input = aInput({
      ...formVacio('2026-11-02', '18:00'),
      titulo: '  Cierre de caja  ',
      tipo: 'TAREA',
      responsableId: '12',
      repeticion: 'SEMANAL',
      repetirHasta: '2026-12-31',
      recordatorioMin: 15,
      visibilidad: 'EQUIPO',
    });
    expect(input).toMatchObject({
      titulo: 'Cierre de caja',
      tipo: 'TAREA',
      inicio: '2026-11-02T23:00:00.000Z',
      fin: '2026-11-03T00:00:00.000Z',
      responsableId: 12,
      repeticion: 'SEMANAL',
      repetirHasta: '2027-01-01T04:59:00.000Z',
      recordatorioMin: 15,
      visibilidad: 'EQUIPO',
      descripcion: null,
      lugar: null,
    });
  });

  it('todo el día manda las 00:00 de Lima y sin fin; sin repetición no manda "hasta"', () => {
    const input = aInput({ ...formVacio('2026-11-02'), titulo: 'Inventario', todoElDia: true, repetirHasta: '2026-12-01' });
    expect(input.inicio).toBe('2026-11-02T05:00:00.000Z');
    expect(input.fin).toBeNull();
    expect(input.repetirHasta).toBeNull();
  });

  it('editar: solo viaja lo que cambió (en una serie no se mueve el inicio si no se tocó)', () => {
    const serie = ev({ repeticion: 'SEMANAL', inicio: '2026-11-16T14:00:00.000Z', fin: '2026-11-16T15:00:00.000Z' });
    expect(aPatch({ ...formDesde(serie), titulo: 'Nuevo título' }, serie)).toEqual({ titulo: 'Nuevo título' });
    const conHora = aPatch({ ...formDesde(serie), horaInicio: '10:00', horaFin: '11:00' }, serie);
    expect(conHora).toEqual({ inicio: '2026-11-16T15:00:00.000Z', fin: '2026-11-16T16:00:00.000Z', todoElDia: false });
    expect(aPatch(formDesde(serie), serie)).toEqual({});
  });

  it('un evento que termina al día siguiente se puede editar sin error de hora', () => {
    const noche = ev({ inicio: '2026-11-03T03:00:00.000Z', fin: '2026-11-03T06:00:00.000Z' }); // 22:00 → 01:00
    const f = formDesde(noche);
    expect(f.horaFin).toBe('');
    expect(validarForm(f)).toEqual({});
    expect(aPatch({ ...f, titulo: 'Inventario nocturno' }, noche)).toEqual({ titulo: 'Inventario nocturno' });
  });

  it('marcar hecho: en una serie va la ocurrencia', () => {
    expect(cuerpoCompletar(ev(), true)).toEqual({ completado: true });
    const s = ev({ repeticion: 'DIARIA', inicio: '2026-11-05T14:00:00.000Z' });
    expect(cuerpoCompletar(s, false)).toEqual({ ocurrencia: '2026-11-05T14:00:00.000Z', completado: false });
  });
});

describe('textos y errores', () => {
  it('duración, faltan y día', () => {
    expect(textoDuracion(30)).toBe('30 min');
    expect(textoDuracion(90)).toBe('1 h 30 min');
    expect(textoDuracion(null)).toBe('');
    expect(textoFaltan('2026-11-03', '2026-11-02')).toBe('Mañana');
    expect(textoFaltan('2026-11-06', '2026-11-02')).toBe('En 4 días');
    expect(etiquetaDia('2026-11-02', '2026-11-02')).toBe('Hoy · Lunes 2 de noviembre');
  });

  it('lee el mensaje del backend y reconoce el 403 de plan', () => {
    const plan = { response: { status: 403, data: { message: 'Tu plan no incluye la Agenda. Consulta con tu proveedor para activarla.' } } };
    expect(esErrorSinPlan(plan)).toBe(true);
    expect(esErrorSinPlan({ response: { status: 403, data: { message: 'No puedes editar este evento.' } } })).toBe(false);
    expect(mensajeError({ response: { data: { message: ['El título es obligatorio'] } } }, 'x')).toBe('El título es obligatorio');
    expect(mensajeError(new Error('red'), 'No se pudo')).toBe('No se pudo');
  });
});

describe('enlace desde la campana', () => {
  it('origen AGENDA → día de Lima de la ocurrencia y el evento', () => {
    expect(
      linkAlAgenda({ origen: 'AGENDA', agendaEventoId: 12, ocurrencia: '2026-11-03T03:30:00.000Z', url: '/administrador/mi-negocio/agenda' }),
    ).toBe('/administrador/mi-negocio/agenda?fecha=2026-11-02&evento=12');
    expect(linkAlAgenda({ origen: 'AGENDA' })).toBe('/administrador/mi-negocio/agenda');
    expect(linkAlAgenda({ origen: 'AGENDA', agendaEventoId: 'x', ocurrencia: 'no-fecha' })).toBe('/administrador/mi-negocio/agenda');
  });

  it('otros avisos no son de la agenda', () => {
    expect(linkAlAgenda({ comprobanteId: 3 })).toBeNull();
    expect(linkAlAgenda({ origen: 'ia-ventas:lead', conversacionId: 4 })).toBeNull();
    expect(linkAlAgenda(null)).toBeNull();
  });

  it('lee la URL y descarta basura', () => {
    expect(leerObjetivo(new URLSearchParams('fecha=2026-11-02&evento=12'))).toEqual({ fecha: '2026-11-02', eventoId: 12 });
    expect(leerObjetivo(new URLSearchParams('fecha=02/11/2026&evento=-1'))).toEqual({ fecha: null, eventoId: null });
  });
});
