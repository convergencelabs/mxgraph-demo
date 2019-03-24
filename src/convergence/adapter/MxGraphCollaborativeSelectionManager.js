

class MxGraphCollaborativeSelectionManager {
  constructor(mxGraph, activity, colorManager, modelAdapter) {
    this._mxGraph = mxGraph;
    this._activity = activity;
    this._colorManager = colorManager;

    modelAdapter.addListener({
      onCellsRemoved: (evt) => {
        evt.cells.forEach(cell => {
          this._cellRemoved(cell);
        });
      },
      onCellGeometryChanged: (evt) => this._cellUpdated(evt.cell),
      onCellStyleChanged: (evt) => this._cellUpdated(evt.cell),
      onCellTerminalChanged: (evt) => this._cellUpdated(evt.cell)
    });

    this._remoteSelectionsBySessionId = {};
    this._selectionHandler = this._mxGraph.selectionCellsHandler;
    this._selectionHandler.addListener(mxEvent.ADD, e => {
      this._setSelection();
    });

    this._selectionHandler.addListener(mxEvent.REMOVE, e => {
      this._setSelection();
    });

    this._activity.on("session_joined", e => {
      this._addRemoteSelection(e.participant);
    });

    this._activity.on("session_left", e => {
      this._updateRemoteSelection(e.sessionId, []);
      delete this._remoteSelectionsBySessionId[e.sessionId];

    });

    this._activity.on("state_set", e => {
      const {key, value, sessionId, local} = e;
      if (!local && key === "selection") {
        this._updateRemoteSelection(sessionId, value);
      }
    });

    this._activity.participants().forEach(participant => {
      this._addRemoteSelection(participant);
    });
  }

  _setSelection() {
    this._activity.setState("selection", this._mxGraph.getSelectionCells().map(c => c.id));
  }

  _addRemoteSelection(participant) {
    if (!participant.local) {
      const selection = participant.state.get("selection") || [];
      this._updateRemoteSelection(participant.sessionId, selection);
    }
  }

  _cellUpdated(cell) {
    const handler = this._mxGraph.selectionCellsHandler.getHandler(cell);
    if (handler) {
      handler.redraw();
    }
    Object.keys(this._remoteSelectionsBySessionId).forEach(sessionId => {
      const remoteSelection = this._remoteSelectionsBySessionId[sessionId];
      const highlighter = remoteSelection.cells[cell.id];
      if (highlighter) {
        const cellState = this._mxGraph.getView().getState(cell);
        highlighter.highlight(null);
        highlighter.highlight(cellState);
      }
    });
  }

  _cellRemoved(cell) {
    Object.keys(this._remoteSelectionsBySessionId).forEach(sessionId => {
      const remoteSelection = this._remoteSelectionsBySessionId[sessionId];
      const cellSelection = remoteSelection.cells[cell.id];
      if (cellSelection) {
        cellSelection.destroy();
        delete remoteSelection.cells[cell.id];
      }
    });
  }

  _updateRemoteSelection(sessionId, cellIds) {
    const currentSelection = this._remoteSelectionsBySessionId[sessionId];
    if (currentSelection) {
      Object.keys(currentSelection.cells).forEach(cellId => {
        const shape = currentSelection.cells[cellId];
        shape.destroy();
      });
      delete this._remoteSelectionsBySessionId[sessionId];
    }

    if (cellIds && cellIds.length > 0) {
      const selection = {
        cells: {}
      };

      cellIds.forEach(cellId => {
        const cell = this._mxGraph.model.getCell(cellId);
        if (cell !== null) {
          const color = this._colorManager.color(sessionId);
          const highlighter = new mxCellHighlight(this._mxGraph, color, 3, false);
          const cellState = this._mxGraph.getView().getState(cell);
          highlighter.highlight(cellState);
          selection.cells[cellId] = highlighter;
        }
      });
      this._remoteSelectionsBySessionId[sessionId] = selection;
    }
  }
}
