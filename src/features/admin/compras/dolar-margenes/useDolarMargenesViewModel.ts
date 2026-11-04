import { useCallback, useEffect, useMemo, useState } from 'react';
import useAlertStore from '@/zustand/alert';
import {
    dolarMargenesService,
    type ConfigDolarMargenes,
    type DolarMargenes,
    type PrecioProducto,
} from '@/services/dolarMargenes.service';
import { filtrarFilas, precioAAplicar, type FiltroEstado } from './dolarMargenesModel';

const mensajeDeError = (e: any, porDefecto: string) => e?.response?.data?.message || e?.message || porDefecto;

export function useDolarMargenesViewModel() {
    const alert = useAlertStore((s) => s.alert);
    const [datos, setDatos] = useState<DolarMargenes | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<FiltroEstado>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
    const [editados, setEditados] = useState<Record<number, string>>({});
    const [config, setConfig] = useState<ConfigDolarMargenes | null>(null);
    const [guardandoConfig, setGuardandoConfig] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [respaldo, setRespaldo] = useState<PrecioProducto[] | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const r = await dolarMargenesService.listar();
            setDatos(r);
            setConfig(r.config);
            setEditados({});
            // Arranca con lo que hace perder plata ya marcado.
            setSeleccion(new Set(r.filas.filter((f) => f.estado === 'riesgo').map((f) => f.productoId)));
            setFiltro(r.resumen.riesgo ? 'riesgo' : 'todos');
        } catch (e) {
            setError(mensajeDeError(e, 'No se pudo cargar el dólar y los márgenes.'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const filas = useMemo(() => filtrarFilas(datos?.filas ?? [], filtro, busqueda), [datos, filtro, busqueda]);

    const configCambiada =
        !!config &&
        !!datos &&
        (config.umbralPct !== datos.config.umbralPct ||
            config.margenObjetivoPct !== datos.config.margenObjetivoPct ||
            config.colchonTc !== datos.config.colchonTc);

    const guardarConfig = async () => {
        if (!config) return;
        setGuardandoConfig(true);
        try {
            await dolarMargenesService.guardarConfig(config);
            alert('Configuración guardada. Recalculé los precios sugeridos.', 'success');
            await cargar();
        } catch (e) {
            alert(mensajeDeError(e, 'No se pudo guardar la configuración.'), 'error');
        } finally {
            setGuardandoConfig(false);
        }
    };

    const alternar = (id: number) =>
        setSeleccion((s) => {
            const n = new Set(s);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const todasVisiblesMarcadas = filas.length > 0 && filas.every((f) => seleccion.has(f.productoId));
    const alternarVisibles = () =>
        setSeleccion((s) => {
            const n = new Set(s);
            filas.forEach((f) => (todasVisiblesMarcadas ? n.delete(f.productoId) : n.add(f.productoId)));
            return n;
        });

    const editarPrecio = (id: number, valor: string) => setEditados((e) => ({ ...e, [id]: valor }));

    const itemsAAplicar = useMemo<PrecioProducto[]>(
        () =>
            (datos?.filas ?? [])
                .filter((f) => seleccion.has(f.productoId))
                .map((f) => ({ productoId: f.productoId, precio: precioAAplicar(f, editados) })),
        [datos, seleccion, editados],
    );
    const hayPrecioInvalido = itemsAAplicar.some((i) => !(i.precio > 0));

    const aplicar = async () => {
        setAplicando(true);
        try {
            const r = await dolarMargenesService.aplicarPrecios(itemsAAplicar);
            setRespaldo(r.anteriores);
            alert(`Precio actualizado en ${r.actualizados} producto${r.actualizados === 1 ? '' : 's'}.`, 'success');
            setConfirmando(false);
            await cargar();
        } catch (e) {
            alert(mensajeDeError(e, 'No se pudieron actualizar los precios.'), 'error');
        } finally {
            setAplicando(false);
        }
    };

    const deshacer = async () => {
        if (!respaldo) return;
        setAplicando(true);
        try {
            await dolarMargenesService.aplicarPrecios(respaldo);
            setRespaldo(null);
            alert('Volví a dejar los precios como estaban.', 'success');
            await cargar();
        } catch (e) {
            alert(mensajeDeError(e, 'No se pudo deshacer el cambio.'), 'error');
        } finally {
            setAplicando(false);
        }
    };

    return {
        datos, cargando, error, filas, filtro, busqueda, seleccion, editados, config,
        configCambiada, guardandoConfig, confirmando, aplicando, respaldo, itemsAAplicar,
        hayPrecioInvalido, todasVisiblesMarcadas,
        actions: {
            cargar, setFiltro, setBusqueda, setConfig, guardarConfig, alternar, alternarVisibles,
            editarPrecio, setConfirmando, aplicar, deshacer,
        },
    };
}
