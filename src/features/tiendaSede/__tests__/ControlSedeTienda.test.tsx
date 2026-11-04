/**
 * Render: franja "Comprando en", modal de la primera visita, cambio de sede
 * con revisión del carrito y aviso "Disponible en …" de la ficha.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PorTienda from '@/components/tienda/PorTienda';
import { useSedeTiendaStore } from '../sedeTienda';
import { tiendaCartKey } from '@/utils/tiendaCart';

jest.mock('@/lib/tiendaPublica', () => ({
    obtenerTiendaPublica: jest.fn(),
}));
import { obtenerTiendaPublica } from '@/lib/tiendaPublica';

const SEDES = [
    { id: 1, nombre: 'Centro', direccion: 'Jr. Lima 100', distrito: 'LIMA', provincia: 'LIMA', departamento: 'LIMA', esPrincipal: true },
    { id: 2, nombre: 'Norte', direccion: 'Av. Túpac 500', distrito: 'COMAS', provincia: 'LIMA', departamento: 'LIMA', esPrincipal: false },
];

const tienda = (modo: string, sedes = SEDES) => ({
    data: { code: 1, data: { diseno: { colorPrimario: '#0F766E' }, horarioAtencion: 'Lun-Sáb 9-7', stockTienda: { modo, sedeDefaultId: 1, sedes } } },
});

let montajes = 0;
function Pagina() {
    // Cuenta montajes: cambiar de sede debe volver a montar la página.
    const [n] = [++montajes];
    return <div data-testid="pagina">pagina {n}</div>;
}

const montar = (ruta = '/tienda/krezka') =>
    render(
        <MemoryRouter initialEntries={[ruta]}>
            <Routes>
                <Route path="/tienda/:slug" element={<PorTienda><Pagina /></PorTienda>} />
                <Route path="/tienda/:slug/producto/:id" element={<PorTienda><Pagina /></PorTienda>} />
            </Routes>
        </MemoryRouter>,
    );

beforeEach(() => {
    localStorage.clear();
    montajes = 0;
    useSedeTiendaStore.setState({ slug: null, stockTienda: null, sedeId: null, eligioAntes: false, generacion: 0, versionCarrito: 0, fichas: {}, selectorAbierto: false, motivoSelector: null, franjaVisible: false });
    jest.restoreAllMocks();
});

it('CLIENTE con 2 sedes: franja con la sede y modal de la primera visita con direcciones', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    montar();
    expect(await screen.findByTestId('franja-sede')).toHaveTextContent('Comprando en:Centro');
    expect(screen.getByTestId('modal-elegir-sede')).toBeInTheDocument();
    expect(screen.getByText('Av. Túpac 500, Comas, Lima')).toBeInTheDocument();
    expect(useSedeTiendaStore.getState().franjaVisible).toBe(true);
});

it('cerrar el modal sin elegir se queda con la sede de la tienda y no vuelve a preguntar', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    montar();
    await screen.findByTestId('modal-elegir-sede');
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(screen.queryByTestId('modal-elegir-sede')).toBeNull();
    expect(localStorage.getItem('tienda:krezka:sede')).toBe('1');
    expect(montajes).toBe(1);
});

it('SEDE, TODAS o CLIENTE con una sede: sin franja ni modal', async () => {
    for (const [modo, sedes] of [['SEDE', SEDES.slice(0, 1)], ['TODAS', SEDES], ['CLIENTE', SEDES.slice(0, 1)]] as const) {
        (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda(modo, [...sedes]));
        const { unmount } = montar();
        await waitFor(() => expect(useSedeTiendaStore.getState().stockTienda?.modo).toBe(modo));
        expect(screen.queryByTestId('franja-sede')).toBeNull();
        expect(screen.queryByTestId('modal-elegir-sede')).toBeNull();
        unmount();
    }
});

it('vista previa del editor (previewPlantilla): franja sí, modal no', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    montar('/tienda/krezka?previewPlantilla=maison');
    expect(await screen.findByTestId('franja-sede')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-elegir-sede')).toBeNull();
});

it('cambiar de sede con el carrito disponible: vuelve a montar la página y guarda la sede', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    localStorage.setItem('tienda:krezka:sede', '1');
    localStorage.setItem(tiendaCartKey('krezka'), JSON.stringify([{ id: 9, productoId: 9, cantidad: 1 }]));
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { data: { modo: 'CLIENTE', sedeId: 2, items: [{ productoId: 9, cantidad: 1, stock: 5, disponible: true, motivo: null }] } } });
    montar();
    fireEvent.click(await screen.findByTestId('franja-sede').then((f) => f.querySelector('button')!));
    fireEvent.click(screen.getByTestId('elegir-sede-2'));
    await waitFor(() => expect(screen.getByTestId('franja-sede')).toHaveTextContent('Norte'));
    expect(localStorage.getItem('tienda:krezka:sede')).toBe('2');
    expect(screen.getByTestId('pagina')).toHaveTextContent('pagina 2');
});

it('cambiar de sede con productos no disponibles: avisa, deja quedarse o ajusta el carrito', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    localStorage.setItem('tienda:krezka:sede', '1');
    localStorage.setItem(tiendaCartKey('krezka'), JSON.stringify([
        { id: 9, productoId: 9, cantidad: 4, descripcion: 'Taza' },
        { id: 7, productoId: 7, cantidad: 1, descripcion: 'Polo' },
    ]));
    jest.spyOn(axios, 'post').mockResolvedValue({
        data: { data: { modo: 'CLIENTE', sedeId: 2, items: [
            { productoId: 9, cantidad: 4, stock: 2, disponible: false, motivo: 'SIN_STOCK' },
            { productoId: 7, cantidad: 1, stock: 0, disponible: false, motivo: 'NO_VENDIBLE' },
        ] } },
    });
    montar();
    await screen.findByTestId('franja-sede');
    act(() => useSedeTiendaStore.getState().abrirSelector());
    fireEvent.click(screen.getByTestId('elegir-sede-2'));
    const modal = await screen.findByTestId('modal-carrito-sede');
    expect(modal).toHaveTextContent('Tu carrito en Norte');
    expect(screen.getByTestId('ajuste-0')).toHaveTextContent('Quedan 2');
    expect(screen.getByTestId('ajuste-1')).toHaveTextContent('No se vende en Norte');
    expect(screen.getByTestId('ajuste-1')).toHaveTextContent('Se quita');

    fireEvent.click(screen.getByText('Seguir en Centro'));
    expect(useSedeTiendaStore.getState().sedeId).toBe(1);

    act(() => useSedeTiendaStore.getState().abrirSelector());
    fireEvent.click(screen.getByTestId('elegir-sede-2'));
    fireEvent.click(await screen.findByTestId('carrito-sede-confirmar'));
    expect(JSON.parse(localStorage.getItem(tiendaCartKey('krezka'))!)).toEqual([{ id: 9, productoId: 9, cantidad: 2, descripcion: 'Taza' }]);
    expect(useSedeTiendaStore.getState()).toMatchObject({ sedeId: 2, versionCarrito: 1 });
});

it('ficha agotada en la sede: aviso común con las otras sedes', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    localStorage.setItem('tienda:krezka:sede', '1');
    montar('/tienda/krezka/producto/7');
    await screen.findByTestId('franja-sede');
    act(() => useSedeTiendaStore.getState().registrarFicha('krezka', { productoId: 7, sedeId: 1, stock: 0, vendible: true, disponibleEn: [{ sedeId: 2, nombre: 'Norte', stock: 8 }] }));
    expect(screen.getByTestId('aviso-otra-sede')).toHaveTextContent('Agotado en Centro · Disponible en Norte');
    expect(screen.getByTestId('aviso-cambiar-2')).toHaveTextContent('Comprar en Norte');
});

it('la ficha de otra sede (aún sin refrescar) no muestra el aviso', async () => {
    (obtenerTiendaPublica as jest.Mock).mockResolvedValue(tienda('CLIENTE'));
    localStorage.setItem('tienda:krezka:sede', '1');
    montar('/tienda/krezka/producto/7');
    await screen.findByTestId('franja-sede');
    act(() => useSedeTiendaStore.getState().registrarFicha('krezka', { productoId: 7, sedeId: 2, stock: 0, vendible: true, disponibleEn: [{ sedeId: 1, nombre: 'Centro', stock: 8 }] }));
    expect(screen.queryByTestId('aviso-otra-sede')).toBeNull();
});
