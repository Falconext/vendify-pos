import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FalconCheckoutPage from '../FalconCheckoutPage';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/tienda/ConfirmOrderModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/tienda/PaymentConfirmationModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/shared/BancoLogo', () => ({ BancoLogo: () => null }));
jest.mock('../FalconShared', () => ({
    GREEN: '#0a0',
    resolveFalconGreen: () => '#0a0',
    money: (n: number) => String(n),
    getImg: () => '',
    editable: (_v: unknown, d: string) => d,
    withPreviewQuery: (p: string) => p,
    FalconHeader: () => null,
    FalconFooter: () => null,
    falconFadeUp: {},
    falconScaleIn: {},
    falconStagger: {},
    falconTap: {},
}), { virtual: true });

function Pagina() {
    const [formData, setFormData] = useState<any>({ tipoEntrega: 'ENVIO', clienteNombre: '', clienteTelefono: '', clienteEmail: '', clienteDireccion: '', clienteReferencia: '', medioPago: 'YAPE' });
    return (
        <FalconCheckoutPage
            {...({
                slug: 'x', tienda: {}, diseno: {}, cp: '#000',
                carritoState: [], updateQuantity: jest.fn(), removeItem: jest.fn(),
                formData, erroresForm: {},
                handleChange: (e: any) => setFormData((f: any) => ({ ...f, [e.target.name]: e.target.value })),
                configPago: {}, configEnvio: {}, enviando: false,
                calcularSubtotal: () => 0, calcularCostoEnvio: () => 0, calcularTotal: () => 0,
                onSubmit: jest.fn(),
            } as any)}
        />
    );
}

describe('Checkout Falcon', () => {
    it('escribir no rehace el campo: el cliente no pierde el foco letra a letra', () => {
        render(<Pagina />);
        const campo = screen.getByPlaceholderText('Nombre completo *') as HTMLInputElement;
        campo.focus();
        fireEvent.change(campo, { target: { name: 'clienteNombre', value: 'A' } });
        const despues = screen.getByPlaceholderText('Nombre completo *') as HTMLInputElement;
        expect(despues).toBe(campo);
        expect(document.activeElement).toBe(campo);
        expect(despues.value).toBe('A');
    });
});
