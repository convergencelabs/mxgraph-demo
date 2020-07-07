class Overview extends UiComponent {

  constructor(options) {
    super("div", 'presence-pane');
    this._options = options;
    this._viewports = {};

    this._init();
  }

  _init() {

    const title = $("<div class='overview-title'>Overview</div>");
    this._el.append(title);

    this._overview = $("<div />", {class: "mx-overview"});
    this._el.append(this._overview);

    this._outline = new mxOutline(this._options.graph, this._overview[0]);

    setTimeout(() => {
      const participants = this._options.activity.participants().sort((a, b) => a.local ? -1 : 1);
      participants.forEach((participant) => {
        if (!participant.local) {
          this._addSession(participant);
        }
      });

      this._options.activity.on("session_joined", (e) => {
        this._addSession(e.participant);
      });

      this._options.activity.on("session_left", (e) => {
        this._removeSession(e.sessionId);
      });

      this._options.activity.on("state_set", (e) => {
        if (!e.local) {
          const sessionId = e.sessionId;
          const participant = this._options.activity.participant(sessionId);
          this._updateViewport(participant);
        }
      });

      const updateHandler = (e) => {
        const graph = this._options.graph;
        const view = graph.view;
        const scale = view.scale;

        const scrollLeft = graph.container.scrollLeft;
        const scrollTop = graph.container.scrollTop;

        const translate = view.translate;
        const x = Math.round((scrollLeft - translate.x * scale) / scale);
        const y = Math.round((scrollTop - translate.y * scale) / scale);
        const height = graph.container.clientHeight / scale;
        const width = graph.container.clientWidth / scale;

        this._options.activity.setState("viewport", {x, y, height, width})
      };

      const view = this._options.graph.getView();
      mxEvent.addListener(this._options.graph.container, 'scroll', updateHandler);
      view.addListener(mxEvent.SCALE, updateHandler);
      view.addListener(mxEvent.TRANSLATE, updateHandler);
      view.addListener(mxEvent.SCALE_AND_TRANSLATE, updateHandler);
    }, 0);
  }

  _addSession(participant) {
    const color = this._options.colorManager.color(participant.user.username);
    const viewport = new mxRectangleShape(new mxRectangle(0, 0, 10, 10), "none", color);
    viewport.dialect = this._outline.outline.dialect;
    const container = this._outline.outline.getView().getOverlayPane()
    viewport.init(container);

    this._viewports[participant.sessionId] = viewport;

    this._updateViewport(participant);
  }

  _removeSession(sessionId) {
    const viewport = this._viewports[sessionId];
    viewport.destroy();
    delete this._viewports[sessionId];
  }

  _updateViewport(participant) {
    const viewport = this._viewports[participant.sessionId];

    if (participant.state.has("viewport")) {
      const bounds = participant.state.get("viewport");
      const scale = this._outline.outline.view.scale;
      const translate = this._outline.outline.view.translate;
      const x = Math.round((bounds.x + translate.x) * scale);
      const y = Math.round((bounds.y + translate.y) * scale);
      const height = Math.round(bounds.height * scale);
      const width = Math.round(bounds.width * scale);

      viewport.bounds = new mxRectangle(x, y, width, height);

      //viewport.node.style.visibility = "visible";
      viewport.redraw();
    } else {
      //viewport.node.style.visibility = "hidden";
    }
  }
}

