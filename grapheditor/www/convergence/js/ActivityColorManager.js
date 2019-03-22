class ActivityColorManager {

  static DefaultColors = ['crimson', 'gold', 'plum', 'mediumseagreen', 'cornflowerblue', 'mediumpurple', 'coral',
    'lightseagreen',
    'mediumorchid', 'aquamarine', 'lightskyblue', 'violet', 'teal', 'lightsalmon', 'orange',
    'royalblue', 'rosybrown', , 'khaki', 'mediumvioletred', 'peachpuff', 'firebrick',
    'palevioletred', 'slateblue', 'chocolate', 'darksalmon', 'forestgreen', 'deeppink', 'indianred',
    'darkmagenta', 'lightcoral', 'sandybrown', 'orangered', 'darkseagreen', 'burlywood', 'steelblue',
    'blueviolet', 'hotpink', 'tomato'];

  constructor(activity) {

    this._sessions = {};
    this._colors = ActivityColorManager.DefaultColors.slice(0);

    const {filter} = rxjs.operators;
    activity.events()
      .pipe(filter((e) => e.name === "session_joined"))
      .subscribe((e) => {
        this._addSession(e.sessionId);
      });

    activity.events()
      .pipe(filter((e) => e.name === "session_left"))
      .subscribe((e) => {
        this._removeSession(e.sessionId);
      });
  }

  color(sessionId) {
    if (this._sessions[sessionId] === undefined) {
      this._addSession(sessionId);
    }
    return this._sessions[sessionId];
  }

  _addSession(sessionId) {
    if (this._sessions[sessionId] === undefined) {
      this._sessions[sessionId] = this._nextColor();
    }
  }

  _removeSession(sessionId) {
    const color = this._sessions[sessionId];
    this._colors.push(color);
    delete this._sessions[sessionId];
  }

  _nextColor() {
    if (this._colors.length > 0) {
      return this._colors.shift();
    } else {
      return this._randomColor();
    }
  }

  _randomColor = function () {
    const hexDigit = '0123456789ABCDEF'.split('');
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += hexDigit[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}
