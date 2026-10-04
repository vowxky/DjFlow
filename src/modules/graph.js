/**
 * Modulo del grafo
 * Representacion interna del grafo dirigido y ponderado:
 * nodos, aristas, lista de adyacencia y matriz de pesos.
 */

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Grafo {
  constructor() {
    this.nodos = [];
    this.aristas = [];
  }

  //genera los nodos A, B, C... y borra las aristas
  establecerNodos(cantidad) {
    this.nodos = LETRAS.slice(0, cantidad).split("");
    this.aristas = [];
  }

  obtenerNodos() {
    return [...this.nodos];
  }

  obtenerAristas() {
    return this.aristas.map((a) => ({ ...a }));
  }

  agregarArista(origen, destino, peso) {
    this.aristas.push({ id: `${origen}-${destino}`, origen, destino, peso: Number(peso) });
  }

  eliminarArista(origen, destino) {
    const antes = this.aristas.length;
    this.aristas = this.aristas.filter((a) => !(a.origen === origen && a.destino === destino));
    return this.aristas.length < antes;
  }

  limpiarAristas() {
    this.aristas = [];
  }

  reiniciar() {
    this.nodos = [];
    this.aristas = [];
  }

  existeArista(origen, destino) {
    return this.aristas.some((a) => a.origen === origen && a.destino === destino);
  }

  obtenerAristasSalientes(nodo) {
    return this.aristas.filter((a) => a.origen === nodo);
  }

  //lista de adyacencia: { A: [{ destino, peso }], ... }
  obtenerListaAdyacencia() {
    const adyacencia = Object.fromEntries(this.nodos.map((n) => [n, []]));
    for (const a of this.aristas) {
      adyacencia[a.origen]?.push({ destino: a.destino, peso: a.peso });
    }
    return adyacencia;
  }

  //matriz de pesos: 0 en la diagonal, null (∞) si no hay arista
  obtenerMatrizAdyacencia() {
    const n = this.nodos.length;
    const indice = new Map(this.nodos.map((nodo, i) => [nodo, i]));
    const matriz = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 0 : null))
    );

    for (const a of this.aristas) {
      matriz[indice.get(a.origen)][indice.get(a.destino)] = a.peso;
    }

    return { nodos: [...this.nodos], matriz };
  }


  //PORFA LEAN ESTO
  /**
   * Genera un DAG aleatorio de n vertices.
   * Las aristas solo van de una letra menor a una mayor (orden topologico A, B, C...),
   * por lo que nunca se forman ciclos. Cada vertice recibe al menos una arista de uno
   * anterior, asi todos son alcanzables desde A. Pesos pequeños (1 a 9) para que
   * aparezcan empates y varios caminos minimos.
   */
  generarAleatorio(cantidad) {
    this.establecerNodos(cantidad);
    const n = this.nodos.length;
    const peso = () => 1 + Math.floor(Math.random() * 9);

    for (let i = 1; i < n; i++) {
      const j = Math.max(0, i - 1 - Math.floor(Math.random() * 3));
      this.agregarArista(this.nodos[j], this.nodos[i], peso());
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < Math.min(n, i + 4); j++) {
        if (!this.existeArista(this.nodos[i], this.nodos[j]) && Math.random() < 0.38) {
          this.agregarArista(this.nodos[i], this.nodos[j], peso());
        }
      }
    }
  }

  cargarEjemplo(tipo = "ejemplo1") {
    const ejemplos = {
      ejemplo1: {
        n: 8,
        aristas: [
          ["A", "B", 2], ["A", "C", 4], ["B", "C", 1], ["B", "D", 7],
          ["C", "E", 3], ["E", "D", 2], ["D", "F", 1], ["E", "F", 5],
          ["D", "H", 3], ["F", "H", 2], ["E", "G", 6], ["G", "H", 1]
        ]
      },
      ejemplo2: {
        n: 9,
        aristas: [
          ["A", "B", 5], ["A", "C", 2], ["A", "D", 6], ["C", "B", 2],
          ["C", "E", 7], ["B", "E", 3], ["B", "F", 6], ["D", "F", 3],
          ["E", "G", 2], ["F", "G", 1], ["E", "H", 4], ["F", "H", 5],
          ["G", "I", 4], ["H", "I", 1]
        ]
      }
    };

    const { n, aristas } = ejemplos[tipo];
    this.establecerNodos(n);
    aristas.forEach(([u, v, w]) => this.agregarArista(u, v, w));
  }
}
