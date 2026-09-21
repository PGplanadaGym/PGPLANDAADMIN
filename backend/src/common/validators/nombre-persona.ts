/** Letras (con acentos/ñ), espacios, apóstrofes y guiones — para nombres de persona
 * (ej. "María José O'Brien-Pérez"). Sin números ni símbolos. */
export const REGEX_NOMBRE_PERSONA = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'\-\s]+$/;
export const MENSAJE_NOMBRE_INVALIDO = 'El nombre solo puede tener letras, espacios, apóstrofes y guiones';
