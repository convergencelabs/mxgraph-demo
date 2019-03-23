<img src="logo.png" height="75"/>

# Convergence mxGraph Demonstration
This project demonstrates collaborative diagram editing using the [mxGraph](https://github.com/jgraph/mxgraph) open source diagraming framework integrated with [Convergence](https://convergence.io). This example is based off of the [Graph Editor Example](https://github.com/jgraph/mxgraph/tree/master/javascript/examples/grapheditor) that comes with mxGraph. It has been extended and integrated with Convergence to provide realtime editing, shared cursors, shared selection, and viewport awareness. The example also leverages Convergence to provide a participant list and a chat room per diagram.

The project uses `lite-server` to provide a minimal web server for hosting the example. The `lite-server` instance maps the `node_modules` directory and the configuration file into the appropriate places for running the example.

## Dependencies

* npm >= 6.0
* node >= 10.0
* mxGraph >= 3.9
* convergence >= 1.0.0-rc.1

## Running the Demo

* `npm install`
* Create a configuration file by following the instructions in the `mxgraph.config.example.js` file.
* `npm start`
* Open your browser to `http://localhost:8000` 