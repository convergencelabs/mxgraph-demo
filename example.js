const sourceElement = document.getElementById("source");

const sourceModel = MxGraphSerializer.jsonToMxGraphModel(JSON_GRAPH);
const sourceGraph = new mxGraph(sourceElement, sourceModel);


const targetModel = MxGraphSerializer.jsonToMxGraphModel(JSON_GRAPH);

const targetElement = document.getElementById("target");

const targetGraph = new mxGraph(targetElement, targetModel);


const binder = new MxGraphBinder(sourceGraph);
