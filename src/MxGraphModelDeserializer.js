class MxGraphModelDeserializer {

  /**
   *
   * @param json
   * @return {mxGraphModel}
   */
  static jsonToMxGraphModel(json) {
    const cells = {...json.cells};
    const rootJson = cells[json.root];
    delete cells[json.root];

    const deferredCellsByParent = {};

    const rootCell = MxGraphModelDeserializer.jsonToMxCell(json.root, rootJson, undefined);

    const model = new mxGraphModel();
    model.createIds = false;

    model.setRoot(rootCell);

    Object.keys(cells).forEach(cellId => {

      const cellJson = cells[cellId];
      const parentCell = model.getCell(cellJson.parent);
      if (parentCell !== null) {
        const cell = MxGraphModelDeserializer.jsonToMxCell(cellId, cellJson, model);
        model.cellAdded(cell);

        const deferredChildren = deferredCellsByParent[cellJson.parent];
        if (deferredChildren) {
          deferredChildren.forEach(deferredChild => {
            const deferredCell = MxGraphModelDeserializer.jsonToMxCell(deferredChild.id, deferredChild.cell, model);
            model.cellAdded(deferredCell);
          })
        }

      } else {
        const deferredChildren = deferredCellsByParent[cellJson.parent] || [];
        deferredCellsByParent[cellJson.parent] = [...deferredChildren, {id: cellId, cell: cellJson}];
      }
    });

    return model;
  }

  /**
   * @param id
   * @param json
   * @param {mxGraphModel} model
   */
  static jsonToMxCell(id, json, model) {
    const value = MxGraphModelDeserializer.jsonToValue(json.value);
    const style = MxGraphModelDeserializer.jsonToStyle(json.style);
    const geometry = MxGraphModelDeserializer.jsonToGeometry(json.geometry);

    const cell = new mxCell(value, geometry, style);
    cell.setId(id);

    if (json.parent) {
      const parent = model.getCell(json.parent);
      parent.insert(cell);
    }

    if (json.source) {
      const source = model.getCell(json.source);
      source.insertEdge(cell, true);
    }

    if (json.target) {
      const target = model.getCell(json.target);
      target.insertEdge(cell, false);
    }

    if (json.collapsed !== undefined) {
      cell.setCollapsed(json.collapsed);
    }

    if (json.connectable !== undefined) {
      cell.setConnectable(json.connectable);
    }

    if (json._visible !== undefined) {
      cell.setVisible(json._visible);
    }

    if (json.vertex === true) {
      cell.setVertex(true);
    }

    if (json.edge === true) {
      cell.setEdge(true);
    }

    if (json.style !== undefined) {
      cell.setStyle(MxGraphModelDeserializer.jsonToStyle(json.style));
    }

    return cell;
  }

  static jsonToValue(jsonValue) {
    // TODO handle an xml node.
    return jsonValue;
  }

  static jsonToStyle(jsonStyle) {
    if (jsonStyle === undefined) {
      return;
    }

    let style = "";
    jsonStyle.classes.forEach(className => {
      style += className + ";";
    });

    Object.keys(jsonStyle.styles).forEach(key => {
      const value = jsonStyle.styles[key];
      style += key + "=" + value + ";";
    });

    return style;
  }

  static jsonToGeometry(jsonGeometry) {
    if (!jsonGeometry) {
      return;
    }

    switch (jsonGeometry.type) {
      case "p":
        return MxGraphModelDeserializer.jsonToPoint(jsonGeometry);
      case "r":
        return new mxRectangle(jsonGeometry.x, jsonGeometry.y, jsonGeometry.width, jsonGeometry.height);
      case "g":
        const result = new mxGeometry(jsonGeometry.x, jsonGeometry.y, jsonGeometry.width, jsonGeometry.height);

        if (jsonGeometry.points) {
          result.points = jsonGeometry.points.map(p => MxGraphModelDeserializer.jsonToPoint(p));
        }

        if (jsonGeometry.sourcePoint) {
          result.setTerminalPoint(MxGraphModelDeserializer.jsonToPoint(jsonGeometry.sourcePoint), true);
        }

        if (jsonGeometry.targetPoint) {
          result.setTerminalPoint(MxGraphModelDeserializer.jsonToPoint(jsonGeometry.targetPoint), false);
        }

        result.relative = jsonGeometry.relative ? 1 : 0;

        result.offset = jsonGeometry.offset;

        return result;
      default:
        throw new Error("Unknown geometry type: " + jsonGeometry.type);
    }
  }

  static jsonToPoint(jsonPoint) {
    return new mxPoint(jsonPoint.x, jsonPoint.y);
  }
}
