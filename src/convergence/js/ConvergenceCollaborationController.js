class ConvergenceCollaborationController {

  static GRAPH_PARAM = "diagram";

  static FIRST_NAMES = [
    "Timid", "Crazy", "Slick", "Sly", "Ingenious", "Furious",
    "Big", "Little", "Giant", "Tiny", "Mighty", "Fearsome"
  ];
  static LAST_NAMES = [
    "Bear", "Dog", "Octopus", "Flamingo", "Kitten", "Kangaroo",
    "Aardvark", "Alligator", "Dolphin", "Elephant", "Badger", "Giraffe",
  ];

  static generateUserName() {
    const fName = Math.floor(Math.random() * ConvergenceCollaborationController.FIRST_NAMES.length);
    const lName = Math.floor(Math.random() * ConvergenceCollaborationController.LAST_NAMES.length);
    return ConvergenceCollaborationController.FIRST_NAMES[fName] +
      " " +
      ConvergenceCollaborationController.LAST_NAMES[lName];
  }

  static _getGraphId() {
    const url = new URL(location.href);
    let id = url.searchParams.get(ConvergenceCollaborationController.GRAPH_PARAM);
    if (!id) {
      id = ConvergenceCollaborationController._createUUID();
      url.searchParams.append(ConvergenceCollaborationController.GRAPH_PARAM, id);
      window.history.pushState({}, "", url.href);
    }
    return id;
  }

  static _createUUID() {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
  }

  static newWindowWithGraph() {
    window.open(window.location.href, "_blank");
  }

  constructor(url) {
    this._domain = null;
    this._url = url
  }

  connect() {
    const displayName = ConvergenceCollaborationController.generateUserName();
    return Convergence
      .connectAnonymously(this._url, displayName)
      .then(domain => {
        this._domain = domain;
      });
  }

  createEditorController() {
    return new ConvergenceEditorController(this._domain, ConvergenceCollaborationController._getGraphId());
  }
}

class ConvergenceEditorController {

  constructor(domain, modelId) {
    this._domain = domain;
    this._modelId = modelId;
    this._room = null;
    this._activity = null;
    this._activityColorManager = null;
  }

  init() {
    return Promise
      .all([this._openModel(), this._joinActivity(), this._joinChat()])
      .then(() => {
        const mxModel = MxGraphModelDeserializer.jsonToMxGraphModel(this._model.root().value());
        const editor = new Editor(urlParams['chrome'] === '0', {}, mxModel);

        const overviewContainer = document.createElement("div");
        overviewContainer.className = "collab-overview-container";
        EditorUi.prototype.createSidebarFooterContainer = () => {
          return overviewContainer;
        };
        EditorUi.prototype.sidebarFooterHeight = 200;

        const ui = new EditorUi(editor);

        ui.handleError = (e) => {
          console.error(e);
        };

        setTimeout(() => editor.graph.view.refresh(), 0);

        this._modelAdapter = new MxGraphAdapter(editor.graph, this._model.root());
        this._pointerManager = new MxGraphCollaborativePointerManager(editor.graph, this._activity, this._activityColorManager);
        this._selectionManager = new MxGraphCollaborativeSelectionManager(editor.graph, this._activity, this._activityColorManager, this._modelAdapter);

        this._presenceList = new PresenceList({
          activity: this._activity,
          colorManager: this._activityColorManager
        });
        document.getElementById("presence").appendChild(this._presenceList.getElement());

        this._chatControl = new ChatControl({
          room: this._room,
          username: this._domain.session().user().displayName,
          sessionId: this._domain.session().sessionId(),
          colorManager: this._activityColorManager
        });

        document.body.appendChild(this._chatControl.getElement());

        this._overview = new Overview({
          graph: editor.graph,
          activity: this._activity,
          colorManager: this._activityColorManager
        });
        overviewContainer.appendChild(this._overview.getElement());

        const shareControls = new ShareControls({id: this._modelId});
        ui.toolbarContainer.appendChild(shareControls.getElement());
      });
  }

  _openModel() {
    return this._domain
      .models()
      .openAutoCreate({
        id: this._modelId,
        collection: MxGraphConfig.COLLECTION_ID,
        ephemeral: true,
        data: MxGraphModelSerializer.modelToJson(new mxGraphModel())
      })
      .then(model => {
        this._model = model;
      });
  }

  _joinActivity() {
    return this._domain
      .activities()
      .join("mxgraph.project." + this._modelId)
      .then((activity) => {
        this._activity = activity;
        this._activityColorManager = new ActivityColorManager(activity);
      });
  }

  _joinChat() {
    const id = "mxgraph.project." + this._modelId;
    return this._domain.chat()
      .create({id, type: "room", membership: "public", ignoreExistsError: true})
      .then((chatId) => {
        return this._domain.chat().join(chatId);
      })
      .then((room) => {
        this._room = room;
      });
  }


}
