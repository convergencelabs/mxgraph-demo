class MxGraphAdapter {

  static _CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  static _ID_LENGTH = 32;

  static _generateId() {
    let text = "";
    for (let i = 0; i < MxGraphAdapter._ID_LENGTH; i++) {
      text += MxGraphAdapter._CHARS.charAt(Math.floor(Math.random() * MxGraphAdapter._CHARS.length));
    }
    return text;
  }

  constructor(mxGraph, rtGraph) {
    this._mxGraph = mxGraph;
    this._rtCells = rtGraph.get("cells");

    this._listeners = [];

    this._cellAdapters = new Map();

    // Listen for local changes
    this._mxGraph.addListener(mxEvent.CELLS_ADDED, (sender, evt) => this._handleLocalCellsAdded(evt));
    this._mxGraph.addListener(mxEvent.CELLS_REMOVED, (sender, evt) => this._handleLocalCellsRemoved(evt));
    this._mxGraph.model.addListener(mxEvent.CHANGE, (sender, evt) => {
      const edit = evt.getProperty('edit');
      edit.changes.forEach(change => this._processLocalChange(change));
    });

    // Listen for remote changes
    this._rtCells.on("set", e => this._handleRemoteCellAdded(e));
    this._rtCells.on("remove", e => this._handleRemoteCellRemoved(e));

    Object.keys(this._mxGraph.model.cells).forEach(id => {
      const cell = this._mxGraph.model.cells[id];
      const rtCell = this._rtCells.get(id);
      this._bindMxCellAdapter(cell, rtCell);
    })
  }

  _bindMxCellAdapter(mxCell, rtCell) {
    const adapter = new MxCellAdapter(mxCell, rtCell, this._mxGraph, this._fireEvent.bind(this));
    this._cellAdapters.set(mxCell, adapter);
  }

  addListener(listener) {
    this._listeners.push(listener);
  }

  _handleLocalCellsAdded(evt) {
    const {properties} = evt;
    const cells = properties.cells;

    cells.forEach(cell => {
      const id = MxGraphAdapter._generateId();
      this._mxGraph.model[id] = cell;
      cell.id = id;

      const cellJson = MxGraphModelSerializer.cellToJson(cell);
      const rtCell = this._rtCells.set(cell.id, cellJson);
      this._bindMxCellAdapter(cell, rtCell);
    });
  }

  _handleLocalCellsRemoved(evt) {
    const {properties} = evt;
    const cells = properties.cells;

    cells.forEach(cell => {
      const cellId = cell.getId();
      this._rtCells.remove(cellId);
    });

    this._fireEvent("onCellsRemoved", {cells});
  }

  _handleRemoteCellAdded(e) {
    const cellId = e.key;
    const cellJson = e.value.value();
    const cell = MxGraphModelDeserializer.jsonToMxCell(cellId, cellJson, this._mxGraph.model);
    this._mxGraph.model.cellAdded(cell);
    this._mxGraph.view.refresh();
    this._bindMxCellAdapter(cell, e.value);
  }

  _handleRemoteCellRemoved(e) {
    const cellId = e.key;
    const cell = this._mxGraph.model.cells[cellId];
    this._mxGraph.model.remove(cell);
    this._mxGraph.view.refresh();
    this._fireEvent("onCellsRemoved", {cells: [cell]});
  }

  _processLocalChange(change) {
    if (change instanceof mxRootChange) {
      console.log('mxRootChange: ', change);
      // Only process the root change that sets the current root
      // ie. ignore previous root changes
      if (change.root === this.model.root) {
        // todo
      }
    } else if (change instanceof mxChildChange) {
      this.processLocalChildChange(change);
    } else if (change.cell != null && change.cell.id != null) {
      const adapter = this._cellAdapters.get(change.cell);
      adapter.processChange(change);
    }
  }

  processLocalChildChange(change) {
    console.log("cell child changed", change);
  }

  _fireEvent(name, evt) {
    this._listeners.forEach(listener => {
      try {
        const callback = listener[name];
        if (callback) {
          callback(evt);
        }
      } catch (e) {
        console.log(e);
      }
    })
  }
}
