/* =========================================================
 * neptuneOS — Web Browser
 * CORS-proxied browser with New Tab page, URL bar, search,
 * navigation, bookmarks, and srcdoc-based rendering.
 * ========================================================= */
(function () {
  "use strict";

  var PROXY = "https://api.allorigins.win/raw?url=";

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
  var loading = false;
  var currentUrl = "";
  var blobUrls = [];

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
      "body{font-family:Tahoma,sans-serif;background:#f0f0f0;color:#333;display:flex;flex-direction:column;align-items:center;padding:32px 16px;}" +
      "h1{font-size:22px;color:#245edc;margin-bottom:4px;}" +
      "sub{color:#888;font-size:12px;margin-bottom:24px;}" +
      ".search{display:flex;width:100%;max-width:480px;margin-bottom:24px;}" +
      ".search input{flex:1;padding:8px 12px;font-size:14px;border:2px solid #7f9db9;border-radius:4px 0 0 4px;outline:none;}" +
      ".search input:focus{border-color:#245edc;}" +
      ".search button{padding:8px 18px;font-size:14px;background:#245edc;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer;}" +
      ".search button:hover{background:#1a54c8;}" +
      ".links{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;width:100%;max-width:600px;}" +
      ".link{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border:1px solid #d0d0d0;border-radius:6px;text-decoration:none;color:#222;font-size:13px;cursor:pointer;transition:background 0.1s,border-color 0.1s;}" +
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

  function buildErrorHTML(title, desc) {
    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      "<style>" +
      "*{margin:0;padding:0;box-sizing:border-box;}" +
      "body{font-family:Tahoma,sans-serif;background:#f4f4f4;color:#333;display:flex;align-items:center;justify-content:center;min-height:100vh;}" +
      ".err{max-width:420px;text-align:center;padding:32px;}" +
      ".err .icon{font-size:48px;margin-bottom:12px;}" +
      ".err h2{font-size:18px;color:#c0392b;margin-bottom:8px;}" +
      ".err p{font-size:13px;color:#666;line-height:1.5;}" +
      "</style></head><body>" +
      '<div class="err">' +
      '<div class="icon">&#9888;</div>' +
      "<h2>" + OS.esc(title) + "</h2>" +
      "<p>" + OS.esc(desc) + "</p>" +
      "</div></body></html>"
    );
  }

  function buildLoadingHTML(domain) {
    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      "<style>" +
      "*{margin:0;padding:0;box-sizing:border-box;}" +
      "body{font-family:Tahoma,sans-serif;background:#f4f4f4;color:#555;display:flex;align-items:center;justify-content:center;min-height:100vh;}" +
      ".ld{text-align:center;}" +
      ".ld .spinner{width:32px;height:32px;border:3px solid #ddd;border-top-color:#245edc;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px;}" +
      "@keyframes spin{to{transform:rotate(360deg);}}" +
      ".ld p{font-size:13px;}" +
      "</style></head><body>" +
      '<div class="ld"><div class="spinner"></div>' +
      "<p>Loading " + OS.esc(domain) + "...</p></div>" +
      "</body></html>"
    );
  }

  function isLikelyURL(str) {
    if (/^https?:\/\//i.test(str)) return true;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(str)) return true;
    if (/^localhost(:\d+)?(\/.*)?$/.test(str)) return true;
    return false;
  }

  function cleanBlobUrls() {
    for (var i = 0; i < blobUrls.length; i++) {
      try { URL.revokeObjectURL(blobUrls[i]); } catch (e) {}
    }
    blobUrls = [];
  }

  function makeBlobUrl(html) {
    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    blobUrls.push(url);
    return url;
  }

  function getDomain(url) {
    try {
      return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split("?")[0];
    } catch (e) {
      return url;
    }
  }

  function fixRelativeUrls(html, baseUrl) {
    var baseTag = '<base href="' + OS.esc(baseUrl) + '">';
    if (/<head[\s>]/i.test(html)) {
      html = html.replace(/(<head[\s>])/i, "$1" + baseTag);
    } else if (/<html[\s>]/i.test(html)) {
      html = html.replace(/(<html[\s>])/i, "$1<head>" + baseTag + "</head>");
    } else {
      html = "<head>" + baseTag + "</head>" + html;
    }
    return html;
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
          cleanBlobUrls();
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
        '  <iframe class="browser-iframe" id="browser-iframe" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>' +
        '  <div class="browser-blank" id="browser-blank"></div>' +
        '  <div class="browser-error" id="browser-error" style="display:none;">' +
        '    <div class="browser-error-inner">' +
        '      <div class="browser-error-icon">&#9888;</div>' +
        '      <div class="browser-error-title" id="browser-error-title">Failed to load page</div>' +
        '      <div class="browser-error-desc" id="browser-error-desc">The page could not be fetched.</div>' +
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

      function loadNewTab() {
        isHome = true;
        loading = false;
        currentUrl = "";
        cleanBlobUrls();
        blank.style.display = "flex";
        errorOverlay.style.display = "none";
        iframe.style.display = "none";
        iframe.removeAttribute("srcdoc");
        iframe.src = "about:blank";
        var blobUrl = makeBlobUrl(NEW_TAB_HTML);
        blank.innerHTML = "";
        var frame = document.createElement("iframe");
        frame.style.cssText = "width:100%;height:100%;border:none;";
        frame.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox");
        frame.src = blobUrl;
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
            raw = "https://duckduckgo.com/?q=" + encodeURIComponent(raw);
          }
        }
        navigate(raw);
      }

      function navigate(url) {
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        isHome = false;
        loading = true;
        currentUrl = url;
        urlInput.value = url;
        blank.style.display = "none";
        errorOverlay.style.display = "none";
        iframe.style.display = "block";

        var domain = getDomain(url);
        win.setTitle(OS.esc(domain) + " \u2014 Browser");
        statusEl.textContent = "Loading " + domain + "...";

        var loadingBlob = makeBlobUrl(buildLoadingHTML(domain));
        iframe.src = "about:blank";
        iframe.srcdoc = "";
        var frame = blank.querySelector("iframe");
        if (frame) {
          blank.style.display = "flex";
          blank.innerHTML = "";
          var lf = document.createElement("iframe");
          lf.style.cssText = "width:100%;height:100%;border:none;";
          lf.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox");
          lf.src = loadingBlob;
          blank.appendChild(lf);
        }

        pushHistory(url);
        updateButtons();
        fetchViaProxy(url);
      }

      function fetchViaProxy(url) {
        var proxied = PROXY + encodeURIComponent(url);

        fetch(proxied)
          .then(function (resp) {
            if (!resp.ok) {
              throw new Error("HTTP " + resp.status + " " + resp.statusText);
            }
            return resp.text();
          })
          .then(function (html) {
            if (currentUrl !== url) return;

            var fixed = fixRelativeUrls(html, url);
            var domain = getDomain(url);

            iframe.src = "about:blank";
            blank.style.display = "none";
            errorOverlay.style.display = "none";
            iframe.style.display = "block";
            iframe.srcdoc = fixed;

            urlInput.value = url;
            win.setTitle(OS.esc(domain) + " \u2014 Browser");
            statusEl.textContent = "Done";
            loading = false;
            updateButtons();
          })
          .catch(function (err) {
            if (currentUrl !== url) return;

            var domain = getDomain(url);
            var msg = err.message || "Could not fetch the page.";
            var errHtml = buildErrorHTML(
              "Failed to load " + domain,
              "The page could not be loaded through the proxy. " + msg
            );
            var errBlob = makeBlobUrl(errHtml);

            iframe.src = "about:blank";
            blank.style.display = "none";
            errorOverlay.style.display = "none";
            iframe.style.display = "block";
            iframe.srcdoc = "";

            iframe.onload = function () {
              iframe.onload = null;
              fetch(errBlob).then(function (r) { return r.text(); }).then(function (h) {
                iframe.srcdoc = h;
              });
            };
            iframe.srcdoc = errHtml;

            urlInput.value = url;
            win.setTitle(OS.esc(domain) + " \u2014 Browser");
            statusEl.textContent = "Error";
            loading = false;
            updateButtons();
          });
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
          loading = true;
          updateButtons();
          fetchViaProxy(currentUrl);
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
