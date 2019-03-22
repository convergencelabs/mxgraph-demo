class MxCellAdapter {

  constructor(mxCell, rtCell, graph, eventEmitter) {
    this._mxCell = mxCell;
    this._rtCell = rtCell;
    this._fireEvent = eventEmitter;
    this._mxGraph = graph;

    this._initCell();
    this._initRtGeometry();
    this._initStyle();
  }

  processChange(change) {
    if (change instanceof mxTerminalChange) {
      this._localTerminalChanged(change);
    } else if (change instanceof mxGeometryChange) {
      this._localGeometryChanged(change)
    } else if (change instanceof mxStyleChange) {
      this._localStyleChanged(change);
    } else if (change instanceof mxValueChange) {
      this._localValueChanged(change)
    } else if (change instanceof mxCollapseChange) {
      console.warn("cell collapsed changed", change);
    } else if (change instanceof mxVisibleChange) {
      console.warn("cell visible changed", change);
    }
  }

  _localGeometryChanged(change) {
    const {geometry} = change;
    const geometryJson = MxGraphModelSerializer.geometryToJson(geometry);
    this._rtGeometry.value(geometryJson);
    this._fireEvent("onCellGeometryChanged", {cell: this._mxCell});
  }

  _localValueChanged(change) {
    const {value} = change;
    this._rtCell.set("value", value);
  }

  _localTerminalChanged(change) {
    const {source, terminal, previous} = change;
    const prop = source ? "source" : "target";

    if (terminal !== previous) {
      const value = terminal !== null ? terminal.getId() : null;
      this._rtCell.set(prop, value);
    }

    this._fireEvent("onCellTerminalChanged", {cell: this._mxCell});
  }

  _localStyleChanged(change) {
    const {previous, style} = change;
    const oldStyle = MxGraphModelSerializer.styleToJson(previous);
    const newStyle = MxGraphModelSerializer.styleToJson(style);

    // check for lazy style initialization
    if (!this._rtStyle) {
      this._rtCell.set("style", newStyle);
      this._initStyle();
    } else {
      const diff = this._diffStyles(newStyle, oldStyle);
      this._applyStyleChanges(diff);
    }

    this._fireEvent("onCellStyleChanged", {cell: this._mxCell});
  }

  _diffStyles(newStyles, oldStyles) {
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

  _applyStyleChanges(styleDiff) {
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

  _initCell() {
    this._rtCell.on("set", e => {
      switch (e.key) {
        case "target":
          const targetId = e.value.value();
          const target = targetId === null ? null : this._mxGraph.model.cells[targetId];
          this._mxCell.setTerminal(target, false);
          this._mxGraph.view.refresh();
          this._fireEvent("onCellTerminalChanged", {cell: this._mxCell});
          break;
        case "source":
          const sourceId = e.value.value();
          const source = sourceId === null ? null : this._mxGraph.model.cells[sourceId];
          this._mxCell.setTerminal(source, true);
          this._mxGraph.view.refresh();
          this._fireEvent("onCellTerminalChanged", {cell: this._mxCell});
          break;
        case "style":
          this._initStyle();
          const newStyle = MxGraphModelDeserializer.jsonToStyle(this._rtStyle.value());
          this._mxCell.setStyle(newStyle);
          this._fireEvent("onCellStyleChanged", {cell: this._mxCell});
          break;
        case "value":
          const value = e.value.value();
          this._mxCell.setValue(value);
          this._mxGraph.view.refresh();
          break;
      }
    });
  }

  _initRtGeometry() {
    if (this._rtCell.hasKey("geometry")) {
      this._rtGeometry = this._rtCell.get("geometry");
      this._rtGeometry.on("value", () => {
        const mxGeometry = MxGraphModelDeserializer.jsonToGeometry(this._rtGeometry.value());
        this._mxCell.setGeometry(mxGeometry);
        this._mxGraph.view.refresh();
        setTimeout(() => {
          this._fireEvent("onCellGeometryChanged", {cell: this._mxCell});
        }, 0);
      });
    }
  }

  _initStyle() {
    if (this._rtCell.hasKey("style")) {
      this._rtStyle = this._rtCell.get("style");

      this._rtStyles = this._rtStyle.get("styles");
      this._rtStyles.on("set", e => {
        this._mutateStyle((cellStyle) => {
          const styleName = e.key;
          cellStyle.styles[styleName] = e.value.value();
        });
      });

      this._rtStyles.on("remove", e => {
        this._mutateStyle((cellStyle) => {
          const styleName = e.key;
          delete cellStyle.styles[styleName];
        });
      });

      this._rtClasses = this._rtCell.get("classes");
      this._rtClasses.on("insert", e => {
        this._mutateStyle((cellStyle) => {
          const className = e.value.value();
          cellStyle.classes.push(className);
        });
      });

      this._rtClasses.on("remove", e => {
        this._mutateStyle((cellStyle) => {
          const className = e.value.value();
          const index = cellStyle.classes.indexOf(className);
          cellStyle.classes.splice(index, 1);
        });
      });
    }
  }

  _mutateStyle(mutate) {
    const cellStyle = MxGraphModelSerializer.styleToJson(this._mxCell.style);
    mutate(cellStyle);
    const newStyle = MxGraphModelDeserializer.jsonToStyle(cellStyle);
    this._mxCell.setStyle(newStyle);
    this._mxGraph.view.removeState(this._mxCell);
    this._mxGraph.view.refresh();
    this._fireEvent("onCellStyleChanged", {cell: this._mxCell});
  }
}