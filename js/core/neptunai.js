/* =========================================================
 * neptuneOS — NeptunAI Assistant
 * Actually useful tips + system info, not just sarcastic popups.
 * Only shows on click or when explicitly asked. No random popups.
 * ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "neptuneos.neptunai.disabled";

  const TIPS = [
    "Right-click the desktop for context menus. Right-click icons for more options.",
    "Drag desktop icons to rearrange them. Your layout is saved automatically.",
    "Press P or Escape to pause games. Press R to restart after game over.",
    "Open Control Panel to change wallpapers, accent colors, and more.",
    "Use the Neptune Store to install additional apps!",
    "The Task Manager shows real-time CPU, RAM, and GPU usage.",
    "Try WASD controls in games as an alternative to arrow keys.",
    "Double-click files in Explorer to open them in the right app.",
    "You can import your own music files into Media Player.",
    "Sticky Notes save automatically. Close them and they'll be here next time.",
    "The Browser supports DuckDuckGo search — just type and press Go!",
    "Try different wallpapers in Control Panel > Appearance.",
    "NeptuneOS stores all your files in browser localStorage.",
    "The clock in the taskbar shows your current time based on the timezone you set.",
    "Hold Ctrl and click icons to multi-select on the desktop.",
  ];

  const SYSTEM_INFO = [
    () => "CPU: " + (OS.hardware ? Math.round(OS.hardware.getCPU()) : "?") + "% usage",
    () => "RAM: " + (OS.hardware ? OS.hardware.getUsedRAM() + " / " + OS.hardware.getTotalRAM() : "?"),
    () => "GPU: " + (OS.hardware ? Math.round(OS.hardware.getGPU()) : "?") + "% usage",
    () => "Open windows: " + (OS.wm ? OS.wm.windows.length : 0),
    () => "Disk usage: " + (OS.fs ? OS.fs.sizeOf("/C:") : "?") + " bytes",
    () => "NeptuneOS " + (OS.brand ? OS.brand.version + " Build " + OS.brand.build : ""),
    () => "Apps installed: " + (OS.apps ? Object.keys(OS.apps).length : 0),
  ];

  let enabled = true;
  let bubbleEl = null;
  let wrapperEl = null;
  let inputEl = null;

  function getUsefulMessage() {
    const roll = Math.random();
    if (roll < 0.5) {
      return TIPS[Math.floor(Math.random() * TIPS.length)];
    } else {
      return SYSTEM_INFO[Math.floor(Math.random() * SYSTEM_INFO.length)]();
    }
  }

  function buildBubble(text) {
    if (!wrapperEl) return;
    if (bubbleEl) bubbleEl.remove();

    bubbleEl = document.createElement("div");
    bubbleEl.className = "neptunai-bubble";
    bubbleEl.innerHTML =
      '<div class="neptunai-bubble-text">' + OS.esc(text || getUsefulMessage()) + "</div>" +
      '<div class="neptunai-bubble-close" title="Dismiss">&times;</div>';
    bubbleEl.addEventListener("click", function (e) {
      if (e.target.classList.contains("neptunai-bubble-close")) {
        hideBubble();
      }
    });
    wrapperEl.appendChild(bubbleEl);
    setTimeout(hideBubble, 12000);
  }

  function hideBubble() {
    if (bubbleEl) {
      bubbleEl.classList.add("neptunai-fade-out");
      setTimeout(function () {
        if (bubbleEl && bubbleEl.parentNode) bubbleEl.remove();
        bubbleEl = null;
      }, 300);
    }
  }

  function show() {
    if (!enabled || !wrapperEl) return;
    buildBubble();
  }

  function hide() {
    hideBubble();
    if (wrapperEl) wrapperEl.style.display = "none";
    enabled = false;
  }

  function activate() {
    if (!wrapperEl) return;
    enabled = true;
    wrapperEl.style.display = "";
  }

  function injectStyles() {
    if (document.getElementById("neptunai-styles")) return;
    var style = document.createElement("style");
    style.id = "neptunai-styles";
    style.textContent =
      ".neptunai-wrap{" +
      "position:fixed;bottom:40px;right:12px;z-index:980;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px;" +
      "}" +
      ".neptunai-wrap.hidden{display:none;}" +
      "@keyframes neptunai-bob{" +
      "0%,100%{transform:translateY(0)}" +
      "50%{transform:translateY(-4px)}" +
      "}" +
      ".neptunai-char{" +
      "width:44px;height:52px;cursor:pointer;" +
      "position:relative;" +
      "animation:neptunai-bob 2.4s ease-in-out infinite;" +
      "transition:transform 0.15s;" +
      "}" +
      ".neptunai-char:hover{transform:scale(1.1);}" +
      ".neptunai-body{" +
      "width:44px;height:52px;position:relative;" +
      "}" +
      ".neptunai-body::before{" +
      "content:'';position:absolute;top:0;left:4px;" +
      "width:36px;height:46px;" +
      "border:3px solid #7a7a7a;border-radius:18px 18px 22px 22px;" +
      "border-bottom-color:#5a5a5a;" +
      "}" +
      ".neptunai-body::after{" +
      "content:'';position:absolute;top:10px;left:12px;" +
      "width:20px;height:28px;" +
      "border:2px solid #999;border-radius:10px 10px 14px 14px;" +
      "border-bottom-color:#666;" +
      "}" +
      ".neptunai-eye{" +
      "position:absolute;width:5px;height:6px;background:#333;border-radius:50%;" +
      "top:18px;z-index:2;" +
      "}" +
      ".neptunai-eye-l{left:13px;}" +
      ".neptunai-eye-r{right:13px;}" +
      "@keyframes neptunai-blink{" +
      "0%,90%,100%{transform:scaleY(1)}" +
      "95%{transform:scaleY(0.1)}" +
      "}" +
      ".neptunai-eye{animation:neptunai-blink 4s ease-in-out infinite;}" +
      ".neptunai-eye-r{animation-delay:0.1s;}" +
      ".neptunai-mouth{" +
      "position:absolute;bottom:12px;left:50%;transform:translateX(-50%);" +
      "width:8px;height:4px;border-bottom:2px solid #555;border-radius:0 0 4px 4px;" +
      "z-index:2;" +
      "}" +
      ".neptunai-eyebrow{" +
      "position:absolute;top:14px;right:10px;" +
      "width:8px;height:2px;background:#555;border-radius:1px;" +
      "transform:rotate(-15deg);z-index:2;" +
      "}" +
      ".neptunai-bubble{" +
      "background:#fffde8;border:1px solid #c0b070;border-radius:10px;" +
      "padding:10px 14px 10px 12px;max-width:280px;min-width:160px;" +
      "box-shadow:2px 3px 10px rgba(0,0,0,0.25);position:relative;" +
      "font-size:12px;line-height:1.45;color:#222;" +
      "animation:neptunai-pop 0.25s ease-out;" +
      "user-select:text;-webkit-user-select:text;" +
      "}" +
      ".neptunai-bubble::after{" +
      "content:'';position:absolute;bottom:-8px;right:18px;" +
      "width:0;height:0;" +
      "border-left:8px solid transparent;border-right:8px solid transparent;" +
      "border-top:8px solid #fffde8;" +
      "}" +
      ".neptunai-bubble::before{" +
      "content:'';position:absolute;bottom:-10px;right:17px;" +
      "width:0;height:0;" +
      "border-left:9px solid transparent;border-right:9px solid transparent;" +
      "border-top:9px solid #c0b070;" +
      "}" +
      "@keyframes neptunai-pop{" +
      "0%{opacity:0;transform:scale(0.8) translateY(6px)}" +
      "100%{opacity:1;transform:scale(1) translateY(0)}" +
      "}" +
      ".neptunai-fade-out{" +
      "animation:neptunai-fadeout 0.3s ease-in forwards;" +
      "}" +
      "@keyframes neptunai-fadeout{" +
      "0%{opacity:1;transform:scale(1)}" +
      "100%{opacity:0;transform:scale(0.85) translateY(8px)}" +
      "}" +
      ".neptunai-bubble-close{" +
      "position:absolute;top:2px;right:6px;" +
      "font-size:14px;line-height:1;color:#999;cursor:pointer;" +
      "transition:color 0.15s;" +
      "}" +
      ".neptunai-bubble-close:hover{color:#c33;}" +
      ".neptunai-bubble-text{padding-right:14px;}" +
      ".neptunai-char::after{" +
      "content:'NeptunAI';" +
      "position:absolute;top:-22px;left:50%;transform:translateX(-50%);" +
      "background:#333;color:#fff;font-size:10px;padding:2px 8px;" +
      "border-radius:3px;white-space:nowrap;opacity:0;" +
      "pointer-events:none;transition:opacity 0.2s;" +
      "}" +
      ".neptunai-char:hover::after{opacity:1;}";
    document.head.appendChild(style);
  }

  function buildDOM() {
    if (wrapperEl) return;
    wrapperEl = document.createElement("div");
    wrapperEl.className = "neptunai-wrap";

    var charEl = document.createElement("div");
    charEl.className = "neptunai-char";
    charEl.innerHTML =
      '<div class="neptunai-body">' +
      '<div class="neptunai-eye neptunai-eye-l"></div>' +
      '<div class="neptunai-eye neptunai-eye-r"></div>' +
      '<div class="neptunai-mouth"></div>' +
      '<div class="neptunai-eyebrow"></div>' +
      "</div>";
    charEl.title = "Click for tips and system info";
    charEl.addEventListener("click", function () {
      if (bubbleEl) {
        hideBubble();
      } else {
        show();
      }
    });

    wrapperEl.appendChild(charEl);
    document.body.appendChild(wrapperEl);
  }

  var neptunai = {
    init() {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        enabled = false;
      }
      injectStyles();
      buildDOM();
      if (!enabled) {
        wrapperEl.classList.add("hidden");
      }
      /* No automatic popups — only shows on click */
    },

    show,
    hide,
    enable: activate,

    disable() {
      localStorage.setItem(STORAGE_KEY, "true");
      hide();
      if (wrapperEl) wrapperEl.classList.add("hidden");
      enabled = false;
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      enabled = true;
      if (wrapperEl) {
        wrapperEl.classList.remove("hidden");
        wrapperEl.style.display = "";
      }
    },

    isEnabled() {
      return enabled;
    },

    onAction(action) {
      /* No automatic popups even on actions */
    },
  };

  window.OS = window.OS || {};
  window.OS.neptunai = neptunai;
})();
