/**
 * This is an example file that will configure the demo app to point to
 * the proper convergence server. To configure the demo do the following:
 *
 * 1. Copy this file and name it 'mxgraph.config.js'.
 *
 * 2. Update the CONVERGENCE_URL to point to you Convergence server and domain.
 */
const MxGraphConfig = {
  CONVERGENCE_URL: 'http://localhost:8000/realtime/convergence/default',
  COLLECTION_ID: "mxgraph"
};

window.MxGraphConfig = MxGraphConfig;