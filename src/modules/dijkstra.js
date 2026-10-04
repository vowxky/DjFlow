/**
 * Modulo de Dijkstra
 * Sigue los pasos del metodo de etiquetado:
 * cada vertice recibe etiquetas [d, V](n), donde d es la distancia acumulada,
 * V el vertice de procedencia y n el numero de iteraciones desde el origen.
 * Genera un historial de pasos para visualizarlos uno a uno.
 */

import { reconstruirCaminos } from "./paths.js";

export function subindice(n) {
  const digitos = "₀₁₂₃₄₅₆₇₈₉";
  return String(n).split("").map((c) => digitos[Number(c)]).join("");
}

export const etiquetaTexto = (e) => `[${e.d}, ${e.pred ?? "−"}]${subindice(e.n)}`;

export function ejecutarDijkstra(grafo, origen, destino) {
  const nodos = grafo.obtenerNodos();
  const pasos = [];

  // etiquetas[v] = [{ d, pred, n, iteracion, tachada }]
  const etiquetas = Object.fromEntries(nodos.map((v) => [v, []]));
  const visitados = [];
  let iteracion = 0;

  const vigentes = (v) => etiquetas[v].filter((e) => !e.tachada);
  const acumulado = (v) => (vigentes(v).length ? vigentes(v)[0].d : Infinity);

  //guarda una copia del estado actual para mostrarlo sin recalcular
  function registrarPaso(datos) {
    pasos.push({
      tipo: "info",
      iteracion,
      nodoActual: null,
      nodoObjetivo: null,
      aristaEvaluada: null,
      esFinal: false,
      resultado: null,
      ...datos,
      etiquetas: Object.fromEntries(nodos.map((v) => [v, etiquetas[v].map((e) => ({ ...e }))])),
      distancias: Object.fromEntries(nodos.map((v) => [v, acumulado(v)])),
      visitados: [...visitados]
    });
  }

  // Paso 1: seleccionar el vertice origen
  etiquetas[origen].push({ d: 0, pred: null, n: 0, iteracion: 0, tachada: false });
  registrarPaso({
    tipo: "inicio",
    nodoActual: origen,
    paso: "Paso 1",
    titulo: `Seleccionar el vértice origen ${origen}`,
    explicacion: `El recorrido parte de ${origen}, así que su etiqueta es [0, −]₀: para llegar a ${origen} no se recorre nada (acumulado 0), no se llega desde ningún otro vértice (−) y todavía no hay iteraciones (0).`,
    operacion: `${origen}: [0, −]₀`
  });

  while (visitados.length < nodos.length) {
    // Paso 3: elegir entre los no visitados el de menor distancia acumulada
    const candidatos = nodos
      .filter((v) => !visitados.includes(v) && acumulado(v) !== Infinity)
      .map((v) => ({ v, d: acumulado(v) }));

    // los vertices restantes no tienen etiqueta: no se puede llegar a ellos
    if (candidatos.length === 0) break;

    const menor = Math.min(...candidatos.map((c) => c.d));
    const empatados = candidatos.filter((c) => c.d === menor).map((c) => c.v);
    const actual = empatados[0];
    visitados.push(actual);
    iteracion++;

    const lista = candidatos.map(({ v, d }) => `${v}: ${d}`).join(", ");
    const eleccion = empatados.length > 1
      ? `${empatados.join(" y ")} empatan con acumulado ${menor}; da igual cuál se tome, aquí se toma ${actual}.`
      : `${actual} es el más cercano al origen (acumulado ${menor}).`;

    registrarPaso({
      tipo: "seleccion",
      nodoActual: actual,
      candidatos,
      empatados,
      paso: "Paso 3",
      titulo: `Iteración ${iteracion}: se elige el vértice ${actual}`,
      explicacion: `Se comparan los vértices pendientes que ya tienen etiqueta (${lista}). ${eleccion} Se marca como visitado y se revisan sus vecinos que aún no fueron visitados.`,
      operacion: `mín { ${candidatos.map((c) => c.d).join(", ")} } = ${menor}  ⇒  ${actual} visitado`
    });

    // Pasos 2 y 4: etiquetar los adyacentes no visitados. Paso 5: comparar etiquetas
    const base = vigentes(actual)[0];
    for (const arista of grafo.obtenerAristasSalientes(actual)) {
      const v = arista.destino;
      if (visitados.includes(v)) continue;

      const w = arista.peso;
      const nueva = { d: base.d + w, pred: actual, n: base.n + 1, iteracion, tachada: false };
      const previas = vigentes(v);
      const calculo = `${actual} tiene acumulado ${base.d} y la arista ${actual} → ${v} pesa ${w}; sumando, ${v} queda con ${base.d} + ${w} = ${nueva.d} llegando desde ${actual}`;
      const comun = {
        nodoActual: actual,
        nodoObjetivo: v,
        aristaEvaluada: arista.id,
        nueva: { ...nueva }
      };

      etiquetas[v].push(nueva);

      if (previas.length === 0) {
        registrarPaso({
          ...comun,
          tipo: "etiqueta",
          paso: iteracion === 1 ? "Paso 2" : "Paso 4",
          titulo: `Etiquetar ${v} desde ${actual}`,
          explicacion: `${v} aún no tenía etiqueta. ${calculo}.`,
          operacion: `${v}: ${base.d} + ${w} = ${nueva.d}  ⇒  ${etiquetaTexto(nueva)}`
        });
        continue;
      }

      const anterior = previas[0];
      const dosEtiquetas = `${v} ya tenía acumulado ${anterior.d} (desde ${anterior.pred}) y ahora aparece ${nueva.d} (desde ${actual})`;

      if (nueva.d < anterior.d) {
        previas.forEach((e) => (e.tachada = true));
        registrarPaso({
          ...comun,
          tipo: "reemplazo",
          paso: "Paso 5",
          titulo: `Comparar etiquetas de ${v}: se reemplaza`,
          explicacion: `${calculo}. ${dosEtiquetas}. La nueva es más corta, así que la anterior se tacha y se queda la nueva.`,
          operacion: `${nueva.d} < ${anterior.d}  ⇒  se tacha ${etiquetaTexto(anterior)}, queda ${etiquetaTexto(nueva)}`
        });
      } else if (nueva.d > anterior.d) {
        nueva.tachada = true;
        registrarPaso({
          ...comun,
          tipo: "conserva",
          paso: "Paso 5",
          titulo: `Comparar etiquetas de ${v}: se conserva la existente`,
          explicacion: `${calculo}. ${dosEtiquetas}. La nueva no mejora lo que ya tenía, por eso se tacha y se mantiene la anterior.`,
          operacion: `${nueva.d} > ${anterior.d}  ⇒  se tacha ${etiquetaTexto(nueva)}, queda ${etiquetaTexto(anterior)}`
        });
      } else {
        registrarPaso({
          ...comun,
          tipo: "empate",
          paso: "Paso 5",
          titulo: `Comparar etiquetas de ${v}: mismo acumulado`,
          explicacion: `${calculo}. ${dosEtiquetas}: son iguales. Se guardan las dos etiquetas, lo que indica que hay más de una ruta igual de corta hasta ${v}.`,
          operacion: `${nueva.d} = ${anterior.d}  ⇒  ${v} conserva ${previas.map(etiquetaTexto).join(" y ")} y ${etiquetaTexto(nueva)}`
        });
      }
    }
  }

  // Paso 7: determinar las rutas minimas siguiendo los vertices de procedencia
  const alcanzable = acumulado(destino) !== Infinity;
  const predecesores = Object.fromEntries(nodos.map((v) => [v, vigentes(v).map((e) => e.pred).filter(Boolean)]));
  const caminos = alcanzable ? reconstruirCaminos(predecesores, origen, destino) : [];
  const k = caminos.length;
  const d = acumulado(destino);

  //recorrido de etiquetas destino -> origen, paso a paso
  const recorridos = caminos.map((camino) =>
    [...camino].reverse().map((v, i, inv) => {
      if (v === origen) return `${v} es el origen`;
      const e = vigentes(v).find((x) => x.pred === inv[i + 1]);
      return `${v}: ${e.d}, ${e.pred}`;
    }).join(" – ")
  );

  registrarPaso({
    tipo: "final",
    paso: "Paso 7",
    titulo: "Determinar las rutas mínimas",
    explicacion: alcanzable
      ? `Ya no quedan vértices por visitar. El acumulado final de ${destino} es ${d}, que es la distancia mínima desde ${origen}. Para obtener ${k === 1 ? "la ruta" : `las ${k} rutas`} se parte de ${destino} y se retrocede por el vértice de procedencia de cada etiqueta hasta llegar a ${origen}.`
      : `${destino} nunca recibió etiqueta: desde ${origen} no hay forma de llegar a ${destino}.`,
    operacion: alcanzable ? `d(${origen} → ${destino}) = ${d}` : `${destino} sin etiqueta`,
    esFinal: true,
    resultado: { alcanzable, distancia: d, caminos, recorridos, origen, destino }
  });

  return pasos;
}
