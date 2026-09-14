import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly configurado = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

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
            reject(error ?? new Error('Cloudinary no devolvió resultado'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }
}
