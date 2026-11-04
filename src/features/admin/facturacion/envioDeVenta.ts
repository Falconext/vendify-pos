/**
 * Los datos de envío del POS y qué pasa con ellos entre ventas.
 *
 * El POS no se desmonta entre una venta y otra. Como estos datos no se limpiaban
 * y la precarga solo llena campos vacíos (ver precargaEnvio.ts), la venta
 * siguiente heredaba la dirección, el nombre y el celular del cliente anterior.
 */
import { precargaDesdeCliente, type ClienteDeVenta, type PrecargaEnvio } from './precargaEnvio';
import { esNombreGenericoCliente } from '@/pages/admin/despacho/repartoPropio';

export const envioVacio = (empaquetador = '') => ({
    transportista: '',
    tipoEnvio: 'AGENCIA',
    agenciaDestino: '',
    celularDest: '',
    nroPaquetes: 1,
    turnoEnvio: 'MANANA',
    tipoMercaderia: '',
    claveEnvio: '',
    nroOrden: '',
    claveOrden: '',
    establecimiento: '',
    repartidor: '',
    repartidorId: null as number | null,
    empaquetador,
    observaciones: '',
    fechaEstimada: '',
    costoEnvio: 0,
    pagarFlete: 'CLIENTE' as 'CLIENTE' | 'NEGOCIO',
    // Sin valor: lo decide el contexto (ver aplicacionPorDefecto). Antes
    // arrancaba en 'ADELANTO' y no había forma de distinguir "recién
    // abierto" de "el vendedor eligió adelanto", así que en un documento
    // formal se convertía en cobro.
    aplicacionMontoCliente: undefined as 'ITEM_ENVIO' | 'ADELANTO' | 'NEGOCIO' | undefined,
    nombreDestinatario: '',
    dniDestinatario: '',
    contenidoPaquete: '',
    montoCOD: 0,
    pesoKg: 0,
    shalomTipoProducto: undefined as number | undefined,
    shalomAgenciaDestinoId: '',
    // Reparto propio / motorizado
    tipoVentaReparto: '',
    distritoUbigeo: '',
    distrito: '',
    coordenadas: '',
    formaPagoCobro: '',
    revisarProducto: false,
});

export type EnvioDeVenta = ReturnType<typeof envioVacio>;

/**
 * El envío con el que arranca la venta siguiente: todo vacío, menos cómo trabaja
 * la caja (courier, turno, local, quién empaca y quién reparte). Eso no es del
 * cliente, y borrarlo obligaría a elegirlo de nuevo en cada venta.
 */
export const envioParaSiguienteVenta = (actual: EnvioDeVenta): EnvioDeVenta => ({
    ...envioVacio(actual.empaquetador),
    transportista: actual.transportista,
    tipoEnvio: actual.tipoEnvio,
    turnoEnvio: actual.turnoEnvio,
    establecimiento: actual.establecimiento,
    repartidor: actual.repartidor,
    repartidorId: actual.repartidorId,
});

/**
 * Tipo de venta del reparto propio según lo que quede por cobrar: con saldo, el
 * motorizado cobra en la puerta; pagada en caja, solo entrega.
 */
export const cobroPorDefectoReparto = (saldoVenta: number, formaPagoCobro?: string) =>
    saldoVenta > 0.009
        ? { tipoVentaReparto: 'CONTRAENTREGA', formaPagoCobro: !formaPagoCobro || formaPagoCobro === 'NO_COBRAR' ? 'EFECTIVO' : formaPagoCobro }
        : { tipoVentaReparto: 'SOLO_ENTREGA', formaPagoCobro: 'NO_COBRAR' };

const texto = (valor: unknown) => String(valor ?? '').trim();

const CAMPOS_PRECARGADOS: (keyof PrecargaEnvio)[] = ['celularDest', 'agenciaDestino', 'distrito', 'nombreDestinatario'];

/** ¿El envío ya tiene datos de alguien? Vacío, no hay nada que corregir. */
export const envioTieneDestino = (envio: Partial<EnvioDeVenta>) =>
    [...CAMPOS_PRECARGADOS, 'dniDestinatario' as const].some((c) => texto(envio[c]) !== '');

/**
 * Cambiaron de cliente con el envío ya cargado. Lo que vino del cliente anterior
 * se reemplaza por lo del nuevo; lo que el vendedor escribió a mano se respeta
 * (puede ser un destinatario distinto a propósito) y se avisa con `quedoAMano`.
 */
export const envioAlCambiarCliente = <T extends Partial<EnvioDeVenta>>(
    envio: T,
    anterior: (ClienteDeVenta & { nroDoc?: string | null }) | null | undefined,
    nuevo: ClienteDeVenta | null | undefined,
): { envio: T; quedoAMano: boolean } => {
    const delAnterior = precargaDesdeCliente(anterior, {});
    const limpio: T = { ...envio };
    for (const campo of CAMPOS_PRECARGADOS) {
        if (delAnterior[campo] && texto(envio[campo]) === texto(delAnterior[campo])) {
            (limpio as any)[campo] = '';
        }
    }
    // Lo que depende de la dirección o del distrito se va con ellos.
    if (texto(limpio.agenciaDestino) === '') (limpio as any).shalomAgenciaDestinoId = '';
    if (texto(limpio.distrito) === '') (limpio as any).distritoUbigeo = '';
    if (texto(anterior?.nroDoc) && texto(envio.dniDestinatario) === texto(anterior?.nroDoc)) {
        (limpio as any).dniDestinatario = '';
    }
    return {
        envio: { ...limpio, ...precargaDesdeCliente(nuevo, limpio) },
        // Desde "Clientes varios" no se está cambiando de destinatario: es la venta
        // que recién toma cliente (o un pedido de la tienda que ya trae su envío).
        quedoAMano: !esNombreGenericoCliente(texto(anterior?.nombre)) && envioTieneDestino(limpio),
    };
};

const palabrasDelNombre = (nombre: unknown) =>
    texto(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().split(/[^A-ZÑ]+/)
        .filter((p) => p.length >= 3 && !['DEL', 'LAS', 'LOS'].includes(p));

const nueveDigitos = (valor: unknown) => texto(valor).replace(/\D/g, '').slice(-9);

/**
 * Avisos cuando el envío no coincide con el cliente de la venta. No bloquean:
 * mandarle a otra persona es válido, pero quien cobra tiene que verlo antes de
 * emitir. Un error de este tipo ya no se corrige solo una vez generada la guía.
 */
export const avisosDestinatario = (envio: Partial<EnvioDeVenta>, cliente: ClienteDeVenta | null | undefined): string[] => {
    const nombreCliente = texto(cliente?.nombre);
    if (!nombreCliente || esNombreGenericoCliente(nombreCliente)) return [];
    const avisos: string[] = [];
    const destinatario = palabrasDelNombre(envio.nombreDestinatario);
    const delCliente = new Set(palabrasDelNombre(nombreCliente));
    if (destinatario.length > 0 && !destinatario.some((p) => delCliente.has(p))) {
        avisos.push(`Recibe "${texto(envio.nombreDestinatario)}", pero la venta es de "${nombreCliente}".`);
    }
    const celularCliente = nueveDigitos(cliente?.telefono);
    const celularEnvio = nueveDigitos(envio.celularDest);
    if (/^9\d{8}$/.test(celularCliente) && celularEnvio && celularEnvio !== celularCliente) {
        avisos.push(`El celular del envío (${celularEnvio}) no es el del cliente (${celularCliente}).`);
    }
    return avisos;
};
