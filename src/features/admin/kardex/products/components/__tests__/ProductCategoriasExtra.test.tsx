/**
 * "Otras categorías" en la ficha del producto: el producto aparece también en
 * estas categorías. Lo que no puede pasar: ofrecer la principal como
 * adicional, repetir una, pasar el tope o que el valor no llegue al backend.
 */
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

import { ProductCategoriasExtra, MAX_CATEGORIAS_EXTRA } from '../ProductCategoriasExtra';
import { payloadCategoriasExtra, resumenCategoriasExtra } from '../../categoriasExtra';
import { totalPestanaTodos } from '@/features/admin/facturacion/catalogoPestanas';

const categorias = [
  { id: 1, nombre: 'Polos' },
  { id: 2, nombre: 'Ofertas' },
  { id: 3, nombre: 'Regalos' },
  { id: 4, nombre: 'Navidad' },
];

const Envoltorio: React.FC<{
  inicial?: number[];
  principal?: number | null;
  onCreate?: (n: string) => Promise<{ id: number; nombre: string } | null>;
  cats?: { id: number; nombre: string }[];
  espia?: (ids: number[]) => void;
}> = ({ inicial = [], principal = 1, onCreate, cats = categorias, espia }) => {
  const [ids, setIds] = useState<number[]>(inicial);
  return (
    <ProductCategoriasExtra
      categories={cats}
      categoriaPrincipalId={principal}
      value={ids}
      onChange={(n) => { setIds(n); espia?.(n); }}
      onCreate={onCreate}
    />
  );
};

describe('selector de otras categorías', () => {
  it('no ofrece la principal y agrega con clic como chip', () => {
    render(<Envoltorio />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.queryByRole('option', { name: 'Polos' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Ofertas' }));
    expect(screen.getByText('Ofertas')).toBeInTheDocument();
    expect(screen.getByLabelText('Quitar Ofertas')).toBeInTheDocument();
    // Ya elegida: deja de ofrecerse.
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.queryByRole('option', { name: 'Ofertas' })).toBeNull();
  });

  it('busca sin tildes ni mayúsculas y Enter toma la primera', () => {
    const espia = jest.fn();
    render(<Envoltorio espia={espia} cats={[...categorias, { id: 5, nombre: 'Sálvame' }]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SALV' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(espia).toHaveBeenLastCalledWith([5]);
  });

  it('quitar con la x y con Backspace en el buscador vacío', () => {
    const espia = jest.fn();
    render(<Envoltorio inicial={[2, 3]} espia={espia} />);
    fireEvent.click(screen.getByLabelText('Quitar Ofertas'));
    expect(espia).toHaveBeenLastCalledWith([3]);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' });
    expect(espia).toHaveBeenLastCalledWith([]);
  });

  it('si la principal pasa a ser una adicional, sale de las adicionales', () => {
    const espia = jest.fn();
    render(<Envoltorio inicial={[2, 3]} principal={2} espia={espia} />);
    expect(espia).toHaveBeenCalledWith([3]);
    expect(screen.queryByText('Ofertas')).toBeNull();
  });

  it('crear una categoría desde el buscador la deja elegida', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: 9, nombre: 'Día de la madre' });
    const espia = jest.fn();
    render(<Envoltorio onCreate={onCreate} espia={espia} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Día de la madre' } });
    fireEvent.click(screen.getByText(/Crear “Día de la madre”/));
    await waitFor(() => expect(espia).toHaveBeenLastCalledWith([9]));
    expect(onCreate).toHaveBeenCalledWith('Día de la madre');
  });

  it('no ofrece crear una que ya existe', () => {
    render(<Envoltorio onCreate={jest.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'regalos' } });
    expect(screen.queryByText(/Crear/)).toBeNull();
  });

  it(`con ${MAX_CATEGORIAS_EXTRA} elegidas el buscador se bloquea`, () => {
    const muchas = Array.from({ length: 12 }, (_, i) => ({ id: i + 10, nombre: `C${i}` }));
    render(<Envoltorio cats={muchas} principal={null} inicial={muchas.slice(0, 10).map((c) => c.id)} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText(`10/${MAX_CATEGORIAS_EXTRA}`)).toBeInTheDocument();
  });
});

describe('lo que viaja al backend', () => {
  it('sin arreglo (backend anterior) no se envía nada', () => {
    expect(payloadCategoriasExtra({ categoriaId: 1 })).toEqual({ categoriasExtra: undefined });
  });

  it('limpia principal, repetidos y basura; [] se envía para quitar todas', () => {
    expect(payloadCategoriasExtra({ categoriaId: '1', categoriasExtraIds: [2, 1, 2, 0, 3] })).toEqual({
      categoriasExtra: undefined,
      categoriasExtraIds: [2, 3],
    });
    expect(payloadCategoriasExtra({ categoriaId: '', categoriasExtraIds: [] }).categoriasExtraIds).toEqual([]);
    // El arreglo de objetos del listado nunca viaja.
    const formulario: Record<string, unknown> = { categoriasExtra: [{ id: 2 }] };
    expect(JSON.parse(JSON.stringify({ ...formulario, ...payloadCategoriasExtra({ categoriasExtraIds: [2] }) }))).toEqual({
      categoriasExtraIds: [2],
    });
  });

  it('el +N de la tabla', () => {
    expect(resumenCategoriasExtra(undefined)).toBeNull();
    expect(resumenCategoriasExtra([])).toBeNull();
    expect(resumenCategoriasExtra([{ id: 2, nombre: 'Ofertas' }, { id: 3, nombre: 'Regalos' }])).toEqual({
      cantidad: 2,
      nombres: 'Ofertas, Regalos',
    });
  });
});

describe('pestaña Todos del POS', () => {
  it('no suma pestañas: un producto en dos categorías no cuenta doble', () => {
    // 3 productos; uno está en Polos y en Ofertas → pestañas 2 + 2 = 4.
    expect(totalPestanaTodos({ totalSinFiltro: null, sinFiltroAhora: true, totalActual: 3, sumaPestanas: 4 })).toBe(3);
  });

  it('con una categoría elegida conserva el total sin filtro', () => {
    expect(totalPestanaTodos({ totalSinFiltro: 3, sinFiltroAhora: false, totalActual: 2, sumaPestanas: 4 })).toBe(3);
  });

  it('sin dato del servidor cae a la suma (como antes)', () => {
    expect(totalPestanaTodos({ totalSinFiltro: null, sinFiltroAhora: false, totalActual: 2, sumaPestanas: 4 })).toBe(4);
    expect(totalPestanaTodos({ totalSinFiltro: null, sinFiltroAhora: true, totalActual: 0, sumaPestanas: 0 })).toBe(0);
  });
});
