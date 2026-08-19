/* =========================================================
 * neptuneOS — Web Browser (multi-tab)
 * Direct-iframe browser with DuckDuckGo HTML search, URL
 * navigation, New Tab page, bookmarks, error fallback,
 * and full tab management.
 * ========================================================= */
(function () {
  "use strict";

  var DDG_HTML = "https://html.duckduckgo.com/html/";

  var BOOKMARKS = [
    { label: "Home", url: "__home__" },
    { label: "Wikipedia", url: "https://en.wikipedia.org" },
    { label: "GitHub", url: "https://github.com" },
    { label: "MDN", url: "https://developer.mozilla.org" },
    { label: "NeptuneOS", url: "https://github.com/notmicrosoft2000-cmd/neptuneos" },
  ];

  var QUICK_LINKS = [
    { label: "Wikipedia", desc: "Free encyclopedia", url: "https://en.wikipedia.org", icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico" },
    { label: "GitHub", desc: "Code hosting", url: "https://github.com", icon: "https://github.githubassets.com/favicons/favicon.svg" },
    { label: "MDN", desc: "Web development docs", url: "https://developer.mozilla.org", icon: "https://developer.mozilla.org/favicon-48x48.png" },
    { label: "DuckDuckGo", desc: "Private search engine", url: "https://duckduckgo.com", icon: "https://duckduckgo.com/favicon.ico" },
    { label: "NeptuneOS", desc: "NeptuneOS repository", url: "https://github.com/notmicrosoft2000-cmd/neptuneos" },
  ];

  var win = null;
  var urlInput = null;
  var statusEl = null;
  var posEl = null;
  var tabsBar = null;
  var frameWrap = null;
  var tabs = [];
  var activeTabId = -1;
  var nextTabId = 1;

  function buildNewTabHTML() {
    var linksHtml = QUICK_LINKS.map(function (l) {
      var iconHtml = l.icon
        ? '<img src="' + OS.esc(l.icon) + '" onerror="this.style.display=\'none\'">'
        : "";
      return (
        '<a class="link" data-url="' + OS.esc(l.url) + '">' +
        iconHtml +
        "<div><b>" + OS.esc(l.label) + "</b><small>" + OS.esc(l.desc) + "</small></div></a>"
      );
    }).join("");

    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>NeptuneOS Browser</title>' +
      "<style>" +
      "*{margin:0;padding:0;box-sizing:border-box;}" +
      "body{font-family:Tahoma,sans-serif;background:#f0f0f0;color:#333;display:flex;flex-direction:column;align-items:center;padding:32px 16px;min-height:100vh;}" +
      "h1{font-size:22px;color:#245edc;margin-bottom:4px;}" +
      "sub{color:#888;font-size:12px;margin-bottom:24px;}" +
      ".search{display:flex;width:100%;max-width:480px;margin-bottom:24px;}" +
      ".search input{flex:1;padding:8px 12px;font-size:14px;border:2px solid #7f9db9;border-radius:4px 0 0 4px;outline:none;}" +
      ".search input:focus{border-color:#245edc;}" +
      ".search button{padding:8px 18px;font-size:14px;background:#245edc;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer;}" +
      ".search button:hover{background:#1a54c8;}" +
      ".links{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;width:100%;max-width:600px;}" +
      ".link{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border:1px solid #d0d0d0;border-radius:6px;text-decoration:none;color:#222;font-size:13px;cursor:pointer;transition:background .1s,border-color .1s;}" +
      ".link:hover{background:#e8f0fc;border-color:#245edc;}" +
      ".link img{width:24px;height:24px;flex-shrink:0;}" +
      ".link b{font-size:12px;display:block;}" +
      ".link small{color:#888;font-size:11px;}" +
      ".note{margin-top:24px;font-size:11px;color:#999;max-width:480px;text-align:center;line-height:1.5;}" +
      "</style></head><body>" +
      "<h1>NeptuneOS Browser</h1>" +
      "<sub>A Neptune Productions Product</sub>" +
      '<div class="search"><input type="text" id="q" placeholder="Search DuckDuckGo or enter URL...">' +
      '<button id="goBtn">Go</button></div>' +
      '<div class="links">' + linksHtml + "</div>" +
      '<div class="note">Tip: Use the search bar above to search DuckDuckGo or enter a URL.</div>' +
      "<script>" +
      'var q=document.getElementById("q");' +
      'document.getElementById("goBtn").onclick=function(){nav();};' +
      'q.addEventListener("keydown",function(e){if(e.key==="Enter")nav();});' +
      'document.querySelectorAll(".link").forEach(function(a){a.addEventListener("click",function(){' +
      'parent.postMessage({neptuneBrowserNavigate:a.getAttribute("data-url")},"*");});});' +
      "function nav(){" +
      "var v=q.value.trim();" +
      'if(!v)return;' +
      'parent.postMessage({neptuneBrowserNavigate:v},"*");' +
      "}" +
      "</script></body></html>"
    );
  }

  var NEW_TAB_HTML = buildNewTabHTML();

  function isLikelyURL(str) {
    if (/^https?:\/\//i.test(str)) return true;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(str)) return true;
    if (/^localhost(:\d+)?(\/.*)?$/.test(str)) return true;
    return false;
  }

  function getDomain(url) {
    try {
      return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split("?")[0];
    } catch (e) {
      return url;
    }
  }

  /* ── Tab model ── */

  function createTab(url) {
    var id = nextTabId++;

    var iframe = document.createElement("iframe");
    iframe.className = "browser-iframe";
    iframe.style.display = "none";
    frameWrap.appendChild(iframe);

    var blank = document.createElement("div");
    blank.className = "browser-blank";
    blank.style.display = "none";
    frameWrap.appendChild(blank);

    var errorOverlay = document.createElement("div");
    errorOverlay.className = "browser-error";
    errorOverlay.style.display = "none";
    errorOverlay.innerHTML =
      '<div class="browser-error-inner">' +
      '<div class="browser-error-icon">&#9888;</div>' +
      '<div class="browser-error-title">Failed to load page</div>' +
      '<div class="browser-error-desc"></div>' +
      '<button class="btn browser-error-btn browser-error-open-real">Open in Real Browser &rarr;</button>' +
      '<button class="btn browser-error-back browser-error-go-back">&larr; Go Back</button>' +
      "</div>";
    frameWrap.appendChild(errorOverlay);

    var tab = {
      id: id,
      title: "New Tab",
      url: "",
      iframe: iframe,
      blank: blank,
      errorOverlay: errorOverlay,
      errorDesc: errorOverlay.querySelector(".browser-error-desc"),
      historyStack: [],
      historyIdx: -1,
      isHome: true,
      currentUrl: "",
      loadTimer: null,
      blankTimer: null,
      innerFrame: null,
    };

    errorOverlay.querySelector(".browser-error-open-real").addEventListener("click", function () {
      var u = tab.currentUrl || urlInput.value;
      if (u && u !== "__home__") window.open(u, "_blank");
    });
    errorOverlay.querySelector(".browser-error-go-back").addEventListener("click", function () {
      goBack();
    });

    iframe.addEventListener("load", function () {
      onIframeLoad(tab);
    });

    tabs.push(tab);
    return tab;
  }

  function removeTab(id) {
    if (tabs.length <= 1) return;
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;

    var tab = tabs[idx];
    clearTimeout(tab.loadTimer);
    clearTimeout(tab.blankTimer);
    tab.iframe.remove();
    tab.blank.remove();
    tab.errorOverlay.remove();
    tabs.splice(idx, 1);

    if (activeTabId === id) {
      var newIdx = idx < tabs.length ? idx : tabs.length - 1;
      switchToTab(tabs[newIdx].id);
    } else {
      renderTabs();
    }
  }

  function switchToTab(id) {
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.id === id) {
        t.iframe.style.display = t.isHome ? "none" : "block";
        t.blank.style.display = t.isHome ? "flex" : "none";
        t.errorOverlay.style.display = "none";
      } else {
        t.iframe.style.display = "none";
        t.blank.style.display = "none";
        t.errorOverlay.style.display = "none";
      }
    }
    activeTabId = id;
    var at = getActiveTab();
    urlInput.value = at.isHome ? "" : at.currentUrl;
    updateButtons();
    renderTabs();
    updateStatus();
  }

  function getActiveTab() {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === activeTabId) return tabs[i];
    }
    return tabs[0];
  }

  function renderTabs() {
    tabsBar.innerHTML = "";
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var tabEl = document.createElement("div");
      tabEl.className = "browser-tab" + (t.id === activeTabId ? " active" : "");
      tabEl.setAttribute("data-tab-id", t.id);

      var label = document.createElement("span");
      label.className = "browser-tab-label";
      label.textContent = t.title;
      label.title = t.title;
      tabEl.appendChild(label);

      if (tabs.length > 1) {
        var close = document.createElement("span");
        close.className = "browser-tab-close";
        close.textContent = "\u00d7";
        close.setAttribute("data-close-tab", t.id);
        close.addEventListener("click", (function (tid) {
          return function (e) {
            e.stopPropagation();
            removeTab(tid);
          };
        })(t.id));
        tabEl.appendChild(close);
      }

      tabEl.addEventListener("click", (function (tid) {
        return function () {
          switchToTab(tid);
        };
      })(t.id));

      tabsBar.appendChild(tabEl);
    }
    tabsBar.appendChild(addBtn);
  }

  function updateTabTitle(tab) {
    tab.title = tab.isHome ? "New Tab" : (getDomain(tab.currentUrl) || "Untitled");
    renderTabs();
  }

  function updateStatus() {
    posEl.textContent = tabs.length > 1 ? tabs.length + " tabs" : "";
  }

  /* ── Navigation helpers ── */

  function onFrameMessage(e) {
    if (e.data && e.data.neptuneBrowserNavigate) {
      var url = e.data.neptuneBrowserNavigate;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      navigate(url);
    }
  }

  function onIframeLoad(tab) {
    if (tab.isHome) return;
    clearTimeout(tab.loadTimer);
    clearTimeout(tab.blankTimer);

    try {
      var loc = tab.iframe.contentWindow.location.href;
      if (loc === "about:blank" || loc === "about:srcdoc") {
        tab.blankTimer = setTimeout(function () {
          try {
            var loc2 = tab.iframe.contentWindow.location.href;
            if (loc2 === "about:blank" || loc2 === "about:srcdoc") {
              showError(tab, tab.currentUrl, "This page could not be loaded. It may block iframe embedding. Try opening it in your real browser instead.");
            } else {
              statusEl.textContent = "Done";
            }
          } catch (e2) {
            statusEl.textContent = "Done";
          }
        }, 1500);
      } else {
        statusEl.textContent = "Done";
      }
    } catch (e) {
      statusEl.textContent = "Done";
    }
  }

  function loadNewTabFor(tab) {
    tab.isHome = true;
    tab.currentUrl = "";
    clearTimeout(tab.loadTimer);
    clearTimeout(tab.blankTimer);
    tab.blank.style.display = "flex";
    tab.errorOverlay.style.display = "none";
    tab.iframe.style.display = "none";
    tab.iframe.src = "about:blank";
    tab.iframe.srcdoc = "";
    tab.blank.innerHTML = "";
    var frame = document.createElement("iframe");
    frame.style.cssText = "width:100%;height:100%;border:none;";
    frame.srcdoc = NEW_TAB_HTML;
    tab.blank.appendChild(frame);
    tab.innerFrame = frame;
    pushHistory(tab, "__home__");
    updateTabTitle(tab);
  }

  function navigateFromBar() {
    var at = getActiveTab();
    var raw = urlInput.value.trim();
    if (!raw) return;
    if (raw === "__home__" || raw.toLowerCase() === "home") {
      loadNewTabFor(at);
      updateButtons();
      if (at.id === activeTabId) urlInput.value = "";
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      if (isLikelyURL(raw)) {
        raw = "https://" + raw;
      } else {
        raw = DDG_HTML + "?q=" + encodeURIComponent(raw);
      }
    }
    navigate(raw);
  }

  function navigate(url) {
    if (!url) return;
    var at = getActiveTab();
    if (!/^https?:\/\//i.test(url)) {
      if (isLikelyURL(url)) {
        url = "https://" + url;
      } else {
        url = DDG_HTML + "?q=" + encodeURIComponent(url);
      }
    }
    at.isHome = false;
    at.currentUrl = url;
    clearTimeout(at.loadTimer);
    clearTimeout(at.blankTimer);
    at.blank.style.display = "none";
    at.errorOverlay.style.display = "none";
    at.iframe.style.display = "block";
    at.iframe.srcdoc = "";
    at.iframe.src = url;

    var domain = getDomain(url);
    urlInput.value = url;
    win.setTitle(OS.esc(domain) + " \u2014 Browser");
    statusEl.textContent = "Loading " + domain + "...";

    pushHistory(at, url);
    updateTabTitle(at);
    updateButtons();

    at.loadTimer = setTimeout(function () {
      try {
        var loc = at.iframe.contentWindow.location.href;
        if (loc === "about:blank" || loc === "about:srcdoc") {
          showError(at, url, "This page took too long to respond or could not be loaded.");
        } else {
          statusEl.textContent = "Done";
        }
      } catch (e) {
        statusEl.textContent = "Done";
      }
    }, 10000);
  }

  function showError(tab, url, desc) {
    var domain = getDomain(url);
    tab.errorOverlay.style.display = "flex";
    tab.iframe.style.display = "none";
    tab.blank.style.display = "none";
    tab.errorDesc.textContent = desc || "The page could not be loaded.";
    if (tab.id === activeTabId) {
      win.setTitle(OS.esc(domain) + " \u2014 Browser");
      statusEl.textContent = "Error";
    }
    clearTimeout(tab.loadTimer);
    clearTimeout(tab.blankTimer);
  }

  function openExternal() {
    var url = urlInput.value;
    if (url && url !== "__home__") window.open(url, "_blank");
  }

  function goBack() {
    var at = getActiveTab();
    if (at.historyIdx > 0) {
      at.historyIdx--;
      var entry = at.historyStack[at.historyIdx];
      if (entry === "__home__") {
        loadNewTabFor(at);
        if (at.id === activeTabId) { urlInput.value = ""; updateButtons(); }
        updateTabTitle(at);
        return;
      }
      navigate(entry);
    }
  }

  function goForward() {
    var at = getActiveTab();
    if (at.historyIdx < at.historyStack.length - 1) {
      at.historyIdx++;
      var entry = at.historyStack[at.historyIdx];
      if (entry === "__home__") {
        loadNewTabFor(at);
        if (at.id === activeTabId) { urlInput.value = ""; updateButtons(); }
        updateTabTitle(at);
        return;
      }
      navigate(entry);
    }
  }

  function refreshPage() {
    var at = getActiveTab();
    if (at.isHome) {
      loadNewTabFor(at);
      updateTabTitle(at);
      return;
    }
    if (at.currentUrl) {
      statusEl.textContent = "Refreshing...";
      var url = at.currentUrl;
      at.currentUrl = "";
      at.iframe.src = "about:blank";
      setTimeout(function () {
        navigate(url);
      }, 50);
    }
  }

  function pushHistory(tab, entry) {
    if (tab.historyIdx < tab.historyStack.length - 1) {
      tab.historyStack = tab.historyStack.slice(0, tab.historyIdx + 1);
    }
    tab.historyStack.push(entry);
    tab.historyIdx = tab.historyStack.length - 1;
  }

  function updateButtons() {
    var at = getActiveTab();
    var back = win.content.querySelector('[data-nav="back"]');
    var fwd = win.content.querySelector('[data-nav="forward"]');
    if (back) back.disabled = at.historyIdx <= 0;
    if (fwd) fwd.disabled = at.historyIdx >= at.historyStack.length - 1;
    posEl.textContent = tabs.length > 1 ? tabs.length + " tabs" : "";
  }

  function newTab() {
    var tab = createTab();
    loadNewTabFor(tab);
    switchToTab(tab.id);
    urlInput.focus();
  }

  /* ── Add button reference ── */
  var addBtn = null;

  /* ── App definition ── */

  var app = {
    id: "browser",
    name: "Browser",
    icon: "assets/icons/browser.svg",
    group: "apps",

    launch: function (opts) {
      if (win && !win.el.isConnected) {
        win = null;
        tabs = [];
        activeTabId = -1;
        nextTabId = 1;
      }
      if (win) {
        win.restore();
        win.focus();
        return win;
      }

      var startUrl = (opts && opts.url) || "";

      win = OS.wm.createWindow({
        title: "Browser",
        icon: this.icon,
        width: 720,
        height: 500,
        app: "browser",
        onClose: function () {
          for (var i = 0; i < tabs.length; i++) {
            clearTimeout(tabs[i].loadTimer);
            clearTimeout(tabs[i].blankTimer);
          }
          win = null;
          tabs = [];
          activeTabId = -1;
          nextTabId = 1;
          window.removeEventListener("message", onFrameMessage);
          window.removeEventListener("keydown", onKeyDown);
        },
      });

      win.content.innerHTML =
        '<div class="browser-tabs" id="browser-tabs"></div>' +
        '<div class="browser-toolbar">' +
        '  <button class="btn browser-nav-btn" data-nav="back" title="Back">&larr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="forward" title="Forward">&rarr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="refresh" title="Refresh">&#8635;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="home" title="Home">&#8962;</button>' +
        '  <input type="text" class="browser-url" id="browser-url" value="" placeholder="Enter URL or search...">' +
        '  <button class="btn browser-go" data-nav="go">Go</button>' +
        '  <button class="btn browser-open-external" data-nav="external" title="Open in real browser">&#8599;</button>' +
        "</div>" +
        '<div class="browser-bookmarks" id="browser-bookmarks"></div>' +
        '<div class="browser-frame-wrap" id="browser-frame-wrap"></div>' +
        '<div class="app-statusbar"><span id="browser-status">Ready</span><span id="browser-pos"></span></div>';

      tabsBar = win.content.querySelector("#browser-tabs");
      urlInput = win.content.querySelector("#browser-url");
      statusEl = win.content.querySelector("#browser-status");
      posEl = win.content.querySelector("#browser-pos");
      frameWrap = win.content.querySelector("#browser-frame-wrap");

      addBtn = document.createElement("button");
      addBtn.className = "browser-tab-add";
      addBtn.textContent = "+";
      addBtn.title = "New Tab (Ctrl+T)";
      addBtn.addEventListener("click", newTab);

      var bmBar = win.content.querySelector("#browser-bookmarks");
      BOOKMARKS.forEach(function (bm) {
        var btn = document.createElement("button");
        btn.className = "btn browser-bm-btn";
        btn.textContent = bm.label;
        btn.addEventListener("click", function () {
          if (bm.url === "__home__") {
            newTab();
            return;
          }
          navigate(bm.url);
        });
        bmBar.appendChild(btn);
      });

      win.content.querySelectorAll("[data-nav]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var action = btn.dataset.nav;
          if (action === "back") goBack();
          else if (action === "forward") goForward();
          else if (action === "refresh") refreshPage();
          else if (action === "home") newTab();
          else if (action === "go") navigateFromBar();
          else if (action === "external") openExternal();
        });
      });

      urlInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") navigateFromBar();
      });

      window.addEventListener("message", onFrameMessage);
      window.addEventListener("keydown", onKeyDown);

      function onKeyDown(e) {
        if (!win || !win.el.isConnected) return;
        if ((e.ctrlKey || e.metaKey) && e.key === "t") {
          e.preventDefault();
          newTab();
        } else if ((e.ctrlKey || e.metaKey) && e.key === "w") {
          e.preventDefault();
          if (tabs.length > 1) removeTab(activeTabId);
        }
      }

      if (startUrl) {
        var tab = createTab();
        switchToTab(tab.id);
        navigate(startUrl);
      } else {
        var firstTab = createTab();
        loadNewTabFor(firstTab);
        switchToTab(firstTab.id);
      }
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.browser = app;
})();
