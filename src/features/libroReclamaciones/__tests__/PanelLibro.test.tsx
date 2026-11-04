import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import apiClient from '@/utils/apiClient';
import LibroReclamacionesPanel from '@/pages/admin/tienda/LibroReclamaciones';
import type { Reclamo } from '../tipos';

jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
const alertMock = jest.fn();
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: alertMock }) }));

const api = apiClient as unknown as { get: jest.Mock; post: jest.Mock };

const base: Reclamo = {
  id: 7, codigo: '2026-000007', estado: 'PENDIENTE', fecha: '2026-10-20T15:00:00Z', fechaLimite: '2026-11-11T04:59:59Z',
  diasHabilesRestantes: 2, tipo: 'RECLAMO', nombres: 'Ana Pérez', tipoDocumento: 'DNI', numeroDocumento: '12345678',
  domicilio: 'Av. Siempre Viva 123', telefono: '987654321', email: 'ana@correo.pe', menorDeEdad: false,
  apoderadoNombre: null, apoderadoDocumento: null, bienTipo: 'PRODUCTO', bienDescripcion: 'Zapatillas',
  montoReclamado: '150.90', pedidoCodigo: 'PED-1', detalle: 'Suela despegada al segundo día.', pedidoConsumidor: 'Cambio',
  respuesta: null, fechaRespuesta: null, respondidoPor: null,
};
const vencido: Reclamo = { ...base, id: 8, codigo: '2026-000008', estado: 'VENCIDO', diasHabilesRestantes: -3, nombres: 'Luis Rojas', tipo: 'QUEJA' };
const respondido: Reclamo = { ...base, respuesta: 'Le cambiamos el producto sin costo.', estado: 'RESPONDIDO', diasHabilesRestantes: null, fechaRespuesta: '2026-10-22T15:00:00Z', respondidoPor: { id: 1, nombre: 'Dueño' } };

const listado = (data: Reclamo[]) => ({ data: { data: { data, total: data.length, resumen: { pendientes: 1, vencidos: 1, porVencer: 1, respondidos: 4 } } } });
const conflicto = () => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('409', 'ERR', config, {}, { status: 409, statusText: '', headers: {}, config, data: { message: 'Ya respondido' } });
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(async (url: string) => {
    if (url === '/libro-reclamaciones') return listado([base, vencido]);
    if (url === '/libro-reclamaciones/7') return { data: { data: base } };
    throw new Error(`GET inesperado ${url}`);
  });
});

const abrirDetalle = async () => {
  render(<LibroReclamacionesPanel />);
  fireEvent.click(await screen.findByText('2026-000007'));
  return screen.findByRole('dialog');
};

describe('panel Libro de Reclamaciones', () => {
  it('muestra resumen, tabla y semáforo de plazos', async () => {
    render(<LibroReclamacionesPanel />);
    expect(await screen.findByText('2026-000007')).toBeInTheDocument();
    expect(screen.getByTestId('resumen-respondidos')).toHaveTextContent('4');
    expect(screen.getByTestId('resumen-porVencer')).toHaveTextContent('1');
    const filaVencida = screen.getByText('2026-000008').closest('tr')!;
    expect(within(filaVencida).getByText('Vencido hace 3 d. hábiles')).toHaveAttribute('data-nivel', 'vencido');
    expect(within(screen.getByText('2026-000007').closest('tr')!).getByText('2 d. hábiles')).toHaveAttribute('data-nivel', 'urgente');
  });

  it('filtra por estado y busca', async () => {
    render(<LibroReclamacionesPanel />);
    await screen.findByText('2026-000007');
    fireEvent.click(screen.getByRole('tab', { name: 'Vencidos' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/libro-reclamaciones', { params: expect.objectContaining({ estado: 'VENCIDO', page: 1 }) }));
    fireEvent.change(screen.getByLabelText('Buscar reclamos'), { target: { value: ' 1234 ' } });
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/libro-reclamaciones', { params: expect.objectContaining({ search: '1234' }) }), { timeout: 2000 });
  });

  it('el detalle muestra la hoja completa', async () => {
    const dialogo = await abrirDetalle();
    expect(await within(dialogo).findByText('Suela despegada al segundo día.')).toBeInTheDocument();
    expect(within(dialogo).getByText('S/ 150.90')).toBeInTheDocument();
    expect(within(dialogo).getByText('PED-1')).toBeInTheDocument();
  });

  it('respuesta corta no se envía', async () => {
    const dialogo = await abrirDetalle();
    fireEvent.change(await within(dialogo).findByLabelText('Responder al consumidor'), { target: { value: 'ok' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Enviar respuesta/ }));
    expect(within(dialogo).getByText('Escribe al menos 10 caracteres.')).toBeInTheDocument();
    expect(screen.queryByText('¿Enviar la respuesta?')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('pide confirmación, responde una sola vez y bloquea el formulario', async () => {
    api.post.mockResolvedValue({ data: { data: respondido } });
    const dialogo = await abrirDetalle();
    fireEvent.change(await within(dialogo).findByLabelText('Responder al consumidor'), { target: { value: 'Le cambiamos el producto sin costo.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Enviar respuesta/ }));
    expect(api.post).not.toHaveBeenCalled();
    expect(await screen.findByText('¿Enviar la respuesta?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, enviar respuesta' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/libro-reclamaciones/7/respuesta', { respuesta: 'Le cambiamos el producto sin costo.' }));
    expect(await within(dialogo).findByTestId('respuesta-registrada')).toHaveTextContent('Le cambiamos el producto sin costo.');
    expect(within(dialogo).queryByLabelText('Responder al consumidor')).toBeNull();
    expect(alertMock).toHaveBeenCalledWith('Respuesta registrada para 2026-000007.', 'success');
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('409: ya estaba respondido, avisa y muestra la respuesta guardada', async () => {
    api.post.mockRejectedValue(conflicto());
    const dialogo = await abrirDetalle();
    api.get.mockImplementation(async (url: string) => (url === '/libro-reclamaciones/7' ? { data: { data: respondido } } : listado([base])));
    fireEvent.change(await within(dialogo).findByLabelText('Responder al consumidor'), { target: { value: 'Otra respuesta distinta.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /Enviar respuesta/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, enviar respuesta' }));
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Este reclamo ya tiene una respuesta registrada.', 'error'));
    expect(await within(dialogo).findByTestId('respuesta-registrada')).toHaveTextContent('Le cambiamos el producto sin costo.');
  });

  it('un reclamo respondido abre sin formulario de respuesta', async () => {
    api.get.mockImplementation(async (url: string) => (url === '/libro-reclamaciones/7' ? { data: { data: respondido } } : listado([respondido])));
    const dialogo = await abrirDetalle();
    expect(await within(dialogo).findByTestId('respuesta-registrada')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: /Enviar respuesta/ })).toBeNull();
  });

  it('exportar valida el rango antes de pedir el Excel', async () => {
    render(<LibroReclamacionesPanel />);
    await screen.findByText('2026-000007');
    fireEvent.change(screen.getByLabelText('Exportar desde'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('Exportar hasta'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('rango válido'), 'warning');
    expect(api.get).not.toHaveBeenCalledWith('/libro-reclamaciones/exportar', expect.anything());
  });

  it('exporta el rango elegido', async () => {
    (URL as any).createObjectURL = jest.fn(() => 'blob:x');
    (URL as any).revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.get.mockImplementation(async (url: string) => (url === '/libro-reclamaciones/exportar' ? { data: new Blob(['x']) } : listado([base])));
    render(<LibroReclamacionesPanel />);
    await screen.findByText('2026-000007');
    fireEvent.change(screen.getByLabelText('Exportar desde'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Exportar hasta'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/libro-reclamaciones/exportar', expect.objectContaining({ params: { desde: '2026-10-01', hasta: '2026-10-31' }, responseType: 'blob' })));
    await waitFor(() => expect(click).toHaveBeenCalled());
  });
});
