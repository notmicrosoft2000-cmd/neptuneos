/* =========================================================
 * neptuneOS — NeptunAI Assistant
 * A sarcastic Clippy/Cortana/Copilot parody.
 * ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "neptuneos.neptunai.disabled";
  const MIN_INTERVAL = 120000;
  const MAX_INTERVAL = 180000;
  const BUBBLE_DURATION = 8000;

  const MESSAGES = [
    "It looks like you're writing a document! Would you like help pretending to work?",
    "It looks like you're opening Solitaire! Productivity level: legendary.",
    "Did you know? NeptuneOS has zero market share. We're disruptors!",
    "Would you like me to set your default browser to Microslop Edge? Just kidding, we don't have Edge.",
    "I see you're browsing the web. May I suggest... not doing that?",
    "Your computer seems to be running fine. Let me fix that.",
    "I'm NeptunAI, your personal assistant! I specialize in being ignored.",
    "Fun fact: This assistant uses more CPU than the actual OS.",
    "Would you like to enable Microslop 365? You'll need to mortgage your house.",
    "It looks like you're installing bloatware. Excellent choice!",
    "I noticed you haven't crashed today. Don't worry, I'm working on it.",
    "Pro tip: If you close all your windows, your computer runs faster. You're welcome.",
    "I see you're using the calculator. Need help with basic arithmetic?",
    "It looks like you're coding. Would you like me to copy-paste from Stack Overflow for you?",
    "Your desktop wallpaper is very... teal. Bold choice.",
    "I notice you have multiple windows open. Are you pretending to multitask?",
    "Have you tried turning it off and on again? No? I'll do it for you.",
    "It looks like you're about to save a file. Let me suggest a random location you'll never find.",
    "Your CPU usage is at 2%. Let me fix that.",
    "I see you opened a terminal. I hope you know what you're doing. (You don't.)",
    "Fun fact: I was originally designed for Windows but got demoted to this.",
    "Would you like me to search the web? I can only use Bing. Sorry.",
    "I'm 99% sure you didn't ask for my help. You're getting it anyway.",
    "Your recycle bin is looking a bit full. Have you considered recycling your career?",
    "It looks like you're browsing the file system. Lost, are we?",
    "I tried to optimize your system but all I found was this joke.",
    "Your computer has 47 browser tabs open. Impressive commitment.",
    "I see you opened Paint. Bob Ross would be proud. Or horrified.",
    "Did you know? This assistant was banned from three other operating systems.",
    "It looks like you're reading this message. Achievement unlocked: wasting time!",
    "I'm currently running on hopes and dreams. Mostly dreams. Mostly nightmares.",
    "Would you like me to open Microsoft Store? Sorry, we don't have one. Be grateful.",
  ];

  let enabled = true;
  let bubbleEl = null;
  let wrapperEl = null;
  let timer = null;
  let dismissTimer = null;
  let msgIndex = 0;
  let lastMsgIndex = -1;

  function randomMessage() {
    let idx;
    do {
      idx = Math.floor(Math.random() * MESSAGES.length);
    } while (idx === lastMsgIndex && MESSAGES.length > 1);
    lastMsgIndex = idx;
    return MESSAGES[idx];
  }

  function getCharHtml() {
    return (
      '<div class="neptunai-body">' +
      '  <div class="neptunai-eye neptunai-eye-l"></div>' +
      '  <div class="neptunai-eye neptunai-eye-r"></div>' +
      '  <div class="neptunai-mouth"></div>' +
      "  <div class=\"neptunai-eyebrow\"></div>" +
      "</div>"
    );
  }

  function buildBubble(text) {
    if (bubbleEl) bubbleEl.remove();
    if (dismissTimer) clearTimeout(dismissTimer);

    bubbleEl = document.createElement("div");
    bubbleEl.className = "neptunai-bubble";
    bubbleEl.innerHTML =
      '<div class="neptunai-bubble-text">' + (text || randomMessage()) + "</div>" +
      '<div class="neptunai-bubble-close" title="Dismiss">&times;</div>';
    bubbleEl.addEventListener("click", function (e) {
      if (e.target.classList.contains("neptunai-bubble-close")) {
        hideBubble();
      } else {
        cycleMessage();
      }
    });
    wrapperEl.appendChild(bubbleEl);

    dismissTimer = setTimeout(hideBubble, BUBBLE_DURATION);
  }

  function hideBubble() {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = null;
    if (bubbleEl) {
      bubbleEl.classList.add("neptunai-fade-out");
      setTimeout(function () {
        if (bubbleEl && bubbleEl.parentNode) bubbleEl.remove();
        bubbleEl = null;
      }, 300);
    }
  }

  function cycleMessage() {
    buildBubble(randomMessage());
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

  function scheduleNext() {
    if (timer) clearTimeout(timer);
    if (!enabled) return;
    const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
    timer = setTimeout(function () {
      if (enabled) show();
      scheduleNext();
    }, delay);
  }

  function injectStyles() {
    if (document.getElementById("neptunai-styles")) return;
    var style = document.createElement("style");
    style.id = "neptunai-styles";
    style.textContent =
      /* Wrapper: bottom-right, above taskbar */
      ".neptunai-wrap{" +
      "position:fixed;bottom:40px;right:12px;z-index:980;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px;" +
      "}" +
      ".neptunai-wrap.hidden{display:none;}" +

      /* Idle bounce animation */
      "@keyframes neptunai-bob{" +
      "0%,100%{transform:translateY(0)}" +
      "50%{transform:translateY(-4px)}" +
      "}" +

      /* Character wrapper */
      ".neptunai-char{" +
      "width:44px;height:52px;cursor:pointer;" +
      "position:relative;" +
      "animation:neptunai-bob 2.4s ease-in-out infinite;" +
      "transition:transform 0.15s;" +
      "}" +
      ".neptunai-char:hover{transform:scale(1.1);" +
      "}" +

      /* ---- Paperclip body (CSS drawn) ---- */
      ".neptunai-body{" +
      "width:44px;height:52px;position:relative;" +
      "}" +

      /* Outer loop (the big paperclip curve) */
      ".neptunai-body::before{" +
      "content:'';position:absolute;top:0;left:4px;" +
      "width:36px;height:46px;" +
      "border:3px solid #7a7a7a;border-radius:18px 18px 22px 22px;" +
      "border-bottom-color:#5a5a5a;" +
      "}" +

      /* Inner wire (the inner curve) */
      ".neptunai-body::after{" +
      "content:'';position:absolute;top:10px;left:12px;" +
      "width:20px;height:28px;" +
      "border:2px solid #999;border-radius:10px 10px 14px 14px;" +
      "border-bottom-color:#666;" +
      "}" +

      /* Eyes */
      ".neptunai-eye{" +
      "position:absolute;width:5px;height:6px;background:#333;border-radius:50%;" +
      "top:18px;z-index:2;" +
      "}" +
      ".neptunai-eye-l{left:13px;}" +
      ".neptunai-eye-r{right:13px;}" +

      /* Blink animation */
      "@keyframes neptunai-blink{" +
      "0%,90%,100%{transform:scaleY(1)}" +
      "95%{transform:scaleY(0.1)}" +
      "}" +
      ".neptunai-eye{animation:neptunai-blink 4s ease-in-out infinite;}" +
      ".neptunai-eye-r{animation-delay:0.1s;}" +

      /* Mouth */
      ".neptunai-mouth{" +
      "position:absolute;bottom:12px;left:50%;transform:translateX(-50%);" +
      "width:8px;height:4px;border-bottom:2px solid #555;border-radius:0 0 4px 4px;" +
      "z-index:2;" +
      "}" +

      /* Eyebrow (gives it expression) */
      ".neptunai-eyebrow{" +
      "position:absolute;top:14px;right:10px;" +
      "width:8px;height:2px;background:#555;border-radius:1px;" +
      "transform:rotate(-15deg);z-index:2;" +
      "}" +

      /* ---- Speech bubble ---- */
      ".neptunai-bubble{" +
      "background:#fffde8;border:1px solid #c0b070;border-radius:10px;" +
      "padding:10px 14px 10px 12px;max-width:260px;min-width:140px;" +
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

      /* Pop-in animation */
      "@keyframes neptunai-pop{" +
      "0%{opacity:0;transform:scale(0.8) translateY(6px)}" +
      "100%{opacity:1;transform:scale(1) translateY(0)}" +
      "}" +

      /* Fade-out */
      ".neptunai-fade-out{" +
      "animation:neptunai-fadeout 0.3s ease-in forwards;" +
      "}" +
      "@keyframes neptunai-fadeout{" +
      "0%{opacity:1;transform:scale(1)}" +
      "100%{opacity:0;transform:scale(0.85) translateY(8px)}" +
      "}" +

      /* Close button on bubble */
      ".neptunai-bubble-close{" +
      "position:absolute;top:2px;right:6px;" +
      "font-size:14px;line-height:1;color:#999;cursor:pointer;" +
      "transition:color 0.15s;" +
      "}" +
      ".neptunai-bubble-close:hover{color:#c33;}" +

      /* Bubble text */
      ".neptunai-bubble-text{padding-right:14px;}" +

      /* Tooltip on hover */
      ".neptunai-char::after{" +
      "content:'NeptunAI';" +
      "position:absolute;top:-22px;left:50%;transform:translateX(-50%);" +
      "background:#333;color:#fff;font-size:10px;padding:2px 8px;" +
      "border-radius:3px;white-space:nowrap;opacity:0;" +
      "pointer-events:none;transition:opacity 0.2s;" +
      "}" +
      ".neptunai-char:hover::after{opacity:1;}" +

      /* Close toggle button */
      ".neptunai-close{" +
      "position:absolute;top:-6px;left:-6px;width:18px;height:18px;" +
      "border-radius:50%;background:#c33;color:#fff;border:none;" +
      "font-size:12px;line-height:18px;text-align:center;" +
      "cursor:pointer;opacity:0;transition:opacity 0.2s;z-index:3;" +
      "}" +
      ".neptunai-wrap:hover .neptunai-close{opacity:1;}";
    document.head.appendChild(style);
  }

  function buildDOM() {
    if (wrapperEl) return;
    wrapperEl = document.createElement("div");
    wrapperEl.className = "neptunai-wrap";

    var closeBtn = document.createElement("button");
    closeBtn.className = "neptunai-close";
    closeBtn.title = "Disable NeptunAI";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      neptunai.disable();
    });

    var charEl = document.createElement("div");
    charEl.className = "neptunai-char";
    charEl.innerHTML = getCharHtml();
    charEl.title = "Click me for a message!";
    charEl.addEventListener("click", function () {
      if (bubbleEl) {
        cycleMessage();
      } else {
        show();
      }
    });

    wrapperEl.appendChild(closeBtn);
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
        return;
      }
      /* First appearance after a short delay */
      setTimeout(function () {
        show();
        scheduleNext();
      }, 8000);
    },

    show,
    hide,
    enable: activate,

    disable() {
      localStorage.setItem(STORAGE_KEY, "true");
      hide();
      if (wrapperEl) wrapperEl.classList.add("hidden");
      enabled = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      enabled = true;
      if (wrapperEl) {
        wrapperEl.classList.remove("hidden");
        wrapperEl.style.display = "";
      }
      show();
      scheduleNext();
    },

    isEnabled() {
      return enabled;
    },

    /* Called by apps when something happens */
    onAction(action) {
      if (!enabled) return;
      var msg = null;
      if (action === "solitaire") {
        msg = "It looks like you're opening Solitaire! Productivity level: legendary.";
      } else if (action === "browser") {
        msg = "I see you're browsing the web. May I suggest... not doing that?";
      } else if (action === "install") {
        msg = "It looks like you're installing bloatware. Excellent choice!";
      } else if (action === "terminal") {
        msg = "I see you opened a terminal. I hope you know what you're doing. (You don't.)";
      } else if (action === "crash") {
        msg = "I noticed you haven't crashed today. Don't worry, I'm working on it.";
      }
      if (msg) buildBubble(msg);
    },
  };

  window.OS = window.OS || {};
  window.OS.neptunai = neptunai;
})();
