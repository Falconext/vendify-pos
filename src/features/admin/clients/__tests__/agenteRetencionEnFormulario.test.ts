/**
 * La casilla "Agente de Retención" tiene que estar en el formulario que el
 * usuario abre de verdad.
 *
 * Esta prueba nace de un error concreto: la casilla se agregó a
 * `src/pages/admin/clientes/ModalCliente.tsx`, que NO lo importa nadie —es
 * código muerto—. El formulario vivo es
 * `features/admin/clients/shared/ModalClient.tsx`, al que se llega por
 * App.tsx → pages/admin/Clientes → ClientsView. Todo compilaba y las pruebas
 * pasaban; la casilla simplemente no existía para el empresario.
 *
 * Por eso no alcanza con comprobar el archivo: hay que seguir la cadena desde
 * la ruta hasta el componente, y recién ahí buscar el campo.
 */
import * as fs from 'fs';
import * as path from 'path';

const raiz = path.join(__dirname, '..', '..', '..', '..');
const leer = (rel: string) => fs.readFileSync(path.join(raiz, rel), 'utf-8');

describe('El formulario de cliente que realmente se usa', () => {
    it('la ruta /administrador/clientes llega a ClientsView', () => {
        expect(leer('App.tsx')).toContain("path=\"clientes\"");
        expect(leer('pages/admin/Clientes.tsx')).toContain('features/admin/clients/ClientsView');
    });

    it('ClientsView monta el modal de clientes', () => {
        expect(leer('features/admin/clients/ClientsView.tsx')).toMatch(/ModalClient\b/);
    });

    it('ese modal —y no otro— tiene la casilla de agente de retención', () => {
        const vivo = leer('features/admin/clients/shared/ModalClient.tsx');
        expect(vivo).toContain('esAgenteRetencion');
        expect(vivo).toContain('Agente de Retención del IGV');
    });

    it('la casilla solo aparece con RUC: solo una empresa es agente', () => {
        const vivo = leer('features/admin/clients/shared/ModalClient.tsx');
        expect(vivo).toMatch(/nroDoc[^\n]*length === 11/);
    });
});

describe('El campo llega hasta el backend', () => {
    it('está en la lista blanca del payload', () => {
        // Sin esto el campo se marca y no se guarda: es el mismo defecto que ya
        // nos pasó con precios mayorista y con el código de producto.
        expect(leer('zustand/clients.ts')).toContain("'esAgenteRetencion'");
    });

    it('está declarado en las interfaces del cliente', () => {
        expect(leer('interfaces/clients.ts')).toContain('esAgenteRetencion');
    });
});
