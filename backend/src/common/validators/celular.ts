/** Celular ecuatoriano: solo dígitos, máximo 10 (ej. "0991234567"). Sin espacios, guiones
 * ni signo "+" — a diferencia del teléfono de sucursal, que sí admite ese formato libre. */
export const REGEX_CELULAR = /^[0-9]{7,10}$/;
export const MENSAJE_CELULAR_INVALIDO = 'El celular solo puede tener números, máximo 10 dígitos';
