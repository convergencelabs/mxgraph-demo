class ConvergenceCollaborationController {
  constructor(url) {
    this._domain = null;
    this._url = url
  }

  connect(displayName) {
    return Convergence
      .connectAnonymously(this._url, displayName)
      .then(domain => {
        this._domain = domain;
      });
  }

  createEditorController(modelId) {
    return new ConvergenceEditorController(this._domain, modelId);
  }
}

class ConvergenceEditorController {
  static COLLECTION_ID = "mxgraph";

  constructor(domain, modelId) {
    this._domain = domain;
    this._modelId = modelId;
  }

  init() {
    return Promise
      .all([this._openModel(), this._joinActivity(), this._joinChat])
      .then(() => {

        const mxModel = MxGraphModelDeserializer.jsonToMxGraphModel(this._model.root().value());

        const editor = new Editor(urlParams['chrome'] === '0', {}, mxModel);
        const ui = new EditorUi(editor);

        setTimeout(() => editor.graph.view.refresh(), 0);

        this._modelAdapter = new MxGraphAdapter(editor.graph, this._model.root());
        this._pointerManager = new MxGraphCollaborativePointerManager(editor.graph, this._activity, this._activityColorManager);
        this._selectionManager = new MxGraphCollaborativeSelectionManager(editor.graph, this._activity, this._activityColorManager, this._modelAdapter);

        this._presenceList = new PresenceList({
          activity: this._activity,
          colorManager: this._activityColorManager
        });
        document.getElementById("presence").appendChild(this._presenceList.getElement());
      });
  }

  _openModel() {
    return this._domain
      .models()
      .openAutoCreate({
        id: this._modelId,
        collection: ConvergenceEditorController.COLLECTION_ID,
        ephemeral: false,
        data: MxGraphModelSerializer.modelToJson(new mxGraphModel())
      })
      .then(model => {
        this._model = model;
      });
  }

  _joinActivity() {
    return this._domain
      .activities()
      .join("mxgraph.project.:" + this._modelId)
      .then((activity) => {
        this._activity = activity;
        this._activityColorManager = new ActivityColorManager(activity);
      });
  }

  _joinChat() {
    const id = "mxgraph.project.:" + this._modelId;
    return this._domain.chat()
      .create({id, type: "room", membership: "public", ignoreExistsError: true})
      .then((chatId) => {
        return this._domain.chat().join(chatId);
      })
      .then(function (room) {
        this._room = room
      });
  }
}
