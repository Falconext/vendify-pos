/**
 * Agenda contra el contrato del backend (mockeado: el backend se construye en
 * paralelo). Qué se pide, qué se manda y qué ve el usuario.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { AgendaOcurrencia } from '../AgendaModel';

const getMock = jest.fn();
const postMock = jest.fn();
const patchMock = jest.fn();
const deleteMock = jest.fn();
const alertMock = jest.fn();

jest.mock('@/utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: (u: string) => getMock(u),
    post: (u: string, b: unknown) => postMock(u, b),
    patch: (u: string, b: unknown) => patchMock(u, b),
    delete: (u: string) => deleteMock(u),
  },
}));
jest.mock('@/zustand/alert', () => ({
  __esModule: true,
  default: () => ({ alert: alertMock }),
}));
jest.mock('@iconify/react', () => ({ Icon: () => null }));

let authMock: unknown = null;
jest.mock('@/zustand/auth', () => ({
  useAuthStore: (sel?: (s: { auth: unknown }) => unknown) => (sel ? sel({ auth: authMock }) : { auth: authMock }),
}));

import AgendaView from '../AgendaView';
import AgendaPage from '@/pages/admin/agenda/Agenda';
import { itemsAgenda } from '@/layouts/sidebar/sidebarMeta';

const ev = (p: Partial<AgendaOcurrencia> = {}): AgendaOcurrencia => ({
  id: `1:${p.inicio ?? '2026-11-02T14:00:00.000Z'}`,
  eventoId: 1,
  titulo: 'Reunión con proveedor',
  descripcion: null,
  lugar: 'Oficina',
  tipo: 'REUNION',
  prioridad: 'MEDIA',
  visibilidad: 'PERSONAL',
  inicio: '2026-11-02T14:00:00.000Z',
  fin: '2026-11-02T15:00:00.000Z',
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

const sobre = (data: unknown) => Promise.resolve({ data: { code: 1, message: 'ok', data } });

const EVENTOS = [
  ev(),
  ev({ id: '2:x', eventoId: 2, titulo: 'Pagar alquiler', tipo: 'PAGO', inicio: '2026-11-05T17:00:00.000Z', fin: null, prioridad: 'ALTA' }),
  ev({
    id: '3:2026-11-03T13:00:00.000Z',
    eventoId: 3,
    titulo: 'Cuadrar caja',
    tipo: 'TAREA',
    inicio: '2026-11-03T13:00:00.000Z',
    fin: null,
    repeticion: 'DIARIA',
    responsable: { id: 9, nombre: 'Ana Pérez' },
  }),
];

const servir = (eventos: AgendaOcurrencia[] = EVENTOS) =>
  getMock.mockImplementation((u: string) => {
    if (u.startsWith('/agenda/eventos')) return sobre(eventos);
    if (u === '/agenda/resumen') return sobre({ hoy: [eventos[0]], proximos: eventos.slice(1), vencidos: 2 });
    if (u === '/agenda/usuarios') return sobre([{ id: 7, nombre: 'Diego Ortega' }, { id: 9, nombre: 'Ana Pérez' }]);
    return Promise.reject(new Error(`GET inesperado ${u}`));
  });

/** Consultas dentro del calendario (el panel lateral repite títulos). */
const cal = () => within(screen.getByRole('region', { name: 'Calendario' }));

const montar = () =>
  render(
    <MemoryRouter>
      <AgendaView />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-02T15:30:00.000Z'), advanceTimers: true }); // lun 2 nov, 10:30 Lima
  jest.clearAllMocks();
  try {
    localStorage.clear();
  } catch {
    /* jsdom */
  }
  servir();
});
afterEach(() => jest.useRealTimers());

describe('AgendaView', () => {
  it('pide el mes visible (6 semanas, 00:00 de Lima) y pinta eventos, leyenda con contador y resumen', async () => {
    montar();
    expect(await cal().findByText('Pagar alquiler')).toBeInTheDocument();
    const url = getMock.mock.calls.map((c) => c[0] as string).find((u) => u.startsWith('/agenda/eventos'));
    expect(url).toBe('/agenda/eventos?desde=2026-10-26T05%3A00%3A00.000Z&hasta=2026-12-07T05%3A00%3A00.000Z');
    expect(screen.getByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagos\s*1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(/pendientes vencidos/)).toBeInTheDocument();
  });

  it('la leyenda oculta y vuelve a mostrar un tipo', async () => {
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getByRole('button', { name: /Pagos\s*1/ }));
    expect(cal().queryByText('Pagar alquiler')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pagos\s*1/ }));
    expect(cal().getByText('Pagar alquiler')).toBeInTheDocument();
  });

  it('"Solo míos" vuelve a pedir con soloMios=true', async () => {
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getByLabelText('Solo míos'));
    await waitFor(() => expect(getMock.mock.calls.some((c) => String(c[0]).includes('soloMios=true'))).toBe(true));
  });

  it('crear: valida el título y luego manda el contrato en UTC', async () => {
    postMock.mockReturnValue(sobre(ev({ id: '9:x', eventoId: 9 })));
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getAllByRole('button', { name: /Nuevo evento/ })[0]);
    const dialogo = await screen.findByRole('heading', { name: 'Nuevo evento' });
    expect(dialogo).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(await screen.findByText('Escribe un título.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Llamar al contador' } });
    fireEvent.click(screen.getByRole('radio', { name: /Tarea/ }));
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Avisarme'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    const [url, body] = postMock.mock.calls[0];
    expect(url).toBe('/agenda/eventos');
    expect(body).toMatchObject({
      titulo: 'Llamar al contador',
      tipo: 'TAREA',
      inicio: '2026-11-02T14:00:00.000Z',
      fin: '2026-11-02T15:00:00.000Z',
      responsableId: 9,
      recordatorioMin: 60,
      repeticion: 'NINGUNA',
      visibilidad: 'PERSONAL',
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Evento agendado', 'success'));
  });

  it('marcar hecho en la vista Agenda: en una serie manda la ocurrencia y tacha al toque', async () => {
    let resolver: (v: unknown) => void = () => undefined;
    postMock.mockReturnValue(new Promise((r) => (resolver = r)));
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    const check = await cal().findByRole('checkbox', { name: /Marcar "Cuadrar caja" como hecho/ });
    fireEvent.click(check);
    expect(postMock).toHaveBeenCalledWith('/agenda/eventos/3/completar', { ocurrencia: '2026-11-03T13:00:00.000Z', completado: true });
    expect(cal().getByRole('checkbox', { name: /Marcar "Cuadrar caja" como pendiente/ })).toHaveAttribute('aria-checked', 'true');
    await act(async () => resolver({ data: { data: { ...EVENTOS[2], completado: true } } }));
  });

  it('si el servidor rechaza "hecho", se revierte y avisa', async () => {
    postMock.mockReturnValue(Promise.reject({ response: { status: 403, data: { message: 'No puedes completar este evento.' } } }));
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    fireEvent.click(await cal().findByRole('checkbox', { name: /Marcar "Pagar alquiler" como hecho/ }));
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('No puedes completar este evento.', 'error'));
    expect(cal().getByRole('checkbox', { name: /Marcar "Pagar alquiler" como hecho/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('editar una serie avisa que aplica a todas y solo manda lo que cambió', async () => {
    patchMock.mockReturnValue(sobre(EVENTOS[2]));
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(cal().getByRole('button', { name: /Cuadrar caja/ }));
    expect(await screen.findByText('Se aplica a todas las repeticiones.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Cuadrar caja y bancos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith('/agenda/eventos/3', { titulo: 'Cuadrar caja y bancos' }));
  });

  it('eliminar pide confirmación y llama DELETE', async () => {
    deleteMock.mockReturnValue(sobre({ ok: true }));
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(cal().getByRole('button', { name: /Pagar alquiler/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(deleteMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/agenda/eventos/2'));
  });

  it('evento ajeno sin permiso de edición: campos bloqueados, sin Eliminar ni Guardar', async () => {
    servir([ev({ puedeEditar: false, puedeCompletar: false, creador: { id: 3, nombre: 'Luis Soto' } })]);
    montar();
    await cal().findByText('Reunión con proveedor');
    fireEvent.click(cal().getByRole('button', { name: /Reunión con proveedor/ }));
    expect(await screen.findByRole('heading', { name: 'Detalle del evento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar hecho/ })).not.toBeInTheDocument();
  });

  it('vista Semana: navegar pide la semana siguiente; Hoy vuelve', async () => {
    montar();
    await cal().findByText('Pagar alquiler');
    fireEvent.click(screen.getByRole('tab', { name: 'Semana' }));
    expect(screen.getByRole('heading', { name: '2 – 8 noviembre 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: '9 – 15 noviembre 2026' })).toBeInTheDocument();
    await waitFor(() =>
      expect(getMock.mock.calls.some((c) => String(c[0]).includes('desde=2026-11-09T05%3A00%3A00.000Z'))).toBe(true),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByRole('heading', { name: '2 – 8 noviembre 2026' })).toBeInTheDocument();
  });

  it('403 de plan desde el backend muestra el aviso del plan', async () => {
    getMock.mockImplementation(() =>
      Promise.reject({ response: { status: 403, data: { message: 'Tu plan no incluye la Agenda. Consulta con tu proveedor para activarla.' } } }),
    );
    montar();
    expect(await screen.findByRole('heading', { name: 'Tu plan no incluye la Agenda' })).toBeInTheDocument();
  });

  it('error de red: mensaje y Reintentar', async () => {
    getMock.mockImplementation((u: string) =>
      u.startsWith('/agenda/eventos') ? Promise.reject(new Error('timeout')) : sobre(u === '/agenda/resumen' ? { hoy: [], proximos: [], vencidos: 0 } : []),
    );
    montar();
    expect(await screen.findByText('No se pudo cargar la agenda.')).toBeInTheDocument();
    servir();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await cal().findByText('Pagar alquiler')).toBeInTheDocument();
  });

  it('panel "Próximos" dice cuántos días faltan', async () => {
    montar();
    const proximos = (await screen.findByText('Próximos')).closest('div')!.parentElement!;
    await waitFor(() => expect(within(proximos).getByText('Mañana')).toBeInTheDocument());
    expect(within(proximos).getByText('En 3 días')).toBeInTheDocument();
  });
});

describe('desde un recordatorio de la campana', () => {
  it('?fecha&evento abre ese día con el evento y limpia la URL', async () => {
    const lejano = ev({ id: '5:2026-12-15T15:00:00.000Z', eventoId: 5, titulo: 'Renovar licencia', inicio: '2026-12-15T15:00:00.000Z', fin: null });
    servir([lejano]);
    render(
      <MemoryRouter initialEntries={['/administrador/mi-negocio/agenda?fecha=2026-12-15&evento=5']}>
        <AgendaView />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Editar evento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Renovar licencia');
    expect(screen.getByRole('heading', { name: 'Diciembre 2026' })).toBeInTheDocument();
    const url = getMock.mock.calls.map((c) => c[0] as string).find((u) => u.startsWith('/agenda/eventos'));
    expect(url).toContain('desde=2026-11-30T05%3A00%3A00.000Z');
  });

  it('parámetros basura se ignoran: abre el mes actual sin modal', async () => {
    render(
      <MemoryRouter initialEntries={['/administrador/mi-negocio/agenda?fecha=2026-13-99&evento=abc']}>
        <AgendaView />
      </MemoryRouter>,
    );
    await cal().findByText('Pagar alquiler');
    expect(screen.getByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar evento' })).not.toBeInTheDocument();
  });
});

describe('plan sin Agenda', () => {
  it('sin tieneAgenda: la ruta muestra el aviso y no llama a la API; el menú no tiene el ítem', () => {
    authMock = { rol: 'ADMIN_EMPRESA', empresa: { plan: { features: { tieneAgenda: false } } } };
    render(
      <MemoryRouter>
        <AgendaPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Tu plan no incluye la Agenda' })).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
    expect(itemsAgenda(authMock)).toEqual([]);
  });

  it('con tieneAgenda: aparece en Mi negocio y la página carga', async () => {
    authMock = { rol: 'USUARIO_EMPRESA', empresa: { plan: { features: { tieneAgenda: true } } } };
    expect(itemsAgenda(authMock)).toEqual([{ codigo: 'mi-negocio:agenda', nombre: 'Agenda', ruta: '/administrador/mi-negocio/agenda' }]);
    render(
      <MemoryRouter>
        <AgendaPage />
      </MemoryRouter>,
    );
    expect(await cal().findByText('Pagar alquiler')).toBeInTheDocument();
  });
});
