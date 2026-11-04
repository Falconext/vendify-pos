/**
 * Datos del conductor que SUNAT exige en una guía con vehículo propio. Antes
 * solo se pedían DNI y placa: la guía sin licencia se emitía y SUNAT la
 * rechazaba con el código 2572 (FORKLIFT HNS, T001-25, 03-11). Misma regla que
 * el backend (`guia-remision/datos-conductor.ts`), para avisar antes de enviar.
 */

interface ConConductor {
    conductorNumDoc?: string | null;
    conductorNombre?: string | null;
    conductorApellidos?: string | null;
    conductorLicencia?: string | null;
    vehiculoPlaca?: string | null;
}

/** "q-4380 8239" → "Q43808239": la licencia va sin guiones ni espacios. */
export const limpiarLicencia = (v?: string | null) =>
    String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const vacio = (v?: string | null) => !String(v ?? "").trim();

/** Mensaje con lo que falta, o null si está completo. */
export function faltaDatoDelConductor(g: ConConductor): string | null {
    const faltan: string[] = [];
    if (vacio(g.vehiculoPlaca)) faltan.push("placa del vehículo");
    if (vacio(g.conductorNumDoc)) faltan.push("DNI del conductor");
    if (vacio(g.conductorNombre)) faltan.push("nombres del conductor");
    if (vacio(g.conductorApellidos)) faltan.push("apellidos del conductor");
    if (vacio(g.conductorLicencia)) faltan.push("N° de licencia del conductor");
    if (faltan.length) return `Para transporte privado SUNAT exige: ${faltan.join(", ")}.`;

    const licencia = limpiarLicencia(g.conductorLicencia);
    if (licencia.length < 9 || licencia.length > 10) {
        return "La licencia del conductor debe tener 9 o 10 letras y números (por ejemplo Q43808239).";
    }
    return null;
}
