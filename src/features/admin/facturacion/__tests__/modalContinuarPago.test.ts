/**
 * El modal "Continuar pago": parpadeo al abrir y vista previa real.
 *
 * Reportado por EQUIMED VENTAS. Dos cosas distintas:
 *
 * 1. El modal parpadeaba al abrirse. La causa era `layout` de framer-motion sin
 *    acotar: re-anima cada vez que el contenido cambia de alto, y el logo del
 *    comprobante carga después y lo reacomoda.
 *
 * 2. La vista previa era una MAQUETA escrita a mano en JSX. No salía de lo que
 *    se imprime, así que no coincidía con el papel —"este no es lo que en
 *    verdad se imprimirá"—. Ahora se renderiza el mismo componente que imprime,
 *    con los mismos formatos que "Configurar formato".
 *
 * Se lee el fuente porque ninguna de las dos cosas se nota en una prueba de
 * comportamiento: la maqueta mostraba datos correctos, solo que con otro
 * formato, y el parpadeo es visual.
 */
import * as fs from 'fs';
import * as path from 'path';

const raiz = path.join(__dirname, '..', '..', '..', '..');
const leer = (rel: string) => fs.readFileSync(path.join(raiz, rel), 'utf-8');
const POS = leer('features/admin/facturacion/components/POSCalculations.tsx');
const IMPRIME = leer('pages/admin/facturacion/comprobanteImprimir.tsx');

describe('El modal ya no parpadea al abrir', () => {
    it('la animación de tamaño está acotada al cambio de fase', () => {
        // Sin esto, cualquier reflujo del contenido vuelve a animar el modal.
        expect(POS).toContain('layoutDependency={isEmitPhase}');
    });
});

describe('La vista previa es el comprobante real', () => {
    it('renderiza el componente que imprime, no una maqueta', () => {
        expect(POS).toContain('<ComprobantePrintPage');
    });

    it('ya no quedan restos de la maqueta escrita a mano', () => {
        // Eran líneas como "IMPORTE TOTAL" dibujadas a mano dentro del modal.
        expect(POS).not.toContain('Representación impresa del Comprobante de Pago Electrónico.');
        expect(POS).not.toContain('previewLogo');
    });

    it('arranca en TICKET, que es lo que se imprime en el mostrador', () => {
        expect(POS).toMatch(/useState<FormatoImpresion>\('TICKET'\)/);
    });

    it('ofrece ticket y A4, no A5', () => {
        // A5 queda en "Configurar formato": tres botones estorban al cobrar.
        expect(POS).toContain("const FORMATOS_PREVIEW: FormatoImpresion[] = ['TICKET', 'A4'];");
        expect(POS).toContain('{FORMATOS_PREVIEW.map((f) => (');
        expect(POS).not.toContain("['TICKET', 'A4', 'A5']");
    });

    it('cada formato ofrecido tiene su medida', () => {
        for (const f of ['A4', 'TICKET']) {
            expect(POS).toMatch(new RegExp(`${f}: \\{ width: \\d+, scale:`));
        }
    });

    it('le pasa los datos reales de la venta, no una muestra', () => {
        // `printFormValues` viene de la vista: ahí vive la lógica de la fecha de
        // emisión, que ya tiene su propia prueba. Duplicarla acá la haría
        // divergir.
        expect(POS).toContain('formValues={printFormValues ?? vm.formValues}');
        expect(leer('features/admin/facturacion/components/FacturacionNuevoView.tsx'))
            .toContain('printFormValues={printFormValues}');
    });
});

describe('Dos comprobantes en pantalla sin pisarse', () => {
    it('el componente acepta su propio id', () => {
        // El POS mantiene una instancia oculta para imprimir; la del modal no
        // puede repetir su id.
        expect(IMPRIME).toContain("id={idRoot || 'print-root'}");
        expect(POS).toContain('id="preview-continuar-pago"');
    });

    it('los estilos del comprobante enganchan por atributo, no por id', () => {
        // Si siguieran colgando de #print-root, la vista previa del modal
        // saldría con la fuente del panel y no con la del papel.
        expect(IMPRIME).toContain('data-print-root');
        const css = leer('index.css');
        expect(css).toContain('html.is-admin [data-print-root]');
        expect(css).toContain("[data-print-root][data-size='TICKET']");
    });

    it('la impresión sigue saliendo por el ref, no por un selector', () => {
        // Es lo que hace que una segunda instancia no rompa el imprimir.
        expect(leer('features/admin/facturacion/components/FacturacionNuevoView.tsx'))
            .toContain('contentRef: componentRef');
    });
});
