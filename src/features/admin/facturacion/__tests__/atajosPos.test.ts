/**
 * Los atajos del POS no pueden robarle el teclado a un campo.
 *
 * Nace de un bug de producción: pegar el celular del destinatario en el modal
 * de Coordinación de Envío mandaba el número al escáner y salía
 * "Código 991065217 no encontrado. ¿Deseas crear el producto?".
 */
import { accionDeTecla, estaEscribiendo } from '../atajosPos';

const ctrlV = { key: 'v', ctrlKey: true };
const cmdV = { key: 'v', metaKey: true };
const input = { tagName: 'INPUT' };
const textarea = { tagName: 'TEXTAREA' };
const select = { tagName: 'SELECT' };
const editable = { tagName: 'DIV', isContentEditable: true };
const body = { tagName: 'BODY' };

describe('EL BUG: pegar dentro de un campo', () => {
    it('Ctrl+V en un input NO va al escáner', () => {
        // Es el caso exacto: el campo "Celular destinatario" del modal de envío.
        expect(accionDeTecla(ctrlV, input)).toBeNull();
    });

    it('Cmd+V en un input tampoco (Mac)', () => {
        expect(accionDeTecla(cmdV, input)).toBeNull();
    });

    it('ni en un textarea ni en un campo editable', () => {
        expect(accionDeTecla(ctrlV, textarea)).toBeNull();
        expect(accionDeTecla(ctrlV, editable)).toBeNull();
    });

    it('ni con un desplegable enfocado', () => {
        expect(accionDeTecla(ctrlV, select)).toBeNull();
    });
});

describe('Pero el atajo sigue sirviendo para lo que se hizo', () => {
    it('Ctrl+V sin foco en un campo SÍ va al escáner', () => {
        // El operario copia un código y pega sin hacer clic en ningún lado.
        expect(accionDeTecla(ctrlV, body)).toBe('escanear');
    });

    it('también sin elemento enfocado', () => {
        expect(accionDeTecla(ctrlV, null)).toBe('escanear');
        expect(accionDeTecla(ctrlV, undefined)).toBe('escanear');
    });

    it('Ctrl+Shift+V no es el atajo: es pegar sin formato', () => {
        expect(accionDeTecla({ key: 'v', ctrlKey: true, shiftKey: true }, body)).toBeNull();
    });
});

describe('Los otros atajos no cambiaron', () => {
    it('Ctrl+B lleva al buscador, incluso escribiendo', () => {
        // Es un salto explícito del usuario, no interfiere con escribir.
        expect(accionDeTecla({ key: 'b', ctrlKey: true }, input)).toBe('buscar');
        expect(accionDeTecla({ key: 'b', ctrlKey: true }, body)).toBe('buscar');
    });

    it('"/" lleva al buscador solo si no se está escribiendo', () => {
        expect(accionDeTecla({ key: '/' }, body)).toBe('buscarBarra');
        // Si no, no se podría escribir una barra en ningún campo.
        expect(accionDeTecla({ key: '/' }, input)).toBeNull();
    });

    it('una tecla cualquiera no hace nada', () => {
        expect(accionDeTecla({ key: 'a' }, body)).toBeNull();
        expect(accionDeTecla({ key: 'Enter' }, input)).toBeNull();
    });
});

describe('Qué cuenta como "estar escribiendo"', () => {
    it('los cuatro casos', () => {
        expect(estaEscribiendo(input)).toBe(true);
        expect(estaEscribiendo(textarea)).toBe(true);
        expect(estaEscribiendo(select)).toBe(true);
        expect(estaEscribiendo(editable)).toBe(true);
    });

    it('el body y un div común, no', () => {
        expect(estaEscribiendo(body)).toBe(false);
        expect(estaEscribiendo({ tagName: 'DIV' })).toBe(false);
        expect(estaEscribiendo(null)).toBe(false);
    });

    it('no depende de mayúsculas del tag', () => {
        expect(estaEscribiendo({ tagName: 'input' })).toBe(true);
    });
});
