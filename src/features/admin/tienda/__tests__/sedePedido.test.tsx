/**
 * Pedidos por sede: generar la nota de un pedido sin sede y avisar cuando el
 * pedido es de otra sede que la activa.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
    esDeOtraSede,
    mensajeOtraSede,
    normalizarSedePedido,
    pideSedeParaNota,
    sedePorDefectoParaNota,
} from '../sedePedido';
import { paramsFiltroSede, leerSedesPedidos, type PedidoTiendaAdmin } from '../usePedidosViewModel';

jest.mock('@/utils/fetch', () => ({ post: jest.fn() }));
jest.mock('@/utils/guiaShalomAuto', () => ({ generarGuiaShalomAuto: jest.fn() }));
import { post } from '@/utils/fetch';
import ModalNotaVentaPedido from '@/pages/admin/tienda/ModalNotaVentaPedido';

const SEDES = [
    { id: 1, nombre: 'Centro', esPrincipal: true },
    { id: 2, nombre: 'Norte', esPrincipal: false },
];

describe('reglas', () => {
    it('esDeOtraSede', () => {
        expect(esDeOtraSede(2, 1)).toBe(true);
        expect(esDeOtraSede(1, 1)).toBe(false);
        expect(esDeOtraSede(null, 1)).toBe(false);
        expect(esDeOtraSede(2, null)).toBe(false);
    });

    it('pideSedeParaNota: solo sin sede y con varias', () => {
        expect(pideSedeParaNota(null, SEDES)).toBe(true);
        expect(pideSedeParaNota(2, SEDES)).toBe(false);
        expect(pideSedeParaNota(null, SEDES.slice(0, 1))).toBe(false);
    });

    it('sedePorDefectoParaNota: la activa del usuario, si no la principal', () => {
        expect(sedePorDefectoParaNota(SEDES, 2)).toBe(2);
        expect(sedePorDefectoParaNota(SEDES, 99)).toBe(1);
        expect(sedePorDefectoParaNota([], 2)).toBeNull();
    });

    it('normalizarSedePedido', () => {
        expect(normalizarSedePedido({ sedeId: 2, sede: { id: 2, nombre: 'Norte' } })).toEqual({ sedeId: 2, sede: { id: 2, nombre: 'Norte' } });
        expect(normalizarSedePedido({ sede: { id: '3' } })).toEqual({ sedeId: 3, sede: { id: 3, nombre: 'Sede 3' } });
        expect(normalizarSedePedido({ sedeId: null })).toEqual({ sedeId: null, sede: null });
        expect(normalizarSedePedido(undefined)).toEqual({ sedeId: null, sede: null });
    });

    it('filtro del listado y sedes de la config', () => {
        expect(paramsFiltroSede('')).toEqual({});
        expect(paramsFiltroSede('sin-sede')).toEqual({ sedeId: 'sin-sede' });
        expect(paramsFiltroSede('2')).toEqual({ sedeId: '2' });
        expect(leerSedesPedidos([{ id: 1, nombre: 'A', esPrincipal: true }, { id: 0 }, null])).toEqual([{ id: 1, nombre: 'A', esPrincipal: true }]);
    });

    it('mensaje claro', () => {
        expect(mensajeOtraSede('Norte', 'Centro')).toBe('Este pedido es de la sede Norte y estás en Centro. Cámbiate a Norte para emitirlo o genera la nota desde el pedido.');
    });
});

const pedido = (extra: Partial<PedidoTiendaAdmin> = {}): PedidoTiendaAdmin => ({
    id: 55, codigoSeguimiento: 'PT-55', clienteNombre: 'Ana', clienteTelefono: '999', tipoEntrega: 'RECOJO',
    estado: 'PENDIENTE', estadoEntrega: 'PENDIENTE', agenciaEnvio: 'RECOJO_TIENDA', estadoEnvio: 'NO_APLICA',
    vendedorNombre: 'Tienda', medioPago: 'EFECTIVO', subtotal: 50, igv: 0, total: 50, costoEnvio: 0, montoPagado: 0,
    saldoPendiente: 50, creadoEn: '2026-10-31T10:00:00Z', items: [], sedeId: null, sede: null, ...extra,
});

const montar = (p: PedidoTiendaAdmin, sedeActivaId: number | null = 2) =>
    render(<ModalNotaVentaPedido pedido={p} sedes={SEDES} sedeActivaId={sedeActivaId} onClose={() => {}} onRevisarEnPos={() => {}} onVerNota={() => {}} onGenerada={() => {}} />);

describe('ModalNotaVentaPedido con sedes', () => {
    beforeEach(() => (post as jest.Mock).mockReset().mockResolvedValue({ success: false, error: 'x' }));

    it('pedido sin sede: pide la sede (por defecto la activa) y la manda', async () => {
        montar(pedido());
        const select = screen.getByTestId('nv-sede') as HTMLSelectElement;
        expect(select.value).toBe('2');
        expect(screen.getByText('Norte (tu sede)')).toBeInTheDocument();
        fireEvent.change(select, { target: { value: '1' } });
        fireEvent.click(screen.getByTestId('nv-generar'));
        await waitFor(() => expect(post).toHaveBeenCalledWith('tienda/pedidos/55/nota-venta', { adelanto: 0, sedeId: 1 }));
    });

    it('pedido con sede: no pregunta, muestra de dónde sale y no manda sedeId', async () => {
        montar(pedido({ sedeId: 1, sede: { id: 1, nombre: 'Centro' } }));
        expect(screen.queryByTestId('nv-sede')).toBeNull();
        expect(screen.getByTestId('nv-sede-pedido')).toHaveTextContent('Sale de Centro');
        fireEvent.click(screen.getByTestId('nv-generar'));
        await waitFor(() => expect(post).toHaveBeenCalledWith('tienda/pedidos/55/nota-venta', { adelanto: 0 }));
    });

    it('error del backend (403 sede sin venta) se muestra tal cual', async () => {
        (post as jest.Mock).mockResolvedValue({ success: false, error: 'No puedes vender en esta sede.' });
        montar(pedido());
        fireEvent.click(screen.getByTestId('nv-generar'));
        expect(await screen.findByText('No puedes vender en esta sede.')).toBeInTheDocument();
    });
});
