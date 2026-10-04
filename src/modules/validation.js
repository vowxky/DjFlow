/**
 * Modulo de validacion
 * Valida cantidad de nodos, pesos, aristas duplicadas
 * y detecta ciclos dirigidos con un DFS manual.
 */

export const MIN_NODOS = 7;
export const MAX_NODOS = 16;

const ok = (extra = {}) => ({ esValido: true, error: null, ...extra });
const fail = (error, extra = {}) => ({ esValido: false, error, ...extra });

export function validarCantidadNodos(valorCrudo) {
  const limpio = String(valorCrudo ?? "").trim();

  if (limpio === "") return fail("Debe ingresar un número de nodos.");
  if (!/^\d+$/.test(limpio)) {
    return fail("La cantidad de nodos debe ser un número entero sin decimales ni caracteres extraños.");
  }

  const numero = Number(limpio);
  if (numero < MIN_NODOS) return fail(`La cantidad mínima requerida es ${MIN_NODOS} nodos (ingresó ${numero}).`);
  if (numero > MAX_NODOS) return fail(`La cantidad máxima permitida es ${MAX_NODOS} nodos (ingresó ${numero}).`);

  return ok({ valor: numero });
}

export function validarPesoArista(pesoCrudo) {
  const limpio = String(pesoCrudo ?? "").trim();

  if (limpio === "") return fail("Debe ingresar el peso de la arista.");
  if (!/^\d+$/.test(limpio)) {
    return fail("El peso debe ser un número entero positivo (sin decimales ni signos negativos).");
  }

  const peso = Number(limpio);
  if (peso <= 0) return fail("El peso debe ser un número entero estrictamente mayor que cero (w ≥ 1).");

  return ok({ valor: peso });
}

//busca un camino dirigido inicio -> objetivo con DFS; devuelve la secuencia o null
export function buscarCaminoDFS(listaAdyacencia, inicio, objetivo) {
  const visitados = new Set([inicio]);
  const padres = new Map();
  const pila = [inicio];

  while (pila.length > 0) {
    const actual = pila.pop();

    if (actual === objetivo) {
      const camino = [];
      for (let paso = objetivo; paso !== undefined; paso = padres.get(paso)) {
        camino.push(paso);
      }
      return camino.reverse();
    }

    for (const { destino } of listaAdyacencia[actual] || []) {
      if (!visitados.has(destino)) {
        visitados.add(destino);
        padres.set(destino, actual);
        pila.push(destino);
      }
    }
  }

  return null;
}

export function validarNuevaArista(grafo, origen, destino, pesoCrudo) {
  if (!origen || !destino) return fail("Debe seleccionar un nodo de origen y un nodo de destino.");

  const nodos = grafo.obtenerNodos();
  if (!nodos.includes(origen) || !nodos.includes(destino)) {
    return fail("Los nodos seleccionados no existen en el grafo actual.");
  }

  if (origen === destino) {
    return fail(`No se permiten autoaristas (un vértice no puede conectarse consigo mismo: ${origen} → ${destino}).`);
  }

  if (grafo.existeArista(origen, destino)) {
    return fail(`Ya existe una arista dirigida de ${origen} hacia ${destino}.`);
  }

  const validacionPeso = validarPesoArista(pesoCrudo);
  if (!validacionPeso.esValido) return fail(validacionPeso.error);

  // origen -> destino forma un ciclo si ya existe un camino destino -> origen
  const caminoExistente = buscarCaminoDFS(grafo.obtenerListaAdyacencia(), destino, origen);
  if (caminoExistente) {
    const ciclo = [...caminoExistente, destino];
    return fail(
      `No se puede agregar ${origen} → ${destino} porque formaría un ciclo dirigido: ${ciclo.join(" → ")}.`,
      { caminoCiclo: ciclo }
    );
  }

  return ok({ peso: validacionPeso.valor });
}

export function validarInicioDijkstra(grafo, origen, destino) {
  const nodos = grafo.obtenerNodos();

  if (nodos.length === 0) return fail("Primero debe configurar y crear los nodos del grafo.");
  if (grafo.obtenerAristas().length === 0) return fail("El grafo debe tener al menos una arista para ejecutar Dijkstra.");
  if (!origen || !destino) return fail("Debe seleccionar tanto el nodo origen como el nodo destino.");
  if (!nodos.includes(origen) || !nodos.includes(destino)) {
    return fail("El nodo origen o destino seleccionado no pertenece al grafo.");
  }
  if (origen === destino) {
    return fail("El vértice origen y el vértice destino deben ser diferentes para calcular el camino.");
  }

  return ok();
}
