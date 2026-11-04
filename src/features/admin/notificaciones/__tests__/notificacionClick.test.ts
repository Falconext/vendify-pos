/**
 * Clic en una notificación: cada origen lleva a su pantalla.
 */
import { renderHook, act } from '@testing-library/react';

const navigateMock = jest.fn();
const marcarMock = jest.fn().mockResolvedValue(undefined);
jest.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
jest.mock('@/zustand/notificaciones', () => ({
  useNotificacionesStore: () => ({
    notificaciones: [],
    noLeidas: 0,
    loading: false,
    obtenerNotificaciones: jest.fn(),
    marcarComoLeida: marcarMock,
    marcarTodasComoLeidas: jest.fn(),
  }),
}));

import { useNotificacionesViewModel } from '../useNotificacionesViewModel';

beforeEach(() => jest.clearAllMocks());

it('recordatorio de la Agenda → ese día con el evento', async () => {
  const { result } = renderHook(() => useNotificacionesViewModel());
  await act(() =>
    result.current.handleNotificacionClick({
      id: 1,
      leida: false,
      metaData: { origen: 'AGENDA', agendaEventoId: 8, ocurrencia: '2026-11-05T14:00:00.000Z', url: '/administrador/mi-negocio/agenda' },
    }),
  );
  expect(marcarMock).toHaveBeenCalledWith(1);
  expect(navigateMock).toHaveBeenCalledWith('/administrador/mi-negocio/agenda?fecha=2026-11-05&evento=8');
});

it('un aviso de comprobante no navega', async () => {
  const { result } = renderHook(() => useNotificacionesViewModel());
  await act(() => result.current.handleNotificacionClick({ id: 3, leida: true, metaData: { comprobanteId: 5 } }));
  expect(navigateMock).not.toHaveBeenCalled();
});
