import axios, { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HojaReclamacion from '../HojaReclamacion';
import type { ProveedorLibro } from '../tipos';

const proveedor: ProveedorLibro = {
  razonSocial: 'ZAPATERÍA ANA S.A.C.',
  ruc: '20123456789',
  direccion: 'Jr. Lima 100, Lima',
  nombreComercial: 'Zapas Ana',
  logo: null,
};

const errorHttp = (status: number, message: string) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, {}, { status, statusText: '', headers: {}, config, data: { message } });
};

const pintar = () => render(<HojaReclamacion slug="zapas" proveedor={proveedor} color="#0f766e" />);
const campo = (form: HTMLElement, name: string) => form.querySelector(`[name="${name}"]`) as HTMLInputElement;
const escribir = (form: HTMLElement, name: string, value: string) => fireEvent.change(campo(form, name), { target: { value } });

function llenar(form: HTMLElement) {
  escribir(form, 'nombres', 'Ana Pérez');
  escribir(form, 'numeroDocumento', '12345678');
  escribir(form, 'domicilio', 'Av. Siempre Viva 123');
  escribir(form, 'telefono', '987654321');
  escribir(form, 'email', 'ana@correo.pe');
  escribir(form, 'bienDescripcion', 'Zapatillas talla 40');
  escribir(form, 'montoReclamado', '150,90');
  escribir(form, 'detalle', 'Llegaron con la suela despegada.');
  escribir(form, 'pedidoConsumidor', 'Cambio del producto');
  fireEvent.click(campo(form, 'aceptaDeclaracion'));
}

beforeEach(() => { window.scrollTo = jest.fn() as any; });
afterEach(() => jest.restoreAllMocks());

describe('HojaReclamacion', () => {
  it('muestra la cabecera formal con los datos del proveedor', () => {
    pintar();
    expect(screen.getByRole('heading', { name: 'Libro de Reclamaciones' })).toBeInTheDocument();
    expect(screen.getByText('Hoja de reclamación')).toBeInTheDocument();
    expect(screen.getByText('ZAPATERÍA ANA S.A.C.')).toBeInTheDocument();
    expect(screen.getByText('RUC: 20123456789')).toBeInTheDocument();
    expect(screen.getByText('Se asigna al enviar')).toBeInTheDocument();
  });

  it('explica la diferencia entre reclamo y queja', () => {
    pintar();
    expect(screen.getByText(/relacionada con los productos o servicios\./)).toBeInTheDocument();
    expect(screen.getByText(/atención al público/)).toBeInTheDocument();
  });

  it('el honeypot existe pero está fuera de la vista y del teclado', () => {
    const { container } = pintar();
    const hp = campo(container, 'website');
    expect(hp).toBeTruthy();
    expect(hp.tabIndex).toBe(-1);
    expect(hp.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('enviar vacío no llama a la API y muestra los errores', async () => {
    const post = jest.spyOn(axios, 'post');
    const { container } = pintar();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    expect(post).not.toHaveBeenCalled();
    expect(await screen.findByText('Ingresa tu nombre completo.')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar la declaración para enviar.')).toBeInTheDocument();
    expect(campo(container, 'nombres')).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(campo(container, 'nombres'));
  });

  it('DNI de 7 dígitos se marca', () => {
    const { container } = pintar();
    llenar(container);
    escribir(container, 'numeroDocumento', '1234567');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    expect(screen.getByText('El DNI tiene 8 dígitos.')).toBeInTheDocument();
  });

  it('menor de edad pide al apoderado', () => {
    const post = jest.spyOn(axios, 'post');
    const { container } = pintar();
    llenar(container);
    fireEvent.click(screen.getByLabelText('Soy menor de edad'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    expect(screen.getByText('Ingresa el nombre del padre, madre o apoderado.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('envía la hoja y muestra código, fecha límite y constancia', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { codigo: '2026-000007', fecha: '2026-10-31T15:00:00Z', fechaLimite: '2026-11-24T04:59:59Z', token: 'tok en/1' } },
    });
    const { container } = pintar();
    llenar(container);
    fireEvent.click(screen.getByRole('radio', { name: /Queja/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));

    expect(await screen.findByTestId('codigo-reclamo')).toHaveTextContent('2026-000007');
    expect(screen.getByTestId('fecha-limite')).toHaveTextContent('23/11/2026');
    const [url, body] = post.mock.calls[0] as [string, any];
    expect(url).toMatch(/\/public\/store\/zapas\/libro-reclamaciones$/);
    expect(body).toMatchObject({ tipo: 'QUEJA', numeroDocumento: '12345678', montoReclamado: 150.9, aceptaDeclaracion: true, website: '' });
    const link = screen.getByRole('link', { name: /Descargar constancia/ });
    expect(link.getAttribute('href')).toMatch(/\/libro-reclamaciones\/2026-000007\/constancia\?token=tok%20en%2F1$/);
  });

  it('un error del servidor se muestra y permite reintentar', async () => {
    jest.spyOn(axios, 'post').mockRejectedValueOnce(errorHttp(429, 'Demasiadas solicitudes'));
    const { container } = pintar();
    llenar(container);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByText(/Demasiadas solicitudes/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar hoja de reclamación' })).not.toBeDisabled());
  });

  it('no envía dos veces con doble clic', async () => {
    let resolver: (v: unknown) => void = () => {};
    const post = jest.spyOn(axios, 'post').mockImplementation(() => new Promise((r) => { resolver = r; }));
    const { container } = pintar();
    llenar(container);
    const boton = screen.getByRole('button', { name: 'Enviar hoja de reclamación' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(post).toHaveBeenCalledTimes(1);
    resolver({ data: { codigo: '2026-000001', fecha: '2026-10-31T15:00:00Z', fechaLimite: '2026-11-21T15:00:00Z', token: 't' } });
    expect(await screen.findByTestId('codigo-reclamo')).toHaveTextContent('2026-000001');
  });
});
