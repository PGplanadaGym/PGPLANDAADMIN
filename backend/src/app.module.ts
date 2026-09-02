import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesPermisosModule } from './roles-permisos/roles-permisos.module';
import { ModulosModule } from './modulos/modulos.module';
import { ClientesModule } from './clientes/clientes.module';
import { MetadataModule } from './metadata/metadata.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { RecursosModule } from './recursos/recursos.module';
import { TiposCitaModule } from './tipos-cita/tipos-cita.module';
import { CitasModule } from './citas/citas.module';
import { ActivosModule } from './activos/activos.module';
import { ProductosModule } from './productos/productos.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { CosteoModule } from './costeo/costeo.module';
import { VentasModule } from './ventas/ventas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { NominaModule } from './nomina/nomina.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuditoriaModule,
    NotificacionesModule,
    AuthModule,
    EmpresasModule,
    UsuariosModule,
    RolesPermisosModule,
    ModulosModule,
    ClientesModule,
    MetadataModule,
    UploadsModule,
    RecursosModule,
    TiposCitaModule,
    CitasModule,
    ActivosModule,
    ProductosModule,
    AsistenciaModule,
    CuentasModule,
    CosteoModule,
    VentasModule,
    DashboardModule,
    ProveedoresModule,
    SucursalesModule,
    NominaModule,
  ],
})
export class AppModule {}
