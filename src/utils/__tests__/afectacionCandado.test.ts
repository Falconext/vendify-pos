import { afectacionConCandado } from '../afectacionIgv';

describe('candado de Ley de Amazonía al cargar líneas', () => {
    const amazonia = { leyAmazonia: true };
    it('línea gravada de un producto exonerado o inafecto → la del producto', () => {
        expect(afectacionConCandado('10', '20', amazonia)).toBe('20');
        expect(afectacionConCandado('10', '30', amazonia)).toBe('30');
    });
    it('producto gravado de verdad, regalo o sin Ley de Amazonía: no se toca', () => {
        expect(afectacionConCandado('10', '10', amazonia)).toBe('10');
        expect(afectacionConCandado('21', '20', amazonia)).toBe('21');
        expect(afectacionConCandado('10', '20', { leyAmazonia: false })).toBe('10');
        expect(afectacionConCandado('10', undefined, amazonia)).toBe('10');
    });
});
