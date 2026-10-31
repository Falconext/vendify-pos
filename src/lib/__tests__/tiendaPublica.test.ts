import axios from 'axios';
import { obtenerTiendaPublica, tiendaPublicaEnCache, vaciarTiendaPublica, VIGENCIA_MS } from '../tiendaPublica';

jest.mock('axios');
const get = axios.get as jest.Mock;

const respuesta = (nombre: string) => ({ data: { data: { nombre, diseno: { plantillaId: 'moda' } } } });

describe('ficha pública de la tienda pedida una sola vez', () => {
  beforeEach(() => { vaciarTiendaPublica(); get.mockReset(); });

  it('pedidos simultáneos del mismo slug comparten una sola petición', async () => {
    get.mockResolvedValue(respuesta('A'));
    const [a, b] = await Promise.all([obtenerTiendaPublica('a', 0), obtenerTiendaPublica('a', 0)]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(a.data.data.nombre).toBe('A');
    expect(b.data.data.nombre).toBe('A');
  });

  it('dentro de la vigencia reutiliza la respuesta; vencida vuelve a pedir', async () => {
    get.mockResolvedValueOnce(respuesta('vieja')).mockResolvedValueOnce(respuesta('nueva'));
    await obtenerTiendaPublica('a', 0);
    expect((await obtenerTiendaPublica('a', VIGENCIA_MS - 1)).data.data.nombre).toBe('vieja');
    expect((await obtenerTiendaPublica('a', VIGENCIA_MS)).data.data.nombre).toBe('nueva');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('cada slug es su propia tienda', async () => {
    get.mockImplementation(async (url: string) => respuesta(url.split('/').pop()!));
    expect((await obtenerTiendaPublica('a', 0)).data.data.nombre).toBe('a');
    expect((await obtenerTiendaPublica('b', 0)).data.data.nombre).toBe('b');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('un error no se guarda: el reintento vuelve a pedir', async () => {
    get.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(respuesta('A'));
    await expect(obtenerTiendaPublica('a', 0)).rejects.toThrow('red');
    expect(tiendaPublicaEnCache('a', 0)).toBeNull();
    expect((await obtenerTiendaPublica('a', 1)).data.data.nombre).toBe('A');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('cada llamador recibe su copia: cambiar una no cambia la de otro', async () => {
    get.mockResolvedValue(respuesta('A'));
    const a = await obtenerTiendaPublica('a', 0);
    a.data.data.nombre = 'tocada';
    a.data.data.diseno.plantillaId = 'otra';
    const b = await obtenerTiendaPublica('a', 1);
    expect(b.data.data.nombre).toBe('A');
    expect(tiendaPublicaEnCache('a', 1).diseno.plantillaId).toBe('moda');
  });

  it('en caché solo hay tienda cuando ya llegó y sigue vigente', async () => {
    let resolver!: (v: unknown) => void;
    get.mockReturnValue(new Promise((r) => { resolver = r; }));
    const p = obtenerTiendaPublica('a', 0);
    expect(tiendaPublicaEnCache('a', 0)).toBeNull(); // todavía en camino
    resolver(respuesta('A'));
    await p;
    expect(tiendaPublicaEnCache('a', 10).nombre).toBe('A');
    expect(tiendaPublicaEnCache('a', VIGENCIA_MS)).toBeNull();
    expect(tiendaPublicaEnCache('otra', 10)).toBeNull();
  });

  it('acepta la respuesta sin envoltorio `data`', async () => {
    get.mockResolvedValue({ data: { nombre: 'plana' } });
    await obtenerTiendaPublica('a', 0);
    expect(tiendaPublicaEnCache('a', 1).nombre).toBe('plana');
  });
});
