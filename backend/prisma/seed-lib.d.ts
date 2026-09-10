import type { PrismaClient } from '@prisma/client';
export declare const CATALOGO_PERMISOS: {
    clave: string;
    etiqueta: string;
}[];
export declare const CATALOGO_MODULOS: {
    clave: string;
    nombre: string;
    descripcion: string;
    precioMensual: number;
}[];
interface SeedEmpresaBaseOptions {
    prisma: PrismaClient;
    empresaNombre: string;
    dominio: string;
    adminNombre: string;
    adminEmail: string;
    adminPassword: string;
    activarModuloClientes?: boolean;
    modulosActivos?: string[];
}
export declare function seedEmpresaBase(opts: SeedEmpresaBaseOptions): Promise<{
    empresa: {
        id: string;
        dominio: string | null;
        nombre: string;
        razonSocial: string | null;
        ruc: string | null;
        direccion: string | null;
        telefono: string | null;
        email: string | null;
        logoUrl: string | null;
        colorPrimario: string | null;
        zonaHoraria: string;
        creadoEn: Date;
    };
    admin: {
        id: string;
        nombre: string;
        telefono: string | null;
        email: string;
        creadoEn: Date;
        empresaId: string;
        passwordHash: string;
        fotoUrl: string | null;
        cargo: string | null;
        bio: string | null;
        activo: boolean;
        passwordConfigurada: boolean;
        sucursalId: string | null;
    };
    rolAdmin: {
        id: string;
        nombre: string;
        empresaId: string | null;
        descripcion: string | null;
    };
    permisos: {
        id: string;
        clave: string;
        etiqueta: string;
    }[];
    modulos: {
        id: string;
        nombre: string;
        descripcion: string | null;
        clave: string;
        precioMensual: import("@prisma/client-runtime-utils").Decimal | null;
    }[];
}>;
export {};
