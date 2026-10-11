/**
 * Aviso de que SUNAT no responde, en la lista de comprobantes.
 *
 * El 09/10/2026 SUNAT dejó de responder y 10 comprobantes de 4 empresas
 * quedaron en "Fallido Envío". El riesgo no es el susto: es que el empresario
 * reaccione reemitiendo o anulando, que rompe correlativos y duplica
 * comprobantes. Este aviso existe para evitar exactamente eso, así que lo que
 * se prueba es que diga lo correcto y que no se quede puesto cuando ya pasó.
 */
import { render, screen } from '@testing-library/react';

// Mismo patrón que el resto de la suite: el icono no aporta al contrato.
jest.mock('@iconify/react/dist/iconify.js', () => ({ Icon: () => null }));
import AvisoIncidenciaSunat from '../AvisoIncidenciaSunat';

describe('Aviso de incidencia de SUNAT', () => {
  it('no aparece cuando no hay nada atascado', () => {
    const { container } = render(<AvisoIncidenciaSunat incidencia={{ activa: false, cantidad: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no aparece mientras no se sabe (aún no respondió la consulta)', () => {
    const { container } = render(<AvisoIncidenciaSunat incidencia={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('aparece cuando hay comprobantes esperando', () => {
    render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 6 }} />);
    expect(screen.getByText(/SUNAT está demorando en responder/i)).toBeInTheDocument();
  });

  it('lo más importante: le dice que NO reemita ni anule', () => {
    render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 6 }} />);
    expect(screen.getByText(/No los vuelvas a emitir ni los anules/i)).toBeInTheDocument();
  });

  it('le quita la culpa de encima', () => {
    render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 3 }} />);
    expect(screen.getByText(/no es un problema de tu sistema ni de tus datos/i)).toBeInTheDocument();
    expect(screen.getByText(/tus comprobantes son válidos/i)).toBeInTheDocument();
  });

  it('dice cuántos son, en singular y en plural', () => {
    const { unmount } = render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 1 }} />);
    expect(screen.getByText(/Tienes 1 comprobante esperando/i)).toBeInTheDocument();
    unmount();
    render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 6 }} />);
    expect(screen.getByText(/Tienes 6 comprobantes esperando/i)).toBeInTheDocument();
  });

  it('no se puede cerrar a mano: se apaga solo cuando se resuelve', () => {
    // Un aviso que se cierra con la X se descarta de un clic y el empresario
    // vuelve a quedarse sin la explicación la próxima vez que mire la lista.
    const { container, rerender } = render(<AvisoIncidenciaSunat incidencia={{ activa: true, cantidad: 2 }} />);
    expect(container.querySelector('button')).toBeNull();
    rerender(<AvisoIncidenciaSunat incidencia={{ activa: false, cantidad: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
