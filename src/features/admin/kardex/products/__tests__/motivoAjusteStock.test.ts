/**
 * Por qué se ajusta el stock a mano.
 *
 * Pedido de DEMENVER: el inventario dejaba quitar nueve audífonos pero no decir
 * por qué. En el kardex todo salía como "Ajuste manual de stock desde
 * inventario (-9)" y lo único guardado era quién lo hizo; cuando después
 * preguntaban por qué faltaban, no había respuesta en ningún lado.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    MOTIVOS_INGRESO,
    MOTIVOS_SALIDA,
    conceptoDelAjuste,
    etiquetaDeMotivo,
    faltaMotivo,
    motivosPara,
} from '../motivoAjusteStock';

describe('Se ofrecen los motivos que corresponden', () => {
    it('al quitar stock, los de salida', () => {
        const codigos = motivosPara('restar').map((m) => m.codigo);
        expect(codigos).toContain('MERMA');
        expect(codigos).toContain('PERDIDA');
        expect(codigos).toContain('CONSUMO_INTERNO');
    });

    it('al agregar stock, los de ingreso', () => {
        // El caso que contó DEMENVER: encontraron una unidad de más en la caja.
        const codigos = motivosPara('sumar').map((m) => m.codigo);
        expect(codigos).toContain('ENCONTRADO');
        expect(codigos).toContain('DEVOLUCION_CLIENTE');
        expect(codigos).not.toContain('MERMA');
    });

    it('sin ajuste no se pide motivo', () => {
        expect(motivosPara('ninguno')).toEqual([]);
    });

    it('todos los motivos tienen código y etiqueta legible', () => {
        for (const m of [...MOTIVOS_SALIDA, ...MOTIVOS_INGRESO]) {
            expect(m.codigo).toMatch(/^[A-Z_]+$/);
            expect(m.etiqueta.length).toBeGreaterThan(3);
        }
    });
});

describe('No se guarda un ajuste sin explicación', () => {
    it('falta el motivo si no se eligió ninguno', () => {
        expect(faltaMotivo({ tipo: 'restar', motivo: '' })).toBe(true);
        expect(faltaMotivo({ tipo: 'restar', motivo: null })).toBe(true);
    });

    it('con un motivo elegido alcanza', () => {
        expect(faltaMotivo({ tipo: 'restar', motivo: 'MERMA' })).toBe(false);
    });

    it('"Otro" sin explicación no vale', () => {
        // "Otro motivo" a secas no explica nada: es volver al problema.
        expect(faltaMotivo({ tipo: 'restar', motivo: 'OTRO' })).toBe(true);
        expect(faltaMotivo({ tipo: 'restar', motivo: 'OTRO', detalle: '  ' })).toBe(true);
        expect(faltaMotivo({ tipo: 'restar', motivo: 'OTRO', detalle: 'se cayó de la repisa' })).toBe(false);
    });

    it('si no hay ajuste, no se pide nada', () => {
        expect(faltaMotivo({ tipo: 'ninguno' })).toBe(false);
    });
});

describe('Lo que queda escrito en el kardex', () => {
    it('el motivo va adelante: es lo único que se ve en la lista', () => {
        expect(conceptoDelAjuste({ tipo: 'restar', motivo: 'MERMA', cantidad: 9 }))
            .toBe('Merma (producto roto o dañado) · Ajuste de inventario (-9)');
    });

    it('un ingreso lleva signo +', () => {
        expect(conceptoDelAjuste({ tipo: 'sumar', motivo: 'ENCONTRADO', cantidad: 1 }))
            .toContain('(+1)');
    });

    it('sin motivo no queda un separador colgando', () => {
        expect(conceptoDelAjuste({ tipo: 'restar', cantidad: 2 }))
            .toBe('Ajuste de inventario (-2)');
    });
});

describe('Front y backend hablan el mismo idioma', () => {
    /**
     * Si el POS ofrece un motivo que el backend no conoce, el kardex guardaría
     * el código crudo ("MERMA") en vez de la frase. Esta prueba lo impide.
     */
    it('cada motivo del POS existe en la tabla del backend', () => {
        // El backend vive al lado del POS, pero no se llama igual en todos los
        // repos: `backend/` en falconext-mype, `vendify-api/` en vendify.
        const raizProyecto = path.join(__dirname, '..', '..', '..', '..', '..', '..');
        // Desde `__tests__`, seis niveles arriba es la carpeta del POS; el
        // backend es su hermano.
        const candidatos = ['backend', 'vendify-api'].map((n) => '..' + path.sep + n);
        const tabla = candidatos
            .map((c) => path.join(raizProyecto, c, 'src', 'producto', 'motivo-ajuste-stock.ts'))
            .find((ruta) => fs.existsSync(ruta));
        if (!tabla) {
            throw new Error(
                'No encontré la tabla de motivos del backend. Se buscó en: ' +
                candidatos.join(', '),
            );
        }
        const backend = fs.readFileSync(tabla, 'utf-8');
        for (const m of [...MOTIVOS_SALIDA, ...MOTIVOS_INGRESO]) {
            expect(backend).toContain(`${m.codigo}:`);
        }
    });
});

describe('Traducir un código suelto', () => {
    it('devuelve la etiqueta', () => {
        expect(etiquetaDeMotivo('VENCIDO')).toBe('Vencido o en mal estado');
    });

    it('un código desconocido se muestra tal cual', () => {
        expect(etiquetaDeMotivo('XYZ')).toBe('XYZ');
    });

    it('sin código, texto vacío', () => {
        expect(etiquetaDeMotivo(null)).toBe('');
    });
});

describe('Se pueden revisar las mermas juntas', () => {
    /**
     * DEMENVER pidió "un apartado de mermas". Antes había que filtrar por Salida
     * y leer línea por línea: el buscador de movimientos solo mira el nombre del
     * producto, no el concepto. Ahora hay un selector de motivo.
     */
    const MOV = path.join(__dirname, '..', '..', 'movements');
    const vista = fs.readFileSync(path.join(MOV, 'MovementsView.tsx'), 'utf-8');
    const modelo = fs.readFileSync(path.join(MOV, 'MovementsModel.ts'), 'utf-8');
    const vm = fs.readFileSync(path.join(MOV, 'useMovementsViewModel.ts'), 'utf-8');

    it('la pantalla ofrece filtrar por motivo', () => {
        expect(vista).toContain('label="Motivo del ajuste"');
        expect(vista).toContain('MOTIVOS_DE_AJUSTE');
    });

    it('las opciones salen de la misma lista que usa el inventario', () => {
        // Si se escribieran a mano, al agregar un motivo nuevo el filtro
        // quedaría incompleto sin que nadie lo note.
        expect(vista).toContain("from '../products/motivoAjusteStock'");
    });

    it('el filtro viaja al backend', () => {
        // El backend ya filtraba por `concepto`; solo faltaba exponerlo.
        expect(modelo).toMatch(/concepto: string;/);
        expect(vm).toMatch(/concepto: '',/);
    });

    it('se vuelve a consultar al cambiar el motivo', () => {
        // Sin esto el selector se movería y la lista no cambiaría.
        expect(vm).toContain('state.filters.concepto]');
    });

    it('"Limpiar" también lo borra', () => {
        const limpiar = vm.slice(vm.indexOf('const cleared = {'), vm.indexOf('};', vm.indexOf('const cleared = {')));
        expect(limpiar).toContain("concepto: ''");
    });
});
