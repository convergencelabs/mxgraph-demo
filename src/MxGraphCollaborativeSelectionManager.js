

class MxGraphCollaborativeSelectionManager {
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

    this._remoteSelectionsBySessionId = {};
    this._selectionHandler = this._mxGraph.createSelectionCellsHandler();
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
      // const cellState = this._mxGraph.getView().getState(cell);
      // handler.state = cellState;
      // handler.refresh();
      // handler.reset();

      // setTimeout(() => {
      //   handler.redraw();
      //   this._mxGraph.view.refresh();
      // }, 0);
    }
    Object.keys(this._remoteSelectionsBySessionId).forEach(sessionId => {
      const remoteSelection = this._remoteSelectionsBySessionId[sessionId];
      const highlighter = remoteSelection.cells[cell.id];
      if (highlighter) {
        const cellState = this._mxGraph.getView().getState(cell);
        highlighter.state = cellState;
        highlighter.repaint();
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
          const highlighter = new mxCellHighlight(this._mxGraph, '#ff0000', 2);
          const cellState = this._mxGraph.getView().getState(cell);
          highlighter.highlight(cellState);
          selection.cells[cellId] = highlighter;
        }
      });
      this._remoteSelectionsBySessionId[sessionId] = selection;
    }
  }
}
