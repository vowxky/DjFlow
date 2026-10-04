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
