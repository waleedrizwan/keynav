// Runs in the page's own JS world before any page script.
// Tags elements that register click-type listeners, so JS-only buttons
// (divs with handlers, no <button>/<a>) can be found later.
(() => {
  const TYPES = new Set([
    'click',
    'mousedown',
    'mouseup',
    'pointerdown',
    'pointerup',
    'touchstart',
  ]);
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    try {
      if (
        TYPES.has(type) &&
        this instanceof Element &&
        this !== document.documentElement &&
        this !== document.body
      ) {
        this.setAttribute('data-keynav-click', '');
      }
    } catch (_) {}
    return orig.call(this, type, listener, options);
  };
})();
