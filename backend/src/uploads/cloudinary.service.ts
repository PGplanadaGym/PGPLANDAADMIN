import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

// El repo trae estas variables con este valor literal como placeholder de ejemplo — si nadie
// las reemplazó por credenciales reales de Cloudinary, no cuentan como "configurado".
const VALOR_PLACEHOLDER = 'placeholder';

function esCredencialReal(valor: string | undefined): boolean {
  return Boolean(valor) && valor !== VALOR_PLACEHOLDER;
}

@Injectable()
export class CloudinaryService {
  private readonly configurado =
    esCredencialReal(process.env.CLOUDINARY_CLOUD_NAME) &&
    esCredencialReal(process.env.CLOUDINARY_API_KEY) &&
    esCredencialReal(process.env.CLOUDINARY_API_SECRET);

  constructor() {
    if (this.configurado) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  subirImagen(buffer: Buffer, carpeta: string): Promise<string> {
    return this.subir(buffer, carpeta, 'image');
  }

  /** Acepta imágenes o PDF (ej. comprobantes/facturas escaneadas). */
  subirDocumento(buffer: Buffer, carpeta: string): Promise<string> {
    return this.subir(buffer, carpeta, 'auto');
  }

  private subir(
    buffer: Buffer,
    carpeta: string,
    resourceType: 'image' | 'auto',
  ): Promise<string> {
    if (!this.configurado) {
      throw new ServiceUnavailableException(
        'La subida de archivos no está configurada (faltan credenciales de Cloudinary)',
      );
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: carpeta, resource_type: resourceType },
        (error, result) => {
          if (error || !result) {
            // El error crudo de Cloudinary (ej. "Invalid api_key placeholder") no es un
            // HttpException, así que Nest lo convertiría en un 500 genérico sin explicación.
            // Se envuelve para que el usuario vea un mensaje que sí dice qué pasó.
            reject(
              new InternalServerErrorException(
                'No se pudo subir el archivo a Cloudinary. Revisa que las credenciales configuradas sean válidas.',
              ),
            );
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }
}
