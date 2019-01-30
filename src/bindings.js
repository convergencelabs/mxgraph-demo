class MxGraphBinder {

  constructor(graph) {
    graph.model.addListener(mxEvent.CHANGE, (sender, evt) => {
      const edit = evt.getProperty('edit');
      const editable = true;
      if (!this.ignoreChange && editable && !edit.ignoreEdit) {
        const changes = edit.changes;

        for (let i = 0; i < changes.length; i++) {
          this.processChange(changes[i]);
        }
      }
    });
  }

  processChange(change) {
    //console.log('processChange: ' + this.dump(change));
    if (change instanceof mxRootChange) {
      // Only process the root change that sets the current root
      // ie. ignore previous root changes
      if (change.root == this.model.root) {
        //this.getCurrentPage().mapping.initRealtime();
      }
    } else if (change instanceof mxChildChange) {
      console.log("cell child changed", change);

    } else if (change.cell != null && change.cell.id != null) {
      if (change instanceof mxTerminalChange) {
        console.log("cell terminal changed", change);
      } else if (change instanceof mxGeometryChange) {
        console.log("cell moved", change);
      } else if (change instanceof mxStyleChange) {
        console.log("cell style changed", change);
      } else if (change instanceof mxValueChange) {
        console.log("cell value changed", change);
      } else if (change instanceof mxCollapseChange) {
        console.log("cell collapsed changed", change);
      } else if (change instanceof mxVisibleChange) {
        console.log("cell visible changed", change);
      }
    }
  }
}