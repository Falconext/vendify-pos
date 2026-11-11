/**
 * Estado de fabricación de una orden de trabajo (Comprobante.estadoOT).
 * Las OT antiguas pueden venir sin estado: cuentan como Pendiente.
 */
export type EstadoFabricacion = 'PENDIENTE' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO';

export const ESTADOS_FABRICACION: {
    id: EstadoFabricacion;
    label: string;
    descripcion: string;
    icon: string;
    // Mismos tonos que los chips de estado de la tabla (table.module.css).
    chip: string;
    punto: string;
}[] = [
    {
        id: 'PENDIENTE', label: 'Pendiente', descripcion: 'Aún no empieza', icon: 'solar:clock-circle-linear',
        chip: 'bg-[#f1ede6] text-[#6b6157] dark:bg-white/10 dark:text-slate-300', punto: 'bg-[#a89d90]',
    },
    {
        id: 'EN_PROCESO', label: 'En fabricación', descripcion: 'Se está trabajando', icon: 'solar:settings-minimalistic-linear',
        chip: 'bg-[#f8ecd2] text-[#8f600a] dark:bg-[rgb(190_138_42/0.18)] dark:text-[#e2b866]', punto: 'bg-[#c98a12]',
    },
    {
        id: 'LISTO', label: 'Listo para entregar', descripcion: 'El cliente ya puede recogerlo', icon: 'solar:box-minimalistic-linear',
        chip: 'bg-[#e8e6fb] text-[#4a41c4] dark:bg-[rgb(122_114_230/0.18)] dark:text-[#aaa4f5]', punto: 'bg-[#5b52d6]',
    },
    {
        id: 'ENTREGADO', label: 'Entregado', descripcion: 'Requiere la orden pagada', icon: 'solar:check-circle-linear',
        chip: 'bg-[#dcf2ec] text-[#0a7a63] dark:bg-[rgb(31_158_130/0.17)] dark:text-[#5ccfb1]', punto: 'bg-[#0a8f74]',
    },
];

export const estadoFabricacionDe = (valor: unknown) =>
    ESTADOS_FABRICACION.find((e) => e.id === valor) ?? ESTADOS_FABRICACION[0];
