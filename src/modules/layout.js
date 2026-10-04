/**
 * Modulo de layout
 * Ubica los nodos del DAG en capas topologicas de izquierda a derecha.
 */

//nivel de cada nodo = longitud del camino mas largo desde una fuente (Kahn)
export function computeLevels(nodos, aristas) {
  const levels = new Map(nodos.map((n) => [n, 0]));
  const inDegree = new Map(nodos.map((n) => [n, 0]));
  const outgoing = new Map(nodos.map((n) => [n, []]));

  aristas.forEach(({ origen, destino }) => {
    inDegree.set(destino, inDegree.get(destino) + 1);
    outgoing.get(origen).push(destino);
  });

  const queue = nodos.filter((n) => inDegree.get(n) === 0);

  while (queue.length > 0) {
    const u = queue.shift();
    outgoing.get(u).forEach((v) => {
      levels.set(v, Math.max(levels.get(v), levels.get(u) + 1));
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    });
  }

  return levels;
}

export function computePositions(nodos, aristas, levels, config) {
  const { WIDTH, HEIGHT, PADDING_X, PADDING_Y } = config;

  // agrupar por nivel
  const groups = new Map();
  nodos.forEach((n) => {
    const l = levels.get(n);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(n);
  });

  const maxLevel = Math.max(0, ...groups.keys());
  const incoming = new Map(nodos.map((n) => [n, []]));
  aristas.forEach(({ origen, destino }) => incoming.get(destino).push(origen));

  const positions = new Map();
  const usableW = WIDTH - PADDING_X * 2;
  const usableH = HEIGHT - PADDING_Y * 2;

  [...groups.keys()].sort((a, b) => a - b).forEach((level) => {
    const group = groups.get(level);

    // ordenar por baricentro de los predecesores para reducir cruces
    const barycenter = (n) => {
      const ys = incoming.get(n).map((p) => positions.get(p)?.y).filter((y) => y !== undefined);
      return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : HEIGHT / 2;
    };
    group.sort((a, b) => barycenter(a) - barycenter(b) || a.localeCompare(b));

    const levelGap = maxLevel === 0 ? 0 : Math.min(115, usableW / maxLevel);
    const x = WIDTH / 2 + (level - maxLevel / 2) * levelGap;
    const gap = Math.min(190, usableH / Math.max(1, group.length - 1));
    const startY = HEIGHT / 2 - (gap * (group.length - 1)) / 2;

    group.forEach((n, i) => {
      // pequeño desfase alterno para que las aristas largas no atraviesen nodos
      const wobble = group.length > 1 ? (level % 2 === 0 ? -14 : 14) : 0;
      positions.set(n, { x, y: startY + i * gap + wobble });
    });
  });

  return positions;
}
