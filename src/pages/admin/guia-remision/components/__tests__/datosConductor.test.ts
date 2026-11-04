import { faltaDatoDelConductor, limpiarLicencia } from "../datosConductor";

// FORKLIFT HNS, T001-25: SUNAT la rechazó por la licencia vacía (cód. 2572).
const forklift = {
    conductorNumDoc: "43808239",
    conductorNombre: "DAVID ",
    conductorApellidos: "SALDAÑA ",
    conductorLicencia: "",
    vehiculoPlaca: "OQ6897",
};

describe("datos del conductor en transporte privado", () => {
    it("sin licencia avisa antes de enviar", () => {
        expect(faltaDatoDelConductor(forklift)).toBe("Para transporte privado SUNAT exige: N° de licencia del conductor.");
    });

    it("con licencia pasa, aunque la escriban con guion o en minúscula", () => {
        expect(faltaDatoDelConductor({ ...forklift, conductorLicencia: "q-43808239" })).toBeNull();
        expect(limpiarLicencia("q-4380 8239")).toBe("Q43808239");
    });

    it("una licencia demasiado corta no pasa", () => {
        expect(faltaDatoDelConductor({ ...forklift, conductorLicencia: "43808" })).toMatch(/9 o 10/);
    });
});
