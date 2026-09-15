import apiClient from '@/utils/apiClient';

export type EstadoGestion =
    | 'POR_CONTACTAR'
    | 'CONTACTADA'
    | 'EN_NEGOCIACION'
    | 'RECUPERADA'
    | 'PERDIDA';

export interface SeguimientoEmpresa {
    id: number;
    empresaId: number;
    nota: string;
    canal: string | null;
    estadoGestion: EstadoGestion | null;
    autorNombre: string;
    autorEmail: string;
    creadoEn: string;
}

// Bitácora de seguimiento postventa/retención de una empresa.
export const listarSeguimientos = async (empresaId: number): Promise<SeguimientoEmpresa[]> => {
    const resp = await apiClient.get(`/empresa/${empresaId}/seguimientos`);
    return (resp.data?.data ?? []) as SeguimientoEmpresa[];
};

export const crearSeguimiento = async (
    empresaId: number,
    dto: { nota: string; canal?: string; estadoGestion?: EstadoGestion | null },
): Promise<SeguimientoEmpresa> => {
    const resp = await apiClient.post(`/empresa/${empresaId}/seguimientos`, dto);
    return resp.data?.data as SeguimientoEmpresa;
};

export const actualizarGestion = async (
    empresaId: number,
    dto: { estadoGestion: EstadoGestion | null; nota?: string },
): Promise<{ estadoGestion: EstadoGestion | null }> => {
    const resp = await apiClient.patch(`/empresa/${empresaId}/gestion`, dto);
    return resp.data?.data as { estadoGestion: EstadoGestion | null };
};
