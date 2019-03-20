class LoginDialog extends UiComponent {

  constructor() {
    super("div", "login-dialog", "login");
    this.inProgress = false;
  }

  _init() {
    this._el.append(`
      <div class="logo">
       <img alt="logo" src="assets/img/cl_logo.png">
       <h1>Convergence Diagram Editor</h1>
      </div>
    `);

    const fields = $('<div>', {class: "login-fields"});
    fields.append('<label>Username</label>');
    this.username = $('<input>', {type: "text", class: "username", autofocus: true});
    this.username.keyup(this.setFieldEnablement.bind(this));
    this.username.keydown((event) => {
      if (event.key === "Enter") {
        this.login();
      }
    });

    fields.append(this.username);
    this._el.append(fields);

    this._el.append('<div class="hint">(Any username will work)</div>');
    this._el.append('<div class="error"></div>');

    const buttons = $('<div>', {class: "login-buttons"});
    this.loginButton = $('<button type="submit" disabled><span>Login</span></button>');
    this.loginButton.click(this.login.bind(this));
    buttons.append(this.loginButton);
    this._el.append(buttons);
    document.body.appendChild(this.el);
  }

  setFieldEnablement() {
    this.loginButton.prop('disabled', this.username.val().length <= 0 || this.inProgress);
    this.username.prop('disabled', this.inProgress);
  }

  login() {
    this.inProgress = true;
    this.setFieldEnablement();

    const username = this.username.val();
    Convergence.connectAnonymously(DiagramEditorConfig.DOMAIN_URL, username)
      .then((domain) => {
        this._el.remove();
        this._options.onLogin(domain);
      })
      .catch(() => {
        this._el.find('.error').html('Authentication failed');
        this.inProgress = false;
        this.setFieldEnablement();
      });
  }
}
