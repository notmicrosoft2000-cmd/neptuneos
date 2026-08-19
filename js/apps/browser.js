/* =========================================================
 * neptuneOS — Web Browser
 * Direct-iframe browser with DuckDuckGo HTML search, URL
 * navigation, New Tab page, bookmarks, and error fallback.
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
  var iframe = null;
  var urlInput = null;
  var blank = null;
  var errorOverlay = null;
  var errorDesc = null;
  var statusEl = null;
  var posEl = null;
  var historyStack = [];
  var historyIdx = -1;
  var isHome = true;
  var currentUrl = "";
  var loadTimer = null;
  var blankTimer = null;

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

  var app = {
    id: "browser",
    name: "Browser",
    icon: "assets/icons/browser.svg",
    group: "apps",

    launch: function (opts) {
      if (win && !win.el.isConnected) {
        win = null;
        historyStack = [];
        historyIdx = -1;
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
          win = null;
          iframe = null;
          window.removeEventListener("message", onFrameMessage);
          clearTimeout(loadTimer);
          clearTimeout(blankTimer);
        },
      });

      win.content.innerHTML =
        '<div class="browser-toolbar">' +
        '  <button class="btn browser-nav-btn" data-nav="back" title="Back">&larr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="forward" title="Forward">&rarr;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="refresh" title="Refresh">&#8635;</button>' +
        '  <button class="btn browser-nav-btn" data-nav="home" title="Home">&#8962;</button>' +
        '  <input type="text" class="browser-url" id="browser-url" value="" placeholder="Enter URL or search...">' +
        '  <button class="btn browser-go" data-nav="go">Go</button>' +
        '  <button class="btn browser-nav-btn" data-nav="newtab" title="New Tab">&#43;</button>' +
        '  <button class="btn browser-open-external" data-nav="external" title="Open in real browser">&#8599;</button>' +
        "</div>" +
        '<div class="browser-bookmarks" id="browser-bookmarks"></div>' +
        '<div class="browser-frame-wrap">' +
        '  <iframe class="browser-iframe" id="browser-iframe"></iframe>' +
        '  <div class="browser-blank" id="browser-blank"></div>' +
        '  <div class="browser-error" id="browser-error" style="display:none;">' +
        '    <div class="browser-error-inner">' +
        '      <div class="browser-error-icon">&#9888;</div>' +
        '      <div class="browser-error-title" id="browser-error-title">Failed to load page</div>' +
        '      <div class="browser-error-desc" id="browser-error-desc">The page could not be loaded.</div>' +
        '      <button class="btn browser-error-btn" id="browser-open-real">Open in Real Browser &rarr;</button>' +
        '      <button class="btn browser-error-back" id="browser-error-back">&larr; Go Back</button>' +
        '    </div>' +
        "  </div>" +
        "</div>" +
        '<div class="app-statusbar"><span id="browser-status">Ready</span><span id="browser-pos"></span></div>';

      iframe = win.content.querySelector("#browser-iframe");
      urlInput = win.content.querySelector("#browser-url");
      blank = win.content.querySelector("#browser-blank");
      errorOverlay = win.content.querySelector("#browser-error");
      errorDesc = win.content.querySelector("#browser-error-desc");
      statusEl = win.content.querySelector("#browser-status");
      posEl = win.content.querySelector("#browser-pos");

      var bmBar = win.content.querySelector("#browser-bookmarks");
      BOOKMARKS.forEach(function (bm) {
        var btn = document.createElement("button");
        btn.className = "btn browser-bm-btn";
        btn.textContent = bm.label;
        btn.addEventListener("click", function () {
          if (bm.url === "__home__") {
            loadNewTab();
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
          else if (action === "home") loadNewTab();
          else if (action === "newtab") loadNewTab();
          else if (action === "go") navigateFromBar();
          else if (action === "external") openExternal();
        });
      });

      urlInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") navigateFromBar();
      });

      win.content.querySelector("#browser-open-real").addEventListener("click", openExternal);
      win.content.querySelector("#browser-error-back").addEventListener("click", goBack);

      window.addEventListener("message", onFrameMessage);

      iframe.addEventListener("load", onIframeLoad);

      if (startUrl) {
        navigate(startUrl);
      } else {
        loadNewTab();
      }
      updateButtons();

      /* ── Internal functions ── */

      function onFrameMessage(e) {
        if (e.data && e.data.neptuneBrowserNavigate) {
          var url = e.data.neptuneBrowserNavigate;
          if (!/^https?:\/\//i.test(url)) url = "https://" + url;
          navigate(url);
        }
      }

      function onIframeLoad() {
        if (isHome) return;
        clearTimeout(loadTimer);
        clearTimeout(blankTimer);

        try {
          var loc = iframe.contentWindow.location.href;
          if (loc === "about:blank" || loc === "about:srcdoc") {
            blankTimer = setTimeout(function () {
              try {
                var loc2 = iframe.contentWindow.location.href;
                if (loc2 === "about:blank" || loc2 === "about:srcdoc") {
                  showError(currentUrl, "This page could not be loaded. It may block iframe embedding. Try opening it in your real browser instead.");
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

      function loadNewTab() {
        isHome = true;
        currentUrl = "";
        clearTimeout(loadTimer);
        clearTimeout(blankTimer);
        blank.style.display = "flex";
        errorOverlay.style.display = "none";
        iframe.style.display = "none";
        iframe.src = "about:blank";
        iframe.srcdoc = "";
        blank.innerHTML = "";
        var frame = document.createElement("iframe");
        frame.style.cssText = "width:100%;height:100%;border:none;";
        frame.srcdoc = NEW_TAB_HTML;
        blank.appendChild(frame);
        urlInput.value = "";
        win.setTitle("Browser");
        statusEl.textContent = "Ready";
        pushHistory("__home__");
        updateButtons();
      }

      function navigateFromBar() {
        var raw = urlInput.value.trim();
        if (!raw) return;
        if (raw === "__home__" || raw.toLowerCase() === "home") {
          loadNewTab();
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
        if (!/^https?:\/\//i.test(url)) {
          if (isLikelyURL(url)) {
            url = "https://" + url;
          } else {
            url = DDG_HTML + "?q=" + encodeURIComponent(url);
          }
        }
        isHome = false;
        currentUrl = url;
        clearTimeout(loadTimer);
        clearTimeout(blankTimer);
        blank.style.display = "none";
        errorOverlay.style.display = "none";
        iframe.style.display = "block";
        iframe.srcdoc = "";
        iframe.src = url;

        var domain = getDomain(url);
        urlInput.value = url;
        win.setTitle(OS.esc(domain) + " \u2014 Browser");
        statusEl.textContent = "Loading " + domain + "...";

        pushHistory(url);
        updateButtons();

        loadTimer = setTimeout(function () {
          try {
            var loc = iframe.contentWindow.location.href;
            if (loc === "about:blank" || loc === "about:srcdoc") {
              showError(url, "This page took too long to respond or could not be loaded.");
            } else {
              statusEl.textContent = "Done";
            }
          } catch (e) {
            statusEl.textContent = "Done";
          }
        }, 10000);
      }

      function showError(url, desc) {
        var domain = getDomain(url);
        errorOverlay.style.display = "flex";
        iframe.style.display = "none";
        blank.style.display = "none";
        errorDesc.textContent = desc || "The page could not be loaded.";
        win.setTitle(OS.esc(domain) + " \u2014 Browser");
        statusEl.textContent = "Error";
        clearTimeout(loadTimer);
        clearTimeout(blankTimer);
      }

      function openExternal() {
        var url = urlInput.value;
        if (url && url !== "__home__") window.open(url, "_blank");
      }

      function goBack() {
        if (historyIdx > 0) {
          historyIdx--;
          var entry = historyStack[historyIdx];
          if (entry === "__home__") {
            loadNewTab();
            return;
          }
          navigate(entry);
        }
      }

      function goForward() {
        if (historyIdx < historyStack.length - 1) {
          historyIdx++;
          var entry = historyStack[historyIdx];
          if (entry === "__home__") {
            loadNewTab();
            return;
          }
          navigate(entry);
        }
      }

      function refreshPage() {
        if (isHome) {
          loadNewTab();
          return;
        }
        if (currentUrl) {
          statusEl.textContent = "Refreshing...";
          var url = currentUrl;
          currentUrl = "";
          iframe.src = "about:blank";
          setTimeout(function () {
            navigate(url);
          }, 50);
        }
      }

      function pushHistory(entry) {
        if (historyIdx < historyStack.length - 1) {
          historyStack = historyStack.slice(0, historyIdx + 1);
        }
        historyStack.push(entry);
        historyIdx = historyStack.length - 1;
      }

      function updateButtons() {
        var back = win.content.querySelector('[data-nav="back"]');
        var fwd = win.content.querySelector('[data-nav="forward"]');
        if (back) back.disabled = historyIdx <= 0;
        if (fwd) fwd.disabled = historyIdx >= historyStack.length - 1;
        posEl.textContent =
          historyStack.length > 1 ? historyIdx + 1 + "/" + historyStack.length : "";
      }
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.browser = app;
})();
