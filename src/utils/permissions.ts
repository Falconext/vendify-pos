// Utilidades para manejo de permisos de usuarios

export interface IUserPermissions {
  permisos?: string[];
  rol?: 'ADMIN_SISTEMA' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA' | 'RESELLER';
  subModulos?: { id: number; codigo: string; nombre: string; moduloId: number; ruta?: string | null; orden?: number }[];
  empresa?: {
    plan?: {
      [key: string]: any;
      modulosAsignados?: { modulo: { id?: number; codigo: string; nombre?: string; icono?: string | null; ruta?: string | null; orden?: number } }[];
      subModulosAsignados?: { subModulo: { id: number; codigo: string; nombre?: string; moduloId: number; ruta?: string | null; orden?: number } }[];
    }
  }
}

const PERM_MAP: Record<string, string> = {};

const MODULE_ALIASES: Record<string, string[]> = {
  reportes: ['reportes', 'contabilidad'],
  contabilidad: ['contabilidad', 'reportes'],
};

const SUBMODULE_ALIASES: Record<string, string[]> = {
  'reportes:formal': ['reportes:formal', 'contabilidad:reportes'],
  'contabilidad:reportes': ['contabilidad:reportes', 'reportes:formal'],
};

const getModuleCandidates = (modulo: string): string[] =>
  MODULE_ALIASES[modulo] ?? [modulo];

const getSubModuleCandidates = (subModuloCodigo: string): string[] =>
  SUBMODULE_ALIASES[subModuloCodigo] ?? [subModuloCodigo];

const normalizePerms = (perms: string[] = []): string[] => {
  const mapped = perms.map((p) => PERM_MAP[p] ?? p);
  return Array.from(new Set(mapped));
};

/**
 * Verifica si un usuario tiene permiso para acceder a un módulo específico
 */
export const hasPermission = (user: IUserPermissions | null, modulo: string): boolean => {
  if (!user) return false;
  if (user.rol === 'ADMIN_SISTEMA') return true;

  const moduloCandidates = getModuleCandidates(modulo);

  // 1. Validar restricción del Plan
  // Array.isArray distingue undefined (plan sin configurar → no restringir) de [] (plan con 0 módulos → bloquear todo)
  const planModulosRaw = user.empresa?.plan?.modulosAsignados;
  if (Array.isArray(planModulosRaw)) {
    const planModulos = planModulosRaw.map((m) => m.modulo.codigo);
    if (!moduloCandidates.some((candidate) => planModulos.includes(candidate))) return false;
  }

  if (user.rol === 'ADMIN_EMPRESA') return true;

  // 2. Validar permisos individuales de usuario
  if (!user.permisos || user.permisos.length === 0) return false;
  if (user.permisos.includes('*')) return true;

  const normalized = normalizePerms(user.permisos);
  return moduloCandidates.some((candidate) => normalized.includes(candidate));
};

export const hasPlanFeature = (user: IUserPermissions | null, featureKey: string): boolean => {
  if (!user) return false;
  if (user.rol === 'ADMIN_SISTEMA') return true;
  const plan = user.empresa?.plan;
  const features = plan?.features;
  if (features && typeof features === 'object' && !Array.isArray(features)) {
    return Boolean(features[featureKey]);
  }
  return Boolean(plan?.[featureKey]);
};

/**
 * Verifica si un usuario tiene acceso a un submódulo específico.
 *
 * Lógica de dos capas:
 * 1. Capa Plan: si subModulosAsignados es un array (incluso vacío), se aplica la restricción.
 *    Si es undefined (plan antiguo sin configuración), no se restringe (backward compat).
 * 2. Capa Usuario: si el usuario tiene subModulos propios, debe incluir el solicitado.
 *    Si el usuario no tiene subModulos configurados y es ADMIN_EMPRESA, accede a todos los del plan.
 */
export const hasSubPermission = (user: IUserPermissions | null, subModuloCodigo: string): boolean => {
  if (!user) return false;
  if (user.rol === 'ADMIN_SISTEMA') return true;

  const subModuloCandidates = getSubModuleCandidates(subModuloCodigo);
  const targetModuleCodes = Array.from(
    new Set(subModuloCandidates.map((code) => String(code).split(':')[0]))
  );

  // Capa 1: restricción del Plan
  // Array.isArray distingue undefined (plan sin configurar → no restringir) de [] (0 submódulos configurados → bloquear todo)
  const planSubModulosRaw = user.empresa?.plan?.subModulosAsignados;
  const planModulosRaw = user.empresa?.plan?.modulosAsignados;

  // Si el plan define módulos pero no trajo lista de submódulos,
  // evitar sobre-permisos: bloquear submódulos del módulo consultado.
  if (!Array.isArray(planSubModulosRaw) && Array.isArray(planModulosRaw)) {
    const planModulos = planModulosRaw.map((m) => m.modulo.codigo);
    const moduleMatchesPlan = targetModuleCodes.some((target) => {
      const candidates = getModuleCandidates(target);
      return candidates.some((candidate) => planModulos.includes(candidate));
    });
    if (moduleMatchesPlan) return false;
  }

  if (Array.isArray(planSubModulosRaw)) {
    const planSubModulos = planSubModulosRaw.map((s) => s.subModulo.codigo);
    const planHasTargetModuleSubModules = planSubModulos.some((code) =>
      targetModuleCodes.includes(String(code).split(':')[0])
    );
    if (
      planHasTargetModuleSubModules &&
      !subModuloCandidates.some((candidate) => planSubModulos.includes(candidate))
    ) return false;
  }

  if (user.rol === 'ADMIN_EMPRESA') return true;

  // Capa 2: restricción del Usuario
  const userSubModulos = user.subModulos?.map((s) => s.codigo);
  if (!userSubModulos || userSubModulos.length === 0) {
    return true;
  }

  return subModuloCandidates.some((candidate) => userSubModulos.includes(candidate));
};

/**
 * Obtiene los módulos disponibles según los permisos del usuario
 */
export const getAvailableModules = (user: IUserPermissions | null): string[] => {
  if (!user) return [];

  const allModules = [
    'dashboard',
    'comprobantes',
    'clientes',
    'kardex',
    'reportes',
    'configuracion',
    'usuarios',
    'caja',
    'pagos',
    'cotizaciones',
    'guias-remision',
    'compras',
    'sedes',
    'notificaciones',
    'contabilidad',
  ];

  if (user.rol === 'ADMIN_SISTEMA') return allModules;

  return allModules.filter((moduleCode) => hasPermission(user, moduleCode));
};

/**
 * Filtra elementos del sidebar según permisos
 */
export const filterSidebarItems = (items: any[], user: IUserPermissions | null) => {
  if (!user) return [];
  return items.filter(item => {
    if (!item.module) return true;
    return hasPermission(user, item.module);
  });
};

/**
 * Redirige a una página permitida si el usuario no tiene acceso
 */
export const getRedirectPath = (user: IUserPermissions | null, intendedPath: string): string => {
  if (!user) return '/login';

  const availableModules = getAvailableModules(user);

  if (availableModules.includes('dashboard')) return '/administrador';

  if (availableModules.length > 0) {
    const firstModule = availableModules[0];
    const moduleRoutes: Record<string, string> = {
      comprobantes: '/administrador/facturacion/comprobantes',
      clientes: '/administrador/clientes',
      kardex: '/administrador/kardex',
      reportes: '/administrador/contabilidad/arqueo',
      contabilidad: '/administrador/contabilidad/reporte',
      configuracion: '/administrador/configuracion',
      usuarios: '/administrador/usuarios',
      caja: '/administrador/ventas/caja',
      pagos: '/administrador/ventas/pagos',
      cotizaciones: '/administrador/facturacion/cotizaciones',
      'guias-remision': '/administrador/facturacion/guia-remision',
      compras: '/administrador/compras',
      sedes: '/administrador/sedes',
      notificaciones: '/administrador/notificaciones',
      dashboard: '/administrador'
    };
    return moduleRoutes[firstModule] || '/administrador';
  }

  return user ? '/administrador' : '/login';
};
