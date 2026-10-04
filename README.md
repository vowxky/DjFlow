# DjFlow

Simulador interactivo del algoritmo de Dijkstra para el problema del camino mínimo en grafos dirigidos acíclicos ponderados (DAGs). Matemática Computacional — UPC.

Cumple el enunciado del Tema 2: n ∈ [7, 16], grafo manual o aleatorio (dirigido y sin ciclos),
representación etiquetada, elección de origen/destino, Dijkstra paso a paso (etiquetas, distancias,
visitados y decisiones), y resultado con la distancia mínima, la cantidad de caminos mínimos y cada
secuencia resaltada sobre el grafo. Incluye modo práctica (el usuario predice cada decisión) y
reproducción automática.

El procedimiento usa etiquetas [d, V]ₙ, los 7 pasos del algoritmo y una tabla única por iteraciones.
Los ejemplos son propios: Ejemplo 1 (8 vértices, dos rutas mínimas) y Ejemplo 2 (9 vértices, ruta única).

pa arrancar: `npm install` y luego `npm run dev`, todo se modifica en tiempo real.

## Estructura

```
index.html            Hero, instrucciones, programa e isla explicativa
info.html             Teoría con ejemplos propios
src/style.css         Estilos (grafo SVG, estados, tablas)
src/main.js           Punto de entrada
src/modules/
  app.js              Controlador de la interfaz
  graph.js            Grafo: nodos, aristas, matriz, generación aleatoria y ejemplos propios
  validation.js       Validaciones y detección de ciclos (DFS)
  dijkstra.js         Algoritmo con etiquetas [d, V]ₙ + historial de pasos
  paths.js            Reconstrucción de todos los caminos mínimos (backtracking)
  steps.js            Navegación de pasos (inicio, anterior, siguiente, final)
  layout.js           Capas topológicas para ubicar los nodos
  renderer.js         Dibujo SVG del grafo y estados de cada paso
```
