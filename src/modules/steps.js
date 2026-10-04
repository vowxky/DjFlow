/**
 * Modulo gestor de pasos
 * Navega el historial de pasos generado por Dijkstra.
 */

export class GestorPasos {
  constructor() {
    this.reiniciar();
  }

  establecerPasos(lista) {
    this.pasos = Array.isArray(lista) ? lista : [];
    this.indice = 0;
  }

  reiniciar() {
    this.pasos = [];
    this.indice = 0;
  }

  get activo() {
    return this.pasos.length > 0;
  }

  actual() {
    return this.pasos[this.indice] ?? null;
  }

  siguiente() {
    if (this.tieneSiguiente()) this.indice++;
    return this.actual();
  }

  anterior() {
    if (this.tieneAnterior()) this.indice--;
    return this.actual();
  }

  irAlInicio() {
    this.indice = 0;
    return this.actual();
  }

  irAlFinal() {
    this.indice = Math.max(0, this.pasos.length - 1);
    return this.actual();
  }

  tieneSiguiente() {
    return this.indice < this.pasos.length - 1;
  }

  tieneAnterior() {
    return this.indice > 0;
  }

  progreso() {
    const total = this.pasos.length;
    if (total === 0) return { actual: 0, total: 0, porcentaje: 0 };
    const actual = this.indice + 1;
    return { actual, total, porcentaje: Math.round((actual / total) * 100) };
  }
}
