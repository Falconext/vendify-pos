/**
 * El negocio puede coordinar el envío aparte (Configuración de la tienda). Con
 * costo cero la tienda decía "Envío: Gratis", y eso le prometía al cliente algo
 * que el negocio no ofrece, también con el recojo elegido por defecto.
 */
export const textoEnvioSinCosto = (
    envioACoordinar?: boolean | null,
    tipoEntrega?: string | null,
    aceptaRecojo?: boolean | null,
) => {
    if (!envioACoordinar) return 'Gratis';
    return tipoEntrega === 'RECOJO' && aceptaRecojo !== false ? 'Recojo en tienda' : 'A coordinar';
};

/** Cambia el beneficio "Envío gratis" que traen de fábrica algunas plantillas. */
export const beneficiosSegunEnvio = <T extends { title: string; text: string }>(
    beneficios: T[],
    envioACoordinar?: boolean | null,
): T[] =>
    envioACoordinar
        ? beneficios.map((b) => (/env[ií]o gratis/i.test(b.title) ? { ...b, title: 'Envío a coordinar', text: 'Lo acordamos contigo' } : b))
        : beneficios;
