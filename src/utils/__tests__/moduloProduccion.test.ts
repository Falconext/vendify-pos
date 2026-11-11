import { tieneModuloProduccion } from '../moduloProduccion';

const empresa = (rubro: string, modulos: string[]) => ({
    rubro: { nombre: rubro },
    plan: { modulosAsignados: modulos.map((codigo) => ({ modulo: { codigo } })) },
});

describe('tieneModuloProduccion', () => {
    it('un rubro de fabricación la conserva aunque su plan no tenga el módulo', () => {
        expect(tieneModuloProduccion({ rol: 'ADMIN_EMPRESA', empresa: empresa('Fabricación y producción', ['kardex']) })).toBe(true);
    });

    it('cualquier rubro la tiene si el plan incluye el módulo', () => {
        expect(tieneModuloProduccion({ rol: 'ADMIN_EMPRESA', empresa: empresa('Textil y confecciones', ['produccion']) })).toBe(true);
        expect(tieneModuloProduccion({ rol: 'ADMIN_EMPRESA', empresa: empresa('Panadería', ['produccion']) })).toBe(true);
    });

    it('sin el módulo en el plan, los demás rubros no la ven', () => {
        expect(tieneModuloProduccion({ rol: 'ADMIN_EMPRESA', empresa: empresa('Textil y confecciones', ['kardex']) })).toBe(false);
    });

    it('un plan sin módulos cargados no abre el acceso', () => {
        expect(tieneModuloProduccion({ rol: 'ADMIN_EMPRESA', empresa: { rubro: { nombre: 'Panadería' } } })).toBe(false);
    });

    it('el usuario necesita además el permiso', () => {
        const e = empresa('Textil y confecciones', ['produccion']);
        expect(tieneModuloProduccion({ rol: 'USUARIO_EMPRESA', permisos: ['kardex'], empresa: e })).toBe(false);
        expect(tieneModuloProduccion({ rol: 'USUARIO_EMPRESA', permisos: ['produccion'], empresa: e })).toBe(true);
    });
});
