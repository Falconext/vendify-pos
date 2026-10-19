/**
 * Qué datos del envío se traen solos del cliente de la venta.
 *
 * Hoy solo se precargaba el celular, aunque el cliente también tiene guardados
 * su dirección y su distrito: en MODA & LINEA, 96 de 117 clientes tienen
 * dirección y 91 tienen distrito. El vendedor los retipeaba en cada venta, y
 * el distrito escrito a mano sale "Ate", "ATE" y "Ate Vitarte", con lo que el
 * Excel del motorizado deja de agrupar.
 *
 * Dos reglas que gobiernan todo esto:
 *
 *  - **Nunca se pisa lo que el usuario escribió.** Solo se llenan campos
 *    vacíos. El domicilio del cliente es su dirección fiscal y no siempre es a
 *    dónde quiere el envío, así que esto es una sugerencia, no un dato fijo.
 *  - **Un cliente genérico no aporta nada.** "CLIENTES VARIOS" o un registro
 *    hecho solo con el WhatsApp no tienen datos reales que traer.
 */
import { esNombreGenericoCliente } from '@/pages/admin/despacho/repartoPropio';

export interface ClienteDeVenta {
    nombre?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    distrito?: string | null;
}

/** Los campos del formulario de envío que esto puede llenar. */
export interface PrecargaEnvio {
    celularDest?: string;
    agenciaDestino?: string;
    distrito?: string;
    nombreDestinatario?: string;
}

const texto = (valor: unknown): string => String(valor ?? '').trim();

/** Un campo "vacío" incluye el guion que deja una importación sin dato. */
const vacio = (valor: unknown): boolean => {
    const t = texto(valor);
    return t === '' || t === '-';
};

const soloDigitos = (valor: unknown): string => texto(valor).replace(/\D/g, '');

/**
 * Un celular peruano válido: 9 dígitos que empiezan en 9.
 *
 * Es la misma validación que ya hacía el modal. Un teléfono fijo o un número a
 * medio cargar no sirve para que el courier avise, y precargarlo haría que el
 * vendedor lo dé por bueno sin mirarlo.
 */
export const celularUtil = (telefono: unknown): string => {
    const digitos = soloDigitos(telefono);
    return digitos.length === 9 && digitos.startsWith('9') ? digitos : '';
};

/**
 * Lo que hay que llenar, dado el cliente y lo que ya tiene el formulario.
 *
 * Devuelve solo las claves que corresponde tocar: si no hay nada que precargar
 * devuelve un objeto vacío, y quien llama puede evitarse el re-render.
 */
export const precargaDesdeCliente = (
    cliente: ClienteDeVenta | null | undefined,
    actual: Partial<PrecargaEnvio> | null | undefined,
): PrecargaEnvio => {
    if (!cliente) return {};
    // Un genérico no tiene datos propios: lo que haya ahí es del mostrador.
    if (esNombreGenericoCliente(texto(cliente.nombre))) return {};

    const precarga: PrecargaEnvio = {};

    if (vacio(actual?.celularDest)) {
        const celular = celularUtil(cliente.telefono);
        if (celular) precarga.celularDest = celular;
    }
    if (vacio(actual?.agenciaDestino) && !vacio(cliente.direccion)) {
        precarga.agenciaDestino = texto(cliente.direccion);
    }
    if (vacio(actual?.distrito) && !vacio(cliente.distrito)) {
        precarga.distrito = texto(cliente.distrito);
    }
    if (vacio(actual?.nombreDestinatario) && !vacio(cliente.nombre)) {
        precarga.nombreDestinatario = texto(cliente.nombre);
    }
    return precarga;
};
