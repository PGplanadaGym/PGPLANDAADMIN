import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CheckPermissions } from '../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ModulosService } from '../modulos/modulos.service';
import { SetHabilitadoModuloDto } from '../modulos/dto/set-habilitado-modulo.dto';

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly modulosService: ModulosService,
  ) {}

  // Listar TODAS las empresas es una acción de super-admin (dueño de la
  // plataforma): un Admin normal solo debe ver la suya vía GET /empresas/:id.
  @UseGuards(SuperAdminGuard)
  @Get()
  findAll() {
    return this.empresasService.findAll();
  }

  @UseGuards(SuperAdminGuard)
  @Get('resumen')
  findAllConResumen() {
    return this.empresasService.findAllConResumen();
  }

  @CheckPermissions('empresas.leer')
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (id !== user.empresaId && !user.esSuperAdmin) {
      throw new ForbiddenException('No puedes ver otra empresa que no sea la tuya');
    }
    return this.empresasService.findOne(id);
  }

  // Crear una empresa nueva es dar de alta a un cliente nuevo de la
  // plataforma: solo el super-admin lo hace.
  @UseGuards(SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.empresasService.create(dto);
  }

  @CheckPermissions('empresas.actualizar')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmpresaDto,
  ) {
    if (id !== user.empresaId && !user.esSuperAdmin) {
      throw new ForbiddenException('No puedes editar otra empresa que no sea la tuya');
    }
    return this.empresasService.update(id, user.id, dto);
  }

  // Ver/editar qué módulos puede usar una empresa (a diferencia de "activo",
  // que decide la propia empresa) es una decisión solo del super-admin.
  @UseGuards(SuperAdminGuard)
  @Get(':id/modulos')
  findModulos(@Param('id') id: string) {
    return this.modulosService.findEntitlementsPorEmpresa(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':id/modulos/:clave')
  setHabilitadoModulo(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('clave') clave: string,
    @Body() dto: SetHabilitadoModuloDto,
  ) {
    return this.modulosService.setHabilitado(id, user.id, clave, dto.habilitado);
  }

  // Invalida el enlace de login anterior de una empresa y genera uno nuevo —
  // útil si el identificador se filtró. Solo el super-admin lo hace.
  @UseGuards(SuperAdminGuard)
  @Post(':id/regenerar-login')
  regenerarLogin(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.empresasService.regenerarDominio(id, user.id);
  }
}
