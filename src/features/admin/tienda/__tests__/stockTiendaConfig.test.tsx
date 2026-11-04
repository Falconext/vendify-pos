/**
 * Panel: "Stock de la tienda virtual" (lógica del payload y render de la sección).
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StockTiendaSeccion from '../StockTiendaSeccion';
import {
    alternarSede,
    leerStockTiendaConfig,
    payloadStockTienda,
    validarStockTienda,
    type StockTiendaForm,
} from '../stockTiendaConfig';

const CONFIG = {
    tiendaStockModo: 'TODAS',
    tiendaSedeId: null,
    tiendaSedesIds: [],
    tiendaStockModoElegidoEn: null,
    sedesTienda: [
        { id: 1, nombre: 'Centro', direccion: 'Jr. Lima 100', esPrincipal: true },
        { id: 2, nombre: 'Norte', direccion: null, esPrincipal: false },
        { id: 3, nombre: 'Sur', direccion: 'Av. Sur 1', esPrincipal: false },
    ],
    avisoStockTienda: true,
};
const leido = leerStockTiendaConfig(CONFIG);

describe('leerStockTiendaConfig', () => {
    it('lee modo, sedes y aviso', () => {
        expect(leido.form).toEqual({ modo: 'TODAS', sedeId: null, sedesIds: [] });
        expect(leido.sedes).toHaveLength(3);
        expect(leido.aviso).toBe(true);
    });

    it('descarta sedes de la lista que ya no están activas y valores raros', () => {
        const r = leerStockTiendaConfig({ ...CONFIG, tiendaStockModo: 'X', tiendaSedeId: 99, tiendaSedesIds: [1, 1, 99, 'a'] });
        expect(r.form).toEqual({ modo: 'SEDE', sedeId: null, sedesIds: [1] });
    });
});

describe('payloadStockTienda', () => {
    it('sin cambios no manda nada (guardar otra cosa no apaga el aviso)', () => {
        expect(payloadStockTienda(leido.form, leido.form, leido.sedes)).toEqual({});
    });

    it('"Mantener" manda el modo actual aunque no cambie', () => {
        expect(payloadStockTienda(leido.form, leido.form, leido.sedes, true)).toEqual({ tiendaStockModo: 'TODAS', tiendaSedeId: null, tiendaSedesIds: [] });
    });

    it('CLIENTE con sedes y sede inicial', () => {
        const form: StockTiendaForm = { modo: 'CLIENTE', sedeId: 2, sedesIds: [1, 2] };
        expect(payloadStockTienda(form, leido.form, leido.sedes)).toEqual({ tiendaStockModo: 'CLIENTE', tiendaSedeId: 2, tiendaSedesIds: [1, 2] });
    });

    it('elegir la principal se guarda como null (sigue a la principal)', () => {
        expect(payloadStockTienda({ modo: 'SEDE', sedeId: 1, sedesIds: [] }, leido.form, leido.sedes).tiendaSedeId).toBeNull();
    });
});

describe('alternarSede / validar', () => {
    it('marcar todas guarda [] y nunca deja cero sedes', () => {
        const base: StockTiendaForm = { modo: 'CLIENTE', sedeId: null, sedesIds: [] };
        const sinSur = alternarSede(base, leido.sedes, 3);
        expect(sinSur.sedesIds).toEqual([1, 2]);
        expect(alternarSede(sinSur, leido.sedes, 3).sedesIds).toEqual([]);
        const solo1 = { ...base, sedesIds: [1] };
        expect(alternarSede(solo1, leido.sedes, 1)).toBe(solo1);
    });

    it('quitar la sede con la que abre la tienda la devuelve a la principal', () => {
        expect(alternarSede({ modo: 'CLIENTE', sedeId: 2, sedesIds: [1, 2] }, leido.sedes, 2).sedeId).toBeNull();
    });

    it('valida que la sede inicial esté habilitada', () => {
        expect(validarStockTienda({ modo: 'CLIENTE', sedeId: 3, sedesIds: [1, 2] }, leido.sedes)).toMatch(/habilitadas/);
        expect(validarStockTienda({ modo: 'CLIENTE', sedeId: 2, sedesIds: [1, 2] }, leido.sedes)).toBeNull();
    });
});

function Seccion({ onConfirmar = () => {}, aviso = true }: { onConfirmar?: () => void; aviso?: boolean }) {
    const [form, setForm] = useState(leido.form);
    return (
        <>
            <StockTiendaSeccion form={form} sedes={leido.sedes} aviso={aviso} error={null} guardando={false} onChange={setForm} onConfirmar={onConfirmar} />
            <pre data-testid="form">{JSON.stringify(form)}</pre>
        </>
    );
}

describe('StockTiendaSeccion', () => {
    it('3 modos como tarjetas radio y el aviso para multi-sede', () => {
        const onConfirmar = jest.fn();
        render(<Seccion onConfirmar={onConfirmar} />);
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(screen.getByTestId('modo-stock-TODAS')).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByText('Mantener "Todas las sedes"'));
        expect(onConfirmar).toHaveBeenCalled();
    });

    it('SEDE muestra el selector de sede; CLIENTE la lista y la sede inicial', () => {
        render(<Seccion aviso={false} />);
        expect(screen.queryByTestId('aviso-stock-tienda')).toBeNull();
        fireEvent.click(screen.getByTestId('modo-stock-SEDE'));
        fireEvent.change(screen.getByTestId('stock-sede-tienda'), { target: { value: '3' } });
        expect(JSON.parse(screen.getByTestId('form').textContent!)).toMatchObject({ modo: 'SEDE', sedeId: 3 });

        fireEvent.click(screen.getByTestId('modo-stock-CLIENTE'));
        fireEvent.click(screen.getByTestId('stock-sede-check-2'));
        expect(JSON.parse(screen.getByTestId('form').textContent!)).toMatchObject({ modo: 'CLIENTE', sedesIds: [1, 3] });
        expect(screen.getByTestId('stock-sede-inicial')).toBeInTheDocument();
        expect(screen.getByText(/Sin dirección/)).toBeInTheDocument();
    });

    it('una sola sede: solo una línea informativa', () => {
        render(<StockTiendaSeccion form={leido.form} sedes={leido.sedes.slice(0, 1)} aviso={false} error={null} guardando={false} onChange={() => {}} onConfirmar={() => {}} />);
        expect(screen.getByTestId('stock-tienda-una-sede')).toHaveTextContent('Centro');
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
});
