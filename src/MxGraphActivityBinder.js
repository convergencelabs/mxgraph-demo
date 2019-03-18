const svgNS = "http://www.w3.org/2000/svg";
const path = "M 0,0 L 0,0 11.6,11.6 6.7,11.6 9.6,18.3 6.0,20.2 3.1,13.3 0,16z";
const padding = 8;

class MxGraphActivityBinder {


  constructor(mxGraph, activity, modelAdapter) {
    this._mxGraph = mxGraph;
    this._activity = activity;

    modelAdapter.addListener({
      onCellsRemoved: (evt) => {
        evt.cells.forEach(cell => {
          this._cellRemoved(cell);
        });
      },
      onCellGeometryChanged: (evt) => this._cellUpdated(evt.cell),
      onCellStyleChanged: (evt) => this._cellUpdated(evt.cell)
    });

    this._mxGraph.model.addListener(mxEvent.CHANGE, (sender, evt) => {
      const edit = evt.getProperty('edit');
      if (!edit.ignoreEdit) {
        edit.changes.forEach(change => {
          if (change instanceof mxGeometryChange) {
            this._cellUpdated(change.cell);
          } else if (change instanceof mxStyleChange) {
            this._cellUpdated(change.cell);
          }
        });
      }
    });

    this._remotePointers = {};
    this._remoteSelectionsBySessionId = {};

    this._svg = mxGraph.view.drawPane.ownerSVGElement;

    this._selectionHandler = this._mxGraph.createSelectionCellsHandler();
    this._selectionHandler.addListener(mxEvent.ADD, e => {
      this._setSelection();
    });

    this._selectionHandler.addListener(mxEvent.REMOVE, e => {
      this._setSelection();
    });

    this._mxGraph.addMouseListener({
      mouseDown: function (sender, evt) {
        //console.log('mouseDown');
      },
      mouseMove: function (sender, evt) {
        const {graphX, graphY} = evt;
        activity.setState("pointer", {x: graphX, y: graphY});
      },
      mouseUp: function (sender, evt) {
        // console.log('mouseUp');
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
      } else if (key === "selection") {
        this._updateRemoteSelection(sessionId, value);
      }
    });

    this._activity.participants().forEach(participant => {
      this._addSession(participant);
    });
  }

  _setSelection() {
    this._activity.setState("selection", this._mxGraph.getSelectionCells().map(c => c.id));
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

  _cellUpdated(cell) {
    Object.keys(this._remoteSelectionsBySessionId).forEach(sessionId => {
      const remoteSelection = this._remoteSelectionsBySessionId[sessionId];
      const cellSelection = remoteSelection.cells[cell.id];
      if (cellSelection) {
        this._updateBoundsForRect(cell, cellSelection);
      }
    });
  }

  _cellRemoved(cell) {
    Object.keys(this._remoteSelectionsBySessionId).forEach(sessionId => {
      const remoteSelection = this._remoteSelectionsBySessionId[sessionId];
      const cellSelection = remoteSelection.cells[cell.id];
      if (cellSelection) {
        cellSelection.parentElement.removeChild(cellSelection);
        delete remoteSelection.cells[cell.id];
      }
    });
  }

  _updateRemoteSelection(sessionId, cellIds) {
    const currentSelection = this._remoteSelectionsBySessionId[sessionId];
    if (currentSelection) {
      currentSelection.group.parentElement.removeChild(currentSelection.group);
      delete this._remoteSelectionsBySessionId[sessionId];
    }

    if (cellIds && cellIds.length > 0) {
      const selection = {
        cells: {}
      };
      const selectionGroup = document.createElementNS(svgNS, "g");
      cellIds.forEach(cellId => {
        const cell = this._mxGraph.model.getCell(cellId);
        if (cell !== null) {
          const cellRect = this._createSelectionRect(cell);
          selectionGroup.appendChild(cellRect);
          selection.cells[cellId] = cellRect;
        }
      });

      selection.group = selectionGroup;

      this._remoteSelectionsBySessionId[sessionId] = selection;
      this._svg.appendChild(selectionGroup);
    }
  }

  _createSelectionRect(cell) {
    const selection = document.createElementNS(svgNS, "rect");
    selection.setAttributeNS(null, "fill", "none");
    selection.setAttributeNS(null, "stroke", "#ff1712");
    selection.setAttributeNS(null, "stroke-dasharray", "3 3");
    selection.setAttributeNS(null, "pointer-events", "3 3");

    this._updateBoundsForRect(cell, selection);

    return selection;
  }

  _updateBoundsForRect(cell, selection) {
    const bounds = this._mxGraph.getBoundingBox([cell]);
    const {x, y, height, width} = bounds;

    selection.setAttributeNS(null, "x", `${x - (padding / 2)}`);
    selection.setAttributeNS(null, "y", `${y - (padding / 2)}`);
    selection.setAttributeNS(null, "height", `${height + padding}`);
    selection.setAttributeNS(null, "width", `${width + padding}`);
  }
}
