/**
 * Modulo principal de la aplicacion
 */

import { Grafo } from "./graph.js";
import { validarCantidadNodos, validarNuevaArista, validarInicioDijkstra } from "./validation.js";
import { ejecutarDijkstra, etiquetaTexto } from "./dijkstra.js";
import { GestorPasos } from "./steps.js";
import { computeLevels, computePositions } from "./layout.js";
import { drawGraph, highlightNode, resetHighlight, applyStep, setEdgeState } from "./renderer.js";

const CONFIG = {
  WIDTH: 960,
  HEIGHT: 620,
  PADDING_X: 70,
  PADDING_Y: 70,
  NODE_RADIUS: 24
};

const ICON_X = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>`;

const TOAST_STYLES = {
  success: "border-emerald-400/25 text-emerald-200",
  error: "border-rose-400/30 text-rose-200",
  info: "border-white/10 text-zinc-200",
  warning: "border-amber-400/30 text-amber-200"
};

const STEP_TAGS = {
  inicio: ["Origen", "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"],
  seleccion: ["Selección", "border-amber-300/25 bg-amber-300/10 text-amber-200"],
  etiqueta: ["Etiquetado", "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"],
  reemplazo: ["Se reemplaza", "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"],
  conserva: ["Se conserva", "border-orange-300/25 bg-orange-300/10 text-orange-200"],
  empate: ["Mismo acumulado", "border-sky-300/25 bg-sky-300/10 text-sky-200"],
  final: ["Rutas mínimas", "border-rose-300/25 bg-rose-300/10 text-rose-200"]
};

const MAX_CAMINOS_LISTADOS = 60;
const AUTOPLAY_MS = 1400;

// pasos en los que el modo practica le pregunta al usuario antes de mostrarlos
const PREGUNTABLES = new Set(["seleccion", "etiqueta", "reemplazo", "conserva", "empate"]);

const OPCIONES_COMPARACION = [
  ["reemplazo", "Se reemplaza la etiqueta", "la nueva distancia es menor"],
  ["empate", "Se conservan las dos", "ambas tienen el mismo acumulado"],
  ["conserva", "Se conserva la existente", "la nueva distancia es mayor"]
];

const EJEMPLOS = {
  ejemplo1: { destino: "H", texto: "Ejemplo 1: 8 vértices. De A a H hay dos rutas mínimas de longitud 11." },
  ejemplo2: { destino: "I", texto: "Ejemplo 2: 9 vértices. De A a I hay una sola ruta mínima de longitud 12." }
};

export class App {
  constructor() {
    const $ = (id) => document.getElementById(id);

    this.el = {
      nodeCount: $("nodeCountInput"),
      createNodesBtn: $("createNodesBtn"),
      edgeFrom: $("edgeFrom"),
      edgeTo: $("edgeTo"),
      edgeWeight: $("edgeWeight"),
      addEdgeBtn: $("addEdgeBtn"),
      modeManualBtn: $("modeManualBtn"),
      modeRandomBtn: $("modeRandomBtn"),
      manualPanel: $("manualPanel"),
      randomPanel: $("randomPanel"),
      randomGraphBtn: $("randomGraphBtn"),
      editorToggle: $("editorToggle"),
      graphEditor: $("graphEditor"),
      edgeList: $("edgeList"),
      edgeCount: $("edgeCount"),
      source: $("sourceSelect"),
      target: $("targetSelect"),
      exampleBtn: $("exampleBtn"),
      exampleTiesBtn: $("exampleTiesBtn"),
      playBtn: $("playBtn"),
      playIcon: $("playIcon"),
      pauseIcon: $("pauseIcon"),
      practiceToggle: $("practiceToggle"),
      practiceScore: $("practiceScore"),
      clearEdgesBtn: $("clearEdgesBtn"),
      resetBtn: $("resetBtn"),
      runBtn: $("runBtn"),
      graph: $("graph"),
      graphMeta: $("graphMeta"),
      output: $("output"),
      stepCounter: $("stepCounter"),
      stepProgress: $("stepProgress"),
      firstBtn: $("firstStepBtn"),
      prevBtn: $("prevStepBtn"),
      nextBtn: $("nextStepBtn"),
      lastBtn: $("lastStepBtn"),
      graphModel: $("graphModel"),
      labelTable: $("labelTable"),
      helpBtn: $("helpBtn"),
      toastHost: $("toastHost")
    };

    window.addEventListener("resize", () => this.scaleLabels());

    this.grafo = new Grafo();
    this.pasos = new GestorPasos();
    this.origen = null;
    this.destino = null;
    this.caminoSeleccionado = null;

    this.practica = false;
    this.pregunta = null;
    this.puntaje = { aciertos: 0, total: 0 };
    this.timer = null;

    this.init();
  }

  init() {
    this.bindControlEvents();
    const pedido = new URLSearchParams(location.search).get("ejemplo");
    this.loadExample(EJEMPLOS[pedido] ? pedido : "ejemplo1", false);
    if (EJEMPLOS[pedido]) document.getElementById("programa")?.scrollIntoView();
  }

  bindControlEvents() {
    const on = (element, handler) => element?.addEventListener("click", handler);
    const onEnter = (element, handler) =>
      element?.addEventListener("keydown", (e) => e.key === "Enter" && handler());

    on(this.el.createNodesBtn, () => this.createNodes());
    onEnter(this.el.nodeCount, () => this.createNodes());
    on(this.el.addEdgeBtn, () => this.addEdge());
    onEnter(this.el.edgeWeight, () => this.addEdge());
    on(this.el.editorToggle, () => this.toggleEditor());
    on(this.el.modeManualBtn, () => this.setMode("manual"));
    on(this.el.modeRandomBtn, () => this.setMode("random"));
    on(this.el.randomGraphBtn, () => this.generateRandom());
    on(this.el.exampleBtn, () => this.loadExample("ejemplo1"));
    on(this.el.exampleTiesBtn, () => this.loadExample("ejemplo2"));
    on(this.el.playBtn, () => (this.timer ? this.stopPlay() : this.startPlay()));
    this.el.practiceToggle?.addEventListener("change", (e) => this.setPractice(e.target.checked));
    on(this.el.clearEdgesBtn, () => this.clearEdges());
    on(this.el.resetBtn, () => this.resetProject());
    on(this.el.runBtn, () => this.runDijkstra());
    on(this.el.firstBtn, () => this.goTo(() => this.pasos.irAlInicio()));
    on(this.el.prevBtn, () => this.goTo(() => this.pasos.anterior()));
    on(this.el.nextBtn, () => this.avanzar());
    on(this.el.lastBtn, () => this.goTo(() => this.pasos.irAlFinal()));
    on(this.el.helpBtn, () => this.showHelp());

    // flechas del teclado para navegar los pasos
    document.addEventListener("keydown", (e) => {
      if (!this.pasos.activo || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") this.avanzar();
      if (e.key === "ArrowLeft") this.goTo(() => this.pasos.anterior());
    });

    this.el.output?.addEventListener("click", (e) => {
      const answer = e.target.closest("[data-answer]");
      if (answer) return this.responder(answer.dataset.answer);

      const btn = e.target.closest("[data-path]");
      if (!btn) return;
      this.caminoSeleccionado = btn.dataset.path === "all" ? null : Number(btn.dataset.path);
      this.renderStep();
    });

    this.el.edgeList?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (btn) this.removeEdge(btn.dataset.from, btn.dataset.to);
    });
  }

  createNodes() {
    const validacion = validarCantidadNodos(this.el.nodeCount.value);
    if (!validacion.esValido) return this.toast(validacion.error, "error");

    this.grafo.establecerNodos(validacion.valor);
    this.refreshAll();
    this.toast(`Se generaron ${validacion.valor} nodos: {${this.grafo.obtenerNodos().join(", ")}}.`, "success");
  }

  addEdge() {
    const origen = this.el.edgeFrom.value;
    const destino = this.el.edgeTo.value;
    const validacion = validarNuevaArista(this.grafo, origen, destino, this.el.edgeWeight.value);

    if (!validacion.esValido) {
      if (validacion.caminoCiclo) this.flashCycle(validacion.caminoCiclo);
      return this.toast(validacion.error, "error");
    }

    this.grafo.agregarArista(origen, destino, validacion.peso);
    this.el.edgeWeight.value = "";
    this.refreshAll();
    this.toast(`Arista ${origen} → ${destino} (peso ${validacion.peso}) agregada.`, "success");
  }

  removeEdge(origen, destino) {
    if (!this.grafo.eliminarArista(origen, destino)) return;
    this.refreshAll();
    this.toast(`Arista ${origen} → ${destino} eliminada.`, "info");
  }

  clearEdges() {
    if (this.grafo.obtenerAristas().length === 0) return this.toast("No hay aristas para limpiar.", "warning");
    this.grafo.limpiarAristas();
    this.refreshAll();
    this.toast("Todas las aristas fueron eliminadas.", "info");
  }

  resetProject() {
    this.grafo.reiniciar();
    this.el.nodeCount.value = "";
    this.refreshAll();
    this.toast("Proyecto reiniciado. Ingresa una cantidad de nodos para comenzar.", "info");
  }

  toggleEditor(abrir) {
    const abierto = abrir ?? this.el.graphEditor.classList.contains("hidden");
    this.el.graphEditor.classList.toggle("hidden", !abierto);
    this.el.editorToggle.setAttribute("aria-expanded", String(abierto));
    this.scaleLabels();
  }

  setMode(mode) {
    const random = mode === "random";
    this.el.modeManualBtn.setAttribute("aria-selected", String(!random));
    this.el.modeRandomBtn.setAttribute("aria-selected", String(random));
    this.el.manualPanel.classList.toggle("hidden", random);
    this.el.randomPanel.classList.toggle("hidden", !random);
  }

  generateRandom() {
    const validacion = validarCantidadNodos(this.el.nodeCount.value);
    if (!validacion.esValido) return this.toast(validacion.error, "error");

    this.grafo.generarAleatorio(validacion.valor);
    this.refreshAll();

    const nodos = this.grafo.obtenerNodos();
    this.el.source.value = nodos[0];
    this.el.target.value = nodos[nodos.length - 1];
    this.toast(`Grafo aleatorio generado: ${nodos.length} vértices y ${this.grafo.obtenerAristas().length} aristas, sin ciclos.`, "success");
  }

  loadExample(tipo, notify = true) {
    this.grafo.cargarEjemplo(tipo);
    this.el.nodeCount.value = this.grafo.obtenerNodos().length;
    this.refreshAll();
    this.el.source.value = "A";
    this.el.target.value = EJEMPLOS[tipo].destino;
    if (notify) this.toast(EJEMPLOS[tipo].texto, "success");
  }

  runDijkstra() {
    const origen = this.el.source.value;
    const destino = this.el.target.value;
    const validacion = validarInicioDijkstra(this.grafo, origen, destino);
    if (!validacion.esValido) return this.toast(validacion.error, "error");

    this.origen = origen;
    this.destino = destino;
    this.caminoSeleccionado = null;
    this.pasos.establecerPasos(ejecutarDijkstra(this.grafo, origen, destino));
    this.renderStep();
    this.toast(`Simulación iniciada: caminos mínimos de ${origen} a ${destino}.`, "success");

    // llevar la vista al grafo y al panel de solucion
    this.toggleEditor(false);
    document.getElementById("programa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  goTo(move) {
    if (!this.pasos.activo) return;
    this.stopPlay();
    this.pregunta = null;
    move();
    this.renderStep();
  }

  //avanza un paso; en modo practica primero pregunta. Devuelve true si avanzo.
  avanzar() {
    if (!this.pasos.activo || !this.pasos.tieneSiguiente()) return false;

    const indice = this.pasos.indice + 1;
    const siguiente = this.pasos.pasos[indice];

    const trivial = siguiente.tipo === "seleccion" && siguiente.candidatos.length === 1;
    if (this.practica && PREGUNTABLES.has(siguiente.tipo) && !trivial) {
      if (this.pregunta?.indice !== indice) {
        this.pregunta = { indice, fallos: [] };
        this.renderStep();
      }
      return false;
    }

    this.pregunta = null;
    this.pasos.siguiente();
    this.renderStep();
    return true;
  }

  responder(respuesta) {
    if (!this.pregunta) return;
    const siguiente = this.pasos.pasos[this.pregunta.indice];

    if (respuesta === "skip") return this.revelar();

    const correctas =
      siguiente.tipo === "seleccion" ? siguiente.empatados
      : siguiente.tipo === "etiqueta" ? [String(siguiente.nueva.d)]
      : [siguiente.tipo];
    const primerIntento = this.pregunta.fallos.length === 0;
    if (primerIntento) this.puntaje.total++;

    if (correctas.includes(respuesta)) {
      if (primerIntento) this.puntaje.aciertos++;
      const nota = siguiente.tipo === "seleccion" && respuesta !== siguiente.nodoActual
        ? ` Hay empate y se elige cualquiera; el programa eligió ${siguiente.nodoActual}.`
        : "";
      this.toast((primerIntento ? "¡Correcto!" : "Correcto, ahora sí.") + nota, "success");
      this.revelar();
    } else {
      this.pregunta.fallos.push(respuesta);
      this.renderStep();
    }
    this.updateScore();
  }

  revelar() {
    this.pregunta = null;
    this.pasos.siguiente();
    this.renderStep();
  }

  setPractice(activa) {
    this.practica = activa;
    this.pregunta = null;
    this.puntaje = { aciertos: 0, total: 0 };
    this.stopPlay();
    this.updateScore();
    if (this.pasos.activo) this.renderStep();
    else this.updateNavigation();
    if (activa) this.toast("Modo práctica activo: al avanzar tendrás que predecir cada decisión.", "info");
  }

  updateScore() {
    const { aciertos, total } = this.puntaje;
    this.el.practiceScore.classList.toggle("hidden", !this.practica || total === 0);
    this.el.practiceScore.textContent = `${aciertos}/${total} aciertos`;
  }

  startPlay() {
    if (!this.pasos.activo || !this.pasos.tieneSiguiente()) return;
    this.timer = setInterval(() => {
      if (!this.avanzar()) this.stopPlay();
    }, AUTOPLAY_MS);
    this.updateNavigation();
  }

  stopPlay() {
    clearInterval(this.timer);
    this.timer = null;
    this.updateNavigation();
  }

  //invalida la ejecucion cuando cambia la estructura del grafo
  stopRun() {
    this.pasos.reiniciar();
    this.origen = null;
    this.destino = null;
    this.caminoSeleccionado = null;
    this.pregunta = null;
    this.stopPlay();
    resetHighlight(this.el.graph);
    this.el.labelTable.innerHTML = `<p class="px-1 py-2 text-sm text-zinc-500">Inicia el algoritmo para ver cómo se llena la tabla.</p>`;
    this.el.output.innerHTML = `
      <p class="text-zinc-400">
        Selecciona el origen y destino y presiona <span class="font-semibold text-white">Iniciar Dijkstra</span>
        para comenzar la simulación. Luego usa los controles (o las flechas del teclado) para avanzar.
      </p>`;
  }

  renderStep() {
    const paso = this.pasos.actual();
    if (!paso) return;

    applyStep(paso, this.origen, this.destino, this.el.graph, this.caminoSeleccionado);

    // en modo practica se marca la arista sobre la que se pregunta
    const enJuego = this.pregunta && this.pasos.pasos[this.pregunta.indice];
    if (enJuego?.aristaEvaluada) setEdgeState(this.el.graph, enJuego.aristaEvaluada, "evaluating");

    this.renderSolution(paso);
    this.updateNavigation();
  }

  updateNavigation() {
    const { actual, total, porcentaje } = this.pasos.progreso();
    this.el.stepCounter.textContent = `Paso ${actual} de ${total}`;
    this.el.stepProgress.style.width = `${porcentaje}%`;

    const activo = this.pasos.activo;
    this.el.firstBtn.disabled = !activo || !this.pasos.tieneAnterior();
    this.el.prevBtn.disabled = !activo || !this.pasos.tieneAnterior();
    this.el.nextBtn.disabled = !activo || !this.pasos.tieneSiguiente();
    this.el.lastBtn.disabled = !activo || !this.pasos.tieneSiguiente();

    const reproduciendo = Boolean(this.timer);
    this.el.playBtn.disabled = !activo || this.practica || (!reproduciendo && !this.pasos.tieneSiguiente());
    this.el.playIcon.classList.toggle("hidden", reproduciendo);
    this.el.pauseIcon.classList.toggle("hidden", !reproduciendo);
    this.el.playBtn.title = this.practica ? "No disponible en modo práctica" : reproduciendo ? "Pausar" : "Reproducir automáticamente";
  }

  renderSolution(paso) {
    const [tagText, tagClass] = STEP_TAGS[paso.tipo];

    this.el.output.innerHTML = `
      <div class="space-y-4">
        ${this.pregunta ? this.renderQuestion(paso, this.pasos.pasos[this.pregunta.indice]) : ""}
        <div>
          <span class="inline-flex rounded-full border px-3 py-1 text-xs ${tagClass}">${paso.paso} · ${tagText}</span>
          <h3 class="mt-3 text-lg font-semibold leading-7 text-white">${paso.titulo}</h3>
          <div class="mt-3 overflow-x-auto rounded-xl border soft-border bg-black/40 px-4 py-3 font-serifMath text-base text-cyan-100">
            ${paso.operacion}
          </div>
          <p class="mt-3 text-sm leading-6 text-zinc-400">${paso.explicacion}</p>
        </div>

        ${paso.esFinal ? this.renderResult(paso.resultado) : ""}
      </div>`;

    this.el.labelTable.innerHTML = this.renderLabelTable(paso);
  }

  //tabla unica de iteraciones: filas = vertices, columnas = iteraciones,
  //celdas = etiqueta "acumulado, vertice de origen"; sombreada = vertice elegido
  renderLabelTable(paso) {
    const total = this.pasos.pasos.at(-1).iteracion;
    const columnas = Array.from({ length: total + 1 }, (_, i) => i);

    const filas = Object.keys(paso.etiquetas).map((v) => {
      const etiquetas = paso.etiquetas[v];
      const elegidas = paso.visitados.includes(v) ? etiquetas.filter((e) => !e.tachada) : [];
      const rowClass = v === paso.nodoObjetivo ? "row-target" : "";

      const celdas = columnas.map((it) => {
        const enCelda = etiquetas.filter((e) => e.iteracion === it);
        const sombreada = enCelda.some((e) => elegidas.includes(e));
        const contenido = enCelda.map((e) =>
          `<span class="${e.tachada ? "label-tachada" : ""}">${e.d}, ${e.pred ?? "−"}</span>`).join("<br>");
        return `<td class="${sombreada ? "cell-elegida" : ""} ${it > paso.iteracion ? "cell-futura" : ""}">${contenido}</td>`;
      }).join("");

      return `<tr class="${rowClass}"><th>${v}</th>${celdas}</tr>`;
    }).join("");

    return `
      <div>
        <div class="overflow-x-auto rounded-xl border soft-border">
          <table class="iter-table">
            <thead><tr><th></th>${columnas.map((it) => `<th>${it === 0 ? "Inicio" : `Iteración ${it}`}</th>`).join("")}</tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
  }

  //tarjeta de pregunta del modo practica (sobre el paso que viene)
  renderQuestion(actual, siguiente) {
    const { fallos } = this.pregunta;
    let enunciado;
    let opciones;
    let columnas = "grid-cols-1";
    let pista = "";

    if (siguiente.tipo === "seleccion") {
      enunciado = "¿Qué vértice se elige en la siguiente iteración?";
      opciones = siguiente.candidatos.map(({ v }) => [v, v, ""]);
      columnas = "grid-cols-4";
      const ultimo = fallos.at(-1);
      if (ultimo) {
        pista = `El acumulado de ${ultimo} es ${actual.distancias[ultimo]}: no es el menor entre los vértices no visitados.`;
      }
    } else {
      const [u, v] = siguiente.aristaEvaluada.split("-");
      const w = this.grafo.obtenerAristas().find((a) => a.id === siguiente.aristaEvaluada).peso;
      const du = actual.distancias[u];
      const previa = actual.etiquetas[v].filter((e) => !e.tachada);

      if (siguiente.tipo === "etiqueta") {
        enunciado = `${u} tiene acumulado ${du} y de ${u} a ${v} hay ${w}. ¿Qué distancia acumulada tendrá la etiqueta de <b>${v}</b>?`;
        const valores = [...new Set([du + w, w, du + w + 2, Math.max(1, du + w - 1)])].slice(0, 3).sort((a, b) => a - b);
        opciones = valores.map((d) => [String(d), `[${d}, ${u}]`, ""]);
        columnas = "grid-cols-3";
        if (fallos.length) pista = `Se suma el acumulado de ${u} y el peso de la arista: ${du} + ${w}.`;
      } else {
        enunciado = `${v} ya tiene la etiqueta ${previa.map(etiquetaTexto).join(" y ")}. Desde ${u} (acumulado ${du}) la arista pesa ${w}. ¿Qué ocurre al comparar las etiquetas?`;
        opciones = OPCIONES_COMPARACION;
        if (fallos.length) pista = `Compara ${du} + ${w} = ${du + w} con el acumulado actual de ${v}, que es ${previa[0].d}.`;
      }
    }

    const botones = opciones.map(([valor, texto, detalle]) => `
      <button type="button" data-answer="${valor}"
        class="answer-option ${fallos.includes(valor) ? "wrong" : ""} rounded-xl px-3 py-2.5 text-left text-sm text-white">
        <span class="block font-semibold">${texto}</span>
        ${detalle ? `<span class="block text-xs text-zinc-400">${detalle}</span>` : ""}
      </button>`).join("");

    return `
      <div class="rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">Tu turno</span>
          <button type="button" data-answer="skip" class="text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline">Mostrar respuesta</button>
        </div>
        <p class="text-[15px] leading-7 text-zinc-100">${enunciado}</p>
        <div class="mt-3 grid ${columnas} gap-2">${botones}</div>
        ${pista ? `<p class="mt-3 text-sm leading-6 text-rose-200">${pista}</p>` : ""}
      </div>`;
  }

  renderResult({ alcanzable, distancia, caminos, recorridos, origen, destino }) {
    if (!alcanzable) {
      return `
        <div class="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-amber-100">
          <p class="font-semibold">Sin ruta</p>
          <p class="mt-1 text-zinc-300"><b>${destino}</b> no recibió etiqueta: no existe una ruta de <b>${origen}</b> hacia <b>${destino}</b>.</p>
        </div>`;
    }

    const listados = caminos.slice(0, MAX_CAMINOS_LISTADOS);
    const ocultos = caminos.length - listados.length;
    const seleccion = this.caminoSeleccionado;

    return `
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl border border-rose-400/25 bg-rose-400/5 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.16em] text-rose-200/70">Longitud mínima</p>
            <p class="mt-1 text-3xl font-semibold text-white">${distancia}</p>
          </div>
          <div class="rounded-xl border border-rose-400/25 bg-rose-400/5 px-4 py-3">
            <p class="text-xs uppercase tracking-[0.16em] text-rose-200/70">Caminos mínimos</p>
            <p class="mt-1 text-3xl font-semibold text-white">${caminos.length}</p>
          </div>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Rutas (siguiendo los vértices de procedencia)</p>
            ${caminos.length > 1 ? `
              <button type="button" data-path="all" aria-pressed="${seleccion === null}"
                class="path-option rounded-full px-3 py-1 text-xs text-rose-100">Ver todos</button>` : ""}
          </div>
          <div class="space-y-2">
            ${listados.map((camino, i) => `
              <button type="button" data-path="${i}" aria-pressed="${seleccion === i}"
                class="path-option flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left">
                <span class="text-xs font-semibold text-rose-300">C${i + 1}</span>
                <span class="min-w-0">
                  <span class="block font-semibold tracking-wide text-white">${camino.join(", ")}</span>
                  <span class="block text-xs leading-5 text-zinc-400">En ${recorridos[i]}</span>
                </span>
              </button>`).join("")}
            ${ocultos > 0 ? `<p class="text-xs text-zinc-500">y ${ocultos} rutas más con la misma longitud.</p>` : ""}
          </div>
          ${caminos.length > 1 ? `<p class="mt-2 text-xs text-zinc-500">Haz clic en un camino para resaltarlo solo en el grafo.</p>` : ""}
        </div>
      </div>`;
  }

  refreshAll() {
    this.drawCurrentGraph();
    this.updateSelectors();
    this.renderEdgeList();
    this.renderGraphModel();
    this.stopRun();
  }

  drawCurrentGraph() {
    const nodos = this.grafo.obtenerNodos();
    const aristas = this.grafo.obtenerAristas();

    if (nodos.length === 0) {
      this.el.graph.setAttribute("viewBox", `0 0 ${CONFIG.WIDTH} ${CONFIG.HEIGHT}`);
      this.el.graph.innerHTML = `
        <text x="480" y="310" fill="#52525b" font-size="15" text-anchor="middle">
          Crea los nodos o carga el ejemplo para empezar
        </text>`;
      this.el.graphMeta.textContent = "Sin datos";
      return;
    }

    // el alto del layout sigue la proporcion del recuadro del grafo
    const proporcion = this.el.graph.clientHeight / this.el.graph.clientWidth || 0.65;
    const levels = computeLevels(nodos, aristas);
    const positions = computePositions(nodos, aristas, levels, {
      ...CONFIG,
      HEIGHT: Math.max(CONFIG.HEIGHT * 0.8, CONFIG.WIDTH * proporcion)
    });

    // encuadrar el viewBox al contenido para aprovechar el espacio
    const xs = [...positions.values()].map((p) => p.x);
    const ys = [...positions.values()].map((p) => p.y);
    // misma proporcion que el recuadro, para que el grafo lo llene
    const pad = 64;
    const ratio = proporcion;
    const contentW = Math.max(...xs) - Math.min(...xs) + pad * 2;
    const contentH = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const width = Math.max(contentW, contentH / ratio);
    const height = Math.max(contentH, width * ratio);
    const left = Math.min(...xs) - pad - (width - contentW) / 2;
    const top = Math.min(...ys) - pad - (height - contentH) / 2;
    this.el.graph.setAttribute("viewBox", `${left} ${top} ${width} ${height}`);

    drawGraph(nodos, aristas, positions, levels, this.el.graph, CONFIG.NODE_RADIUS, (v) => this.selectNode(v));
    this.el.graphMeta.textContent = `${nodos.length} vértices · ${aristas.length} aristas`;
    this.scaleLabels();
  }

  //agranda las etiquetas [d, V]n cuando el grafo se muestra reducido para que sigan legibles
  scaleLabels() {
    const vb = this.el.graph.viewBox.baseVal;
    const { clientWidth, clientHeight } = this.el.graph;
    if (!vb?.width || !clientWidth || !clientHeight) return;
    const escala = Math.min(clientWidth / vb.width, clientHeight / vb.height);
    const k = Math.min(1.7, Math.max(1, 0.8 / escala));
    this.el.graph.querySelectorAll(".node-labels").forEach((g) => {
      g.setAttribute("transform", `translate(0, ${-CONFIG.NODE_RADIUS - 8}) scale(${k.toFixed(2)})`);
    });
  }

  selectNode(value) {
    // durante la ejecucion el grafo muestra el estado del paso
    if (this.pasos.activo) return;
    highlightNode(value, this.el.graph);
  }

  //resalta brevemente el camino que cerraria un ciclo
  flashCycle(ciclo) {
    if (this.pasos.activo) return;
    resetHighlight(this.el.graph);
    const enCiclo = new Set(ciclo);
    this.el.graph.querySelectorAll(".node").forEach((n) => {
      n.classList.add(enCiclo.has(n.dataset.value) ? "target" : "faded");
    });
    this.el.graph.querySelectorAll(".edge, .edge-label").forEach((e) => {
      const [u, v] = e.dataset.id.split("-");
      const idx = ciclo.indexOf(u);
      e.classList.add(idx !== -1 && ciclo[idx + 1] === v ? "evaluating" : "faded");
    });
    clearTimeout(this.cycleTimer);
    this.cycleTimer = setTimeout(() => !this.pasos.activo && resetHighlight(this.el.graph), 2200);
  }

  updateSelectors() {
    const nodos = this.grafo.obtenerNodos();
    const fill = (select, placeholder) => {
      const previo = select.value;
      select.innerHTML = `<option value="">${placeholder}</option>` +
        nodos.map((n) => `<option value="${n}">${n}</option>`).join("");
      if (nodos.includes(previo)) select.value = previo;
    };

    fill(this.el.edgeFrom, "Origen u");
    fill(this.el.edgeTo, "Destino v");
    fill(this.el.source, "Origen");
    fill(this.el.target, "Destino");
  }

  renderEdgeList() {
    const aristas = this.grafo.obtenerAristas();
    this.el.edgeCount.textContent = `${aristas.length} arista${aristas.length === 1 ? "" : "s"}`;

    if (aristas.length === 0) {
      this.el.edgeList.innerHTML = `<p class="px-1 py-2 text-sm text-zinc-500">No hay aristas agregadas.</p>`;
      return;
    }

    this.el.edgeList.innerHTML = `
      <div class="flex flex-wrap gap-2">
        ${aristas.map(({ origen, destino, peso }) => `
          <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs text-zinc-100">
            <span class="font-semibold">${origen} → ${destino}</span>
            <span class="text-cyan-200">w=${peso}</span>
            <button type="button" data-remove data-from="${origen}" data-to="${destino}"
              class="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Eliminar arista ${origen} a ${destino}">${ICON_X}</button>
          </span>`).join("")}
      </div>`;
  }

  renderGraphModel() {
    const { nodos, matriz } = this.grafo.obtenerMatrizAdyacencia();
    const aristas = this.grafo.obtenerAristas();

    if (nodos.length === 0) {
      this.el.graphModel.innerHTML = `
        <div class="space-y-4">
          <p class="text-base leading-7 text-zinc-300">
            Crea los vértices para mostrar aquí la matriz de distancias del grafo.
          </p>
          <div class="model-chip">Esperando datos del grafo</div>
        </div>`;
      return;
    }

    const matrixHtml = `
      <table class="matrix-table">
        <thead><tr><th></th>${nodos.map((n) => `<th>${n}</th>`).join("")}</tr></thead>
        <tbody>
          ${matriz.map((row, i) => `
            <tr><th>${nodos[i]}</th>${row.map((val, j) =>
              i === j ? `<td class="m-diag"></td>`
              : val === null ? `<td></td>`
              : `<td class="m-val">${val}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>`;

    this.el.graphModel.innerHTML = `
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article class="rounded-2xl border soft-border bg-black/20 p-5">
          <div class="mb-4 flex flex-wrap gap-2">
            <span class="model-chip">${nodos.length} vértices</span>
            <span class="model-chip">${aristas.length} aristas</span>
          </div>
          <h3 class="text-xl font-semibold text-white">¿Qué estamos modelando?</h3>
          <p class="mt-3 text-[15px] leading-7 text-zinc-300">
            Un grafo con ${nodos.length} vértices (${nodos.join(", ")}) unidos por aristas con un peso cada una.
            Piensa en los vértices como lugares y en los pesos como lo que cuesta ir de uno a otro: tiempo,
            distancia o dinero. La pregunta es cuál es la forma más barata de llegar desde el origen a cada lugar.
          </p>
          <p class="mt-3 text-[15px] leading-7 text-zinc-300">
            Mientras corre el algoritmo, cada vértice lleva una etiqueta <span class="font-serifMath text-white">[d, V]ₙ</span>:
            cuánto se lleva acumulado (<span class="font-semibold text-white">d</span>), desde qué vértice se llegó
            (<span class="font-semibold text-white">V</span>) y cuántas iteraciones van desde el origen
            (<span class="font-semibold text-white">n</span>).
          </p>
          <h3 class="mt-6 text-xl font-semibold text-white">¿Para qué sirve?</h3>
          <p class="mt-3 text-[15px] leading-7 text-zinc-300">
            La misma idea aparece cuando una app de mapas busca la ruta más corta, cuando una red envía datos
            por el camino más rápido o cuando una empresa planifica el reparto con el menor costo.
          </p>
        </article>

        <article class="rounded-2xl border soft-border bg-black/20 p-5">
          <div class="mb-4 flex items-center justify-between gap-4">
            <h3 class="text-xl font-semibold text-white">Matriz de distancias</h3>
            <span class="text-xs uppercase tracking-[0.18em] text-zinc-400">fila → columna</span>
          </div>
          <p class="mb-4 text-sm leading-6 text-zinc-400">
            Cada número es el peso de la arista que va del vértice de la fila al de la columna. Una celda vacía significa que no hay arista.
          </p>
          <div class="overflow-x-auto">${matrixHtml}</div>
        </article>
      </div>`;
  }

  /* ---------------- ayuda y avisos ---------------- */

  toast(message, type = "info") {
    const item = document.createElement("div");
    item.className = `toast rounded-2xl border bg-[#0d1324]/95 px-4 py-3 text-sm leading-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur ${TOAST_STYLES[type]}`;
    item.setAttribute("role", type === "error" ? "alert" : "status");
    item.textContent = message;
    this.el.toastHost.appendChild(item);

    while (this.el.toastHost.children.length > 3) this.el.toastHost.firstChild.remove();
    setTimeout(() => item.remove(), type === "error" ? 6000 : 3500);
  }

  showHelp() {
    const existingHelp = document.getElementById("helpPopover");

    if (existingHelp) {
      existingHelp.remove();
      return;
    }

    const helpPopover = document.createElement("div");
    helpPopover.id = "helpPopover";
    helpPopover.className =
      "fixed top-20 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-3xl border border-white/10 bg-[#0d1324]/95 p-5 text-sm leading-6 text-zinc-200 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur";

    helpPopover.innerHTML = `
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-white">¿Qué es DjFlow?</h2>
          <p class="mt-1 text-xs text-zinc-400">Guía rápida del programa</p>
        </div>

        <button
          id="closeHelpBtn"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
          aria-label="Cerrar ayuda"
        >${ICON_X}</button>
      </div>

      <div class="space-y-3 text-sm text-zinc-300">
        <p>
          DjFlow busca la forma más barata de ir desde un vértice origen hasta los demás en un grafo con pesos,
          usando el <span class="font-semibold text-white">algoritmo de Dijkstra</span>.
        </p>
        <p>
          Puedes avanzar paso a paso y ver cómo cada vértice recibe su etiqueta
          <span class="font-serifMath text-white">[d, V]ₙ</span>, cuándo una etiqueta se tacha porque apareció otra mejor
          y cómo al final se arman las rutas mínimas.
        </p>
        <p class="text-zinc-400">Atajo: usa las flechas izquierda y derecha para moverte entre pasos.</p>
        <div class="mt-5 pt-4 border-t border-white/10">
          <a
            href="./info.html"
            class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Ver teoría completa
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(helpPopover);

    document.getElementById("closeHelpBtn")?.addEventListener("click", () => helpPopover.remove());

    setTimeout(() => {
      const handleOutsideClick = (event) => {
        const clickedPopover = helpPopover.contains(event.target);
        const clickedHelpBtn = this.el.helpBtn?.contains(event.target);

        if (!clickedPopover && !clickedHelpBtn) {
          helpPopover.remove();
          document.removeEventListener("click", handleOutsideClick);
        }
      };

      document.addEventListener("click", handleOutsideClick);
    }, 0);
  }
}
