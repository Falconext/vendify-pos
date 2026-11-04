import { Dispatch } from "react";
import { IFormProduct } from "@/interfaces/products";

export interface IPropsProducts {
    formValues: IFormProduct;
    isOpenModal: boolean;
    setErrors: any;
    closeModal: any;
    isEdit: boolean;
    errors: any;
    setFormValues: any;
    setIsOpenModal: Dispatch<boolean>;
    initialForm: IFormProduct;
    isInvoice?: boolean;
    setSelectProduct?: any;
    /** Sede que el Kardex está mostrando: ahí va el stock. `id` null = "Todas las sedes". */
    sedeStock?: { id: number | null; nombre: string | null };
}

export type TipoAjusteStock = 'ninguno' | 'reemplazar' | 'sumar' | 'restar';

export interface ICreationLote {
    lote: string;
    fechaVencimiento: string;
    stockInicial?: string | number;
}

export interface IWholesaleOption {
    cantidadMinima: number;
    precio: number;
}
