import { randomBytes } from 'crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

/** Identificador corto y no adivinable para el enlace de login por empresa. */
function generarSlugLogin(): string {
  return randomBytes(6).toString('base64url');
}

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll() {
    return this.prisma.empresa.findMany();
  }

  /** Solo para el super-admin: resumen de cada empresa cliente con sus módulos activos. */
  async findAllConResumen() {
    const empresas = await this.prisma.empresa.findMany({
      orderBy: { creadoEn: 'asc' },
      include: {
        _count: { select: { usuarios: true } },
        modulos: { where: { activo: true }, include: { modulo: true } },
      },
    });

    return empresas.map((empresa) => {
      const modulosActivos = empresa.modulos.map((activacion) => ({
        clave: activacion.modulo.clave,
        nombre: activacion.modulo.nombre,
        precioMensual: activacion.modulo.precioMensual,
      }));
      const totalMensual = modulosActivos.reduce(
        (acc, modulo) => acc + Number(modulo.precioMensual ?? 0),
        0,
      );

      return {
        id: empresa.id,
        nombre: empresa.nombre,
        razonSocial: empresa.razonSocial,
        ruc: empresa.ruc,
        email: empresa.email,
        dominio: empresa.dominio,
        creadoEn: empresa.creadoEn,
        totalUsuarios: empresa._count.usuarios,
        modulosActivos,
        totalMensual,
      };
    });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }

  create(dto: CreateEmpresaDto) {
    return this.prisma.empresa.create({
      data: { ...dto, dominio: dto.dominio ?? generarSlugLogin() },
    });
  }

  /**
   * Marca a mostrar en el login. `dominio` es el identificador de la URL
   * (/login/:dominio) de una empresa específica. Si no viene, o no coincide con
   * ninguna empresa, se devuelve el mismo genérico en ambos casos — a propósito,
   * para no dar pistas de qué identificadores existen.
   */
  async findBrandingPublico(dominio?: string) {
    const generico = { nombre: 'Backoffice Core', logoUrl: null, colorPrimario: null };
    if (!dominio) return generico;

    const empresa = await this.prisma.empresa.findUnique({
      where: { dominio },
      select: { nombre: true, logoUrl: true, colorPrimario: true },
    });
    return empresa ?? generico;
  }

  async update(id: string, actorId: string, dto: UpdateEmpresaDto) {
    await this.findOne(id);

    let empresa;
    try {
      empresa = await this.prisma.empresa.update({ where: { id }, data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese identificador de enlace ya está en uso');
      }
      throw error;
    }

    await this.auditoriaService.registrar({
      empresaId: id,
      usuarioId: actorId,
      accion: 'actualizar',
      entidad: 'empresa',
      entidadId: id,
      detalle: { ...dto },
    });

    return empresa;
  }

  /** Solo para el super-admin: invalida el enlace de login anterior y genera uno nuevo. */
  regenerarDominio(id: string, actorId: string) {
    return this.update(id, actorId, { dominio: generarSlugLogin() });
  }
}
