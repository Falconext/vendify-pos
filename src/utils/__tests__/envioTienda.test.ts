import { beneficiosSegunEnvio, textoEnvioSinCosto } from '../envioTienda';

describe('envío a coordinar en la tienda', () => {
    it('sin la opción, el costo cero sigue siendo gratis', () => {
        expect(textoEnvioSinCosto(false, 'ENVIO')).toBe('Gratis');
        expect(textoEnvioSinCosto(undefined, 'ENVIO')).toBe('Gratis');
    });

    it('con la opción, el envío dice a coordinar', () => {
        expect(textoEnvioSinCosto(true, 'ENVIO')).toBe('A coordinar');
    });

    it('con la opción, el recojo tampoco dice gratis', () => {
        expect(textoEnvioSinCosto(true, 'RECOJO', true)).toBe('Recojo en tienda');
    });

    it('sin la opción, el recojo sigue siendo gratis', () => {
        expect(textoEnvioSinCosto(false, 'RECOJO', true)).toBe('Gratis');
    });

    it('si la tienda no ofrece recojo, no lo menciona', () => {
        expect(textoEnvioSinCosto(true, 'RECOJO', false)).toBe('A coordinar');
    });

    it('cambia solo el beneficio de envío gratis', () => {
        const lista = [{ title: 'Envío gratis', text: 'Desde S/ 80' }, { title: 'Pago seguro', text: 'Yape' }];
        expect(beneficiosSegunEnvio(lista, true)).toEqual([{ title: 'Envío a coordinar', text: 'Lo acordamos contigo' }, lista[1]]);
        expect(beneficiosSegunEnvio(lista, false)).toBe(lista);
    });
});
