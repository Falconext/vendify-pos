import { ChangeEvent } from "react";
import Select from "../Select";

interface ITrasladoTypeSelectProps {
    value: string;
    name: string;
    onChange: (idValue: any, value: any, name: any, id: any) => void;
    error?: string;
    label?: string;
}

const TRASLADO_TYPES = [
    { id: "01", value: "VENTA" },
    { id: "02", value: "COMPRA" },
    { id: "04", value: "TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA" },
    { id: "13", value: "OTROS" },
    { id: "08", value: "IMPORTADORES" },
    { id: "09", value: "EXPORTADORES" },
    { id: "19", value: "TRASLADO A ZONA PRIMARIA" },
    { id: "14", value: "VENTA SUJETA A CONFIRMACION DE EL COMPRADOR" },
    { id: "05", value: "TRASLADO DE BIENES PARA TRANSFORMACION" },
    { id: "06", value: "RECOJO DE BIENES TRANSFORMADOS" },
    { id: "07", value: "DEVOLUCION" },
    { id: "03", value: "VENTA CON ENTREGA A TERCEROS" },
];

const TrasladoTypeSelect = ({ value, name, onChange, error, label = "Motivo de Traslado" }: ITrasladoTypeSelectProps) => {
    return (
        <Select
            value={TRASLADO_TYPES.find(t => t.id === value)?.value || ""}
            defaultValue={value}
            options={TRASLADO_TYPES}
            name={name}
            id={name}
            onChange={onChange}
            label={label}
            error={error}
            isIcon
            icon="heroicons:truck"
        />
    );
};

export default TrasladoTypeSelect;
