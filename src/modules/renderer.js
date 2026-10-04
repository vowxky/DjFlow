/**
 * Módulo de renderizado
 * Dibuja el grafo dirigido y ponderado en SVG y aplica los estados de cada paso.
*/

import { obtenerAristasDelCamino } from "./paths.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const MARKERS = {
  "arrow-default": "#6f6f6f",
  "arrow-active": "#ffffff",
  "arrow-evaluating": "#fbbf24",
  "arrow-improved": "#34d399",
  "arrow-tie": "#38bdf8",
  "arrow-path": "#fb7185"
};

function createSvgElement(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function buildDefs() {
  const defs = createSvgElement("defs");

  Object.entries(MARKERS).forEach(([id, color]) => {
    const marker = createSvgElement("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 11,
      markerHeight: 11,
      markerUnits: "userSpaceOnUse",
      orient: "auto-start-reverse"
    });
    marker.appendChild(createSvgElement("path", { d: "M0 0 L10 5 L0 10 z", fill: color }));
    defs.appendChild(marker);
  });

  return defs;
}

//curva cuadratica entre dos nodos; se arquea (hacia afuera del grafo) si la arista
//salta niveles o es vertical, para no pasar por encima de otros nodos
function edgeGeometry(p, q, nodeRadius, levelSpan, centerY) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // la curva sube/baja bend/2 en su punto medio: debe librar el radio del nodo
  // intermedio mas la mitad de la etiqueta del peso
  let bend = levelSpan > 1 ? 4 * nodeRadius + 24 * (levelSpan - 2) : levelSpan === 0 ? 46 : 0;
  const midY = (p.y + q.y) / 2;
  const outward = midY < centerY ? -1 : 1;
  if (Math.sign(ny * bend) !== outward && ny !== 0) bend = -bend;
  const c = { x: (p.x + q.x) / 2 + nx * bend, y: midY + ny * bend };

  const unit = (a, b) => {
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };

  const us = unit(p, c);
  const ue = unit(c, q);
  const start = { x: p.x + us.x * nodeRadius, y: p.y + us.y * nodeRadius };
  const end = { x: q.x - ue.x * (nodeRadius + 3), y: q.y - ue.y * (nodeRadius + 3) };

  const label = {
    x: 0.25 * start.x + 0.5 * c.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * c.y + 0.25 * end.y
  };

  return { d: `M ${start.x} ${start.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`, label };
}

//Dibuja el grafo completo (aristas, pesos y nodos)
export function drawGraph(nodos, aristas, positions, levels, graphElement, nodeRadius, onNodeClick) {
  graphElement.innerHTML = "";
  graphElement.appendChild(buildDefs());

  const edgeLayer = createSvgElement("g", { "data-layer": "edges" });
  const labelLayer = createSvgElement("g", { "data-layer": "labels" });
  const nodeLayer = createSvgElement("g", { "data-layer": "nodes" });
  const ys = [...positions.values()].map((pos) => pos.y);
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  aristas.forEach((arista) => {
    const p = positions.get(arista.origen);
    const q = positions.get(arista.destino);
    const span = levels.get(arista.destino) - levels.get(arista.origen);
    const { d, label } = edgeGeometry(p, q, nodeRadius, span, centerY);

    const path = createSvgElement("path", { d, class: "edge" });
    path.dataset.id = arista.id;
    path.dataset.from = arista.origen;
    path.dataset.to = arista.destino;
    edgeLayer.appendChild(path);

    const tag = createSvgElement("g", {
      class: "edge-label",
      transform: `translate(${label.x}, ${label.y})`
    });
    tag.dataset.id = arista.id;

    const width = 14 + String(arista.peso).length * 8;
    tag.appendChild(createSvgElement("rect", { x: -width / 2, y: -11, width, height: 22, rx: 7 }));
    const text = createSvgElement("text", { x: 0, y: 1 });
    text.textContent = arista.peso;
    tag.appendChild(text);
    labelLayer.appendChild(tag);
  });

  nodos.forEach((value) => {
    const pos = positions.get(value);

    const group = createSvgElement("g", {
      class: "node",
      transform: `translate(${pos.x}, ${pos.y})`
    });
    group.dataset.value = value;

    group.appendChild(createSvgElement("circle", { r: nodeRadius + 8, class: "node-ring" }));
    group.appendChild(createSvgElement("circle", { r: nodeRadius, class: "node-circle" }));

    const text = createSvgElement("text", { class: "node-text", x: 0, y: 1 });
    text.textContent = value;
    group.appendChild(text);

    // etiquetas [d, V]n del algoritmo (se llenan en cada paso)
    group.appendChild(createSvgElement("g", { class: "node-labels", transform: `translate(0, ${-nodeRadius - 14})` }));

    group.addEventListener("click", () => onNodeClick(value));
    nodeLayer.appendChild(group);
  });

  graphElement.appendChild(edgeLayer);
  graphElement.appendChild(labelLayer);
  graphElement.appendChild(nodeLayer);
}

const NODE_STATES = ["active", "faded", "origin", "destination", "current", "target", "visited", "on-path"];
const EDGE_STATES = ["active", "faded", "evaluating", "improved", "tie", "path"];

//limpia noma
export function resetHighlight(graphElement) {
  graphElement.classList.remove("running");
  graphElement.querySelectorAll(".node-labels").forEach((g) => (g.innerHTML = ""));
  graphElement.querySelectorAll(".node").forEach((node) => node.classList.remove(...NODE_STATES));
  graphElement.querySelectorAll(".edge, .edge-label").forEach((edge) => edge.classList.remove(...EDGE_STATES));
}

//destaca un nodo y sus aristas de entrada/salida
export function highlightNode(value, graphElement) {
  resetHighlight(graphElement);

  const neighbors = new Set([value]);
  graphElement.querySelectorAll(".edge").forEach((edge) => {
    const touches = edge.dataset.from === value || edge.dataset.to === value;
    if (touches) {
      neighbors.add(edge.dataset.from);
      neighbors.add(edge.dataset.to);
    }
    setEdgeState(graphElement, edge.dataset.id, touches ? "active" : "faded");
  });

  graphElement.querySelectorAll(".node").forEach((node) => {
    const nodeValue = node.dataset.value;
    if (nodeValue === value) node.classList.add("active");
    else if (!neighbors.has(nodeValue)) node.classList.add("faded");
  });
}

export function setEdgeState(graphElement, id, state) {
  graphElement
    .querySelectorAll(`[data-id="${id}"]`)
    .forEach((el) => el.classList.add(state));
}

const LINE_H = 15;

//dibuja la pila de etiquetas de un vertice (la mas antigua arriba, tachadas en rojo)
function drawLabels(container, etiquetas) {
  container.innerHTML = "";
  if (!etiquetas.length) return;

  const textos = etiquetas.map((e) => `[${e.d}, ${e.pred ?? "−"}]`);
  const width = Math.max(...textos.map((t, i) => t.length + String(etiquetas[i].n).length)) * 7 + 14;
  const height = etiquetas.length * LINE_H + 6;

  container.appendChild(createSvgElement("rect", {
    x: -width / 2, y: -height + 4, width, height, rx: 8
  }));

  etiquetas.forEach((e, i) => {
    const y = -(etiquetas.length - 1 - i) * LINE_H - 4;
    const text = createSvgElement("text", { x: 0, y, class: e.tachada ? "tachada" : "" });
    text.textContent = textos[i];
    const sub = createSvgElement("tspan", { class: "sub", dy: 3 });
    sub.textContent = e.n;
    text.appendChild(sub);
    container.appendChild(text);
  });
}

//color de la arista evaluada segun lo que paso con la etiqueta
const EDGE_BY_TYPE = {
  etiqueta: "improved",
  reemplazo: "improved",
  empate: "tie",
  conserva: "evaluating"
};

//pinta un paso del algoritmo sobre el grafo; en el paso final resalta
//todos los caminos minimos o solo el seleccionado (indice)
export function applyStep(paso, origen, destino, graphElement, caminoSeleccionado = null) {
  resetHighlight(graphElement);
  graphElement.classList.add("running");

  const caminos = paso.resultado?.caminos ?? [];
  const visibles = caminoSeleccionado === null ? caminos : [caminos[caminoSeleccionado]].filter(Boolean);
  const camino = new Set(visibles.flat());
  const aristasCamino = new Set(visibles.flatMap(obtenerAristasDelCamino));

  graphElement.querySelectorAll(".node").forEach((node) => {
    const v = node.dataset.value;
    drawLabels(node.querySelector(".node-labels"), paso.etiquetas[v]);

    if (v === origen) node.classList.add("origin");
    if (v === destino) node.classList.add("destination");
    if (paso.visitados.includes(v)) node.classList.add("visited");
    if (v === paso.nodoActual) node.classList.add("current");
    if (v === paso.nodoObjetivo) node.classList.add("target");
    if (camino.has(v)) node.classList.add("on-path");
  });

  if (paso.aristaEvaluada) {
    setEdgeState(graphElement, paso.aristaEvaluada, EDGE_BY_TYPE[paso.tipo]);
  }

  if (paso.esFinal) {
    graphElement.querySelectorAll(".edge").forEach((edge) => {
      const onPath = aristasCamino.has(edge.dataset.id);
      setEdgeState(graphElement, edge.dataset.id, onPath ? "path" : "faded");
    });
  }
}
