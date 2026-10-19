/**
 * El mensaje que se le manda al cliente desde la ficha del envío.
 *
 * Estaba escrito dentro del JSX, donde no se podía probar ni leer. Importa
 * porque se le manda a un cliente real: una clave de retiro equivocada o un
 * flete que no corresponde cuesta una llamada y una queja.
 */

export interface DatosDelMensaje {
    estado: string;
    estadoLabel: string;
    codigoGuia?: string | null;
    claveEnvio?: string | null;
    transportista?: string | null;
    shalomFleteCotizado?: number | null;
}

/** La foto de la entrega, si hay. La primera basta: es la del paquete. */
export interface EvidenciaParaMensaje {
    url: string;
}

export function mensajeAlCliente(
    d: DatosDelMensaje,
    referencia: string | undefined,
    evidencias: EvidenciaParaMensaje[] = [],
): string {
    const partes = [
        `Hola, su pedido ${referencia ?? ''} está en estado: ${d.estadoLabel}.`,
    ];
    if (d.codigoGuia) partes.push(` Guía: ${d.codigoGuia}.`);
    // La clave de retiro es de Shalom: mandarla con otro courier confunde.
    if (d.claveEnvio && /SHALOM/i.test(String(d.transportista ?? ''))) {
        partes.push(` Clave de retiro: ${d.claveEnvio}.`);
    }
    if (d.shalomFleteCotizado != null && Number(d.shalomFleteCotizado) > 0) {
        partes.push(
            ` Flete a pagar al recoger: S/ ${Number(d.shalomFleteCotizado).toFixed(2)}.`,
        );
    }
    // La foto va SOLO cuando ya está entregado: mandarla antes anuncia una
    // entrega que todavía no pasó.
    if (d.estado === 'ENTREGADO' && evidencias.length > 0) {
        partes.push(` Foto de la entrega: ${evidencias[0].url}`);
    }
    partes.push(' Gracias.');
    return partes.join('');
}

/** El enlace de WhatsApp al celular del destinatario. */
export function enlaceAlCliente(celular: string, mensaje: string): string {
    const digitos = String(celular || '').replace(/\D/g, '');
    // Los celulares se guardan sin código de país; con 51 ya puesto no se duplica.
    const numero = digitos.startsWith('51') ? digitos : `51${digitos}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
