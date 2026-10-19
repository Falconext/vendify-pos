/**
 * El mensaje se le manda a un cliente real: cada dato de más o de menos
 * cuesta una llamada. Estos casos cubren justo los que se pueden equivocar.
 */
import { enlaceAlCliente, mensajeAlCliente } from '../mensajeTrazabilidad';

const base = {
    estado: 'EN_CAMINO',
    estadoLabel: 'En camino',
    codigoGuia: null,
    claveEnvio: null,
    transportista: null,
    shalomFleteCotizado: null,
};

describe('el mensaje al cliente', () => {
    it('dice el estado y nada más cuando no hay otros datos', () => {
        expect(mensajeAlCliente(base, 'NV01-8')).toBe(
            'Hola, su pedido NV01-8 está en estado: En camino. Gracias.',
        );
    });

    it('incluye la guía cuando existe', () => {
        expect(
            mensajeAlCliente({ ...base, codigoGuia: 'SHL-99123' }, 'NV01-8'),
        ).toContain('Guía: SHL-99123.');
    });

    it('la clave de retiro solo sale con Shalom', () => {
        const conShalom = mensajeAlCliente(
            { ...base, claveEnvio: '4821', transportista: 'SHALOM_PRO' },
            'NV01-8',
        );
        expect(conShalom).toContain('Clave de retiro: 4821.');

        // Con otro courier la clave no significa nada y confunde al cliente.
        const conOlva = mensajeAlCliente(
            { ...base, claveEnvio: '4821', transportista: 'OLVA' },
            'NV01-8',
        );
        expect(conOlva).not.toMatch(/clave/i);
    });

    it('el flete sale con dos decimales y solo si es mayor que cero', () => {
        expect(
            mensajeAlCliente({ ...base, shalomFleteCotizado: 12.5 }, 'NV01-8'),
        ).toContain('Flete a pagar al recoger: S/ 12.50.');
        expect(
            mensajeAlCliente({ ...base, shalomFleteCotizado: 0 }, 'NV01-8'),
        ).not.toMatch(/flete/i);
    });
});

describe('la foto de la entrega en el mensaje', () => {
    const entregado = { ...base, estado: 'ENTREGADO', estadoLabel: 'Entregado' };

    it('va cuando el pedido está entregado y hay foto', () => {
        const m = mensajeAlCliente(entregado, 'NV01-8', [
            { url: 'https://s3/entregas/evidencia-1.webp' },
        ]);
        expect(m).toContain('Foto de la entrega: https://s3/entregas/evidencia-1.webp');
    });

    it('NO va antes de estar entregado: anunciaría una entrega que no pasó', () => {
        const m = mensajeAlCliente(base, 'NV01-8', [
            { url: 'https://s3/entregas/evidencia-1.webp' },
        ]);
        expect(m).not.toMatch(/foto/i);
    });

    it('entregado sin foto no deja el mensaje a medias', () => {
        expect(mensajeAlCliente(entregado, 'NV01-8', [])).toBe(
            'Hola, su pedido NV01-8 está en estado: Entregado. Gracias.',
        );
    });
});

describe('el enlace de WhatsApp', () => {
    it('le pone el 51 al celular guardado sin código de país', () => {
        expect(enlaceAlCliente('925 085 731', 'hola')).toContain('wa.me/51925085731?');
    });

    it('no duplica el 51 si ya lo trae', () => {
        expect(enlaceAlCliente('51925085731', 'hola')).toContain('wa.me/51925085731?');
    });

    it('el mensaje viaja escapado', () => {
        const url = enlaceAlCliente('925085731', 'Guía: ABC/1 & listo');
        expect(decodeURIComponent(url.split('text=')[1])).toBe('Guía: ABC/1 & listo');
    });
});
