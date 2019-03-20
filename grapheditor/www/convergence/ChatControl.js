class ChatControl extends UiComponent {

  constructor() {
    super("div", "chat-control", "chat");
  }

  _init() {
    const {filter} = rxjs.operators;

    this._open = false;

    this._unread = 0;

    this._badge = $('<div>', {class: "chat-badge"});
    this._badge.css("visibility", "hidden");
    this._el.append(this._badge);

    this._chatIcon = $("<i>", {class: "chat-icon fa fa-comments", "aria-hidden": true});
    this._chatIcon.on("click", () => this._toggle());
    this._el.append(this._chatIcon);

    this._chatWindow = new ChatWindow({
      room: this._options.room,
      username: this._options.username,
      sessionId: this._options.sessionId,
      colorManager: this._options.colorManager,
      onClose: this.toggle.bind(this)
    });

    this._el.append(this._chatWindow._el);

    this._options.room.events()
      .pipe(filter((e) => e.name === "message"))
      .subscribe(() => {
        if (!this._open) {
          this._unread++;
          this._badge.text(this._unread);
          this._badge.css("visibility", "visible");
        }
      });
  }

  _toggle() {
    this._open = !this._open;
    if (this._open) {
      this._badge.text("");
      this._unread = 0;
      this._badge.css("visibility", "hidden");
      this._chatIcon.addClass("chat-icon-open");
    } else {
      this._chatIcon.removeClass("chat-icon-open");
    }
    this._chatWindow.toggle();
  }
}

class ChatWindow extends UiComponent {
  constructor(options) {
    super("div", "chat-window");
    this._visible = false;
    this._options = options;
  }

  _init() {
    this.setVisible(false);

    const title = $("<div>", {class: "chat-window-title"}).text("Chat Messages");
    const close = $("<i>", {class: "chat-window-close fa fa-times"});
    close.click(this._onClose);
    title.append(close);
    this._el.append(title);

    this._messagePane = new ChatMessagePane({
      username: this._options.username,
      color: this._options.colorManager.color(this._options.sessionId),
      colorManager: this._options.colorManager,
      room: this._options.room
    });
    this._el.append(this._messagePane._el);

    this._messageInput = new ChatMessageInput({
      chatWindow: this
    });
    this._el.append(this._messageInput._el);
  }

  toggle() {
    this._visible = !this._visible;
    this.setVisible(this._visible);
  }

  setVisible(visible) {
    this._el.css("visibility", visible ? "visible" : "hidden");
  }

  sendMessage(message) {
    this._options.room.send(message);
    this._messagePane._appendLocalMessage(message);
  }
}

class ChatMessagePane extends UiComponent {

  constructor(options) {
    super("div", "chat-messages");

    this._options = options;
  }

  _init() {
    const {filter} = rxjs.operators;
    this._options.room
      .events()
      .pipe(filter((e) => e.name === "message"))
      .subscribe((e) => {
        this._appendRemoteMessage(
          e.message,
          e.user,
          e.timestamp,
          this._options.colorManager.color(e.sessionId))
      });
  }

  _appendRemoteMessage(message, user, timestamp, color) {
    const displayName = user.displayName ? user.displayName : user.username;
    const msg = new ChatMessage({
      message: message,
      username: displayName,
      timestamp: timestamp,
      color: color
    });
    this._append(msg);

  }

  _appendLocalMessage(message) {
    const user = this._options.room.session().user();
    const displayName = user.displayName ? user.displayName : user.username;
    const msg = new ChatMessage({
      message: message,
      timestamp: new Date().getTime(),
      username: displayName,
      color: self.options.color
    });
    this._append(msg);
  }

  _append(message) {
    this._el.append(message._el);
    this._el.scrollTop(this._el[0].scrollHeight);
  }
}

class ChatMessage extends UiComponent {
  constructor() {
    super("div", "chat-message");
  }

  _init() {
    const timestamp = moment(this._options.timestamp);
    this._el.css("border-left-color", this._options.color);

    const header = $('<div>', {class: "chat-header"});
    header.append($('<span>', {class: "chat-user"}).text(this._options.username));
    header.append($('<span>', {class: "chat-time"}).text(timestamp.format("h:mm a")));
    this._el.append(header);

    this._el.append($('<span>', {class: "chat-text"}).text(this._options.message));
  }
}

class ChatMessageInput extends UiComponent {
  constructor() {
    super("input", "chat-input");
  }

  _init() {
    this._el.attr("placeholder", "Type a message...");
    this._el.keypress((e) => {
      if (e.which === 13) {
        this._sendMessage(this._el.val());

        this._el.val("");
        return false;
      }
    });
  }

  _sendMessage(message) {
    this._options._chatWindow.sendMessage(message);
  }
}