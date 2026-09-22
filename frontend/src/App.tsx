import { Authenticated, Refine } from '@refinedev/core'
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
} from '@refinedev/react-router'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { authProvider } from './providers/authProvider'
import { dataProvider } from './providers/dataProvider'
import { accessControlProvider } from './providers/accessControlProvider'
import { notificationProvider } from './providers/notificationProvider'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/login/LoginPage'
import { ForgotPasswordPage } from './pages/login/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/login/ResetPasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { UsuariosListPage } from './pages/usuarios/UsuariosListPage'
import { UsuariosCreatePage } from './pages/usuarios/UsuariosCreatePage'
import { UsuarioPerfilPage } from './pages/usuarios/UsuarioPerfilPage'
import { ClientesListPage } from './pages/clientes/ClientesListPage'
import { ClienteFormPage } from './pages/clientes/ClienteFormPage'
import { EmpresaPage } from './pages/empresa/EmpresaPage'
import { PerfilPage } from './pages/perfil/PerfilPage'
import { CitasPage } from './pages/citas/CitasPage'
import { RecursosPage } from './pages/recursos/RecursosPage'
import { TiposCitaPage } from './pages/tipos-cita/TiposCitaPage'
import { RolesPermisosPage } from './pages/roles/RolesPermisosPage'
import { CuentasPage } from './pages/cuentas/CuentasPage'
import { ClientePerfilPage } from './pages/clientes/ClientePerfilPage'
import { SucursalesPage } from './pages/sucursales/SucursalesPage'
import { SucursalPerfilPage } from './pages/sucursales/SucursalPerfilPage'
import { MembresiasPage } from './pages/membresias/MembresiasPage'

function App() {
  return (
    <Refine
      routerProvider={routerProvider}
      authProvider={authProvider}
      dataProvider={dataProvider}
      accessControlProvider={accessControlProvider}
      notificationProvider={notificationProvider}
      resources={[
        {
          name: 'dashboard',
          list: '/',
          meta: { label: 'Dashboard' },
        },
        {
          name: 'usuarios',
          list: '/usuarios',
          create: '/usuarios/nuevo',
          edit: '/usuarios',
          meta: { label: 'Usuarios' },
        },
        {
          name: 'roles',
          list: '/roles',
          meta: { label: 'Roles y permisos' },
        },
        {
          name: 'cuentas',
          list: '/cuentas',
          meta: { label: 'Cuentas' },
        },
        {
          name: 'clientes',
          list: '/clientes',
          create: '/clientes/nuevo',
          edit: '/clientes/:id/editar',
          meta: { label: 'Clientes' },
        },
        {
          name: 'empresas',
          list: '/empresa',
          meta: { label: 'Mi empresa' },
        },
        {
          name: 'citas',
          list: '/citas',
          meta: { label: 'Citas' },
        },
        {
          name: 'recursos',
          list: '/recursos',
          meta: { label: 'Recursos' },
        },
        {
          name: 'tipos-cita',
          list: '/tipos-cita',
          meta: { label: 'Tipos de cita' },
        },
        {
          name: 'sucursales',
          list: '/sucursales',
          meta: { label: 'Sucursales' },
        },
        {
          name: 'membresias',
          list: '/membresias',
          meta: { label: 'Membresías' },
        },
      ]}
      options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <Authenticated key="private" fallback={<CatchAllNavigate to="/login" />}>
              <Layout />
            </Authenticated>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/usuarios" element={<UsuariosListPage />} />
          <Route path="/usuarios/nuevo" element={<UsuariosCreatePage />} />
          <Route path="/usuarios/:id" element={<UsuarioPerfilPage />} />
          <Route path="/roles" element={<RolesPermisosPage />} />
          <Route path="/cuentas" element={<CuentasPage />} />
          <Route path="/clientes" element={<ClientesListPage />} />
          <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
          <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
          <Route path="/empresa" element={<EmpresaPage />} />
          <Route path="/citas" element={<CitasPage />} />
          <Route path="/recursos" element={<RecursosPage />} />
          <Route path="/tipos-cita" element={<TiposCitaPage />} />
          <Route path="/clientes/:id" element={<ClientePerfilPage />} />
          <Route path="/sucursales" element={<SucursalesPage />} />
          <Route path="/sucursales/:id" element={<SucursalPerfilPage />} />
          <Route path="/membresias" element={<MembresiasPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>

        <Route path="*" element={<NavigateToResource resource="dashboard" />} />
      </Routes>

      <Toaster position="top-right" richColors closeButton />
    </Refine>
  )
}

export default App
