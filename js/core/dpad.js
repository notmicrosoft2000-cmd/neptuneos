/* =========================================================
 * neptuneOS — Touch D-Pad for keyboard games
 * Adds on-screen directional buttons on touch devices.
 * Attach to any game that uses arrow keys / WASD.
 * ========================================================= */
(function () {
  "use strict";

  function createDPad(opts) {
    if (!document.body.classList.contains("touch-device")) return null;

    var onDir = opts.onDir;     /* function(direction) where direction is 'up','down','left','right' */
    var onAction = opts.onAction; /* function(action) where action is 'space','pause','rotate' */
    var wrap = opts.parent;     /* parent element to append to */
    var compact = opts.compact; /* use compact layout */

    var el = document.createElement("div");
    el.className = "game-dpad" + (compact ? " dpad-compact" : "");
    el.innerHTML =
      '<div class="dpad-row">' +
      '  <button class="dpad-btn dpad-up" data-dir="up">&#9650;</button>' +
      '</div>' +
      '<div class="dpad-row">' +
      '  <button class="dpad-btn dpad-left" data-dir="left">&#9664;</button>' +
      '  <button class="dpad-btn dpad-center"></button>' +
      '  <button class="dpad-btn dpad-right" data-dir="right">&#9654;</button>' +
      '</div>' +
      '<div class="dpad-row">' +
      '  <button class="dpad-btn dpad-down" data-dir="down">&#9660;</button>' +
      '</div>';

    if (wrap) wrap.appendChild(el);

    el.querySelectorAll("[data-dir]").forEach(function (btn) {
      btn.addEventListener("touchstart", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (onDir) onDir(btn.dataset.dir);
        btn.classList.add("dpad-active");
      });
      btn.addEventListener("touchend", function (e) {
        e.preventDefault();
        btn.classList.remove("dpad-active");
      });
    });

    /* Action buttons (space / pause / rotate) */
    var actions = document.createElement("div");
    actions.className = "dpad-actions";
    if (opts.actions) {
      opts.actions.forEach(function (a) {
        var b = document.createElement("button");
        b.className = "dpad-action-btn";
        b.textContent = a.label;
        b.dataset.action = a.id;
        b.addEventListener("touchstart", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (onAction) onAction(a.id);
          b.classList.add("dpad-active");
        });
        b.addEventListener("touchend", function (e) {
          e.preventDefault();
          b.classList.remove("dpad-active");
        });
        actions.appendChild(b);
      });
    }
    el.appendChild(actions);

    return {
      el: el,
      destroy: function () { el.remove(); },
    };
  }

  window.OS = window.OS || {};
  OS.createDPad = createDPad;
})();
