/* =========================================================
 * neptuneOS — Web Browser
 * iframe-based browser with URL bar, navigation, bookmarks.
 * ========================================================= */
(function () {
  "use strict";

  const BOOKMARKS = [
    { label: "NeptuneOS Repo", url: "https://github.com/notmicrosoft2000-cmd/neptuneos" },
    { label: "Wikipedia", url: "https://en.wikipedia.org" },
    { label: "MDN", url: "https://developer.mozilla.org" },
    { label: "GitHub", url: "https://github.com" },
  ];

  let win = null;
  let iframe = null;
  let urlInput = null;
  let titleEl = null;
  let history = [];
  let historyIdx = -1;
  let loading = false;

  const app = {
    id: "browser",
    name: "Browser",
    icon: "assets/icons/browser.svg",
    group: "apps",

    launch(opts) {
      if (win && !win.el.isConnected) { win = null; history = []; historyIdx = -1; }
      if (win) { win.restore(); win.focus(); return win; }

      const startUrl = (opts && opts.url) || "";

      win = OS.wm.createWindow({
        title: "Browser",
        icon: this.icon,
        width: 720,
        height: 500,
        app: "browser",
        onClose: () => { win = null; iframe = null; },
      });

      win.content.innerHTML =
        '<div class="browser-toolbar">' +
        '  <button class="btn browser-nav-btn" data-nav="back" title="Back">&larr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="forward" title="Forward">&rarr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="refresh" title="Refresh">&#8635;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="home" title="Home">&#8962;</button>' +
        '  <input type="text" class="browser-url" id="browser-url" value="" placeholder="Enter URL...">' +
        '  <button class="btn browser-go" data-nav="go">Go</button>' +
        "</div>" +
        '<div class="browser-bookmarks" id="browser-bookmarks"></div>' +
        '<div class="browser-frame-wrap">' +
        '  <iframe class="browser-iframe" id="browser-iframe" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>' +
        '  <div class="browser-blank" id="browser-blank">' +
        '    <div class="browser-blank-inner">' +
        '      <img src="assets/icons/browser.svg" alt="" style="width:48px;height:48px;opacity:0.4;">' +
        '      <div style="margin-top:8px;color:#888;font-size:13px;">Enter a URL above and press Go</div>' +
        '    </div>' +
        "  </div>" +
        "</div>" +
        '<div class="app-statusbar"><span id="browser-status">Ready</span><span id="browser-pos"></span></div>';

      iframe = win.content.querySelector("#browser-iframe");
      urlInput = win.content.querySelector("#browser-url");
      titleEl = win.title;
      const blank = win.content.querySelector("#browser-blank");
      const statusEl = win.content.querySelector("#browser-status");
      const posEl = win.content.querySelector("#browser-pos");

      // Bookmarks bar
      const bmBar = win.content.querySelector("#browser-bookmarks");
      BOOKMARKS.forEach((bm) => {
        const btn = document.createElement("button");
        btn.className = "btn browser-bm-btn";
        btn.textContent = bm.label;
        btn.addEventListener("click", () => navigate(bm.url));
        bmBar.appendChild(btn);
      });

      // Navigation buttons
      win.content.querySelectorAll("[data-nav]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.nav;
          if (action === "back") goBack();
          else if (action === "forward") goForward();
          else if (action === "refresh") refreshPage();
          else if (action === "home") navigate(BOOKMARKS[0].url);
          else if (action === "go") navigate(urlInput.value);
        });
      });

      // URL bar enter
      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          let url = urlInput.value.trim();
          if (!url) return;
          if (!/^https?:\/\//i.test(url)) url = "https://" + url;
          navigate(url);
        }
      });

      // Track iframe load
      iframe.addEventListener("load", () => {
        loading = false;
        statusEl.textContent = "Done";
        try {
          const loc = iframe.contentWindow.location.href;
          if (loc && loc !== "about:blank") {
            urlInput.value = loc;
            if (historyIdx < history.length - 1) history = history.slice(0, historyIdx + 1);
            history.push(loc);
            historyIdx = history.length - 1;
          }
        } catch (e) {
          // cross-origin — just show the URL we navigated to
        }
        updateButtons();
      });

      // Navigate to start URL
      if (startUrl) navigate(startUrl);
      updateButtons();

      function navigate(url) {
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        loading = true;
        statusEl.textContent = "Loading...";
        urlInput.value = url;
        blank.style.display = "none";
        iframe.style.display = "block";
        iframe.src = url;
        win.setTitle(url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] + " — Browser");
        updateButtons();
      }

      function goBack() {
        if (historyIdx > 0) {
          historyIdx--;
          const url = history[historyIdx];
          urlInput.value = url;
          iframe.src = url;
          statusEl.textContent = "Loading...";
          updateButtons();
        }
      }

      function goForward() {
        if (historyIdx < history.length - 1) {
          historyIdx++;
          const url = history[historyIdx];
          urlInput.value = url;
          iframe.src = url;
          statusEl.textContent = "Loading...";
          updateButtons();
        }
      }

      function refreshPage() {
        if (iframe.src && iframe.src !== "about:blank") {
          statusEl.textContent = "Refreshing...";
          iframe.src = iframe.src;
        }
      }

      function updateButtons() {
        const back = win.content.querySelector('[data-nav="back"]');
        const fwd = win.content.querySelector('[data-nav="forward"]');
        if (back) back.disabled = historyIdx <= 0;
        if (fwd) fwd.disabled = historyIdx >= history.length - 1;
        posEl.textContent = history.length ? (historyIdx + 1) + "/" + history.length : "";
      }
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.browser = app;
})();
