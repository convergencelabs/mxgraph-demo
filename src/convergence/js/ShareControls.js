class ShareControls extends UiComponent {

  constructor(options) {
    super("div", "share-controls", "share-controls");
    this._options = options;
    this._init();
  }

  _init() {
    this._share = $('<span class="geButton" title="Get a Shareable Link"><i class="fa fa-share-square"></i></span>');
    this._el.append(this._share);
    this._share.on("click", () => {
      const el = document.createElement('textarea');
      el.value = window.location.href;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      const selected =
        document.getSelection().rangeCount > 0
          ? document.getSelection().getRangeAt(0)
          : false;
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
      }

      toastr["success"]("URL Copied");
      toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "showDuration": "300",
        "hideDuration": "500",
        "timeOut": "2000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
      };
    });


    this._new = $('<span class="geButton" title="Open Diagrm in a New Window"><i class="fa fa-external-link-alt"></i></span>');
    this._el.append(this._new);
    this._new.on("click", () => {
      window.open(window.location.href, "_blank");
    });
  }
}
