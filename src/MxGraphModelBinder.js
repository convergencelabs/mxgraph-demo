class MxGraphModelBinder {

  constructor(mxGraph, rtGraph) {
    this._mxGraph = mxGraph;

    this._mxGraph.addListener(mxEvent.CELLS_ADDED, (sender, evt) => {
      const {name, properties} = evt;
      const cells = properties.cells;

      cells.forEach(cell => {
        const cellJson = MxGraphSerializer.cellToJson(cell);
        const rtCell = this._rtCells.set(cell.id, cellJson);
        CellAdapter.bind(cell, rtCell, this._mxGraph);
      });
    });

    this._mxGraph.addListener(mxEvent.CELLS_REMOVED, (sender, evt) => {
      const {name, properties} = evt;
      const cells = properties.cells;

      cells.forEach(cell => {
        const cellId = cell.getId();
        this._rtCells.remove(cellId);
      });
    });

    this._mxGraph.model.addListener(mxEvent.CHANGE, (sender, evt) => {
      const edit = evt.getProperty('edit');
      const editable = true;
      if (!this.ignoreChange && editable && !edit.ignoreEdit) {
        const changes = edit.changes;

        for (let i = 0; i < changes.length; i++) {
          this.processChange(changes[i]);
        }
      }
    });

    this._rtCells = rtGraph.get("cells");
    this._rtCells.on("set", e => {
      const cellId = e.key;
      const cellJson = e.value.value();
      const cell = MxGraphSerializer.jsonToMxCell(cellId, cellJson, this._mxGraph.model);
      this._mxGraph.model.cellAdded(cell);
      this._mxGraph.view.refresh();
      CellAdapter.bind(cell, e.value, this._mxGraph);
    });

    this._rtCells.on("remove", e => {
      const cellId = e.key;
      const cell = this._mxGraph.model.cells[cellId];
      this._mxGraph.model.remove(cell);
      this._mxGraph.view.refresh();
    });

    Object.keys(this._mxGraph.model.cells).forEach(id => {
      const cell = this._mxGraph.model.cells[id];
      const rtCell = this._rtCells.get(id);
      CellAdapter.bind(cell, rtCell, this._mxGraph);
    })
  }

  processChange(change) {

    if (change instanceof mxRootChange) {
      console.log('mxRootChange: ', change);
      // Only process the root change that sets the current root
      // ie. ignore previous root changes
      if (change.root === this.model.root) {
        //this.getCurrentPage().mapping.initRealtime();
      }
    } else if (change instanceof mxChildChange) {
      this.processLocalChildChange(change);
    } else if (change.cell != null && change.cell.id != null) {
      change.cell.__convergenceAdapter.processChange(change);
    }
  }

  processLocalChildChange(change) {
    console.log("cell child changed", change);
  }
}

class CellAdapter {
  static bind(mxCell, rtCell, graph) {
    const adapter = new CellAdapter(mxCell, rtCell, graph);
    mxCell.__convergenceAdapter = adapter;
  }

  constructor(mxCell, rtCell, graph) {
    this._mxCell = mxCell;
    this._rtCell = rtCell;

    this._mxGraph = graph;

    this.initCell();
    this.initGeometry();
    this.initStyle();
  }

  processChange(change) {
    if (change instanceof mxTerminalChange) {
      this.localTerminalChanged(change);

    } else if (change instanceof mxGeometryChange) {
      this.localGeometryChanged(change)
    } else if (change instanceof mxStyleChange) {
      this.localStyleChanged(change);
    } else if (change instanceof mxValueChange) {
      this.localValueChanged(change)
    } else if (change instanceof mxCollapseChange) {
      console.log("cell collapsed changed", change);
    } else if (change instanceof mxVisibleChange) {
      console.log("cell visible changed", change);
    }
  }

  localGeometryChanged(change) {
    const {geometry} = change;
    const geometryJson = MxGraphSerializer.geometryToJson(geometry);
    this._rtGeometry.value(geometryJson);
  }

  localValueChanged(change) {
    const {value} = change;
    this._rtCell.set("value", value);
  }

  localTerminalChanged(change) {
    const {source, terminal, previous} = change;
    const prop = source ? "source" : "target";

    if (terminal !== previous) {
      const value = terminal !== null ? terminal.getId() : null;
      this._rtCell.set(prop, value);
    }
  }

  localStyleChanged(change) {
    const {previous, style} = change;
    const oldStyle = MxGraphSerializer.styleToJson(previous);
    const newStyle = MxGraphSerializer.styleToJson(style);

    // check for lazy style initialization
    if (!this._rtStyle) {
      this._rtCell.set("style", newStyle);
      this.initStyle();
    } else {
      const diff = this.diffStyles(newStyle, oldStyle);
      this.applyStyleChnages(diff);
    }
  }

  diffStyles(newStyles, oldStyles) {
    const addedClasses = newStyles.classes.filter(c => oldStyles.classes.indexOf(c) >= 0);
    const removedClasses = oldStyles.classes.filter(c => newStyles.classes.indexOf(c) < 0);

    const changedStyles = {};

    // Process all new styles
    for (let styleName in newStyles.styles) {
      const newValue = newStyles.styles[styleName];
      const oldValue = oldStyles.styles[styleName];

      if (newValue !== oldValue) {
        changedStyles[styleName] = newValue;
      }
    }

    // look for removed styles
    for (let styleName in oldStyles.styles) {
      if (typeof newStyles.styles[styleName] === "undefined") {
        changedStyles[styleName] = null;
      }
    }
    return {addedClasses, removedClasses, changedStyles};
  }

  applyStyleChnages(styleDiff) {
    this._rtStyle.model().startBatch();
    styleDiff.removedClasses.forEach(c => {
      const oldClasses = this._rtClasses.value();
      const index = oldClasses.indexOf(c);
      this._rtClasses.remove(index);
    });

    styleDiff.addedClasses.forEach(c => {
      this._rtClasses.push(c);
    });

    for (let styleName in styleDiff.changedStyles) {
      const newValue = styleDiff.changedStyles[styleName];

      if (newValue !== null) {
        this._rtStyles.set(styleName, newValue);
      } else {
        this._rtStyles.remove(styleName);
      }
    }

    this._rtStyle.model().endBatch();
  }

  initCell() {
    this._rtCell.on("set", e => {
      switch (e.key) {
        case "target":
          const targetId = e.value.value();
          const target = targetId === null ? null : this._mxGraph.model.cells[targetId];
          this._mxCell.setTerminal(target, false);
          this._mxGraph.view.refresh();
          break;
        case "source":
          const sourceId = e.value.value();
          const source = sourceId === null ? null : this._mxGraph.model.cells[sourceId];
          this._mxCell.setTerminal(source, true);
          this._mxGraph.view.refresh();
          break;
        case "style":
          this.initStyle();
          const newStyle = MxGraphSerializer.jsonToStyle(this._rtStyle.value());
          this._mxCell.setStyle(newStyle);
          break;
        case "value":
          const value = e.value.value();
          this._mxCell.setValue(value);
          this._mxGraph.view.refresh();
          break;
      }
    });
  }

  initGeometry() {
    if (this._rtCell.hasKey("geometry")) {
      this._rtGeometry = this._rtCell.get("geometry");
      this._rtGeometry.on("value", () => {
        const mxGeometry = MxGraphSerializer.jsonToGeometry(this._rtGeometry.value());
        this._mxCell.setGeometry(mxGeometry);
        this._mxGraph.view.refresh();
      });
    }
  }

  initStyle() {
    if (this._rtCell.hasKey("style")) {
      this._rtStyle = this._rtCell.get("style");

      this._rtStyles = this._rtStyle.get("styles");
      this._rtStyles.on("set", e => {
        const styleName = e.key;
        const value = e.value.value();
        const currentStyle = MxGraphSerializer.styleToJson(this._mxCell.style);
        currentStyle.styles[styleName] = value;
        const newStyle = MxGraphSerializer.jsonToStyle(currentStyle);
        this._mxCell.setStyle(newStyle);
        this._mxGraph.view.removeState(this._mxCell);
        this._mxGraph.view.refresh();

      });

      this._rtStyles.on("remove", e => {
        const styleName = e.key;
        const currentStyle = MxGraphSerializer.styleToJson(this._mxCell.style);
        delete currentStyle.styles[styleName];
        const newStyle = MxGraphSerializer.jsonToStyle(currentStyle);
        this._mxCell.setStyle(newStyle);
        const old = mxGraphView.prototype.updateStyle;
        mxGraphView.prototype.updateStyle = true;
        this._mxGraph.view.refresh();
        mxGraphView.prototype.updateStyle = old;
      });


      this._rtClasses = this._rtCell.get("classes");
      this._rtClasses.on("insert", e => {
        const className = e.value.value();
        const currentStyle = MxGraphSerializer.styleToJson(this._mxCell.style);
        currentStyle.classes.push(className);
        const newStyle = MxGraphSerializer.jsonToStyle(currentStyle);
        this._mxCell.setStyle(newStyle);
        this._mxGraph.view.removeState(this._mxCell);
        this._mxGraph.view.refresh();
      });

      this._rtClasses.on("remove", e => {
        const className = e.value.value();
        const currentStyle = MxGraphSerializer.styleToJson(this._mxCell.style);
        const index = currentStyle.classes.indexOf(className);
        currentStyle.classes.splice(index, 1);
        const newStyle = MxGraphSerializer.jsonToStyle(currentStyle);
        this._mxCell.setStyle(newStyle);
        this._mxGraph.view.removeState(this._mxCell);
        this._mxGraph.view.refresh();
      });
    }
  }
}