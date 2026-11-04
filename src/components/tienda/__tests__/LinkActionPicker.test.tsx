jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@iconify/react/dist/iconify.js', () => ({ Icon: () => null }));
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

import { fireEvent, render, screen } from '@testing-library/react';
import { LinkActionPicker } from '@/components/tienda/StoreLiveEditorDrawer';
import type { LinkFieldDef } from '@/components/tienda/liveEditorFields';

const campo: LinkFieldDef = { key: 'motosMenu1Action', label: 'Menú · botón 1', defaultType: 'catalog', permiteAuto: true, textoSinEnlace: 'El botón no se muestra en el menú.' };

const pintar = (diseno: any, field: LinkFieldDef = campo) => {
  const onChange = jest.fn();
  render(<LinkActionPicker field={field} diseno={diseno} categories={['Repuestos']} onChange={onChange} />);
  return onChange;
};

describe('selector de destino de un enlace', () => {
  it('muestra cada destino como botón, sin <select>', () => {
    pintar({});
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getAllByRole('radio').map((b) => b.textContent))
      .toEqual(['Automático', 'Catálogo', 'Categoría', 'Producto', 'Búsqueda', 'URL', 'Sin enlace']);
  });

  it('sin destino guardado marca "Automático"', () => {
    pintar({});
    expect(screen.getByRole('radio', { name: /Automático/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('marca el destino guardado', () => {
    pintar({ motosMenu1ActionType: 'none' });
    expect(screen.getByRole('radio', { name: /Sin enlace/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('El botón no se muestra en el menú.', { exact: false })).toBeTruthy();
  });

  it('elegir un destino lo guarda; "Automático" lo borra', () => {
    const onChange = pintar({ motosMenu1ActionType: 'catalog' });
    fireEvent.click(screen.getByRole('radio', { name: /Categoría/ }));
    expect(onChange).toHaveBeenLastCalledWith({ motosMenu1ActionType: 'category' });
    fireEvent.click(screen.getByRole('radio', { name: /Automático/ }));
    expect(onChange).toHaveBeenLastCalledWith({ motosMenu1ActionType: null });
  });

  it('sin "permiteAuto" no ofrece Automático y usa el destino por defecto', () => {
    pintar({}, { key: 'slide1', label: 'Slide 1', defaultType: 'catalog' });
    expect(screen.queryByRole('radio', { name: /Automático/ })).toBeNull();
    expect(screen.getByRole('radio', { name: /Catálogo/ })).toHaveAttribute('aria-checked', 'true');
  });
});
