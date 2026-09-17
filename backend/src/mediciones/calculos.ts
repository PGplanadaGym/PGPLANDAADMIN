/**
 * Cálculos derivados del seguimiento físico. Nada de esto se guarda en la base de datos:
 * se recalcula cada vez a partir de peso/talla/perímetros, para que si algún día se corrige
 * un dato de una medición vieja, las cifras derivadas siempre queden consistentes.
 */

export type Sexo = 'M' | 'F';

export interface DatosMedicion {
  peso: number; // kg
  talla: number; // cm
  perimetroCuello?: number | null; // cm
  perimetroCintura?: number | null; // cm
  perimetroCadera?: number | null; // cm
  sexo?: Sexo | null;
}

export type ClasificacionImc = 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';

export interface CalculosMedicion {
  imc: number;
  clasificacionImc: ClasificacionImc;
  pesoIdealMin: number;
  pesoIdealMax: number;
  sobrepesoKg: number;
  porcentajeGrasa: number | null; // null si faltan datos para calcularlo (fórmula naval)
}

function clasificarImc(imc: number): ClasificacionImc {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

/**
 * % de grasa corporal por el método naval de EE.UU. — la única fórmula razonablemente
 * validada que solo necesita cinta métrica (sin báscula de bioimpedancia). Requiere
 * cuello + cintura (+ cadera si es mujer) + talla + sexo; si falta algo, retorna null
 * en vez de inventar un número con datos incompletos.
 */
function calcularPorcentajeGrasa(datos: DatosMedicion): number | null {
  const { talla, perimetroCuello, perimetroCintura, perimetroCadera, sexo } = datos;
  if (!sexo || !perimetroCuello || !perimetroCintura) return null;

  if (sexo === 'M') {
    const diferencia = perimetroCintura - perimetroCuello;
    if (diferencia <= 0) return null;
    const valor =
      495 /
        (1.0324 - 0.19077 * Math.log10(diferencia) + 0.15456 * Math.log10(talla)) -
      450;
    return redondear(valor);
  }

  // mujer: necesita también la cadera
  if (!perimetroCadera) return null;
  const suma = perimetroCintura + perimetroCadera - perimetroCuello;
  if (suma <= 0) return null;
  const valor =
    495 /
      (1.29579 - 0.35004 * Math.log10(suma) + 0.221 * Math.log10(talla)) -
    450;
  return redondear(valor);
}

function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function calcularMedicion(datos: DatosMedicion): CalculosMedicion {
  const tallaMetros = datos.talla / 100;
  const imc = redondear(datos.peso / (tallaMetros * tallaMetros), 1);
  const pesoIdealMin = redondear(18.5 * tallaMetros * tallaMetros);
  const pesoIdealMax = redondear(24.9 * tallaMetros * tallaMetros);
  const sobrepesoKg = redondear(Math.max(0, datos.peso - pesoIdealMax));

  return {
    imc,
    clasificacionImc: clasificarImc(imc),
    pesoIdealMin,
    pesoIdealMax,
    sobrepesoKg,
    porcentajeGrasa: calcularPorcentajeGrasa(datos),
  };
}
