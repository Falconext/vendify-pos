import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import LoginPage from './pages/Login'
import StorePreviewPage from './pages/StorePreviewPage'
// import DashboardPage from './pages/Dashboard' 
import { ProtectedRoute } from './app/ProtectedRoute'
import { RoleRoute } from './app/RoleRoute'
import { ProduccionRoute } from './app/ProduccionRoute'
import AdminIndex from './pages/admin/Index'
import AdminLayout from './layouts/AdminLayout'
import ClientesPage from './pages/admin/Clientes'
import DoctorsPage from './pages/admin/Doctors'
import ReporteContabilidad from './pages/admin/contabilidad/Reporte'
import ReporteInformales from './pages/admin/contabilidad/ReporteInformales'
import ArqueoCaja from './pages/admin/contabilidad/Arqueo'
import CajaIndex from './pages/admin/caja/Index'
import ComprobantesPage from './pages/admin/facturacion/Comprobantes'
import ComprobantesInformales from './pages/admin/facturacion/ComprobantesInformales'
import Invoice from './pages/admin/facturacion/Nuevo'
import Pagos from './pages/admin/facturacion/Pagos'
import CuentasPorCobrar from './pages/admin/facturacion/CuentasPorCobrar'
import Cotizaciones from './pages/admin/cotizaciones/Cotizaciones'
import EmpresasIndex from './pages/admin/empresa/Index'
import PerfilIndex from './pages/admin/perfil/Index'
import KardexIndex from './pages/admin/kardex/Index'
import InventarioDashboard from './pages/admin/kardex/Dashboard'
import KardexProductos from './pages/admin/kardex/Productos'
import ProductoNuevo from './pages/admin/kardex/ProductoNuevo'
import KardexTraslados from './pages/admin/kardex/Traslados'
import Lotes from './pages/admin/kardex/Lotes'
import LibroControl from './pages/admin/kardex/LibroControl'
import SeriesGarantias from './pages/admin/kardex/SeriesGarantias'
import UsuariosIndex from './pages/admin/usuarios/Index'
import VendedoresView from './features/admin/users/VendedoresView'
import SedesIndex from './pages/admin/sedes/Index'
import NotificacionesIndex from './pages/admin/notificaciones/Index'
import ConfiguracionTienda from './pages/admin/tienda/Configuracion'
import TemplateTienda from './pages/admin/tienda/Template'
import PedidosTienda from './pages/admin/tienda/Pedidos'
import ReviewsTienda from './pages/admin/tienda/Reviews'
import BlogTienda from './pages/admin/tienda/Blog'
import PanelVentasView from './pages/admin/despacho/PanelVentasView'
import DespachoConfigPage from './pages/admin/despacho/DespachoConfigPage'
import RepartidoresView from './pages/admin/repartidores/RepartidoresView'
import CombosTienda from './pages/admin/tienda/Combos'
import ModificadoresTienda from './pages/admin/tienda/Modificadores'
import TiendaPublica from './pages/tienda/[slug]'
import ProductoDetalle from './pages/tienda/ProductoDetalle'
import ProductoDetalleRouter from './pages/tienda/ProductoDetalleRouter'
import Checkout from './pages/tienda/Checkout'
import Catalogo from './pages/tienda/Catalogo'
import SeguimientoPedido from './pages/tienda/SeguimientoPedido'
import ContactoRouter from './pages/tienda/ContactoRouter'
import BlogRouter from './pages/tienda/BlogRouter'
import TiendaLogin from './pages/TiendaLogin'
import TiendaHome from './pages/TiendaHome'

import CatalogoGlobal from './pages/admin/sistema/CatalogoGlobal'
import Planes from './pages/admin/sistema/Planes'
import ModulosPage from './pages/admin/sistema/Modulos'
import FinanceDashboard from './pages/admin/finanzas/Dashboard'
import MisComisionesPage from './pages/admin/mis-comisiones/MisComisionesPage'
import Campanas from './pages/admin/marketing/Campanas'
import ResumenNegocio from './pages/admin/ecommerce/ResumenNegocio'
import ComprasIndex from './pages/admin/compras/Index'
import ProveedoresPage from './pages/admin/compras/Proveedores'
import GuiaRemision from './pages/admin/guia-remision/GuiaRemision'
import LibroVentas from './pages/admin/sire/LibroVentas'
import LibroCompras from './pages/admin/sire/LibroCompras'
import AdminResellers from './pages/admin/sistema/Resellers'
import CatalogoWebPage from './pages/admin/sistema/CatalogoWebPage'
import SistemaUsuarios from './pages/admin/sistema/SistemaUsuarios'
import SistemaFinanzas from './pages/admin/sistema/SistemaFinanzas'
import SistemaDashboard from './pages/admin/sistema/SistemaDashboard'
import SistemaRubros from './pages/admin/sistema/SistemaRubros'
import DisenoRubroPage from './pages/admin/sistema/DisenoRubroPage'
import ResellerLayout from './layouts/ResellerLayout'
import ResellerDashboard from './pages/reseller/Dashboard'
import ResellerClientes from './pages/reseller/Clientes'
import ResellerGanancias from './pages/reseller/Ganancias'
import ResellerMarca from './pages/reseller/Marca'
import ResellerRecargas from './pages/reseller/Recargas'
import ResellerEstadoCuenta from './pages/reseller/EstadoCuenta'
import SedeSelectionScreen from './features/auth/sede-selection/SedeSelectionScreen'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import ProduccionRecetasPage from './pages/admin/produccion/Recetas'
import ProduccionOrdenesPage from './pages/admin/produccion/Ordenes'
import ReservasPage from './pages/admin/reservas/ReservasPage'
import VehiculosPage from './pages/admin/vehiculos/Vehiculos'
import ContratosVehicularesPage from './pages/admin/vehiculos/ContratosVehiculares'
import DashboardPreviewPage from './features/admin/dashboard-preview/DashboardPreviewPage'

function App() {
  console.log('App initialized - Checkpoint')
  return (
    <BrowserRouter>
      <Alert />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
        {/* Redirects de compatibilidad para enlaces viejos */}
        <Route path="/forgot-password" element={<Navigate to="/recuperar-contrasena" replace />} />
        <Route path="/reset-password" element={<Navigate to="/restablecer-contrasena" replace />} />
        <Route path="/sede-seleccion" element={<SedeSelectionScreen />} />
        {/* Piloto de rediseño del dashboard (shell propio, fuera de AdminLayout) */}
        <Route
          path="/dashboard-nuevo"
          element={
            <ProtectedRoute>
              <DashboardPreviewPage />
            </ProtectedRoute>
          }
        />
        {/* Login específico para tienda (mismo backend, layout invertido) */}
        <Route path="/tienda/login" element={<TiendaLogin />} />
        {/* <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/administrador"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndex />} />
          <Route path="perfil" element={<PerfilIndex />} />
          <Route path="empresas" element={<EmpresasIndex />} />
          {/* Rutas de crear/editar migradas a modal: redirigir al listado */}
          <Route path="empresas/crear" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="empresas/editar/:id" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="medicos" element={<DoctorsPage />} />

          <Route path="compras" element={<ComprasIndex />} />
          <Route path="compras/proveedores" element={<ProveedoresPage />} />
          <Route path="guia-remision" element={<GuiaRemision />} />
          <Route path="facturacion/guia-remision" element={<GuiaRemision />} />
          <Route path="contabilidad" element={<Navigate to="/administrador/contabilidad/reporte" replace />} />
          <Route path="contabilidad/reporte" element={<ReporteContabilidad />} />
          <Route path="contabilidad/reporte-informales" element={<ReporteInformales />} />
          <Route path="contabilidad/arqueo" element={<ArqueoCaja />} />
          <Route path="sire/ventas" element={<LibroVentas />} />
          <Route path="sire/compras" element={<LibroCompras />} />
          <Route path="caja" element={<CajaIndex />} />
          <Route path="ventas/caja" element={<CajaIndex />} />
          <Route path="facturacion/comprobantes" element={<ComprobantesPage />} />
          <Route path="facturacion/comprobantes-informales" element={<ComprobantesInformales />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="pagos/cuentas-cobrar" element={<CuentasPorCobrar />} />
          <Route path="ventas/pagos" element={<Pagos />} />
          <Route path="ventas/pagos/cuentas-cobrar" element={<CuentasPorCobrar />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cotizaciones/nuevo" element={<Invoice />} />
          <Route path="facturacion/cotizaciones" element={<Cotizaciones />} />
          <Route path="facturacion/cotizaciones/nuevo" element={<Invoice />} />
          <Route path="facturacion/nuevo" element={<Invoice />} />
          <Route path="finanzas/dashboard" element={<FinanceDashboard />} />
          <Route path="mi-negocio/marketing/finanzas" element={<FinanceDashboard />} />
          <Route path="mis-comisiones" element={<MisComisionesPage />} />
          <Route path="mi-negocio/marketing/campanas" element={<Campanas />} />
          <Route path="mi-negocio/resumen" element={<ResumenNegocio />} />
          <Route path="kardex" element={<KardexIndex />} />
          <Route path="kardex/productos" element={<KardexProductos />} />
          <Route path="kardex/productos/nuevo" element={<ProductoNuevo />} />
          <Route path="kardex/productos/editar/:id" element={<ProductoNuevo />} />
          <Route path="kardex/traslados" element={<KardexTraslados />} />
          <Route path="kardex/lotes" element={<Lotes />} />
          <Route path="kardex/libro-control" element={<LibroControl />} />
          <Route path="kardex/series-garantias" element={<SeriesGarantias />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="kardex/combos" element={<CombosTienda />} />
          <Route path="kardex/dashboard" element={<InventarioDashboard />} />
          <Route
            path="produccion/recetas"
            element={
              <ProduccionRoute>
                <ProduccionRecetasPage />
              </ProduccionRoute>
            }
          />
          <Route
            path="produccion/ordenes"
            element={
              <ProduccionRoute>
                <ProduccionOrdenesPage />
              </ProduccionRoute>
            }
          />
          <Route path="usuarios" element={<UsuariosIndex />} />
          <Route path="usuarios/vendedores" element={<VendedoresView />} />
          <Route path="usuarios/repartidores" element={<RepartidoresView />} />
          <Route path="usuarios/clientes" element={<ClientesPage />} />
          <Route path="usuarios/proveedores" element={<ProveedoresPage />} />
          <Route path="sedes" element={<SedesIndex />} />
          <Route path="notificaciones" element={<NotificacionesIndex />} />
          <Route path="tienda/configuracion" element={<ConfiguracionTienda />} />
          <Route path="tienda/template" element={<TemplateTienda />} />
          <Route path="tienda/pedidos" element={<PedidosTienda />} />
          <Route path="tienda/reviews" element={<ReviewsTienda />} />
          <Route path="tienda/blog" element={<BlogTienda />} />
          <Route path="ventas" element={<PanelVentasView />} />
          <Route path="despacho/config" element={<DespachoConfigPage />} />
          <Route path="repartidores" element={<RepartidoresView />} />
          <Route path="tienda/combos" element={<CombosTienda />} />
          <Route path="tienda/modificadores" element={<ModificadoresTienda />} />
          {/* Módulo Vehicular (GPS / Alarmas / Seguridad Electrónica) */}
          <Route path="vehiculos" element={<VehiculosPage />} />
          <Route path="vehiculos/contratos" element={<ContratosVehicularesPage />} />

          {/* Rutas de ADMIN_SISTEMA */}

          <Route
            path="sistema/dashboard"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <SistemaDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="sistema/rubros"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <SistemaRubros />
              </RoleRoute>
            }
          />
          <Route path="sistema/catalogo-global" element={<CatalogoGlobal />} />
          <Route path="sistema/planes" element={<Planes />} />
          <Route
            path="sistema/disenos-tienda"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <DisenoRubroPage />
              </RoleRoute>
            }
          />
          <Route path="sistema/modulos" element={<ModulosPage />} />
          <Route
            path="sistema/resellers"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <AdminResellers />
              </RoleRoute>
            }
          />
          <Route
            path="sistema/catalogo-web"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <CatalogoWebPage />
              </RoleRoute>
            }
          />
          <Route
            path="sistema/usuarios"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA"]} fallbackPath="/administrador">
                <SistemaUsuarios />
              </RoleRoute>
            }
          />
          <Route
            path="sistema/finanzas"
            element={
              <RoleRoute allowedRoles={["ADMIN_SISTEMA", "ADMIN_EMPRESA"]} fallbackPath="/administrador">
                <SistemaFinanzas />
              </RoleRoute>
            }
          />
        </Route>

        {/* Rutas de Reseller (Distribuidor) */}
        <Route
          path="/reseller"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["RESELLER"]} fallbackPath="/administrador">
                <ResellerLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<ResellerDashboard />} />
          <Route path="clientes" element={<ResellerClientes />} />
          <Route path="ganancias" element={<ResellerGanancias />} />
          <Route path="marca" element={<ResellerMarca />} />
          <Route path="recargas" element={<ResellerRecargas />} />
          <Route path="estado-cuenta" element={<ResellerEstadoCuenta />} />
        </Route>
        {/* Rutas de tienda */}
        {/* Home de tienda para emprendedor (requiere estar logueado, usa mismo token) */}
        <Route path="/diseno-preview" element={<StorePreviewPage />} />
        <Route path="/tienda/home" element={<TiendaHome />} />
        <Route path="/tienda/preview/:previewPage" element={<StorePreviewPage />} />
        {/* Rutas públicas de tienda para clientes finales */}
        <Route path="/tienda/:slug" element={<TiendaPublica />} />
        <Route path="/tienda/:slug/catalogo" element={<Catalogo />} />
        <Route path="/tienda/:slug/producto/:id" element={<ProductoDetalleRouter />} />
        <Route path="/tienda/:slug/checkout" element={<Checkout />} />
        <Route path="/tienda/:slug/seguimiento" element={<SeguimientoPedido />} />
        <Route path="/tienda/:slug/contacto" element={<ContactoRouter />} />
        <Route path="/tienda/:slug/blog" element={<BlogRouter />} />
        <Route path="/tienda/:slug/blog/:blogId" element={<BlogRouter />} />
        {/* Catch-all para tienda pública: Evita que links rotos en banners manden al login/admin */}
        <Route path="/tienda/:slug/*" element={<TiendaPublica />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
