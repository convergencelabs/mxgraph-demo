class MxGraphModelSerializer {

  /**
   *
   * @param graph
   */
  static graphToJson(graph) {
    return MxGraphModelSerializer.modelToJson(graph.model);
  }

  /**
   *
   * @param {mxGraphModel} model
   */
  static modelToJson(model) {
    const cells = {};

    Object.keys(model.cells).forEach(cellId => {
      const cell = model.cells[cellId];
      cells[cellId] = MxGraphModelSerializer.cellToJson(cell);
    });

    const root = model.root.id;

    const result = {
      root,
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
      result.style = MxGraphModelSerializer.styleToJson(cell.style);
    }

    if (cell.value !== undefined) {
      result.value = MxGraphModelSerializer.valueToJson(cell.value);
    }

    if (cell.geometry !== undefined) {
      result.geometry = MxGraphModelSerializer.geometryToJson(cell.geometry);
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
        result.points = geometry.points.map(p => MxGraphModelSerializer.pointToJson(p));
      }

      if (geometry.sourcePoint) {
        result.sourcePoint = MxGraphModelSerializer.pointToJson(geometry.sourcePoint);
      }

      if (geometry.targetPoint) {
        result.targetPoint = MxGraphModelSerializer.pointToJson(geometry.targetPoint);
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
      return MxGraphModelSerializer.pointToJson(geometry);
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
        } else if (s.trim().length > 0) {
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
}
