import { useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  getGraphState,
  refreshGraphGeometry,
  registerGraphLayoutEngine,
  registerGraphNodeType,
  renderGraph,
  resetGraphFocus,
  runGraphLayoutEngine,
  selectGraphEdge,
  selectGraphNode,
  setGraphViewport,
  unregisterGraphLayoutEngine,
} from "../js/index.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readGraphView(canvas) {
  return {
    panX: Number.parseFloat(canvas?.dataset.graphPanX || "0") || 0,
    panY: Number.parseFloat(canvas?.dataset.graphPanY || "0") || 0,
    zoom: Number.parseFloat(canvas?.dataset.graphZoom || "1") || 1,
  };
}

function writeGraphView(canvas, view) {
  if (!canvas) return;
  const viewport = canvas.querySelector(".if-graph-viewport[data-if-graph-viewport]");
  canvas.dataset.graphPanX = String(view.panX);
  canvas.dataset.graphPanY = String(view.panY);
  canvas.dataset.graphZoom = Number(view.zoom || 1).toFixed(2);
  viewport?.style.setProperty("--graph-pan-x", `${view.panX}px`);
  viewport?.style.setProperty("--graph-pan-y", `${view.panY}px`);
  viewport?.style.setProperty("--graph-zoom", Number(view.zoom || 1).toFixed(2));
}

/**
 * React lifecycle adapter for the framework graph explorer.
 * The framework remains the single owner of graph DOM, viewport, keyboard,
 * accessibility, selection, edge inspection, and geometry.
 */
export function ControlGraph({
  nodes = [],
  edges = [],
  selected = null,
  layout = "custom",
  mode = "unified",
  layoutEngine,
  layoutOptions,
  nodeTypes = {},
  panelMode = "internal",
  edgeLabelMode = "pill",
  canvasLabel = "Graph canvas",
  a11yLabel = "Accessible graph fallback",
  a11yMode = "visible",
  emptyLabel = "Graph",
  draggable = true,
  pannable = true,
  className = "",
  onNodeSelect,
  onEdgeSelect,
  onLayoutResult,
  onReady,
  ...props
}) {
  const reactId = useId();
  const graphRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const engineNameRef = useRef(`react-graph-${reactId.replaceAll(":", "")}`);
  const callbacksRef = useRef({ onNodeSelect, onEdgeSelect, onLayoutResult, onReady });
  callbacksRef.current = { onNodeSelect, onEdgeSelect, onLayoutResult, onReady };

  useLayoutEffect(() => {
    const graph = graphRef.current;
    if (!graph) return undefined;
    let active = true;
    let registeredEngine = false;
    const handleNode = (event) => callbacksRef.current.onNodeSelect?.(event.detail, event);
    const handleEdge = (event) => callbacksRef.current.onEdgeSelect?.(event.detail, event);
    const handleLayout = (event) => callbacksRef.current.onLayoutResult?.(event.detail, event);

    Object.entries(nodeTypes || {}).forEach(([type, config]) => registerGraphNodeType(type, config));
    renderGraph(graph, {
      a11yMode,
      a11yLabel,
      canvasLabel,
      edgeLabelMode,
      edges,
      emptyLabel,
      layout,
      mode,
      nodes,
      panelMode,
      selected,
    });
    graph.addEventListener("if:graph-node-select", handleNode);
    graph.addEventListener("if:graph-edge-select", handleEdge);
    graph.addEventListener("if:graph-layout-result", handleLayout);

    let layoutPromise = Promise.resolve(null);
    const runOptions = { layout, ...(layoutOptions || {}), options: layoutOptions || {} };
    if (typeof layoutEngine === "function") {
      registerGraphLayoutEngine(engineNameRef.current, layoutEngine);
      registeredEngine = true;
      layoutPromise = runGraphLayoutEngine(graph, engineNameRef.current, runOptions);
    } else if (typeof layoutEngine === "string" && layoutEngine) {
      layoutPromise = runGraphLayoutEngine(graph, layoutEngine, runOptions);
    }
    layoutPromise.then(() => {
      if (active) callbacksRef.current.onReady?.({ graph, state: getGraphState(graph) });
    });

    return () => {
      active = false;
      graph.removeEventListener("if:graph-node-select", handleNode);
      graph.removeEventListener("if:graph-edge-select", handleEdge);
      graph.removeEventListener("if:graph-layout-result", handleLayout);
      if (registeredEngine) unregisterGraphLayoutEngine(engineNameRef.current);
      graph.replaceChildren();
    };
  }, [a11yLabel, a11yMode, canvasLabel, edgeLabelMode, edges, emptyLabel, layout, layoutEngine, layoutOptions, mode, nodeTypes, nodes, panelMode]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (!selected) {
      graph.querySelectorAll(".if-graph-node").forEach((node) => {
        node.classList.remove("is-selected", "is-related", "is-muted");
        node.setAttribute("aria-selected", "false");
      });
      graph.querySelectorAll("[data-edge-from], [data-if-graph-edge]").forEach((edge) => edge.classList.remove("is-selected", "is-related", "is-muted"));
      graph.dataset.graphSelection = "none";
      return;
    }
    const node = [...graph.querySelectorAll(".if-graph-node[data-node-id]")].find((item) => item.dataset.nodeId === String(selected));
    if (node && node.getAttribute("aria-selected") !== "true") selectGraphNode(node);
  }, [selected]);

  function handleClick(event) {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    const graph = graphRef.current;
    if (!graph || !graph.contains(event.target)) return;
    const viewportControl = event.target.closest("[data-if-graph-viewport='in'], [data-if-graph-viewport='out'], [data-if-graph-viewport='fit'], [data-if-graph-viewport='reset']");
    if (viewportControl) {
      event.preventDefault();
      setGraphViewport(viewportControl);
      return;
    }
    const traversalControl = event.target.closest("[data-if-graph-traverse]");
    if (traversalControl) {
      event.preventDefault();
      const target = [...graph.querySelectorAll(".if-graph-node[data-node-id]")]
        .find((node) => node.dataset.nodeId === traversalControl.dataset.ifGraphTraverse);
      if (target) selectGraphNode(target);
      return;
    }
    const edge = event.target.closest("[data-if-graph-edge]");
    if (edge) {
      event.preventDefault();
      selectGraphEdge(edge);
      return;
    }
    const node = event.target.closest(".if-graph-node[data-node-id]");
    if (node) {
      event.preventDefault();
      if (graph.dataset.graphSuppressClick !== "true") selectGraphNode(node);
      return;
    }
    const canvas = event.target.closest(".if-graph-canvas");
    if (canvas && !event.target.closest("button, a, input, select, textarea")) {
      event.preventDefault();
      if (graph.dataset.graphSuppressClick !== "true") resetGraphFocus(graph);
    }
  }

  function handlePointerDown(event) {
    props.onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    const graph = graphRef.current;
    const node = event.target.closest(".if-graph-node[data-node-id]");
    if (draggable && node && graph?.contains(node)) {
      const viewport = graph.querySelector(".if-graph-viewport[data-if-graph-viewport]");
      const rect = viewport?.getBoundingClientRect();
      if (!rect?.width || !rect?.height) return;
      const styles = getComputedStyle(node);
      dragRef.current = {
        graph,
        node,
        pointerId: event.pointerId,
        rect,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: Number.parseFloat(styles.getPropertyValue("--x")) || 50,
        startY: Number.parseFloat(styles.getPropertyValue("--y")) || 50,
        moved: false,
      };
      node.classList.add("is-dragging");
      node.setPointerCapture?.(event.pointerId);
      return;
    }
    const canvas = event.target.closest(".if-graph-canvas");
    if (!pannable || !canvas || event.target.closest("button, a, input, select, textarea")) return;
    const view = readGraphView(canvas);
    panRef.current = {
      canvas,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: view.panX,
      startPanY: view.panY,
      moved: false,
    };
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    props.onPointerMove?.(event);
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const dx = ((event.clientX - drag.startClientX) / drag.rect.width) * 100;
      const dy = ((event.clientY - drag.startClientY) / drag.rect.height) * 100;
      drag.moved ||= Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35;
      const minX = Number(drag.graph.dataset.graphMinX) || 7;
      const maxX = Number(drag.graph.dataset.graphMaxX) || 93;
      const minY = Number(drag.graph.dataset.graphMinY) || 7;
      const maxY = Number(drag.graph.dataset.graphMaxY) || 93;
      drag.node.style.setProperty("--x", `${clamp(drag.startX + dx, minX, maxX).toFixed(2)}%`);
      drag.node.style.setProperty("--y", `${clamp(drag.startY + dy, minY, maxY).toFixed(2)}%`);
      refreshGraphGeometry(drag.graph);
      return;
    }
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      const dx = event.clientX - pan.startClientX;
      const dy = event.clientY - pan.startClientY;
      pan.moved ||= Math.abs(dx) > 2 || Math.abs(dy) > 2;
      writeGraphView(pan.canvas, {
        ...readGraphView(pan.canvas),
        panX: pan.startPanX + dx,
        panY: pan.startPanY + dy,
      });
    }
  }

  function finishPointer(event) {
    props.onPointerUp?.(event);
    const graph = graphRef.current;
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      drag.node.releasePointerCapture?.(event.pointerId);
      drag.node.classList.remove("is-dragging");
      if (drag.moved && graph) {
        graph.dataset.graphSuppressClick = "true";
        window.setTimeout(() => delete graph.dataset.graphSuppressClick, 120);
        graph.dispatchEvent(new CustomEvent("if:graph-node-move", {
          bubbles: true,
          detail: { id: drag.node.dataset.nodeId, node: drag.node },
        }));
      }
      dragRef.current = null;
      return;
    }
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      pan.canvas.releasePointerCapture?.(event.pointerId);
      if (pan.moved && graph) {
        graph.dataset.graphSuppressClick = "true";
        window.setTimeout(() => delete graph.dataset.graphSuppressClick, 120);
        graph.dispatchEvent(new CustomEvent("if:graph-pan", {
          bubbles: true,
          detail: readGraphView(pan.canvas),
        }));
      }
      panRef.current = null;
    }
  }

  function handleWheel(event) {
    props.onWheel?.(event);
    if (event.defaultPrevented || (!event.ctrlKey && !event.metaKey)) return;
    const graph = graphRef.current;
    const canvas = event.target.closest(".if-graph-canvas");
    if (!graph || !canvas || !graph.contains(canvas)) return;
    event.preventDefault();
    const action = event.deltaY < 0 ? "in" : "out";
    const control = graph.querySelector(`[data-if-graph-viewport='${action}']`);
    if (control) setGraphViewport(control);
  }

  return <section
    {...props}
    ref={graphRef}
    onClick={handleClick}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={finishPointer}
    onPointerCancel={finishPointer}
    onWheel={handleWheel}
    className={`if-graph-shell ${className}`.trim()}
    data-if-graph
    data-graph-layout={layout}
    data-graph-mode={mode}
    data-graph-edge-label-mode={edgeLabelMode}
    data-graph-react-adapter="true"
  />;
}

export default ControlGraph;
