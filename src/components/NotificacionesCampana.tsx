import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNotificacionesStore } from '../zustand/notificaciones';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/zustand/auth';
import { useRubroFeatures } from '@/utils/rubro-features';
import apiClient from '@/utils/apiClient';

interface LoteAlerta {
  id: number;
  lote: string;
  fechaVencimiento: string;
  stockActual: number;
  producto: {
    descripcion: string;
    codigo: string;
  };
}

const NotificacionesCampana: React.FC = () => {
  const {
    notificaciones,
    noLeidas,
    loading,
    mostrarPanel,
    sonidoHabilitado,
    pushHabilitado,
    obtenerNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    togglePanel,
    cerrarPanel,
    iniciarWebSocket,
    detenerWebSocket,
    toggleSonido,
    togglePush,
    solicitarPermisoPush,
  } = useNotificacionesStore();

  const { auth } = useAuthStore();
  const features = useRubroFeatures(auth?.empresa?.rubro, {
    usaCodigoBarrasManual: auth?.empresa?.usaCodigoBarrasManual,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Estado para alertas de lotes
  const [lotesVencidos, setLotesVencidos] = useState<LoteAlerta[]>([]);
  const [lotesPorVencer, setLotesPorVencer] = useState<LoteAlerta[]>([]);

  useEffect(() => {
    obtenerNotificaciones();
    iniciarWebSocket();
    return () => {
      detenerWebSocket();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar alertas de lotes para farmacias
  useEffect(() => {
    if (!features.gestionLotes) return;

    const cargarAlertasLotes = async () => {
      try {
        const [vencidosRes, porVencerRes] = await Promise.all([
          apiClient.get('/productos/lotes/vencidos'),
          apiClient.get('/productos/lotes/por-vencer?dias=15'),
        ]);

        const vencidos = vencidosRes.data?.data || vencidosRes.data || [];
        const porVencer = porVencerRes.data?.data || porVencerRes.data || [];

        setLotesVencidos(vencidos);
        const hoy = new Date();
        setLotesPorVencer(porVencer.filter((l: LoteAlerta) => new Date(l.fechaVencimiento) >= hoy));
      } catch (error) {
        console.error('Error al cargar alertas de lotes:', error);
      }
    };

    cargarAlertasLotes();
    // Verificar cada 5 minutos
    const interval = setInterval(cargarAlertasLotes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [features.gestionLotes]);

  // Calcular total de alertas (notificaciones + lotes)
  const totalLotesAlerta = lotesVencidos.length + lotesPorVencer.length;
  const totalNoLeidas = noLeidas + totalLotesAlerta;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        cerrarPanel();
      }
    };

    if (mostrarPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarPanel, cerrarPanel]);

  const handleNotificacionClick = async (notificacion: any) => {
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id);
    }
  };

  const getTipoEstilos = (tipo: string, titulo?: string) => {
    const isSunat = titulo?.toLowerCase().includes('sunat') || titulo?.toLowerCase().includes('rechazado') || titulo?.toLowerCase().includes('pendiente');
    switch (tipo) {
      case 'CRITICAL':
      case 'ERROR':
      case 'LOTE_VENCIDO':
        return {
          icon: isSunat ? 'mdi:file-document-alert' : 'mdi:alert-circle',
          color: 'text-red-600',
          colorDark: 'dark:text-red-400',
          bgColor: 'bg-red-50',
          bgColorDark: 'dark:bg-red-900/30'
        };
      case 'WARNING':
      case 'LOTE_POR_VENCER':
        return {
          icon: isSunat ? 'mdi:file-document-remove' : 'mdi:alert',
          color: 'text-orange-500',
          colorDark: 'dark:text-orange-400',
          bgColor: 'bg-orange-50',
          bgColorDark: 'dark:bg-orange-900/30'
        };
      case 'SUCCESS':
        return {
          icon: 'mdi:check-circle',
          color: 'text-green-600',
          colorDark: 'dark:text-green-400',
          bgColor: 'bg-green-50',
          bgColorDark: 'dark:bg-green-900/30'
        };
      case 'INFO':
      default:
        return {
          icon: isSunat ? 'mdi:file-document-clock' : 'mdi:information',
          color: 'text-blue-600',
          colorDark: 'dark:text-blue-400',
          bgColor: 'bg-blue-50',
          bgColorDark: 'dark:bg-blue-900/30'
        };
    }
  };

  const formatFecha = (fecha: string) => {
    try {
      // Usar abreviaciones similares a la imagen (10 min ago, 1 day ago - pero en español)
      const date = new Date(fecha);
      return formatDistanceToNow(date, { locale: es, addSuffix: false })
        .replace('alrededor de ', '')
        .replace('minutos', 'min')
        .replace('horas', 'h')
        .replace('días', 'd')
        .replace('semanas', 'sem');
    } catch {
      return 'ahora';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={togglePanel}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Notificaciones"
      >
        <Icon icon="solar:bell-linear" className="h-6 w-6 text-[#515C6C] dark:text-gray-400" />
        {totalNoLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {mostrarPanel && (
        <div className="absolute z-[999999] right-0 mt-3 w-[400px] bg-[#F8F9FA] dark:bg-[#0F1219] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-transparent z-50 overflow-hidden font-sans">
          {/* Header Limpio */}
          <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {/* <button onClick={cerrarPanel} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="mdi:chevron-left" width={24} />
              </button> */}
              <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Notificaciones</h3>
            </div>
            <button
              onClick={() => setMostrarConfig(!mostrarConfig)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <Icon icon="solar:settings-linear" width={22} />
            </button>
          </div>

          {/* Configuración Expandible */}
          {mostrarConfig && (
            <div className="bg-white dark:bg-slate-900 px-5 py-3 border-b border-gray-100 dark:border-slate-700 space-y-3 shadow-inner dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sonido</span>
                <button onClick={toggleSonido} className={`w-9 h-5 rounded-full relative transition-colors ${sonidoHabilitado ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${sonidoHabilitado ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Notificaciones Push</span>
                <button onClick={() => !pushHabilitado ? solicitarPermisoPush() : togglePush()} className={`w-9 h-5 rounded-full relative transition-colors ${pushHabilitado ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${pushHabilitado ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              {noLeidas > 0 && (
                <button onClick={marcarTodasComoLeidas} className="w-full text-center text-xs text-blue-500 font-medium py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                  Marcar todas como leídas
                </button>
              )}
            </div>
          )}

          {/* Lista tipo Cards */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
            {/* 🆕 ALERTAS DE LOTES PARA FARMACIAS */}
            {(lotesVencidos.length > 0 || lotesPorVencer.length > 0) && (
              <>
                {/* Lotes Vencidos */}
                {lotesVencidos.length > 0 && (
                  <Link
                    to="/administrador/kardex/lotes"
                    onClick={cerrarPanel}
                    className="block bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800/60 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Icon icon="mdi:alert-circle" className="text-red-600 dark:text-red-400" width={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-bold text-red-700 dark:text-red-400">
                          ⚠️ {lotesVencidos.length} producto{lotesVencidos.length > 1 ? 's' : ''} vencido{lotesVencidos.length > 1 ? 's' : ''}
                        </h4>
                        <p className="text-[12px] text-red-600 dark:text-red-400/80">
                          {lotesVencidos.slice(0, 2).map(l => l.producto.descripcion).join(', ')}
                          {lotesVencidos.length > 2 && ` y ${lotesVencidos.length - 2} más`}
                        </p>
                        <span className="text-[11px] text-red-500 dark:text-red-400 font-medium mt-1 inline-block">
                          Click para gestionar →
                        </span>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Lotes Por Vencer */}
                {lotesPorVencer.length > 0 && (
                  <Link
                    to="/administrador/kardex/lotes"
                    onClick={cerrarPanel}
                    className="block bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/50 hover:border-orange-300 dark:hover:border-orange-800/60 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Icon icon="mdi:alert" className="text-orange-500 dark:text-orange-400" width={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-bold text-orange-700 dark:text-orange-400">
                          {lotesPorVencer.length} producto{lotesPorVencer.length > 1 ? 's' : ''} por vencer
                        </h4>
                        <p className="text-[12px] text-orange-600 dark:text-orange-400/80">
                          {lotesPorVencer.slice(0, 2).map(l => {
                            const dias = Math.ceil((new Date(l.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return `${l.producto.descripcion} (${dias}d)`;
                          }).join(', ')}
                          {lotesPorVencer.length > 2 && ` y ${lotesPorVencer.length - 2} más`}
                        </p>
                        <span className="text-[11px] text-orange-500 dark:text-orange-400 font-medium mt-1 inline-block">
                          Click para gestionar →
                        </span>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Separador */}
                {notificaciones?.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-slate-700 my-2"></div>
                )}
              </>
            )}

            {/* Notificaciones regulares */}
            {loading && notificaciones?.length === 0 ? (
              <div className="flex justify-center py-8">
                <Icon icon="line-md:loading-loop" className="text-gray-400" width={24} />
              </div>
            ) : notificaciones?.length === 0 && lotesVencidos.length === 0 && lotesPorVencer.length === 0 ? (
              <div className="text-center py-10">
                <Icon icon="solar:bell-off-linear" className="mx-auto text-gray-300 dark:text-slate-600 mb-2" width={48} />
                <p className="text-gray-400 dark:text-slate-500 text-sm">No tienes notificaciones recientes</p>
              </div>
            ) : (
              notificaciones?.slice(0, 5).map((notificacion) => {
                const styles = getTipoEstilos(notificacion.tipo || 'INFO', notificacion.titulo);

                // Limpiar emojis del título (Caja, Alerta, Check, Info)
                const cleanTitle = notificacion.titulo.replace(/📦|⚠️|❗|✅/g, '').trim();

                const meta = notificacion.metaData as any;
                const sunatLink = meta?.comprobanteId
                  ? `/administrador/facturacion/comprobantes`
                  : meta?.guiaId
                  ? `/administrador/guia-remision`
                  : null;

                const cardContent = (
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.bgColor} ${styles.bgColorDark} flex items-center justify-center mt-0.5`}>
                      <Icon icon={styles.icon} className={`${styles.color} ${styles.colorDark}`} width={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className={`text-[14px] font-bold text-gray-900 dark:text-white leading-tight ${!notificacion.leida ? 'font-extrabold' : ''}`}>
                          {cleanTitle}
                        </h4>
                        <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap ml-2">
                          {formatFecha(notificacion.creadoEn)}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                        {notificacion.mensaje}
                      </p>
                      {sunatLink && (
                        <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: styles.color.includes('red') ? '#dc2626' : styles.color.includes('orange') ? '#ea580c' : '#2563eb' }}>
                          Ver comprobante →
                        </span>
                      )}
                    </div>
                  </div>
                );

                if (sunatLink) {
                  return (
                    <Link
                      key={notificacion.id}
                      to={sunatLink}
                      onClick={() => { handleNotificacionClick(notificacion); cerrarPanel(); }}
                      className={`block bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm border hover:border-gray-300 dark:hover:border-slate-600 transition-all relative group ${!notificacion.leida ? 'border-red-200 dark:border-red-900/50' : 'border-transparent dark:border-transparent'}`}
                    >
                      {cardContent}
                    </Link>
                  );
                }

                return (
                  <div
                    key={notificacion.id}
                    onClick={() => handleNotificacionClick(notificacion)}
                    className={`bg-white dark:bg-slate-900/80 p-3 rounded-xl shadow-sm border border-transparent dark:border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-all cursor-pointer relative group`}
                  >
                    {cardContent}
                  </div>
                );
              })
            )}
          </div>

          {notificaciones?.length > 5 && (
            <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 p-3 text-center">
              <Link to="/administrador/notificaciones" onClick={cerrarPanel} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium transition-colors">
                Ver historial completo
              </Link>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default NotificacionesCampana;
