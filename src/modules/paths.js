/**
 * Modulo de caminos
 * Reconstruye todos los caminos minimos a partir de los predecesores
 * (cada vertice guarda la lista de predecesores que empatan en distancia).
 */

//backtracking destino -> origen siguiendo cada predecesor
export function reconstruirCaminos(predecesores, origen, destino) {
  const caminos = [];

  const recorrer = (nodo, sufijo) => {
    if (nodo === origen) {
      caminos.push([origen, ...sufijo]);
      return;
    }
    for (const pred of predecesores[nodo] ?? []) {
      recorrer(pred, [nodo, ...sufijo]);
    }
  };

  recorrer(destino, []);
  return caminos.sort((a, b) => a.join("").localeCompare(b.join("")));
}

//ids 'u-v' de las aristas que forman el camino
export function obtenerAristasDelCamino(camino) {
  return camino.slice(0, -1).map((nodo, i) => `${nodo}-${camino[i + 1]}`);
}
