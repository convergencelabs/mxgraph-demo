const svgNS = "http://www.w3.org/2000/svg";

const svgSuffix = '<svg stroke="#000000" fill="" xmlns="http://www.w3.org/2000/svg"><path d="M 0,0 L 0,0 11.6,11.6 6.7,11.6 9.6,18.3 6.0,20.2 3.1,13.3 0,16z"/></svg>'
const cursorPath = '<path d="M 0,0 L 0,0 11.6,11.6 6.7,11.6 9.6,18.3 6.0,20.2 3.1,13.3 0,16z"/>';
const path = "M 0,0 L 0,0 11.6,11.6 6.7,11.6 9.6,18.3 6.0,20.2 3.1,13.3 0,16z";

class MxGraphActivityBinder {


  constructor(mxGraph, activity) {
    this._mxGraph = mxGraph;
    this._activity = activity;

    console.log(mxGraph);
    this._svg = mxGraph.view.drawPane.ownerSVGElement;

    this._remotePointers = {};

    this._mxGraph.addMouseListener({
      mouseDown: function (sender, evt) {
        console.log('mouseDown');
      },
      mouseMove: function (sender, evt) {
        const {graphX, graphY} = evt;
        activity.setState("pointer", {x: graphX, y: graphY});

      },
      mouseUp: function (sender, evt) {
        console.log('mouseUp');
      }
    });

    this._activity.on("session_joined", e => {
      this._addSession(e.participant);
    });

    this._activity.on("session_left", e => {
      const remotePointer = this._remotePointers[e.sessionId];
      remotePointer.parentElement.removeChild(remotePointer);
      delete this._remotePointers[e.sessionId];
    });

    this._activity.on("state_set", e => {
      const {key, value, sessionId, local} = e;
      if (local) {
        return;
      }

      if (key === "pointer") {
        const remotePointer = this._remotePointers[sessionId];
        remotePointer.setAttributeNS(null, "transform", `translate(${value.x},${value.y})`);
      }
    });

    this._activity.participants().forEach(participant => {
      this._addSession(participant);
    });
  }

  _addSession(participant) {
    if (!participant.local) {
      const pointer = participant.state.get("pointer") || {x: 0, y: 0};
      const remotePointer = document.createElementNS(svgNS, "path");
      remotePointer.setAttributeNS(null, "d", path);
      remotePointer.setAttributeNS(null, "transform", `translate(${pointer.x},${pointer.y})`);
      this._remotePointers[participant.sessionId] = remotePointer;
      this._svg.appendChild(remotePointer);
    }
  }
}
