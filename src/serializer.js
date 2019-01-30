class MxGraphSerializer {

  //
  // To JSON
  //

  /**
   *
   * @param graph
   */
  static graphToJson(graph) {
    return MxGraphSerializer.modelToJson(graph.model);
  }

  /**
   *
   * @param {mxGraphModel} model
   */
  static modelToJson(model) {
    const cells = [];
    Object.keys(model.cells).forEach(cellId => {
      const cell = model.cells[cellId];
      cells.push(MxGraphSerializer.cellToJson(cell));
    });

    const result = {
      cells
    };

    return result;
  }

  /**
   *
   * @param {mxCell} cell
   * @returns *
   */
  static cellToJson(cell) {
    const result = {
      id: cell.id
    };

    if (cell.style !== undefined) {
      result.style = MxGraphSerializer.styleToJson(cell.style);
    }

    if (cell.value !== undefined) {
      result.value = MxGraphSerializer.valueToJson(cell.value);
    }

    if (cell.geometry !== undefined) {
      result.geometry = MxGraphSerializer.geometryToJson(cell.geometry);
    }

    if (cell.connectable !== undefined) {
      result.connectable = cell.connectable;
    }

    if (cell.visible !== undefined) {
      result.visible = cell.visible;
    }

    if (cell.collapsed !== undefined) {
      result.collapsed = cell.collapsed;
    }

    if (cell.edge) {
      result.edge = true;
    }

    if (cell.vertex) {
      result.vertex = true;
    }

    if (cell.parent) {
      result.parent = cell.parent.id;
    }

    if (cell.source) {
      result.source = cell.source.id;
    }

    if (cell.target) {
      result.target = cell.target.id;
    }

    return result;
  }

  static resolveCellId(cell) {
    return cell ? cell.id : null;
  }

  static geometryToJson(geometry) {
    if (geometry instanceof mxGeometry) {
      let result = {
        type: "g",
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height
      };

      if (geometry.points) {
        result.points = points.map(p => MxGraphSerializer.pointToJson(p));
      }

      if (geometry.sourcePoint) {
        result.sourcePoint = MxGraphSerializer.pointToJson(geometry.sourcePoint);
      }

      if (geometry.targetPoint) {
        result.targetPoint = MxGraphSerializer.pointToJson(geometry.targetPoint);
      }

      if (geometry.relative !== undefined) {
        result.relative = geometry.relative ? true : false;
      }

      result.offset = geometry.offset;

      return result;
    } else if (geometry instanceof mxRectangle) {
      return {
        type: "r",
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
      };
    } else if (geometry instanceof mxPoint) {
      return MxGraphSerializer.pointToJson(geometry);
    }
  }

  static pointToJson(geometry) {
    return {
      type: "p",
      x: geometry.x,
      y: geometry.y
    };
  }

  /**
   *
   * @param {string} style
   */
  static styleToJson(style) {
    const result = {
      classes: [],
      styles: {}
    };

    if (style) {
      const styles = style.split(";");
      styles.forEach(s => {
        if (s.includes("=")) {
          const [key, value] = s.split("=");
          result.styles[key] = value;
        } else {
          result.classes.push(s);
        }
      });
    }

    return result;
  }

  static valueToJson(value) {
    // TODO handle an xml node.
    return value;
  }

  //
  // From JSON
  //

  static jsonToMxGraphModel(json) {
    const cells = json.cells.slice(0);
    const rootJson = cells.shift();

    const rootCell = MxGraphSerializer.jsonToMxCell(rootJson, undefined);
    const model = new mxGraphModel(rootCell);
    cells.forEach(cellJson => {
      const cell = MxGraphSerializer.jsonToMxCell(cellJson, model);
      model.cellAdded(cell);
    });

    return model;
  }

  /**
   *
   * @param json
   * @param {mxGraphModel} model
   */
  static jsonToMxCell(json, model) {
    const value = MxGraphSerializer.jsonToValue(json.value);
    const style = MxGraphSerializer.jsonToStyle(json.style);
    const geometry = MxGraphSerializer.jsonToGeometry(json.geometry);

    const cell = new mxCell(value, geometry, style);

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

    if (json.visible !== undefined) {
      cell.setVisible(json.visible);
    }

    if (json.vertex === true) {
      cell.setVertex(true);
    }

    if (json.edge === true) {
      cell.setEdge(true);
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
      style += key + "=" + value;
    });

    return style;
  }

  static jsonToGeometry(jsonGeometry) {
    if (!jsonGeometry) {
      return;
    }

    switch (jsonGeometry.type) {
      case "p":
        return MxGraphSerializer.jsonToPoint(jsonGeometry);
      case "r":
        return new mxRectangle(jsonGeometry.x, jsonGeometry.y, jsonGeometry.width, jsonGeometry.height);
      case "g":
        const result = new mxGeometry(jsonGeometry.x, jsonGeometry.y, jsonGeometry.width, jsonGeometry.height);

        if (jsonGeometry.points) {
          result.points = jsonGeometry.points.map(p => MxGraphSerializer.jsonToPoint(p));
        }

        if (jsonGeometry.sourcePoint) {
          result.setTerminalPoint(MxGraphSerializer.jsonToPoint(jsonGeometry.sourcePoint), true);
        }

        if (jsonGeometry.targetPoint) {
          result.setTerminalPoint(MxGraphSerializer.jsonToPoint(jsonGeometry.targetPoint), false);
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
