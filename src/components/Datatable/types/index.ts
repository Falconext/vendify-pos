export interface ITableHeaderProps {
    columns: Array<string | { label: string; key: string }>;
    colorFont?: string;
    actions?: IAction[];
    onSort: (column: string) => void;
}

export interface ITableBodyProps {
    data: any[];
    colorRow?: string;
    payments?: any;
    colorFont?: string;
    actions?: IAction[];
}

export interface IDataTableProps {
    headerColumns: Array<string | { label: string; key: string }>;
    bodyData: any[];
    formValues?: any;
    onEditPayment?: any;
    tableInitFinal?: boolean;
    payments?: any;
    setPaymentValues?: any;
    boletaValues?: any;
    setBoletaValues?: any;
    paymentValues?: any;
    color?: string;
    isPay?: boolean;
    idTable?: string;
    colorFont?: string;
    colorRow?: string;
    isCompact?: boolean;
    pageSize?: number;
    actions?: IAction[];
}

export interface IAction {
    onClick: (row: any) => void;
    className?: string;
    icon?: any;
    tooltip?: string | ((row: any) => string);
    /** Explicit button color. Auto-detected from tooltip text if omitted. */
    color?: 'violet' | 'blue' | 'rose' | 'emerald' | 'amber' | 'gray';
    hide?: (row: any) => boolean;
    condition?: (row: any) => boolean;
}
