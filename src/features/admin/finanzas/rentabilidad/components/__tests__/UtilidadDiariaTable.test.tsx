import { render, screen, fireEvent } from '@testing-library/react';
import UtilidadDiariaTable from '../UtilidadDiariaTable';

const dia = (fecha: string, ventas: number, costo: number, pedidos: number, gastos = 0) => ({
    fecha, ventasNetas: ventas, costoMercaderia: costo, gananciaBruta: ventas - costo,
    margenBruto: ventas ? ((ventas - costo) / ventas) * 100 : 0, publicidad: 0, otrosGastos: gastos,
    gastosOperativos: gastos, gananciaNeta: ventas - costo - gastos,
    margenNeto: ventas ? ((ventas - costo - gastos) / ventas) * 100 : 0, pedidos,
});

const pnl: any = {
    periodo: { label: 'Noviembre 2026' },
    criterioIgvLabel: 'IGV descontado en todos los documentos',
    gananciaNeta: 120,
    resumenDiario: [],
    utilidadDiaria: [dia('2026-11-03', 200, 100, 2), dia('2026-11-02', 0, 0, 0), dia('2026-11-01', 100, 60, 1, 10)],
    utilidadDiariaTotal: {
        ventasNetas: 300, costoMercaderia: 160, gananciaBruta: 140, margenBruto: 46.67, gastosOperativos: 10,
        gananciaNeta: 130, margenNeto: 43.33, pedidos: 3, diasConVenta: 2, diasSinVenta: 1,
        ajustesSinDia: -10, gananciaNetaPeriodo: 120,
    },
};

describe('UtilidadDiariaTable', () => {
    it('muestra todos los días, el total y el ajuste que cuadra con el período', () => {
        render(<UtilidadDiariaTable pnl={pnl} />);
        expect(screen.getByText('03/11/2026')).toBeInTheDocument();
        expect(screen.getByText('02/11/2026')).toBeInTheDocument();
        expect(screen.getByText('2 con venta · 1 sin venta')).toBeInTheDocument();
        expect(screen.getByText('Otros ingresos y gastos del período sin día')).toBeInTheDocument();
        expect(screen.getByText('Ganancia neta del período').closest('tr')).toHaveTextContent('S/ 120.00');
        expect(screen.getByText(/Mejor día/)).toHaveTextContent('03/11/2026');
    });
    it('oculta los días sin movimiento', () => {
        render(<UtilidadDiariaTable pnl={pnl} />);
        fireEvent.click(screen.getByLabelText('Ocultar días sin movimiento'));
        expect(screen.queryByText('02/11/2026')).not.toBeInTheDocument();
        expect(screen.getByText('01/11/2026')).toBeInTheDocument();
    });
    it('un céntimo de redondeo no aparece como ajuste', () => {
        const redondeo = { ...pnl, gananciaNeta: 129.99, utilidadDiariaTotal: { ...pnl.utilidadDiariaTotal, ajustesSinDia: -0.01, gananciaNetaPeriodo: 129.99 } };
        render(<UtilidadDiariaTable pnl={redondeo} />);
        expect(screen.queryByText('Otros ingresos y gastos del período sin día')).not.toBeInTheDocument();
    });
    it('el botón Excel llama a exportar', () => {
        const onExportar = jest.fn();
        render(<UtilidadDiariaTable pnl={pnl} onExportar={onExportar} />);
        fireEvent.click(screen.getByRole('button', { name: /Excel/ }));
        expect(onExportar).toHaveBeenCalled();
    });
});
