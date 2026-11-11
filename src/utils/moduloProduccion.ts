import { hasPermission } from './permissions';
import { esRubroFabricacion } from './rubro-features';

/**
 * Producción sirve a cualquier rubro: se activa con el módulo en el plan y el
 * permiso del usuario. Los rubros de fabricación la tienen siempre, como antes
 * de existir el módulo. Es la misma regla que aplica el backend.
 */
export const tieneModuloProduccion = (auth: any): boolean => {
    if (esRubroFabricacion(auth?.empresa?.rubro?.nombre)) return true;
    const enPlan = (auth?.empresa?.plan?.modulosAsignados ?? []).some(
        (m: any) => m?.modulo?.codigo === 'produccion',
    );
    return enPlan && hasPermission(auth, 'produccion');
};
