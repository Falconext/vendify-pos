import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAlertStore from '@/zustand/alert';
import { agendaService } from '@/services/agenda.service';
import {
  TIPOS,
  aInput,
  aPatch,
  agruparPorDia,
  claveDia,
  contarPorTipo,
  cuerpoCompletar,
  esErrorSinPlan,
  filtrarPorTipo,
  formDesde,
  formVacio,
  inicioDia,
  mensajeError,
  moverCursor,
  moverEvento,
  rangoDeVista,
  type AgendaOcurrencia,
  type AgendaResumen,
  type AgendaTipo,
  type AgendaUsuarioMin,
  type FormEvento,
  type Vista,
} from './AgendaModel';

const CLAVE_VISTA = 'agenda:vista';

const leerVista = (): Vista => {
  try {
    const v = localStorage.getItem(CLAVE_VISTA);
    return v === 'semana' || v === 'agenda' || v === 'mes' ? v : 'mes';
  } catch {
    return 'mes';
  }
};

export interface EstadoModal {
  /** null = evento nuevo */
  evento: AgendaOcurrencia | null;
  form: FormEvento;
}

export function useAgendaViewModel(fechaInicial?: string | null) {
  const { alert } = useAlertStore();
  const [hoy] = useState(() => claveDia(new Date()));
  const [vista, setVista] = useState<Vista>(leerVista);
  const [cursor, setCursor] = useState(() => fechaInicial ?? hoy);
  const [soloMios, setSoloMios] = useState(false);
  const [tiposVisibles, setTiposVisibles] = useState<ReadonlySet<AgendaTipo>>(() => new Set(TIPOS));

  const [eventos, setEventos] = useState<AgendaOcurrencia[]>([]);
  const eventosRef = useRef(eventos);
  eventosRef.current = eventos;
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [resumen, setResumen] = useState<AgendaResumen | null>(null);
  const [usuarios, setUsuarios] = useState<AgendaUsuarioMin[]>([]);

  const [modal, setModal] = useState<EstadoModal | null>(null);
  const [guardando, setGuardando] = useState(false);

  const rango = useMemo(() => rangoDeVista(vista, cursor), [vista, cursor]);
  const desdeIso = useMemo(() => inicioDia(rango.desde).toISOString(), [rango.desde]);
  const hastaIso = useMemo(() => inicioDia(rango.hasta).toISOString(), [rango.hasta]);

  // Solo vale la última respuesta: navegar rápido no debe pintar un mes viejo.
  const pedido = useRef(0);

  const cargarEventos = useCallback(async () => {
    const n = ++pedido.current;
    setCargando(true);
    try {
      const lista = await agendaService.eventos({ desde: desdeIso, hasta: hastaIso, soloMios });
      if (n !== pedido.current) return;
      setEventos(Array.isArray(lista) ? lista : []);
      setError(null);
    } catch (err) {
      if (n !== pedido.current) return;
      if (esErrorSinPlan(err)) setSinPlan(true);
      else setError(mensajeError(err, 'No se pudo cargar la agenda.'));
    } finally {
      if (n === pedido.current) setCargando(false);
    }
  }, [desdeIso, hastaIso, soloMios]);

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await agendaService.resumen());
    } catch (err) {
      if (esErrorSinPlan(err)) setSinPlan(true);
    }
  }, []);

  useEffect(() => {
    void cargarEventos();
  }, [cargarEventos]);

  useEffect(() => {
    void cargarResumen();
    agendaService
      .usuarios()
      .then((u) => setUsuarios(Array.isArray(u) ? u : []))
      .catch(() => setUsuarios([]));
  }, [cargarResumen]);

  const refrescar = useCallback(() => {
    void cargarEventos();
    void cargarResumen();
  }, [cargarEventos, cargarResumen]);

  /* ── Derivados ── */
  const conteo = useMemo(() => contarPorTipo(eventos), [eventos]);
  const visibles = useMemo(() => filtrarPorTipo(eventos, tiposVisibles), [eventos, tiposVisibles]);
  const porDia = useMemo(() => agruparPorDia(visibles), [visibles]);
  const diasConEventos = useMemo(() => new Set(agruparPorDia(eventos).keys()), [eventos]);

  /* ── Navegación ── */
  const cambiarVista = useCallback((v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* sin almacenamiento: solo no se recuerda */
    }
  }, []);
  const anterior = useCallback(() => setCursor((c) => moverCursor(vista, c, -1)), [vista]);
  const siguiente = useCallback(() => setCursor((c) => moverCursor(vista, c, 1)), [vista]);
  const irHoy = useCallback(() => setCursor(hoy), [hoy]);
  const irADia = useCallback(
    (dia: string, v?: Vista) => {
      setCursor(dia);
      if (v) cambiarVista(v);
    },
    [cambiarVista],
  );

  const alternarTipo = useCallback((t: AgendaTipo) => {
    setTiposVisibles((prev) => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return s;
    });
  }, []);

  /* ── Modal ── */
  const abrirNuevo = useCallback(
    (fecha?: string, hora?: string) => setModal({ evento: null, form: formVacio(fecha ?? hoy, hora) }),
    [hoy],
  );
  const abrirEvento = useCallback((e: AgendaOcurrencia) => setModal({ evento: e, form: formDesde(e) }), []);
  const cerrarModal = useCallback(() => setModal(null), []);

  const guardar = useCallback(
    async (form: FormEvento) => {
      if (!modal) return;
      setGuardando(true);
      try {
        if (modal.evento) {
          const cambios = aPatch(form, modal.evento);
          if (Object.keys(cambios).length) await agendaService.editar(modal.evento.eventoId, cambios);
          alert('Evento actualizado', 'success');
        } else {
          await agendaService.crear(aInput(form));
          alert('Evento agendado', 'success');
        }
        setModal(null);
        refrescar();
      } catch (err) {
        alert(mensajeError(err, 'No se pudo guardar el evento.'), 'error');
      } finally {
        setGuardando(false);
      }
    },
    [modal, alert, refrescar],
  );

  const eliminar = useCallback(async () => {
    if (!modal?.evento) return;
    setGuardando(true);
    try {
      await agendaService.eliminar(modal.evento.eventoId);
      alert('Evento eliminado', 'success');
      setModal(null);
      refrescar();
    } catch (err) {
      alert(mensajeError(err, 'No se pudo eliminar el evento.'), 'error');
    } finally {
      setGuardando(false);
    }
  }, [modal, alert, refrescar]);

  /** Marca/desmarca al toque; si el servidor dice que no, se revierte. */
  const completar = useCallback(
    async (e: AgendaOcurrencia, completado: boolean) => {
      const cambiar = (valor: boolean) =>
        setEventos((prev) => prev.map((x) => (x.id === e.id ? { ...x, completado: valor, vencido: valor ? false : x.vencido } : x)));
      cambiar(completado);
      setModal((m) => (m?.evento?.id === e.id ? { ...m, evento: { ...m.evento, completado } } : m));
      try {
        const r = await agendaService.completar(e.eventoId, cuerpoCompletar(e, completado));
        if (r && r.id) setEventos((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...r, id: x.id } : x)));
        void cargarResumen();
      } catch (err) {
        cambiar(e.completado);
        setModal((m) => (m?.evento?.id === e.id ? { ...m, evento: { ...m.evento, completado: e.completado } } : m));
        alert(mensajeError(err, 'No se pudo actualizar el evento.'), 'error');
      }
    },
    [alert, cargarResumen],
  );

  /** Arrastrar en la semana: mismo evento, otro día/hora, misma duración. */
  const mover = useCallback(
    async (e: AgendaOcurrencia, dia: string, offsetPx: number) => {
      const nuevo = moverEvento(e, dia, offsetPx);
      if (!nuevo) return;
      const previo = eventosRef.current;
      setEventos((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...nuevo } : x)));
      try {
        await agendaService.editar(e.eventoId, nuevo);
        refrescar();
      } catch (err) {
        setEventos(previo);
        alert(mensajeError(err, 'No se pudo mover el evento.'), 'error');
      }
    },
    [alert, refrescar],
  );

  const actions = useMemo(
    () => ({
      cambiarVista,
      anterior,
      siguiente,
      irHoy,
      irADia,
      alternarTipo,
      setSoloMios,
      abrirNuevo,
      abrirEvento,
      cerrarModal,
      guardar,
      eliminar,
      completar,
      mover,
      refrescar,
    }),
    [cambiarVista, anterior, siguiente, irHoy, irADia, alternarTipo, abrirNuevo, abrirEvento, cerrarModal, guardar, eliminar, completar, mover, refrescar],
  );

  return {
    hoy,
    vista,
    cursor,
    rango,
    soloMios,
    tiposVisibles,
    eventos,
    visibles,
    porDia,
    conteo,
    diasConEventos,
    cargando,
    error,
    sinPlan,
    resumen,
    usuarios,
    modal,
    guardando,
    actions,
  };
}

export type AgendaVM = ReturnType<typeof useAgendaViewModel>;
