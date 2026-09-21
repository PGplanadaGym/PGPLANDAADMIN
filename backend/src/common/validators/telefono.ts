/** Formato libre de teléfono: dígitos, espacios, +, - y paréntesis (ej. "099 321 0108",
 * "+593 99 321 0108", "(02) 234-5678"). Entre 7 y 20 caracteres para cubrir números
 * locales cortos y números internacionales largos con separadores. */
export const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
export const MENSAJE_TELEFONO_INVALIDO =
  'El teléfono solo puede tener números, espacios, +, - y paréntesis';
