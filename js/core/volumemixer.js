/* =========================================================
 * neptuneOS — Volume Mixer
 * System-tray volume control with slider and mute toggle.
 * ========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "neptuneos.sound.volume";

  function loadVolume() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) return JSON.parse(raw);
    } catch (_) {}
    return 75;
  }

  function saveVolume(v) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch (_) {}
  }

  function speakerSVG(level) {
    var fill =
      level === 0
        ? "none"
        : level < 40
          ? "#5B9BD5"
          : level < 80
            ? "#5B9BD5"
            : "#5B9BD5";
    var bars = "";
    if (level > 0 && level <= 33) {
      bars =
        '<line x1="11" y1="5" x2="11" y2="3" stroke="#eee" stroke-width="1.2" stroke-linecap="round"/>';
    } else if (level > 33 && level <= 66) {
      bars =
        '<line x1="11" y1="5" x2="11" y2="3" stroke="#eee" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M13 3.5a3.5 3.5 0 0 1 0 5" stroke="#eee" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    } else if (level > 66) {
      bars =
        '<line x1="11" y1="5" x2="11" y2="3" stroke="#eee" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M13 3.5a3.5 3.5 0 0 1 0 5" stroke="#eee" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M14.5 2a6 6 0 0 1 0 8" stroke="#eee" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    }
    var x = level === 0 ? "M4 4l6 4-6 4z" : "M4 4l6 4-6 4z";
    return (
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
      '<path d="' +
      x +
      '" fill="' +
      fill +
      '"/>' +
      bars +
      (level === 0
        ? '<line x1="12" y1="5" x2="15" y2="11" stroke="#e55" stroke-width="1.5" stroke-linecap="round"/><line x1="15" y1="5" x2="12" y2="11" stroke="#e55" stroke-width="1.5" stroke-linecap="round"/>'
        : "") +
      "</svg>"
    );
  }

  var mixer = {
    btn: null,
    popup: null,
    slider: null,
    open: false,
    volume: 75,
    muted: false,

    init: function () {
      this.volume = loadVolume();
      this.renderButton();
      this.updateIcon();
    },

    renderButton: function () {
      var tray = document.getElementById("tray");
      if (!tray) return;
      this.btn = document.createElement("button");
      this.btn.className = "tray-btn";
      this.btn.id = "volume-btn";
      this.btn.title = "Volume";
      var clockEl = document.getElementById("clock");
      if (clockEl) {
        tray.insertBefore(this.btn, clockEl);
      } else {
        tray.appendChild(this.btn);
      }
      this.btn.addEventListener(
        "click",
        function (e) {
          e.stopPropagation();
          mixer.toggle();
        }.bind(this)
      );
    },

    updateIcon: function () {
      if (!this.btn) return;
      this.btn.innerHTML = speakerSVG(this.muted ? 0 : this.volume);
    },

    toggle: function () {
      this.open ? this.close() : this.show();
    },

    show: function () {
      if (this.open) return;

      var popup = document.createElement("div");
      popup.id = "volume-popup";
      popup.style.cssText =
        "position:fixed;top:38px;right:40px;background:#1e1e2e;border:1px solid #444;border-radius:8px;padding:14px;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;gap:10px;width:48px";

      var label = document.createElement("div");
      label.style.cssText =
        "color:#aaa;font-size:10px;width:100%;text-align:center";
      label.textContent = this.volume + "%";

      var sliderWrap = document.createElement("div");
      sliderWrap.style.cssText =
        "position:relative;width:6px;height:120px;background:#333;border-radius:3px;cursor:pointer";

      var fill = document.createElement("div");
      fill.style.cssText =
        "position:absolute;bottom:0;width:100%;background:#5B9BD5;border-radius:3px;transition:height 0.1s";
      fill.style.height = this.volume + "%";

      var thumb = document.createElement("div");
      thumb.style.cssText =
        "position:absolute;width:16px;height:8px;background:#eee;border-radius:3px;left:-5px;cursor:grab;transition:bottom 0.1s";
      thumb.style.bottom = "calc(" + this.volume + "% - 4px)";

      sliderWrap.appendChild(fill);
      sliderWrap.appendChild(thumb);

      var muteBtn = document.createElement("button");
      muteBtn.style.cssText =
        "background:none;border:1px solid #555;border-radius:4px;color:#eee;padding:3px 8px;font-size:10px;cursor:pointer;width:100%";
      muteBtn.textContent = this.muted ? "Unmute" : "Mute";

      popup.appendChild(label);
      popup.appendChild(sliderWrap);
      popup.appendChild(muteBtn);
      document.body.appendChild(popup);

      this.popup = popup;
      this.slider = sliderWrap;
      this.open = true;

      var self = this;

      function setVolumeFromY(clientY) {
        var rect = sliderWrap.getBoundingClientRect();
        var pct = Math.round(
          ((rect.bottom - clientY) / rect.height) * 100
        );
        pct = Math.max(0, Math.min(100, pct));
        self.volume = pct;
        self.muted = false;
        saveVolume(pct);
        self.applyVolume();
        label.textContent = pct + "%";
        fill.style.height = pct + "%";
        thumb.style.bottom = "calc(" + pct + "% - 4px)";
        self.updateIcon();
      }

      function onSliderDown(e) {
        e.preventDefault();
        setVolumeFromY(e.clientY || e.touches[0].clientY);

        function onMove(ev) {
          setVolumeFromY(ev.clientY || (ev.touches && ev.touches[0].clientY));
        }
        function onUp() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onUp);
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchmove", onMove);
        document.addEventListener("touchend", onUp);
      }

      sliderWrap.addEventListener("mousedown", onSliderDown);
      sliderWrap.addEventListener("touchstart", onSliderDown, { passive: false });

      muteBtn.addEventListener("click", function () {
        self.muted = !self.muted;
        saveVolume(self.volume);
        self.applyVolume();
        label.textContent = self.muted ? "Muted" : self.volume + "%";
        fill.style.height = (self.muted ? 0 : self.volume) + "%";
        thumb.style.bottom =
          "calc(" + (self.muted ? 0 : self.volume) + "% - 4px)";
        muteBtn.textContent = self.muted ? "Unmute" : "Mute";
        self.updateIcon();
      });

      setTimeout(function () {
        document.addEventListener("click", mixer.onOutsideClick);
      }, 0);
    },

    close: function () {
      if (this.popup && this.popup.parentNode) {
        this.popup.parentNode.removeChild(this.popup);
      }
      this.popup = null;
      this.slider = null;
      this.open = false;
      document.removeEventListener("click", mixer.onOutsideClick);
    },

    onOutsideClick: function (e) {
      if (!mixer.popup) return;
      if (!mixer.popup.contains(e.target) && e.target !== mixer.btn) {
        mixer.close();
      }
    },

    applyVolume: function () {
      if (window.OS && OS.sfx && typeof OS.sfx.setVolume === "function") {
        OS.sfx.setVolume(this.muted ? 0 : this.volume);
      }
    },
  };

  window.OS = window.OS || {};
  OS.volumemixer = mixer;
})();
