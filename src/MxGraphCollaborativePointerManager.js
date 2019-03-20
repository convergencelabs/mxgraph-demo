

class MxGraphCollaborativePointerManager {

  static SVG_NS = "http://www.w3.org/2000/svg";
  static CURSOR_PATH = "M 0,0 L 0,0 11.6,11.6 6.7,11.6 9.6,18.3 6.0,20.2 3.1,13.3 0,16z";
  static POINTER_KEY = "pointer";

  constructor(mxGraph, activity) {
    this._mxGraph = mxGraph;
    this._activity = activity;
    this._remotePointers = {};
    this._root = this._mxGraph.getView().getOverlayPane();

    this._active = true;

    this._listenToGraph();
    this._listenToActivity();

    this._activity.participants().forEach(participant => {
      this._addRemotePointer(participant);
    });
  }

  _listenToGraph() {
    this._root.ownerSVGElement.addEventListener("mouseleave", () => {
      this._activity.removeState(MxGraphCollaborativePointerManager.POINTER_KEY);
      this._active = false;
    });

    this._root.ownerSVGElement.addEventListener("mouseenter", () => {
      this._active = true;
    });

    this._mxGraph.addMouseListener({
      mouseDown: (sender, evt) => {
        // No-Op
      },
      mouseMove: (sender, evt) => {
        if (this._active) {
          const {graphX, graphY} = evt;
          const scale = this._mxGraph.view.scale;
          const translate = this._mxGraph.view.translate;
          const tX = Math.round((graphX - translate.x * scale) / scale);
          const tY = Math.round((graphY - translate.y * scale) / scale);
          const pointerState = {x: tX, y: tY};
          this._activity.setState(MxGraphCollaborativePointerManager.POINTER_KEY, pointerState);
        }
      },
      mouseUp: (sender, evt) => {
        // Click animation.
      }
    });
  }

  _listenToActivity() {
    this._activity.on("session_joined", (e) => {
      this._addRemotePointer(e.participant);
    });

    this._activity.on("session_left", (e) => {
      const remotePointer = this._remotePointers[e.sessionId];
      remotePointer.parentElement.removeChild(remotePointer);
      delete this._remotePointers[e.sessionId];
    });

    this._activity.on("state_set", (e) => {
      const {key, value, sessionId, local} = e;
      if (!local && key === MxGraphCollaborativePointerManager.POINTER_KEY) {
        const remotePointer = this._remotePointers[sessionId];
        const scale = this._mxGraph.view.scale;
        const translate = this._mxGraph.view.translate;
        const graphX = Math.round((value.x + translate.x) * scale);
        const graphY = Math.round((value.y + translate.y) * scale);
        remotePointer.setAttributeNS(null, "transform", `translate(${graphX},${graphY})`);
        remotePointer.setAttributeNS(null, "visibility", "visible");
      }
    });

    this._activity.on("state_removed", (e) => {
      const {key, sessionId, local} = e;
      if (!local && key === "pointer") {
        const remotePointer = this._remotePointers[sessionId];
        remotePointer.setAttributeNS(null, "visibility", "hidden");
      }
    });
  }

  _addRemotePointer(participant) {
    if (!participant.local) {
      const pointer = participant.state.get(MxGraphCollaborativePointerManager.POINTER_KEY) || {x: 0, y: 0};
      const remotePointer = document.createElementNS(MxGraphCollaborativePointerManager.SVG_NS, "path");
      remotePointer.setAttributeNS(null, "d", MxGraphCollaborativePointerManager.CURSOR_PATH);
      remotePointer.setAttributeNS(null, "transform", `translate(${pointer.x},${pointer.y})`);
      this._remotePointers[participant.sessionId] = remotePointer;
      this._root.appendChild(remotePointer);
    }
  }
}
