class UiComponent {

  constructor(tag, className, id) {
    this._el = $(`<${tag} />`, {class: className, id: id});
  }

  getElement() {
    return this._el[0];
  }

  dispose() {
    this._el.remove();
  }

  _init() {

  }
}
