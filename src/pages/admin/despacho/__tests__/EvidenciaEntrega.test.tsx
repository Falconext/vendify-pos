/**
 * D3 — QA de la evidencia de entrega en pantalla.
 *
 * Lo que se protege: que subir la foto no marque entregado sin que alguien lo
 * haya pedido, que un usuario común no pueda anular la prueba, y que la foto
 * se convierta antes de subirla (el HEIC del iPhone, si no, se rechaza).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const postMock = jest.fn((_url: string, _body?: unknown) =>
    Promise.resolve({ data: { data: { registradas: 1, evidencias: [] } } }),
);
const deleteMock = jest.fn((_url: string) =>
    Promise.resolve({ data: { code: 1 } }),
);
const alertMock = jest.fn();
let rolActual = 'USUARIO_EMPRESA';

jest.mock('@/utils/apiClient', () => ({
    __esModule: true,
    default: {
        post: (u: string, b: any) => postMock(u, b),
        delete: (u: string) => deleteMock(u),
    },
}));
jest.mock('@/zustand/alert', () => ({
    __esModule: true,
    default: () => ({ alert: alertMock }),
    useAlertStore: () => ({ alert: alertMock }),
}));
jest.mock('@/zustand/auth', () => ({
    __esModule: true,
    // Misma forma que el store real: el rol está en `auth`, no en la raíz.
    // Con el mock plano, el test pasaba y en producción el rol era undefined.
    useAuthStore: (sel: any) => sel({ auth: { rol: rolActual } }),
}));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
// La conversión real necesita canvas, que jsdom no tiene; su matemática se
// prueba aparte en utils/__tests__/fotoParaSubir.test.ts.
jest.mock('@/utils/fotoParaSubir', () => ({
    prepararFoto: (f: File) =>
        Promise.resolve(new File([f], 'convertida.jpg', { type: 'image/jpeg' })),
}));

import { EvidenciaEntrega } from '../EvidenciaEntrega';

const foto = (nombre = 'IMG_4821.HEIC', tipo = 'image/heic') =>
    new File([new Uint8Array([1, 2, 3])], nombre, { type: tipo });

const evidencia = (id: number) => ({
    id,
    url: `https://s3/entregas/evidencia-${id}.webp`,
    tipo: 'FOTO_PAQUETE',
    nota: null,
    tomadaEn: '2026-10-08T18:30:00.000Z',
    usuarioNombre: 'ANA',
});

function montar(over: Partial<React.ComponentProps<typeof EvidenciaEntrega>> = {}) {
    const props = {
        comprobanteId: 99,
        evidencias: [],
        yaEntregado: false,
        onCambio: jest.fn(),
        ...over,
    };
    return { ...render(<EvidenciaEntrega {...props} />), props };
}

const inputDeFotos = (c: HTMLElement) =>
    c.querySelector('input[type="file"]') as HTMLInputElement;

beforeEach(() => {
    postMock.mockClear();
    deleteMock.mockClear();
    alertMock.mockClear();
    rolActual = 'USUARIO_EMPRESA';
});

describe('cuando no hay ninguna foto', () => {
    it('dice en claro qué se pierde: no hay nada que mostrarle al cliente', () => {
        montar();
        expect(screen.getByText(/no hay nada que mostrarle/i)).toBeInTheDocument();
    });

    it('la cámara se abre directo en el celular', () => {
        const { container } = montar();
        expect(inputDeFotos(container).getAttribute('capture')).toBe('environment');
    });
});

describe('subir la foto', () => {
    it('la manda convertida y como multipart', async () => {
        const { container } = montar();
        fireEvent.change(inputDeFotos(container), { target: { files: [foto()] } });

        await waitFor(() => expect(postMock).toHaveBeenCalled());
        const [url, body] = postMock.mock.calls[0] as unknown as [string, FormData];
        expect(url).toBe('/envio-despacho/comprobante/99/evidencias');
        const adjunta = body.getAll('fotos')[0] as File;
        // El HEIC entró y salió JPEG: el servidor no acepta HEIC.
        expect(adjunta.type).toBe('image/jpeg');
    });

    it('con el pedido aún no entregado ofrece marcarlo, y lo manda marcado', async () => {
        const { container } = montar({ yaEntregado: false });
        expect(screen.getByRole('checkbox')).toBeChecked();

        fireEvent.change(inputDeFotos(container), { target: { files: [foto()] } });
        await waitFor(() => expect(postMock).toHaveBeenCalled());
        const body = postMock.mock.calls[0][1] as unknown as FormData;
        expect(body.get('marcarEntregado')).toBe('true');
    });

    it('si se destilda, NO se manda: avisarle al cliente no se puede deshacer', async () => {
        const { container } = montar({ yaEntregado: false });
        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.change(inputDeFotos(container), { target: { files: [foto()] } });
        await waitFor(() => expect(postMock).toHaveBeenCalled());
        const body = postMock.mock.calls[0][1] as unknown as FormData;
        expect(body.get('marcarEntregado')).toBeNull();
    });

    it('si ya está entregado no muestra la opción ni la manda', async () => {
        const { container } = montar({ yaEntregado: true });
        expect(screen.queryByRole('checkbox')).toBeNull();

        fireEvent.change(inputDeFotos(container), { target: { files: [foto()] } });
        await waitFor(() => expect(postMock).toHaveBeenCalled());
        const body = postMock.mock.calls[0][1] as unknown as FormData;
        expect(body.get('marcarEntregado')).toBeNull();
    });

    it('un error del servidor se muestra tal cual, no "algo falló"', async () => {
        postMock.mockRejectedValueOnce({
            response: { data: { message: 'El almacenamiento no está configurado' } },
        });
        const { container } = montar();
        fireEvent.change(inputDeFotos(container), { target: { files: [foto()] } });
        await waitFor(() =>
            expect(alertMock).toHaveBeenCalledWith(
                'El almacenamiento no está configurado',
                'error',
            ),
        );
    });
});

describe('las fotos ya registradas', () => {
    it('se ven con su hora', () => {
        montar({ evidencias: [evidencia(1), evidencia(2)], yaEntregado: true });
        expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    it('con el máximo alcanzado ya no deja subir más', () => {
        const { container } = montar({
            evidencias: [1, 2, 3, 4, 5, 6].map(evidencia),
            yaEntregado: true,
        });
        expect(inputDeFotos(container)).toBeNull();
        expect(screen.queryByText(/tomar o subir foto/i)).toBeNull();
    });
});

describe('anular una evidencia', () => {
    const abrirAmpliada = () => {
        montar({ evidencias: [evidencia(1)], yaEntregado: true });
        fireEvent.click(screen.getAllByRole('button')[0]);
    };

    it('un usuario común no ve el botón', () => {
        abrirAmpliada();
        expect(screen.queryByText(/anular/i)).toBeNull();
    });

    it('el administrador sí, y la quita de la lista', async () => {
        rolActual = 'ADMIN_EMPRESA';
        const onCambio = jest.fn();
        render(
            <EvidenciaEntrega
                comprobanteId={99}
                evidencias={[evidencia(1)]}
                yaEntregado
                onCambio={onCambio}
            />,
        );
        fireEvent.click(screen.getAllByRole('button')[0]);
        fireEvent.click(screen.getByText(/anular/i));

        await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/envio-despacho/evidencias/1'));
        expect(onCambio).toHaveBeenCalledWith([]);
    });
});
