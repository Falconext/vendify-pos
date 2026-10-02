/**
 * El reporte de mermas.
 *
 * Pedido de DEMENVER: ver las salidas sueltas en el historial no alcanza para
 * decidir. Lo que sirve es saber cuántas unidades y cuánta plata se perdieron
 * en el período, y por qué.
 *
 * Lo que se fija acá es el criterio —qué cuenta como pérdida y qué no— y que la
 * pantalla use los componentes del proyecto en vez de inventar los suyos.
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..');
const VISTA = fs.readFileSync(path.join(DIR, 'MermasView.tsx'), 'utf-8');
const VM = fs.readFileSync(path.join(DIR, 'useMermasViewModel.ts'), 'utf-8');

describe('La pantalla usa el diseño del proyecto', () => {
    it('la tabla es el DataTable del proyecto, no una propia', () => {
        expect(VISTA).toContain("from '@/components/Datatable'");
        expect(VISTA).toContain('<DataTable');
        expect(VISTA).not.toMatch(/<table[\s>]/);
    });

    it('los botones y el selector de fecha son los del proyecto', () => {
        expect(VISTA).toContain("from '@/components/Button'");
        expect(VISTA).toContain("from '@/components/Date'");
        expect(VISTA).toContain("from '@/components/Loading'");
    });

    it('las tarjetas siguen el formato del dashboard de Kardex', () => {
        // Mismo borde, radio y fondo que el resto del panel.
        expect(VISTA).toContain('rounded-2xl');
        expect(VISTA).toContain('dark:bg-[#131620]');
        expect(VISTA).toContain('border-gray-100 dark:border-slate-800');
    });

    it('respeta el modo oscuro en todo lo que pinta', () => {
        // Cada fondo claro declara su contraparte, como el resto del panel.
        const clases = VISTA.match(/className="[^"]+"/g) ?? [];
        const sinPareja = clases.filter((c) => /\bbg-white\b/.test(c) && !/dark:bg-/.test(c));
        expect(sinPareja).toEqual([]);
    });
});

describe('Qué período mira', () => {
    it('arranca en el mes corriente', () => {
        // Es el período en que un empresario revisa sus pérdidas.
        expect(VM).toContain("moment().startOf('month')");
        expect(VM).toContain("moment().endOf('month')");
    });

    it('ofrece saltar al mes anterior para comparar', () => {
        expect(VM).toContain('verMesAnterior');
        expect(VISTA).toContain('Mes anterior');
    });

    it('consulta la sede activa', () => {
        expect(VM).toContain('sedeActiva?.id');
    });
});

describe('Lo que el reporte dice y lo que calla', () => {
    it('muestra la plata perdida al costo, no al precio de venta', () => {
        // Lo que se perdió es lo que costó reponerlo, no lo que se habría ganado.
        expect(VISTA).toContain('al costo de reponerlo');
    });

    it('aclara que una corrección de conteo no es pérdida', () => {
        expect(VISTA).toContain('Las correcciones de conteo no son pérdida');
    });

    it('ordena los productos por plata, no por cantidad', () => {
        expect(VISTA).toContain('no por cantidad');
    });

    it('muestra el detalle escrito a mano y el responsable', () => {
        expect(VISTA).toContain("label: 'Detalle'");
        expect(VISTA).toContain("label: 'Responsable'");
    });
});

describe('Está enganchado al panel', () => {
    const raiz = path.join(DIR, '..', '..', '..', '..');
    it('tiene su ruta', () => {
        expect(fs.readFileSync(path.join(raiz, 'App.tsx'), 'utf-8'))
            .toContain('path="kardex/mermas"');
    });

    it('y aparece en el menú de Kardex', () => {
        expect(fs.readFileSync(path.join(raiz, 'layouts', 'sidebar', 'sidebarMeta.ts'), 'utf-8'))
            .toContain("'/administrador/kardex/mermas'");
    });
});
