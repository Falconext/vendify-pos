import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/utils/apiClient';

interface EmpresaVencimiento {
  id: number;
  ruc: string;
  razonSocial: string;
  fechaExpiracion: string;
  diasRestantes: number;
  plan: {
    nombre: string;
    costo: number;
    tipoFacturacion: string;
  };
}

interface AlertasVencimientoProps {
  diasAntes?: number;
  className?: string;
}

const AlertasVencimiento = ({ diasAntes = 7, className = '' }: AlertasVencimientoProps) => {
  const [empresas, setEmpresas] = useState<EmpresaVencimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const cargarEmpresasProximasVencer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/empresa/proximas-vencer?dias=${diasAntes}`);
      setEmpresas(response.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar empresas próximas a vencer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpresasProximasVencer();
  }, [diasAntes]);

  const getColorSeveridad = (diasRestantes: number) => {
    if (diasRestantes <= 1) return 'text-red-600 bg-red-50';
    if (diasRestantes <= 3) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getIconoSeveridad = (diasRestantes: number) => {
    if (diasRestantes <= 1) return 'mdi:alert-circle';
    if (diasRestantes <= 3) return 'mdi:alert';
    return 'mdi:clock-alert';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <Icon icon="mdi:alert-circle" />
          <span className="text-sm">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-green-700">
          <Icon icon="mdi:check-circle" />
          <span className="text-sm font-medium">
            No hay empresas próximas a vencer en los próximos {diasAntes} días
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div
        className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon
              icon="mdi:alert-circle-outline"
              className="text-orange-500 w-5 h-5"
            />
            <h3 className="font-semibold text-gray-800">
              Alertas de Vencimiento
            </h3>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {empresas.length}
            </span>
          </div>
          <Icon
            icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            className="text-gray-400 w-5 h-5"
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Empresas que vencen en los próximos {diasAntes} días
        </p>
      </div>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="p-4 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon
                      icon={getIconoSeveridad(empresa.diasRestantes)}
                      className={`w-4 h-4 ${getColorSeveridad(empresa.diasRestantes).split(' ')[0]}`}
                    />
                    <h4 className="font-medium text-gray-900 truncate">
                      {empresa.razonSocial}
                    </h4>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>RUC: {empresa.ruc}</p>
                    <p>
                      Plan: {empresa.plan.nombre} - S/ {empresa.plan.costo}
                      <span className="text-gray-500 ml-1">
                        / {empresa.plan.tipoFacturacion.toLowerCase()}
                      </span>
                    </p>
                    <p>
                      Vence: {new Date(empresa.fechaExpiracion).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getColorSeveridad(empresa.diasRestantes)}`}>
                  {empresa.diasRestantes === 0
                    ? 'Hoy'
                    : empresa.diasRestantes === 1
                    ? '1 día'
                    : `${empresa.diasRestantes} días`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && empresas.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <button
            onClick={cargarEmpresasProximasVencer}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
          >
            <Icon icon="mdi:refresh" className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertasVencimiento;